// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"errors"
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
//   - Bucket: "day" (default), "week", "month", or "auto" (resolved from span)
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

func normalizeBucket(b string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(b)) {
	case "", "day":
		return "day", nil
	case "week":
		return "week", nil
	case "month":
		return "month", nil
	case "auto":
		return "auto", nil
	default:
		return "", errInvalidBucket
	}
}

// Auto bucket cutoffs match the admin duration presets: day through ~2 months,
// week through ~9 months, month for a year or longer.
const (
	autoDayMaxSpan  = 60 * 24 * time.Hour
	autoWeekMaxSpan = 270 * 24 * time.Hour
)

func bucketForSpan(span time.Duration) string {
	switch {
	case span < autoDayMaxSpan:
		return "day"
	case span < autoWeekMaxSpan:
		return "week"
	default:
		return "month"
	}
}

func spanStartUnix(from *int64, events []CompletionEvent) (int64, bool) {
	if from != nil {
		return *from, true
	}
	var min int64
	var has bool
	for _, e := range events {
		if !has || e.CompletedAt < min {
			min = e.CompletedAt
			has = true
		}
	}
	return min, has
}

func resolveBucket(requested string, from *int64, toUnix int64, events []CompletionEvent) string {
	bucket, err := normalizeBucket(requested)
	if err != nil {
		return "day"
	}
	if bucket != "auto" {
		return bucket
	}

	startUnix, ok := spanStartUnix(from, events)
	if !ok || toUnix <= startUnix {
		return "day"
	}
	return bucketForSpan(time.Duration(toUnix-startUnix) * time.Second)
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

	toUnix := now.UTC().Unix()
	if q.To != nil {
		toUnix = *q.To
	}
	bucket := resolveBucket(q.Bucket, q.From, toUnix, filtered)

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

	for t := seriesStart; !t.After(seriesEnd); t = nextBucket(t, bucket) {
		start := t.Unix()
		result.Points = append(result.Points, TimeBucket{
			Start: start,
			Count: counts[start],
		})
		if len(result.Points) >= maxCompletionsOverTimePoints {
			break
		}
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
