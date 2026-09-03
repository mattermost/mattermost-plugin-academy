// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubPlatform struct {
	admins map[string]bool
	users  map[string]*model.User
}

func (s stubPlatform) HasPermissionTo(userID string, _ *model.Permission) bool {
	return s.admins[userID]
}

func (s stubPlatform) ListByUserIDs(ids []string) ([]*model.User, error) {
	out := make([]*model.User, 0, len(ids))
	for _, id := range ids {
		if u, ok := s.users[id]; ok {
			out = append(out, u)
		}
	}
	return out, nil
}

func (s stubPlatform) LogWarn(string, ...any) {}

func newAdminHandler(store *Store, plat Platform) *Handler {
	return &Handler{
		store:    store,
		policy:   stubPolicy{guideEnabled: true, badgesEnabled: true},
		platform: plat,
	}
}

func serveAdmin(h *Handler, method, path, userID string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	if userID != "" {
		r.Header.Set("Mattermost-User-Id", userID)
	}
	w := httptest.NewRecorder()
	h.ServeAdminHTTP(w, r)
	return w
}

func TestAdminUnauthorizedAndForbidden(t *testing.T) {
	h := newAdminHandler(newTestStore(newMemKV()), stubPlatform{admins: map[string]bool{"admin": true}})

	unauth := serveAdmin(h, http.MethodGet, "/api/v1/admin/stats/completions-over-time", "")
	assert.Equal(t, http.StatusUnauthorized, unauth.Code)

	forbidden := serveAdmin(h, http.MethodGet, "/api/v1/admin/stats/completions-over-time", "user1")
	assert.Equal(t, http.StatusForbidden, forbidden.Code)
}

func seedCompletedGuide(t *testing.T) *Store {
	t.Helper()
	kv := newMemKV()
	store := newTestStore(kv)
	require.NoError(t, kv.Set(progressKey("user1", "ai-quick-start"), Record{
		V:                  1,
		GuideID:            "ai-quick-start",
		CompletedModuleIDs: []string{"chat"},
		EverCompleted:      true,
		CompletedAt:        time.Now().Add(-time.Hour).Unix(),
	}))
	require.NoError(t, store.EnsureIndexes())
	return store
}

func TestAdminCompletionsOverTime(t *testing.T) {
	store := seedCompletedGuide(t)

	h := newAdminHandler(store, stubPlatform{admins: map[string]bool{"admin": true}})
	w := serveAdmin(h, http.MethodGet, "/api/v1/admin/stats/completions-over-time", "admin")
	require.Equal(t, http.StatusOK, w.Code)

	var result CompletionsOverTimeResult
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &result))
	var total int64
	for _, p := range result.Points {
		total += p.Count
	}
	assert.Equal(t, int64(1), total)
}

func TestAdminCompletionsExport(t *testing.T) {
	store := seedCompletedGuide(t)

	h := newAdminHandler(store, stubPlatform{
		admins: map[string]bool{"admin": true},
		users: map[string]*model.User{
			"user1": {Id: "user1", Username: "=cmd", Email: "a@example.com", FirstName: "Ada", LastName: "Lovelace"},
		},
	})
	w := serveAdmin(h, http.MethodGet, "/api/v1/admin/stats/completions.csv", "admin")
	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "text/csv")
	assert.Contains(t, w.Body.String(), "'=cmd")
	assert.Contains(t, w.Body.String(), "ai-quick-start")
	assert.NotContains(t, w.Body.String(), ",=cmd,")
}

func TestAdminUnknownRoute(t *testing.T) {
	h := newAdminHandler(newTestStore(newMemKV()), stubPlatform{admins: map[string]bool{"admin": true}})
	w := serveAdmin(h, http.MethodGet, "/api/v1/admin/nope", "admin")
	assert.Equal(t, http.StatusNotFound, w.Code)
}
