// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(kv *memKV) *Store {
	return &Store{kv: kv}
}

func TestPutIndexesWithoutScanning(t *testing.T) {
	kv := newMemKV()
	s := newTestStore(kv)

	_, err := s.Put("user1", "ai-quick-start", PutRequest{
		CompletedModuleIDs: []string{"chat"},
		ModuleIDs:          []string{"chat", "search"},
	})
	require.NoError(t, err)

	listCallsBefore := kv.listCalls
	records, err := s.ListForUser("user1")
	require.NoError(t, err)
	require.Contains(t, records, "ai-quick-start")
	assert.Equal(t, []string{"chat"}, records["ai-quick-start"].CompletedModuleIDs)
	assert.False(t, records["ai-quick-start"].EverCompleted)
	assert.Equal(t, listCallsBefore, kv.listCalls)

	completions, err := s.ListCompletionsForUser("user1")
	require.NoError(t, err)
	assert.Empty(t, completions)

	_, err = s.Put("user1", "ai-quick-start", PutRequest{
		CompletedModuleIDs: []string{"search"},
		ModuleIDs:          []string{"chat", "search"},
	})
	require.NoError(t, err)

	completions, err = s.ListCompletionsForUser("user1")
	require.NoError(t, err)
	require.Len(t, completions, 1)
	assert.Equal(t, "ai-quick-start", completions[0].GuideID)
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
