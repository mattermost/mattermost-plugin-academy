// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A module ID that fails validGuideID would pass the webapp drift check, which
// only tests the charset of guide IDs, and then be rejected on every save. The
// module could never be completed and nothing else would catch it.
func TestCatalogLoadsAndValidatesIDs(t *testing.T) {
	require.NotEmpty(t, catalog)
	for guideID, spec := range catalog {
		assert.True(t, validGuideID(guideID), "guide id %q", guideID)
		assert.NotEmpty(t, spec.Modules, "guide %q has no modules", guideID)
		for _, mod := range spec.Modules {
			assert.True(t, validGuideID(mod.ID), "module id %q in guide %q", mod.ID, guideID)
		}
	}
}
