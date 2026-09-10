// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeIDs(t *testing.T) {
	assert.Equal(t, []string{"a", "b"}, normalizeIDs([]string{" b ", "a", "b", "", "a"}))
}

func TestContainsAll(t *testing.T) {
	assert.False(t, containsAll([]string{"a"}, nil))
	assert.False(t, containsAll([]string{"a"}, []string{}))
	assert.True(t, containsAll([]string{"a", "b", "c"}, []string{"c", "a"}))
	assert.False(t, containsAll([]string{"a", "b"}, []string{"a", "c"}))
}

func TestIntersectIDs(t *testing.T) {
	assert.Equal(t, []string{"a", "c"}, intersectIDs([]string{"c", "a", "x"}, []string{"a", "b", "c"}))
	assert.Empty(t, intersectIDs([]string{"x"}, []string{"a"}))
	assert.Empty(t, intersectIDs([]string{"a"}, nil))
}

func TestPutRequestCompleteness(t *testing.T) {
	have := normalizeIDs([]string{"ai-chat", "summarize-threads"})
	need := normalizeIDs([]string{"summarize-threads", "ai-chat", "ai-search"})
	require.False(t, containsAll(have, need))

	have = normalizeIDs(append(have, "ai-search"))
	require.True(t, containsAll(have, need))
}

func TestPutUnknownGuideNeverCompletes(t *testing.T) {
	s := newTestStore(newMemKV())
	rec, err := s.Put("user1", "totally-fake", []string{"x"}, []string{"x"})
	require.NoError(t, err)
	assert.False(t, rec.EverCompleted)
	assert.Empty(t, rec.CompletedModuleIDs)
	assert.Zero(t, rec.CompletedAt)
}

func TestGetEmptyRecord(t *testing.T) {
	s := newTestStore(newMemKV())
	rec, err := s.Get("user1", "boards")
	require.NoError(t, err)
	assert.Equal(t, 1, rec.V)
	assert.Equal(t, "boards", rec.GuideID)
	assert.Empty(t, rec.CompletedModuleIDs)
	assert.False(t, rec.EverCompleted)
}

func newTestStore(kv *memKV) *Store {
	return &Store{kv: kv}
}

func TestPutIndexesWithoutScanning(t *testing.T) {
	kv := newMemKV()
	s := newTestStore(kv)

	basics := []string{"channels-and-sidebar", "composing", "formatting", "threads"}
	_, err := s.Put("user1", "mattermost-basics", []string{"composing"}, basics)
	require.NoError(t, err)

	listCallsBefore := kv.listCalls
	records, err := s.ListForUser("user1")
	require.NoError(t, err)
	require.Contains(t, records, "mattermost-basics")
	assert.Equal(t, []string{"composing"}, records["mattermost-basics"].CompletedModuleIDs)
	assert.False(t, records["mattermost-basics"].EverCompleted)
	assert.Equal(t, listCallsBefore, kv.listCalls)

	completions, err := s.ListCompletionsForUser("user1")
	require.NoError(t, err)
	assert.Empty(t, completions)

	_, err = s.Put("user1", "mattermost-basics", []string{"channels-and-sidebar", "formatting", "threads"}, basics)
	require.NoError(t, err)

	completions, err = s.ListCompletionsForUser("user1")
	require.NoError(t, err)
	require.Len(t, completions, 1)
	assert.Equal(t, "mattermost-basics", completions[0].GuideID)
	assert.Greater(t, completions[0].CompletedAt, int64(0))

	events, err := s.ListAllCompletions()
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, "user1", events[0].UserID)
	assert.Equal(t, listCallsBefore, kv.listCalls)
}

func TestEnsureIndexesBackfillsAndSkipsRescan(t *testing.T) {
	kv := newMemKV()
	s := newTestStore(kv)

	require.NoError(t, kv.Set(progressKey("userA", "boards"), Record{
		V:             1,
		GuideID:       "boards",
		EverCompleted: true,
		CompletedAt:   100,
	}))
	require.NoError(t, kv.Set(progressKey("userA", "playbooks"), Record{
		V:       1,
		GuideID: "playbooks",
	}))
	require.NoError(t, kv.Set(progressKey("userB", "boards"), Record{
		V:             1,
		GuideID:       "boards",
		EverCompleted: true,
		CompletedAt:   200,
	}))
	require.NoError(t, kv.Set(statsKeyPrefix+"boards", int64(2)))

	require.NoError(t, s.EnsureIndexes())
	require.NoError(t, s.EnsureIndexes())

	var leftover int64
	require.NoError(t, kv.Get(statsKeyPrefix+"boards", &leftover))
	assert.Equal(t, int64(0), leftover)

	listCalls := kv.listCalls
	records, err := s.ListForUser("userA")
	require.NoError(t, err)
	assert.Len(t, records, 2)
	assert.True(t, records["boards"].EverCompleted)

	completions, err := s.ListCompletionsForUser("userA")
	require.NoError(t, err)
	require.Len(t, completions, 1)
	assert.Equal(t, "boards", completions[0].GuideID)

	events, err := s.ListAllCompletions()
	require.NoError(t, err)
	assert.Len(t, events, 2)
	assert.Equal(t, listCalls, kv.listCalls)
}

func TestParseProgressKey(t *testing.T) {
	userID, guideID, ok := parseProgressKey("progress:user1:ai-quick-start")
	assert.True(t, ok)
	assert.Equal(t, "user1", userID)
	assert.Equal(t, "ai-quick-start", guideID)

	_, _, ok = parseProgressKey("completions:user1")
	assert.False(t, ok)
	_, _, ok = parseProgressKey("progress:")
	assert.False(t, ok)
}

func TestAppendUniqueID(t *testing.T) {
	ids, err := appendUniqueID(nil, "b")
	require.NoError(t, err)
	ids, err = appendUniqueID(mustJSON(t, ids), "a")
	require.NoError(t, err)
	ids, err = appendUniqueID(mustJSON(t, ids), "a")
	require.NoError(t, err)
	assert.Equal(t, []string{"a", "b"}, ids)
}

func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	raw, err := marshalKVValue(v)
	require.NoError(t, err)
	return raw
}
