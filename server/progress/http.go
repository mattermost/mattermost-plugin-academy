// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/mattermost/mattermost/server/public/pluginapi"

	"github.com/mattermost/mattermost-plugin-academy/server/access"
)

// Policy exposes the plugin configuration decisions handlers honour, so this
// package does not reach into plugin configuration itself.
type Policy interface {
	GuideEnabled(guideID string) bool
	ProfileBadgesEnabled() bool
}

// Handler serves progress HTTP APIs. Authentication and access gating are
// performed by middleware in the access package before any method runs;
// handlers read the validated caller from request context.
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

func (h *Handler) ListProgress(w http.ResponseWriter, r *http.Request) {
	records, err := h.store.ListForUser(access.UserFromContext(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list progress")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"guides": records})
}

func (h *Handler) GetProgress(w http.ResponseWriter, r *http.Request) {
	guideID := r.PathValue("guideId")
	if !validGuideID(guideID) {
		writeError(w, http.StatusBadRequest, "invalid guide id")
		return
	}

	rec, err := h.store.Get(access.UserFromContext(r.Context()), guideID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get progress")
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

// PutProgress handles PUT /api/v1/progress/{guideId}. Writes to a disabled
// guide are refused; reads stay allowed so an open tab degrades quietly.
func (h *Handler) PutProgress(w http.ResponseWriter, r *http.Request) {
	guideID := r.PathValue("guideId")
	if !validGuideID(guideID) {
		writeError(w, http.StatusBadRequest, "invalid guide id")
		return
	}
	if !h.policy.GuideEnabled(guideID) {
		writeError(w, http.StatusForbidden, "guide is not available")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxRequestBodyBytes)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	var req PutRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := validatePutRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	rec, err := h.store.Put(access.UserFromContext(r.Context()), guideID, req)
	if err != nil {
		if errors.Is(err, errTooManyStoredModuleIDs) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to save progress")
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

// ListUserCompletions handles GET /api/v1/users/{userId}/completions.
// Gated on ProfileBadgesEnabled so disabling badges closes the data too,
// not just the UI.
func (h *Handler) ListUserCompletions(w http.ResponseWriter, r *http.Request) {
	if !h.policy.ProfileBadgesEnabled() {
		writeError(w, http.StatusForbidden, "profile badges are disabled")
		return
	}

	targetUserID := r.PathValue("userId")
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
