// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"net/http"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
)

// ServeAdminHTTP handles system-admin stats routes under /api/v1/admin/.
func (h *Handler) ServeAdminHTTP(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequest(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if h.platform == nil || !h.platform.HasPermissionTo(userID, model.PermissionManageSystem) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/")
	path = strings.Trim(path, "/")

	switch {
	case path == "stats/completions-over-time" && r.Method == http.MethodGet:
		h.serveCompletionsOverTime(w, r)
	case path == "stats/completions.csv" && r.Method == http.MethodGet:
		h.serveCompletionsExport(w, r)
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (h *Handler) serveCompletionsOverTime(w http.ResponseWriter, r *http.Request) {
	q, err := parseCompletionsQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.store.CompletionsOverTime(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load completions")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
