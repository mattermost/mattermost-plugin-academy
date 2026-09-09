// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckUserAccessModes(t *testing.T) {
	p := &Plugin{}

	t.Run("all allows anyone", func(t *testing.T) {
		cfg := defaultUserAccessConfig()
		p.setConfiguration(&configuration{UserAccessConfig: &cfg})
		require.NoError(t, p.checkUserAccess("user1"))
	})

	t.Run("allow list by user id", func(t *testing.T) {
		cfg := UserAccessConfig{
			UserAccessLevel: UserAccessLevelAllow,
			UserIDs:         []string{"allowed"},
			TeamIDs:         []string{},
		}
		p.setConfiguration(&configuration{UserAccessConfig: &cfg})
		require.NoError(t, p.checkUserAccess("allowed"))
		err := p.checkUserAccess("other")
		require.Error(t, err)
		assert.True(t, errors.Is(err, errUsageRestriction))
	})

	t.Run("block list by user id", func(t *testing.T) {
		cfg := UserAccessConfig{
			UserAccessLevel: UserAccessLevelBlock,
			UserIDs:         []string{"blocked"},
			TeamIDs:         []string{},
		}
		p.setConfiguration(&configuration{UserAccessConfig: &cfg})
		err := p.checkUserAccess("blocked")
		require.Error(t, err)
		assert.True(t, errors.Is(err, errUsageRestriction))
		require.NoError(t, p.checkUserAccess("other"))
	})

	t.Run("none denies everyone", func(t *testing.T) {
		cfg := UserAccessConfig{
			UserAccessLevel: UserAccessLevelNone,
			UserIDs:         []string{},
			TeamIDs:         []string{},
		}
		p.setConfiguration(&configuration{UserAccessConfig: &cfg})
		err := p.checkUserAccess("anyone")
		require.Error(t, err)
		assert.True(t, errors.Is(err, errUsageRestriction))
	})
}
