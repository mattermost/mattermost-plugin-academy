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
}

func (s stubPolicy) GuideEnabled(string) bool   { return s.guideEnabled }
func (s stubPolicy) ProfileBadgesEnabled() bool { return s.badgesEnabled }

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
	w := call(h.PutProgress, http.MethodPut, "/api/v1/progress/slash-commands", `{}`, "user1", map[string]string{"guideId": "slash-commands"})

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
	body := `{"completedModuleIds":["chat"],"moduleIds":["chat","search"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1", map[string]string{"guideId": "ai-quick-start"})
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"chat"}, saved.CompletedModuleIDs)
	assert.False(t, saved.EverCompleted)

	get := call(h.GetProgress, http.MethodGet, "/api/v1/progress/ai-quick-start", "", "user1", map[string]string{"guideId": "ai-quick-start"})
	require.Equal(t, http.StatusOK, get.Code)
	var loaded Record
	require.NoError(t, json.Unmarshal(get.Body.Bytes(), &loaded))
	assert.Equal(t, saved.CompletedModuleIDs, loaded.CompletedModuleIDs)
}

func TestListProgressAndCompletionsAfterFinish(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	body := `{"completedModuleIds":["chat","search"],"moduleIds":["chat","search"]}`

	put := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1", map[string]string{"guideId": "ai-quick-start"})
	require.Equal(t, http.StatusOK, put.Code)

	list := call(h.ListProgress, http.MethodGet, "/api/v1/progress", "", "user1", nil)
	require.Equal(t, http.StatusOK, list.Code)
	var listed struct {
		Guides map[string]Record `json:"guides"`
	}
	require.NoError(t, json.Unmarshal(list.Body.Bytes(), &listed))
	require.Contains(t, listed.Guides, "ai-quick-start")
	assert.True(t, listed.Guides["ai-quick-start"].EverCompleted)

	completions := call(h.ListUserCompletions, http.MethodGet, "/api/v1/users/user1/completions", "", "viewer", map[string]string{"userId": "user1"})
	require.Equal(t, http.StatusOK, completions.Code)
	var payload struct {
		Completions []Completion `json:"completions"`
	}
	require.NoError(t, json.Unmarshal(completions.Body.Bytes(), &payload))
	require.Len(t, payload.Completions, 1)
	assert.Equal(t, "ai-quick-start", payload.Completions[0].GuideID)
}

func TestPutInvalidJSONAndGuideID(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true})

	badJSON := call(h.PutProgress, http.MethodPut, "/api/v1/progress/ai-quick-start", `{`, "user1", map[string]string{"guideId": "ai-quick-start"})
	assert.Equal(t, http.StatusBadRequest, badJSON.Code)

	badID := call(h.PutProgress, http.MethodPut, "/api/v1/progress/Not-Valid", `{}`, "user1", map[string]string{"guideId": "Not-Valid"})
	assert.Equal(t, http.StatusBadRequest, badID.Code)
}
