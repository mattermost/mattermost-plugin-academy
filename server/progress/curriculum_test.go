// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestKnownGuide(t *testing.T) {
	assert.True(t, KnownGuide("mattermost-basics"))
	assert.True(t, KnownGuide("ai-quick-start"))
	assert.False(t, KnownGuide("totally-fake"))
	assert.False(t, KnownGuide(""))
}

func TestCatalogIDsAreValidAndNonEmpty(t *testing.T) {
	require.NotEmpty(t, catalog)
	for id, spec := range catalog {
		assert.True(t, validGuideID(id), "guide %q", id)
		require.NotEmpty(t, spec.Modules, "guide %q", id)
		seen := map[string]struct{}{}
		for _, m := range spec.Modules {
			assert.NotEmpty(t, m.ID, "guide %q", id)
			_, dup := seen[m.ID]
			assert.False(t, dup, "guide %q duplicate module %q", id, m.ID)
			seen[m.ID] = struct{}{}
		}
	}
}

func TestEffectiveCurriculumOmitsInactivePlugins(t *testing.T) {
	all, ok := EffectiveCurriculum("ai-quick-start", nil, false)
	require.True(t, ok)
	assert.Contains(t, all, "summarize-calls")

	none := func(string) bool { return false }
	withoutCalls, ok := EffectiveCurriculum("ai-quick-start", none, false)
	require.True(t, ok)
	assert.NotContains(t, withoutCalls, "summarize-calls")
	assert.Contains(t, withoutCalls, "ai-chat")

	callsOn := func(id string) bool { return id == "com.mattermost.calls" }
	withCalls, ok := EffectiveCurriculum("ai-quick-start", callsOn, false)
	require.True(t, ok)
	assert.Contains(t, withCalls, "summarize-calls")

	testMode, ok := EffectiveCurriculum("ai-quick-start", none, true)
	require.True(t, ok)
	assert.Equal(t, all, testMode)

	_, ok = EffectiveCurriculum("totally-fake", nil, false)
	assert.False(t, ok)
}

func TestFilterKnownModules(t *testing.T) {
	assert.Equal(t, []string{"composing", "threads"}, filterKnownModules(
		"mattermost-basics",
		[]string{"threads", "forged", "composing", "threads"},
	))
	assert.Nil(t, filterKnownModules("totally-fake", []string{"x"}))
}
