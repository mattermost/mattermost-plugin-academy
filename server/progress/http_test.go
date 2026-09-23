// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost-plugin-academy/server/access"
)

type stubPolicy struct {
	guideEnabled  bool
	badgesEnabled bool
	testMode      bool
	// disabledPlugins is empty by default, so a stub policy runs every plugin
	// a guide asks for unless a test says otherwise.
	disabledPlugins []string
}

func (s stubPolicy) GuideEnabled(string) bool   { return s.guideEnabled }
func (s stubPolicy) ProfileBadgesEnabled() bool { return s.badgesEnabled }
func (s stubPolicy) TestMode() bool             { return s.testMode }
func (s stubPolicy) PluginEnabled(pluginID string) bool {
	return !slices.Contains(s.disabledPlugins, pluginID)
}

func newTestHandler(store *Store, policy Policy) *Handler {
	return &Handler{store: store, policy: policy}
}

// call invokes a handler with a pre-authenticated context and path values,
// standing in for what the router middleware injects in production.
func call(h func(http.ResponseWriter, *http.Request), method, path, body, userID string, pathValues map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if userID != "" {
		r = r.WithContext(access.WithUser(r.Context(), userID))
	}
	for k, v := range pathValues {
		r.SetPathValue(k, v)
	}
	w := httptest.NewRecorder()
	h(w, r)
	return w
}

func TestPutRejectedForDisabledGuide(t *testing.T) {
	h := newTestHandler(nil, stubPolicy{guideEnabled: false})
	w := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", `{}`, "user1", map[string]string{"guideId": "mattermost-basics"})

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "guide is not available")
}

func TestCompletionsRejectedWhenBadgesDisabled(t *testing.T) {
	h := newTestHandler(nil, stubPolicy{badgesEnabled: false})
	w := call(h.ListUserCompletions, http.MethodGet, "/api/v1/users/abc123/completions", "", "user1", map[string]string{"userId": "abc123"})

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "profile badges are disabled")
}

func TestPutThenGetProgress(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	body := `{"completedModuleIds":["composing"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", body, "user1", map[string]string{"guideId": "mattermost-basics"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"composing"}, saved.CompletedModuleIDs)
	assert.False(t, saved.EverCompleted)

	get := call(h.GetProgress, http.MethodGet, "/api/v1/progress/mattermost-basics", "", "user1", map[string]string{"guideId": "mattermost-basics"})
	require.Equal(t, http.StatusOK, get.Code)
	var loaded Record
	require.NoError(t, json.Unmarshal(get.Body.Bytes(), &loaded))
	assert.Equal(t, saved.CompletedModuleIDs, loaded.CompletedModuleIDs)
}

func TestListProgressAndCompletionsAfterFinish(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	body := `{"completedModuleIds":["channels-and-sidebar","composing","formatting","threads"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", body, "user1", map[string]string{"guideId": "mattermost-basics"})
	require.Equal(t, http.StatusOK, put.Code)

	list := call(h.ListProgress, http.MethodGet, "/api/v1/progress", "", "user1", nil)
	require.Equal(t, http.StatusOK, list.Code)
	var listed struct {
		Guides map[string]Record `json:"guides"`
	}
	require.NoError(t, json.Unmarshal(list.Body.Bytes(), &listed))
	require.Contains(t, listed.Guides, "mattermost-basics")
	assert.True(t, listed.Guides["mattermost-basics"].EverCompleted)

	completions := call(h.ListUserCompletions, http.MethodGet, "/api/v1/users/user1/completions", "", "viewer", map[string]string{"userId": "user1"})
	require.Equal(t, http.StatusOK, completions.Code)
	var payload struct {
		Completions []Completion `json:"completions"`
	}
	require.NoError(t, json.Unmarshal(completions.Body.Bytes(), &payload))
	require.Len(t, payload.Completions, 1)
	assert.Equal(t, "mattermost-basics", payload.Completions[0].GuideID)
}

func TestPutInvalidJSONAndGuideID(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})

	badJSON := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", `{`, "user1", map[string]string{"guideId": "mattermost-basics"})
	assert.Equal(t, http.StatusBadRequest, badJSON.Code)

	badID := call(h.PutProgress, http.MethodPut, "/api/v1/progress/Not-Valid", `{}`, "user1", map[string]string{"guideId": "Not-Valid"})
	assert.Equal(t, http.StatusBadRequest, badID.Code)
}

// The MM-70621 attack: a caller claims completion with a module list it made
// up. The server keeps only its own modules, so the fake IDs never land and
// the shrunken list cannot stand in for the real yardstick.
func TestPutIgnoresModulesOutsideServerCurriculum(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})
	body := `{"completedModuleIds":["composing","forged","totally-fake"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", body, "user1", map[string]string{"guideId": "mattermost-basics"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"composing"}, saved.CompletedModuleIDs)
	assert.False(t, saved.EverCompleted)
}

func TestPutRejectsUnknownGuide(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})
	w := call(h.PutProgress, http.MethodPut, "/api/v1/progress/totally-fake", `{"completedModuleIds":["x"]}`, "user1", map[string]string{"guideId": "totally-fake"})

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "unknown guide")
}

func TestPutRejectedWhenGuidePluginIsOff(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, disabledPlugins: []string{"mattermost-ai"}})
	w := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", `{"completedModuleIds":["ai-chat"]}`, "user1", map[string]string{"guideId": "ai-quick-start"})

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "guide is not available")
}

// A module gated behind an inactive plugin drops out of the yardstick, so the
// guide stays finishable rather than becoming permanently incomplete.
func TestGuideCompletesWithoutModulesGatedByInactivePlugin(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, disabledPlugins: []string{"mattermost-ai"}})
	body := `{"completedModuleIds":["search-basics","search-filters","precision","file-search","channels-mentions-saved"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/advanced-search", body, "user1", map[string]string{"guideId": "advanced-search"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.True(t, saved.EverCompleted)
	assert.NotContains(t, saved.CompletedModuleIDs, "semantic-search")
}

// The mirror of the case above: while the plugin is off, its module is not a
// valid completion, so it cannot be banked for a later plugin-on completion.
func TestPutDropsModuleGatedByInactivePlugin(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, disabledPlugins: []string{"mattermost-ai"}})
	body := `{"completedModuleIds":["search-basics","semantic-search"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/advanced-search", body, "user1", map[string]string{"guideId": "advanced-search"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"search-basics"}, saved.CompletedModuleIDs)
}

func TestTestModeIgnoresPluginGates(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, testMode: true, disabledPlugins: []string{"mattermost-ai"}})
	body := `{"completedModuleIds":["search-basics","semantic-search"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/advanced-search", body, "user1", map[string]string{"guideId": "advanced-search"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Contains(t, saved.CompletedModuleIDs, "semantic-search")
}
