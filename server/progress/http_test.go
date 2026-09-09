// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
	plugins       map[string]bool
}

func (s stubPolicy) GuideEnabled(string) bool   { return s.guideEnabled }
func (s stubPolicy) ProfileBadgesEnabled() bool { return s.badgesEnabled }
func (s stubPolicy) TestMode() bool             { return s.testMode }
func (s stubPolicy) PluginEnabled(id string) bool {
	if s.plugins == nil {
		return true
	}
	return s.plugins[id]
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

func TestPutRejectedForUnknownGuide(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})
	body := `{"completedModuleIds":["x"],"moduleIds":["x"]}`

	w := call(h.PutProgress, http.MethodPut, "/api/v1/progress/totally-fake", body, "user1", map[string]string{"guideId": "totally-fake"})
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "unknown guide")
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

func TestPutIgnoresClientCurriculumAndDropsUnknownModules(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	// Client claims a one-module curriculum and a forged extra ID. Neither
	// should mark the guide complete or be stored.
	body := `{"completedModuleIds":["composing","forged"],"moduleIds":["composing"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/mattermost-basics", body, "user1", map[string]string{"guideId": "mattermost-basics"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"composing"}, saved.CompletedModuleIDs)
	assert.False(t, saved.EverCompleted)
	assert.Zero(t, saved.CompletedAt)
}

func TestPutCompletesAgainstServerCurriculumMinusInactivePlugins(t *testing.T) {
	body := `{"completedModuleIds":["ai-chat","summarize-threads","summarize-channels","ai-search","rewrite-with-ai","custom-agents"]}`

	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{
		guideEnabled:  true,
		badgesEnabled: true,
		plugins:       map[string]bool{"com.mattermost.calls": false},
	})
	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1", map[string]string{"guideId": "ai-quick-start"})
	require.Equal(t, http.StatusOK, put.Code)
	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.True(t, saved.EverCompleted)
	assert.NotContains(t, saved.CompletedModuleIDs, "summarize-calls")

	h = newTestHandler(newTestStore(newMemKV()), stubPolicy{
		guideEnabled:  true,
		badgesEnabled: true,
		plugins:       map[string]bool{"com.mattermost.calls": true},
	})
	put = call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1", map[string]string{"guideId": "ai-quick-start"})
	require.Equal(t, http.StatusOK, put.Code)
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.False(t, saved.EverCompleted)
}

func TestPutInvalidJSONAndGuideID(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})

	badJSON := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", `{`, "user1", map[string]string{"guideId": "ai-quick-start"})
	assert.Equal(t, http.StatusBadRequest, badJSON.Code)

	badID := call(h.PutProgress, http.MethodPut, "/api/v1/progress/Not-Valid", `{}`, "user1", map[string]string{"guideId": "Not-Valid"})
	assert.Equal(t, http.StatusBadRequest, badID.Code)
}
