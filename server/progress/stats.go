// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"errors"
	"slices"
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

var errInvalidBucket = errors.New("invalid bucket")

// IsValid reports whether the query is safe to run. The chart and the CSV
// export share these rules.
func (q CompletionsOverTimeQuery) IsValid(now time.Time) error {
	if _, err := normalizeBucket(q.Bucket); err != nil {
		return err
	}
	for _, id := range q.GuideIDs {
		if !validGuideID(strings.TrimSpace(id)) {
			return errors.New("invalid guide id")
		}
	}
	if q.From != nil && q.To != nil && *q.From >= *q.To {
		return errors.New("from must be before to")
	}
	if q.To != nil && *q.To > now.Add(maxCompletionsToFuture).Unix() {
		return errors.New("to is too far in the future")
	}
	return nil
}

// IsValidForChart adds the series-size cap to IsValid. Only the bucketed chart
// needs it: the CSV export emits one row per completion and has no buckets.
func (q CompletionsOverTimeQuery) IsValidForChart(now time.Time) error {
	if err := q.IsValid(now); err != nil {
		return err
	}
	if q.From == nil {
		return nil
	}

	toUnix := now.Unix()
	if q.To != nil {
		toUnix = *q.To
	}
	if toUnix > *q.From && toUnix-*q.From > maxCompletionsOverTimePoints*completionsBucketSeconds(q.Bucket) {
		return errors.New("range too large")
	}
	return nil
}

func normalizeBucket(b string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(b)) {
	case "", "day":
		return "day", nil
	case "week":
		return "week", nil
	case "month":
		return "month", nil
	default:
		return "", errInvalidBucket
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

// prevBucket steps one bucket back. Inputs are aligned by bucketStart, so the
// calendar arithmetic always lands on another bucket boundary.
func prevBucket(t time.Time, bucket string) time.Time {
	switch bucket {
	case "week":
		return t.AddDate(0, 0, -7)
	case "month":
		return t.AddDate(0, -1, 0)
	default:
		return t.AddDate(0, 0, -1)
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

	// Validated by IsValid; the zero value means the default day bucket.
	bucket := q.Bucket
	if bucket == "" {
		bucket = "day"
	}

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
	switch {
	case q.From != nil:
		seriesStart = bucketStart(time.Unix(*q.From, 0), bucket)
	case hasMin:
		seriesStart = time.Unix(minStart, 0).UTC()
	default:
		return result
	}

	seriesEnd := bucketStart(time.Unix(toUnix-1, 0), bucket)
	if seriesEnd.Before(seriesStart) {
		return result
	}

	// Walk newest to oldest so a series past the cap keeps the recent buckets
	// admins actually look at.
	for t := seriesEnd; !t.Before(seriesStart); t = prevBucket(t, bucket) {
		start := t.Unix()
		result.Points = append(result.Points, TimeBucket{
			Start: start,
			Count: counts[start],
		})
		if len(result.Points) >= maxCompletionsOverTimePoints {
			break
		}
	}
	slices.Reverse(result.Points)

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
