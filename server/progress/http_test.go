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

func serve(h *Handler, method, path, body, userID string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if userID != "" {
		r.Header.Set("Mattermost-User-Id", userID)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestPutRejectedForDisabledGuide(t *testing.T) {
	w := serve(newTestHandler(nil, stubPolicy{guideEnabled: false}), http.MethodPut, "/api/v1/progress/slash-commands", `{}`, "user1")

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "guide is not available")
}

func TestCompletionsRejectedWhenBadgesDisabled(t *testing.T) {
	w := serve(newTestHandler(nil, stubPolicy{badgesEnabled: false}), http.MethodGet, "/api/v1/users/abc123/completions", "", "user1")

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "profile badges are disabled")
}

func TestUnauthenticatedRequestsRejectedBeforePolicy(t *testing.T) {
	w := serve(newTestHandler(nil, stubPolicy{guideEnabled: true, badgesEnabled: true}), http.MethodGet, "/api/v1/progress", "", "")

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestPutThenGetProgress(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	body := `{"completedModuleIds":["chat"],"moduleIds":["chat","search"]}`

	put := serve(h, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1")
	require.Equal(t, http.StatusOK, put.Code)

	var saved Record
	require.NoError(t, json.Unmarshal(put.Body.Bytes(), &saved))
	assert.Equal(t, []string{"chat"}, saved.CompletedModuleIDs)
	assert.False(t, saved.EverCompleted)

	get := serve(h, http.MethodGet, "/api/v1/progress/ai-quick-start", "", "user1")
	require.Equal(t, http.StatusOK, get.Code)
	var loaded Record
	require.NoError(t, json.Unmarshal(get.Body.Bytes(), &loaded))
	assert.Equal(t, saved.CompletedModuleIDs, loaded.CompletedModuleIDs)
}

func TestListProgressAndCompletionsAfterFinish(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})
	body := `{"completedModuleIds":["chat","search"],"moduleIds":["chat","search"]}`

	put := serve(h, http.MethodPut, "/api/v1/progress/ai-quick-start", body, "user1")
	require.Equal(t, http.StatusOK, put.Code)

	list := serve(h, http.MethodGet, "/api/v1/progress", "", "user1")
	require.Equal(t, http.StatusOK, list.Code)
	var listed struct {
		Guides map[string]Record `json:"guides"`
	}
	require.NoError(t, json.Unmarshal(list.Body.Bytes(), &listed))
	require.Contains(t, listed.Guides, "ai-quick-start")
	assert.True(t, listed.Guides["ai-quick-start"].EverCompleted)

	completions := serve(h, http.MethodGet, "/api/v1/users/user1/completions", "", "viewer")
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

	badJSON := serve(h, http.MethodPut, "/api/v1/progress/ai-quick-start", `{`, "user1")
	assert.Equal(t, http.StatusBadRequest, badJSON.Code)

	badID := serve(h, http.MethodPut, "/api/v1/progress/Not-Valid", `{}`, "user1")
	assert.Equal(t, http.StatusBadRequest, badID.Code)
}

func TestProgressMethodNotAllowed(t *testing.T) {
	h := newTestHandler(newTestStore(newMemKV()), stubPolicy{guideEnabled: true, badgesEnabled: true})

	w := serve(h, http.MethodPost, "/api/v1/progress/ai-quick-start", `{}`, "user1")
	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)

	w = serve(h, http.MethodPost, "/api/v1/users/user1/completions", "", "user1")
	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}
