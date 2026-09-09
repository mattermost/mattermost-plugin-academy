// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import "net/http"

func (h *Handler) CompletionsOverTime(w http.ResponseWriter, r *http.Request) {
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
