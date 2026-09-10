// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"strconv"
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

func TestValidatePutRequest(t *testing.T) {
	assert.NoError(t, validatePutRequest(PutRequest{
		CompletedModuleIDs: []string{"chat"},
		ModuleIDs:          []string{"chat", "search"},
	}))
	assert.ErrorIs(t, validatePutRequest(PutRequest{
		CompletedModuleIDs: []string{"../x"},
		ModuleIDs:          []string{"chat"},
	}), errInvalidModuleID)
	assert.ErrorIs(t, validatePutRequest(PutRequest{
		CompletedModuleIDs: []string{"chat"},
		ModuleIDs:          []string{"AI"},
	}), errInvalidModuleID)
	assert.ErrorIs(t, validatePutRequest(PutRequest{
		CompletedModuleIDs: []string{""},
	}), errInvalidModuleID)

	tooMany := make([]string, maxRequestModuleIDs+1)
	for i := range tooMany {
		tooMany[i] = "m" + strconv.Itoa(i)
	}
	assert.ErrorIs(t, validatePutRequest(PutRequest{CompletedModuleIDs: tooMany}), errTooManyModuleIDs)
	assert.ErrorIs(t, validatePutRequest(PutRequest{ModuleIDs: tooMany}), errTooManyModuleIDs)

	atCap := tooMany[:maxRequestModuleIDs]
	assert.NoError(t, validatePutRequest(PutRequest{CompletedModuleIDs: atCap, ModuleIDs: atCap}))
}
