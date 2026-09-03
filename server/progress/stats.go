// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"strings"
	"time"
)

// TimeBucket is one point on a completions-over-time series.
type TimeBucket struct {
	// Start is the inclusive unix timestamp for the start of this bucket (UTC).
	Start int64 `json:"start"`
	Count int64 `json:"count"`
}

// CompletionsOverTimeQuery filters and buckets guide completions.
//
// Date bounds are absolute unix timestamps so callers can use presets today
// (last week / last month / all time) or pass an arbitrary range later
// (date picker, custom presets) without API changes.
//
//   - From: inclusive lower bound; nil means no lower bound (all time start)
//   - To: exclusive upper bound; nil means "now" at query time
//   - GuideIDs: empty means all guides; otherwise only listed IDs
//   - Bucket: "day" (default), "week", or "month"
type CompletionsOverTimeQuery struct {
	GuideIDs []string
	From     *int64
	To       *int64
	Bucket   string
}

// CompletionsOverTimeResult is the admin chart payload.
type CompletionsOverTimeResult struct {
	From   *int64       `json:"from,omitempty"`
	To     int64        `json:"to"`
	Bucket string       `json:"bucket"`
	Guides []string     `json:"guides"`
	Points []TimeBucket `json:"points"`
}

func normalizeBucket(b string) string {
	switch strings.ToLower(strings.TrimSpace(b)) {
	case "week":
		return "week"
	case "month":
		return "month"
	default:
		return "day"
	}
}

func bucketStart(t time.Time, bucket string) time.Time {
	t = t.UTC()
	switch bucket {
	case "week":
		// Weeks start Monday (ISO-8601).
		weekday := int(t.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		return day.AddDate(0, 0, -(weekday - 1))
	case "month":
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	default:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	}
}

func nextBucket(t time.Time, bucket string) time.Time {
	switch bucket {
	case "week":
		return t.AddDate(0, 0, 7)
	case "month":
		return t.AddDate(0, 1, 0)
	default:
		return t.AddDate(0, 0, 1)
	}
}

func guideAllowed(guideID string, allow map[string]struct{}) bool {
	if len(allow) == 0 {
		return true
	}
	_, ok := allow[guideID]
	return ok
}

// AggregateCompletionsOverTime buckets completions for charting.
// Pure function so ranges/buckets can be unit-tested without KV.
func AggregateCompletionsOverTime(completions []CompletionEvent, q CompletionsOverTimeQuery, now time.Time) CompletionsOverTimeResult {
	filtered := FilterCompletionEvents(completions, q, now)
	bucket := normalizeBucket(q.Bucket)

	toUnix := now.UTC().Unix()
	if q.To != nil {
		toUnix = *q.To
	}

	counts := map[int64]int64{}
	var minStart int64
	var hasMin bool

	for _, c := range filtered {
		start := bucketStart(time.Unix(c.CompletedAt, 0), bucket).Unix()
		counts[start]++
		if !hasMin || start < minStart {
			minStart = start
			hasMin = true
		}
	}

	guides := make([]string, 0, len(q.GuideIDs))
	for _, id := range q.GuideIDs {
		id = strings.TrimSpace(id)
		if id != "" {
			guides = append(guides, id)
		}
	}

	result := CompletionsOverTimeResult{
		From:   q.From,
		To:     toUnix,
		Bucket: bucket,
		Guides: guides,
		Points: []TimeBucket{},
	}

	var seriesStart time.Time
	if q.From != nil {
		seriesStart = bucketStart(time.Unix(*q.From, 0), bucket)
	} else if hasMin {
		seriesStart = time.Unix(minStart, 0).UTC()
	} else {
		return result
	}

	seriesEnd := bucketStart(time.Unix(toUnix-1, 0), bucket)
	if seriesEnd.Before(seriesStart) {
		return result
	}

	for t := seriesStart; !t.After(seriesEnd); t = nextBucket(t, bucket) {
		start := t.Unix()
		result.Points = append(result.Points, TimeBucket{
			Start: start,
			Count: counts[start],
		})
	}

	return result
}

// FilterCompletionEvents applies guide + date bounds (same rules as the chart API).
func FilterCompletionEvents(completions []CompletionEvent, q CompletionsOverTimeQuery, now time.Time) []CompletionEvent {
	toUnix := now.UTC().Unix()
	if q.To != nil {
		toUnix = *q.To
	}

	allow := make(map[string]struct{}, len(q.GuideIDs))
	for _, id := range q.GuideIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		allow[id] = struct{}{}
	}

	out := make([]CompletionEvent, 0, len(completions))
	for _, c := range completions {
		if !guideAllowed(c.GuideID, allow) {
			continue
		}
		if c.CompletedAt <= 0 {
			continue
		}
		if q.From != nil && c.CompletedAt < *q.From {
			continue
		}
		if c.CompletedAt >= toUnix {
			continue
		}
		out = append(out, c)
	}
	return out
}

// ListAllCompletions returns every ever-completed guide across all users.
func (s *Store) ListAllCompletions() ([]CompletionEvent, error) {
	userIDs, err := s.listCompleters()
	if err != nil {
		return nil, err
	}

	out := make([]CompletionEvent, 0)
	for _, userID := range userIDs {
		if !validUserID(userID) {
			continue
		}
		completions, err := s.ListCompletionsForUser(userID)
		if err != nil {
			return nil, err
		}
		for _, c := range completions {
			if c.CompletedAt <= 0 {
				continue
			}
			out = append(out, CompletionEvent{
				UserID:      userID,
				GuideID:     c.GuideID,
				CompletedAt: c.CompletedAt,
			})
		}
	}

	return out, nil
}

// CompletionsOverTime loads completions and aggregates them for the query.
func (s *Store) CompletionsOverTime(q CompletionsOverTimeQuery) (CompletionsOverTimeResult, error) {
	completions, err := s.ListAllCompletions()
	if err != nil {
		return CompletionsOverTimeResult{}, err
	}
	return AggregateCompletionsOverTime(completions, q, time.Now()), nil
}
