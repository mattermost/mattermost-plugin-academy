// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	_ "embed"
	"encoding/json"
)

//go:embed curriculum.json
var curriculumJSON []byte

type curriculumModule struct {
	ID string `json:"id"`
	// RequiresPlugins lists plugins that must all be running for this module
	// to count toward completion (unless Test Mode is on).
	RequiresPlugins []string `json:"requiresPlugins"`
}

type curriculumGuide struct {
	// RequiresPlugins lists plugins that must all be running for PUT progress
	// on this guide (unless Test Mode is on). Matches webapp visibility.
	RequiresPlugins []string           `json:"requiresPlugins"`
	Modules         []curriculumModule `json:"modules"`
}

// catalog is the server-known set of guides and their modules. Completion is
// measured against it, not against whatever module list the client sent.
var catalog map[string]curriculumGuide

func init() {
	if err := json.Unmarshal(curriculumJSON, &catalog); err != nil {
		panic("progress: invalid curriculum.json: " + err.Error())
	}
}

// KnownGuide reports whether guideID is in the shipped catalog.
func KnownGuide(guideID string) bool {
	_, ok := catalog[guideID]
	return ok
}

// GuidePluginsMet reports whether the guide's required plugins are running.
// Unknown guides are false. ignorePluginReqs (test mode) is always true.
// A nil pluginEnabled callback matches the webapp fail-open.
func GuidePluginsMet(guideID string, pluginEnabled func(string) bool, ignorePluginReqs bool) bool {
	spec, ok := catalog[guideID]
	if !ok {
		return false
	}
	if ignorePluginReqs {
		return true
	}
	return meetsPluginReqs(spec.RequiresPlugins, pluginEnabled)
}

// EffectiveCurriculum is the module IDs that count toward finishing a guide.
// Plugin-gated modules are omitted unless every required plugin is running, or
// ignorePluginReqs is set (test mode), so a guide stays completable on a server
// that does not run the gated plugin. A nil pluginEnabled callback matches the
// webapp fail-open: gated modules stay in the list.
func EffectiveCurriculum(guideID string, pluginEnabled func(string) bool, ignorePluginReqs bool) ([]string, bool) {
	spec, ok := catalog[guideID]
	if !ok {
		return nil, false
	}
	out := make([]string, 0, len(spec.Modules))
	for _, m := range spec.Modules {
		if ignorePluginReqs || meetsPluginReqs(m.RequiresPlugins, pluginEnabled) {
			out = append(out, m.ID)
		}
	}
	return out, true
}

func meetsPluginReqs(need []string, pluginEnabled func(string) bool) bool {
	if len(need) == 0 {
		return true
	}
	if pluginEnabled == nil {
		return true
	}
	for _, id := range need {
		if !pluginEnabled(id) {
			return false
		}
	}
	return true
}
