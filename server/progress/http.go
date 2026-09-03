// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mattermost/mattermost/server/public/pluginapi"
)

// Policy exposes the plugin configuration decisions the handler must honour,
// so this package does not need to reach into plugin configuration itself.
type Policy interface {
	GuideEnabled(guideID string) bool
	ProfileBadgesEnabled() bool
}

// Handler serves progress HTTP APIs under /api/v1/progress.
type Handler struct {
	store    *Store
	policy   Policy
	platform Platform
}

func NewHandler(store *Store, policy Policy, client *pluginapi.Client) *Handler {
	h := &Handler{store: store, policy: policy}
	if client != nil {
		h.platform = pluginPlatform{client: client}
	}
	return h
}

func userIDFromRequest(r *http.Request) string {
	return r.Header.Get("Mattermost-User-Id")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (h *Handler) logWarn(message string, keyValuePairs ...any) {
	if h.platform != nil {
		h.platform.LogWarn(message, keyValuePairs...)
	}
}

// ServeHTTP handles:
//
//	GET  /api/v1/progress
//	GET  /api/v1/progress/{guideId}
//	PUT  /api/v1/progress/{guideId}
//	GET  /api/v1/users/{userId}/completions
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequest(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/v1/users/") {
		h.serveUserCompletions(w, r)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/progress")
	path = strings.Trim(path, "/")

	switch {
	case path == "" && r.Method == http.MethodGet:
		records, err := h.store.ListForUser(userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list progress")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"guides": records})
		return

	case path != "" && !strings.Contains(path, "/"):
		guideID := path
		if !validGuideID(guideID) {
			writeError(w, http.StatusBadRequest, "invalid guide id")
			return
		}

		switch r.Method {
		case http.MethodGet:
			rec, err := h.store.Get(userID, guideID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to get progress")
				return
			}
			writeJSON(w, http.StatusOK, rec)
			return

		case http.MethodPut:
			// Reads of a guide disabled after the fact stay allowed so an
			// open tab degrades quietly, but writes must not record progress
			// for a guide an admin has turned off.
			if !h.policy.GuideEnabled(guideID) {
				writeError(w, http.StatusForbidden, "guide is not available")
				return
			}

			var req PutRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "invalid json")
				return
			}
			rec, err := h.store.Put(userID, guideID, req)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to save progress")
				return
			}
			writeJSON(w, http.StatusOK, rec)
			return

		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
	}

	writeError(w, http.StatusNotFound, "not found")
}

// serveUserCompletions handles GET /api/v1/users/{userId}/completions.
//
// This reports another user's finished guides so profile popovers can show
// badges, so turning badges off has to close the endpoint too. Otherwise the
// setting only hides the UI while the data stays readable.
func (h *Handler) serveUserCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if !h.policy.ProfileBadgesEnabled() {
		writeError(w, http.StatusForbidden, "profile badges are disabled")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[1] != "completions" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	targetUserID := parts[0]
	if !validUserID(targetUserID) {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	completions, err := h.store.ListCompletionsForUser(targetUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list completions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"completions": completions})
}
