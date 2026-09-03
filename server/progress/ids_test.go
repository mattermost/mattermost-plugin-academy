// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidGuideID(t *testing.T) {
	assert.True(t, validGuideID("ai-quick-start"))
	assert.True(t, validGuideID("slash_command_1"))
	assert.False(t, validGuideID(""))
	assert.False(t, validGuideID("../x"))
	assert.False(t, validGuideID("AI"))
}

func TestValidUserID(t *testing.T) {
	assert.True(t, validUserID("abcdefghijklmnopqrstuvwxyz"))
	assert.True(t, validUserID("UserID123"))
	assert.False(t, validUserID(""))
	assert.False(t, validUserID("user-id"))
	assert.False(t, validUserID("../x"))
}
