// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
)

const (
	maxCompletionsOverTimePoints = 4096
	maxCompletionsToFuture       = 24 * time.Hour
)

// completionsBucketSeconds is the shortest a bucket can be. A month counts as
// 28 days so the range cap never over-estimates how many buckets fit.
func completionsBucketSeconds(bucket string) int64 {
	switch bucket {
	case "week":
		return 7 * 24 * 60 * 60
	case "month":
		return 28 * 24 * 60 * 60
	default:
		return 24 * 60 * 60
	}
}

// readCompletionsParams pulls the filters off the URL without judging them.
// Validation lives on CompletionsOverTimeQuery.
func readCompletionsParams(r *http.Request) (CompletionsOverTimeQuery, error) {
	bucket, bucketErr := normalizeBucket(r.URL.Query().Get("bucket"))
	if bucketErr != nil {
		return CompletionsOverTimeQuery{}, bucketErr
	}
	q := CompletionsOverTimeQuery{Bucket: bucket}

	if guides := strings.TrimSpace(r.URL.Query().Get("guides")); guides != "" {
		for id := range strings.SplitSeq(guides, ",") {
			id = strings.TrimSpace(id)
			if id == "" {
				continue
			}
			q.GuideIDs = append(q.GuideIDs, id)
		}
	}

	fromRaw := strings.TrimSpace(r.URL.Query().Get("from"))
	toRaw := strings.TrimSpace(r.URL.Query().Get("to"))

	if fromRaw != "" {
		from, err := strconv.ParseInt(fromRaw, 10, 64)
		if err != nil || from < 0 {
			return q, fmt.Errorf("invalid from")
		}
		q.From = &from
	}
	if toRaw != "" {
		to, err := strconv.ParseInt(toRaw, 10, 64)
		if err != nil || to < 0 {
			return q, fmt.Errorf("invalid to")
		}
		q.To = &to
	}

	return q, nil
}

// parseCompletionsQuery reads the filters the CSV export understands.
func parseCompletionsQuery(r *http.Request) (CompletionsOverTimeQuery, error) {
	q, err := readCompletionsParams(r)
	if err != nil {
		return q, err
	}
	return q, q.IsValid(time.Now())
}

// parseCompletionsChartQuery also enforces the bucketed-series cap.
func parseCompletionsChartQuery(r *http.Request) (CompletionsOverTimeQuery, error) {
	q, err := readCompletionsParams(r)
	if err != nil {
		return q, err
	}
	return q, q.IsValidForChart(time.Now())
}

// sanitizeCSVCell prefixes formula-like values so Excel will not execute them.
func sanitizeCSVCell(s string) string {
	if s == "" {
		return s
	}
	switch s[0] {
	case '=', '+', '-', '@', '\t', '\r':
		return "'" + s
	default:
		return s
	}
}

func (h *Handler) CompletionsExport(w http.ResponseWriter, r *http.Request) {
	q, err := parseCompletionsQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	events, err := h.store.ListAllCompletions()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load completions")
		return
	}

	filtered := FilterCompletionEvents(events, q, time.Now())
	sort.Slice(filtered, func(i, j int) bool {
		if filtered[i].CompletedAt == filtered[j].CompletedAt {
			if filtered[i].UserID == filtered[j].UserID {
				return filtered[i].GuideID < filtered[j].GuideID
			}
			return filtered[i].UserID < filtered[j].UserID
		}
		return filtered[i].CompletedAt < filtered[j].CompletedAt
	})

	usersByID := map[string]*model.User{}
	if h.platform != nil && len(filtered) > 0 {
		ids := make([]string, 0, len(filtered))
		seen := map[string]struct{}{}
		for _, e := range filtered {
			if _, ok := seen[e.UserID]; ok {
				continue
			}
			seen[e.UserID] = struct{}{}
			ids = append(ids, e.UserID)
		}
		const chunk = 200
		for i := 0; i < len(ids); i += chunk {
			end := min(i+chunk, len(ids))
			users, getErr := h.platform.ListByUserIDs(ids[i:end])
			if getErr != nil {
				h.logWarn("Failed to load users for completions export", "error", getErr.Error())
				break
			}
			for _, u := range users {
				usersByID[u.Id] = u
			}
		}
	}

	filename := fmt.Sprintf("academy-completions-%s.csv", time.Now().UTC().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.WriteHeader(http.StatusOK)

	if err := writeCompletionsCSV(w, filtered, usersByID); err != nil {
		h.logWarn("Failed writing completions CSV", "error", err.Error())
	}
}

func writeCompletionsCSV(w io.Writer, events []CompletionEvent, usersByID map[string]*model.User) error {
	cw := csv.NewWriter(w)
	if err := cw.Write([]string{
		"user_id",
		"username",
		"email",
		"first_name",
		"last_name",
		"guide_id",
		"completed_at",
	}); err != nil {
		return err
	}

	for _, e := range events {
		username, email, first, last := "", "", "", ""
		if u := usersByID[e.UserID]; u != nil {
			username = u.Username
			email = u.Email
			first = u.FirstName
			last = u.LastName
		}
		completedAt := time.Unix(e.CompletedAt, 0).UTC().Format(time.RFC3339)
		if err := cw.Write([]string{
			sanitizeCSVCell(e.UserID),
			sanitizeCSVCell(username),
			sanitizeCSVCell(email),
			sanitizeCSVCell(first),
			sanitizeCSVCell(last),
			sanitizeCSVCell(e.GuideID),
			sanitizeCSVCell(completedAt),
		}); err != nil {
			return err
		}
	}

	cw.Flush()
	return cw.Error()
}
