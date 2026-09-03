// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserIsAdmin(t *testing.T) {
	t.Run("false when client is not initialised", func(t *testing.T) {
		p := &Plugin{}
		assert.False(t, p.userIsAdmin("user1"))
	})
}
