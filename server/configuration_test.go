// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTruthyUnmarshal(t *testing.T) {
	cases := []struct {
		raw     string
		want    Truthy
		wantErr bool
	}{
		{`true`, true, false},
		{`false`, false, false},
		{`"true"`, true, false},
		{`"false"`, false, false},
		{`"TRUE"`, true, false},
		{`""`, false, false},
		{`"nope"`, false, true},
	}
	for _, tc := range cases {
		var got Truthy
		err := json.Unmarshal([]byte(tc.raw), &got)
		if tc.wantErr {
			require.Error(t, err, tc.raw)
			continue
		}
		require.NoError(t, err, tc.raw)
		assert.Equal(t, tc.want, got, tc.raw)
	}
}

func TestTestModeEnabledDefaults(t *testing.T) {
	assert.False(t, (*configuration)(nil).testModeEnabled())
	assert.False(t, (&configuration{}).testModeEnabled())
	assert.True(t, (&configuration{UserAccessConfig: &UserAccessConfig{TestMode: true}}).testModeEnabled())
}

func TestProfileBadgesEnabledDefaults(t *testing.T) {
	assert.True(t, (*configuration)(nil).profileBadgesEnabled())
	assert.True(t, (&configuration{}).profileBadgesEnabled())

	on := Truthy(true)
	off := Truthy(false)
	assert.True(t, (&configuration{EnableProfileBadges: &on}).profileBadgesEnabled())
	assert.False(t, (&configuration{EnableProfileBadges: &off}).profileBadgesEnabled())
}

func TestLoadEnableProfileBadgesFromMattermostDefaultString(t *testing.T) {
	// Mattermost LoadPluginConfiguration lowercases keys and uses schema default strings.
	raw := `{"enableprofilebadges":"true"}`
	cfg := new(configuration)
	require.NoError(t, json.Unmarshal([]byte(raw), cfg))
	require.NotNil(t, cfg.EnableProfileBadges)
	assert.True(t, cfg.profileBadgesEnabled())
}

func TestUserAccessConfigDefaults(t *testing.T) {
	assert.Equal(t, UserAccessLevelAll, (*configuration)(nil).userAccess().UserAccessLevel)
	assert.Equal(t, UserAccessLevelAll, (&configuration{}).userAccess().UserAccessLevel)
}

func TestUserAccessConfigUnmarshal(t *testing.T) {
	cases := []struct {
		raw  string
		want UserAccessConfig
	}{
		{`null`, defaultUserAccessConfig()},
		{`""`, defaultUserAccessConfig()},
		{`{"userAccessLevel":1,"userIDs":["u1"],"teamIDs":["t1"]}`, UserAccessConfig{
			UserAccessLevel:  UserAccessLevelAllow,
			UserIDs:          []string{"u1"},
			TeamIDs:          []string{"t1"},
			DisabledGuideIDs: []string{},
		}},
		{`"{\"userAccessLevel\":2,\"userIDs\":[\"u2\"],\"teamIDs\":[]}"`, UserAccessConfig{
			UserAccessLevel:  UserAccessLevelBlock,
			UserIDs:          []string{"u2"},
			TeamIDs:          []string{},
			DisabledGuideIDs: []string{},
		}},
		{`{"userAccessLevel":0,"disabledGuideIDs":["ai-quick-start"],"testMode":true}`, UserAccessConfig{
			UserAccessLevel:  UserAccessLevelAll,
			UserIDs:          []string{},
			TeamIDs:          []string{},
			DisabledGuideIDs: []string{"ai-quick-start"},
			TestMode:         true,
		}},
	}
	for _, tc := range cases {
		var got UserAccessConfig
		require.NoError(t, json.Unmarshal([]byte(tc.raw), &got), tc.raw)
		assert.Equal(t, tc.want, got, tc.raw)
	}
}

func TestLoadUserAccessConfigFromPluginJSON(t *testing.T) {
	raw := `{"useraccessconfig":{"userAccessLevel":1,"userIDs":["abc"],"teamIDs":["team1"],"disabledGuideIDs":["g1"]}}`
	cfg := new(configuration)
	require.NoError(t, json.Unmarshal([]byte(raw), cfg))
	require.NotNil(t, cfg.UserAccessConfig)
	assert.Equal(t, UserAccessLevelAllow, cfg.userAccess().UserAccessLevel)
	assert.Equal(t, []string{"abc"}, cfg.userAccess().UserIDs)
	assert.Equal(t, []string{"team1"}, cfg.userAccess().TeamIDs)
	assert.Equal(t, []string{"g1"}, cfg.disabledGuideIDs())
	assert.False(t, cfg.guideEnabled("g1"))
	assert.True(t, cfg.guideEnabled("other"))
}
