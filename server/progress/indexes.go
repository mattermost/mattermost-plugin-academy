// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"slices"
	"sort"
	"strings"
)

const (
	completionsPrefix    = "completions:"
	progressGuidesPrefix = "progress_guides:"
	completersKey        = "completers"
	indexesMigratedKey   = "kv:indexes_v1"
)

func completionsKey(userID string) string {
	return completionsPrefix + userID
}

func progressGuidesKey(userID string) string {
	return progressGuidesPrefix + userID
}

func parseProgressKey(key string) (userID, guideID string, ok bool) {
	if !strings.HasPrefix(key, keyPrefix) {
		return "", "", false
	}
	rest := strings.TrimPrefix(key, keyPrefix)
	parts := strings.SplitN(rest, ":", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	if !validUserID(parts[0]) || !validGuideID(parts[1]) {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func appendUniqueID(oldValue []byte, id string) ([]string, error) {
	var ids []string
	if len(oldValue) > 0 {
		if err := json.Unmarshal(oldValue, &ids); err != nil {
			return nil, err
		}
	}
	if slices.Contains(ids, id) {
		return ids, nil
	}
	ids = append(ids, id)
	sort.Strings(ids)
	return ids, nil
}

func appendCompletion(oldValue []byte, c Completion) ([]Completion, error) {
	var out []Completion
	if len(oldValue) > 0 {
		if err := json.Unmarshal(oldValue, &out); err != nil {
			return nil, err
		}
	}
	for i, existing := range out {
		if existing.GuideID == c.GuideID {
			out[i] = c
			return out, nil
		}
	}
	out = append(out, c)
	sort.Slice(out, func(i, j int) bool {
		if out[i].CompletedAt == out[j].CompletedAt {
			return out[i].GuideID < out[j].GuideID
		}
		return out[i].CompletedAt < out[j].CompletedAt
	})
	return out, nil
}

func (s *Store) addGuideID(userID, guideID string) error {
	return s.kv.SetAtomicWithRetries(progressGuidesKey(userID), func(oldValue []byte) (any, error) {
		return appendUniqueID(oldValue, guideID)
	})
}

func (s *Store) addCompletion(userID string, c Completion) error {
	return s.kv.SetAtomicWithRetries(completionsKey(userID), func(oldValue []byte) (any, error) {
		return appendCompletion(oldValue, c)
	})
}

func (s *Store) addCompleter(userID string) error {
	return s.kv.SetAtomicWithRetries(completersKey, func(oldValue []byte) (any, error) {
		return appendUniqueID(oldValue, userID)
	})
}

func (s *Store) listGuideIDs(userID string) ([]string, error) {
	var ids []string
	if err := s.kv.Get(progressGuidesKey(userID), &ids); err != nil {
		return nil, err
	}
	return ids, nil
}

func (s *Store) listCompleters() ([]string, error) {
	var ids []string
	if err := s.kv.Get(completersKey, &ids); err != nil {
		return nil, err
	}
	return ids, nil
}

// ListForUser returns progress for all guides the user has started.
func (s *Store) ListForUser(userID string) (map[string]Record, error) {
	guideIDs, err := s.listGuideIDs(userID)
	if err != nil {
		return nil, err
	}
	out := map[string]Record{}
	for _, guideID := range guideIDs {
		if !validGuideID(guideID) {
			continue
		}
		rec, err := s.Get(userID, guideID)
		if err != nil {
			return nil, err
		}
		out[guideID] = rec
	}
	return out, nil
}

// ListCompletionsForUser returns only guides the user has ever completed.
func (s *Store) ListCompletionsForUser(userID string) ([]Completion, error) {
	var out []Completion
	if err := s.kv.Get(completionsKey(userID), &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []Completion{}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CompletedAt == out[j].CompletedAt {
			return out[i].GuideID < out[j].GuideID
		}
		return out[i].CompletedAt < out[j].CompletedAt
	})
	return out, nil
}

// EnsureIndexes backfills per-user indexes from existing progress keys once.
// Request paths never scan the full KV store after this has succeeded.
func (s *Store) EnsureIndexes() error {
	var done bool
	if err := s.kv.Get(indexesMigratedKey, &done); err != nil {
		return err
	}
	if done {
		return nil
	}
	if err := s.rebuildIndexes(); err != nil {
		return err
	}
	return s.kv.Set(indexesMigratedKey, true)
}

func (s *Store) forEachKey(fn func(key string) error) error {
	for page := 0; ; page++ {
		keys, err := s.kv.ListKeys(page, 100)
		if err != nil {
			return err
		}
		if len(keys) == 0 {
			break
		}
		for _, key := range keys {
			if err := fn(key); err != nil {
				return err
			}
		}
		if len(keys) < 100 {
			break
		}
	}
	return nil
}

func (s *Store) rebuildIndexes() error {
	type userAccum struct {
		guides      []string
		completions []Completion
	}
	users := map[string]*userAccum{}
	var statsKeys []string

	if err := s.forEachKey(func(key string) error {
		if strings.HasPrefix(key, statsKeyPrefix) {
			statsKeys = append(statsKeys, key)
			return nil
		}
		userID, guideID, ok := parseProgressKey(key)
		if !ok {
			return nil
		}
		var rec Record
		if err := s.kv.Get(key, &rec); err != nil {
			return err
		}
		acc := users[userID]
		if acc == nil {
			acc = &userAccum{}
			users[userID] = acc
		}
		acc.guides = append(acc.guides, guideID)
		if rec.EverCompleted {
			acc.completions = append(acc.completions, Completion{
				GuideID:     guideID,
				CompletedAt: rec.CompletedAt,
			})
		}
		return nil
	}); err != nil {
		return err
	}

	completers := make([]string, 0)
	for userID, acc := range users {
		if err := s.kv.Set(progressGuidesKey(userID), normalizeIDs(acc.guides)); err != nil {
			return err
		}
		if len(acc.completions) == 0 {
			continue
		}
		sort.Slice(acc.completions, func(i, j int) bool {
			if acc.completions[i].CompletedAt == acc.completions[j].CompletedAt {
				return acc.completions[i].GuideID < acc.completions[j].GuideID
			}
			return acc.completions[i].CompletedAt < acc.completions[j].CompletedAt
		})
		if err := s.kv.Set(completionsKey(userID), acc.completions); err != nil {
			return err
		}
		completers = append(completers, userID)
	}
	sort.Strings(completers)
	if err := s.kv.Set(completersKey, completers); err != nil {
		return err
	}
	for _, key := range statsKeys {
		if err := s.kv.Delete(key); err != nil {
			return err
		}
	}
	return nil
}
