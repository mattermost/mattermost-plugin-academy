// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/pluginapi"
)

const (
	keyPrefix      = "progress:"
	statsKeyPrefix = "stats:ever_completed:"
)

// Store reads/writes progress in the plugin KV store.
type Store struct {
	kv kvAPI
}

func NewStore(client *pluginapi.Client) *Store {
	return &Store{kv: pluginKV{kv: &client.KV}}
}

func progressKey(userID, guideID string) string {
	return keyPrefix + userID + ":" + guideID
}

func normalizeIDs(ids []string) []string {
	seen := make(map[string]struct{}, len(ids))
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

func containsAll(have []string, need []string) bool {
	if len(need) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(have))
	for _, id := range have {
		set[id] = struct{}{}
	}
	for _, id := range need {
		if _, ok := set[id]; !ok {
			return false
		}
	}
	return true
}

// Get returns progress for a user/guide, or an empty record if none exists.
func (s *Store) Get(userID, guideID string) (Record, error) {
	var rec Record
	if err := s.kv.Get(progressKey(userID, guideID), &rec); err != nil {
		return Record{}, err
	}
	// Unset JSON unmarshals to the zero value (V == 0). That empty record
	// means this user has no saved progress for the guide yet.
	if rec.V == 0 && rec.GuideID == "" && len(rec.CompletedModuleIDs) == 0 {
		return Record{
			V:                  1,
			GuideID:            guideID,
			CompletedModuleIDs: []string{},
		}, nil
	}
	if rec.CompletedModuleIDs == nil {
		rec.CompletedModuleIDs = []string{}
	}
	return rec, nil
}

// Put merges completed module IDs and updates ever-completed / indexes when appropriate.
// curriculum is the server-known yardstick; client-supplied module lists are ignored.
func (s *Store) Put(userID, guideID string, completedModuleIDs, curriculum []string) (Record, error) {
	key := progressKey(userID, guideID)
	now := time.Now().Unix()

	completed := filterKnownModules(guideID, completedModuleIDs)
	curriculum = filterKnownModules(guideID, curriculum)

	var next Record
	becameComplete := false

	err := s.kv.SetAtomicWithRetries(key, func(oldValue []byte) (any, error) {
		var prev Record
		if len(oldValue) > 0 {
			if err := json.Unmarshal(oldValue, &prev); err != nil {
				return nil, err
			}
		}

		merged := normalizeIDs(append(prev.CompletedModuleIDs, completed...))
		next = Record{
			V:                  1,
			GuideID:            guideID,
			CompletedModuleIDs: merged,
			UpdatedAt:          now,
			EverCompleted:      prev.EverCompleted,
			CompletedAt:        prev.CompletedAt,
		}

		if !prev.EverCompleted && containsAll(merged, curriculum) {
			next.EverCompleted = true
			next.CompletedAt = now
			becameComplete = true
		}

		return next, nil
	})
	if err != nil {
		return Record{}, err
	}

	if err := s.addGuideID(userID, guideID); err != nil {
		return Record{}, err
	}
	if becameComplete {
		if err := s.addCompletion(userID, Completion{GuideID: guideID, CompletedAt: next.CompletedAt}); err != nil {
			return Record{}, err
		}
		if err := s.addCompleter(userID); err != nil {
			return Record{}, err
		}
	}

	return next, nil
}

// CompletionsOverTime loads completions and aggregates them for the query.
func (s *Store) CompletionsOverTime(q CompletionsOverTimeQuery) (CompletionsOverTimeResult, error) {
	completions, err := s.ListAllCompletions()
	if err != nil {
		return CompletionsOverTimeResult{}, err
	}
	return AggregateCompletionsOverTime(completions, q, time.Now()), nil
}
