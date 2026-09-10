// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAggregateCompletionsOverTimeDayBuckets(t *testing.T) {
	now := time.Date(2026, 7, 20, 15, 0, 0, 0, time.UTC)
	day := func(y int, m time.Month, d int) int64 {
		return time.Date(y, m, d, 12, 0, 0, 0, time.UTC).Unix()
	}

	completions := []CompletionEvent{
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: day(2026, 7, 14)},
		{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: day(2026, 7, 14)},
		{UserID: "u1", GuideID: "slash-command-workflow-automation-quick-start", CompletedAt: day(2026, 7, 16)},
		{UserID: "u3", GuideID: "ai-quick-start", CompletedAt: day(2026, 7, 19)},
		{UserID: "u4", GuideID: "ai-quick-start", CompletedAt: day(2026, 7, 10)},
	}

	from := time.Date(2026, 7, 14, 0, 0, 0, 0, time.UTC).Unix()
	result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{
		From:   &from,
		Bucket: "day",
	}, now)

	require.Len(t, result.Points, 7)
	assert.Equal(t, "day", result.Bucket)
	assert.Equal(t, int64(2), result.Points[0].Count)
	assert.Equal(t, int64(0), result.Points[1].Count)
	assert.Equal(t, int64(1), result.Points[2].Count)
	assert.Equal(t, int64(1), result.Points[5].Count)
}

func TestAggregateCompletionsOverTimeGuideFilter(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	day := func(d int) int64 {
		return time.Date(2026, 7, d, 12, 0, 0, 0, time.UTC).Unix()
	}

	completions := []CompletionEvent{
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: day(18)},
		{UserID: "u2", GuideID: "slash-command-workflow-automation-quick-start", CompletedAt: day(18)},
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: day(19)},
	}

	from := time.Date(2026, 7, 18, 0, 0, 0, 0, time.UTC).Unix()
	result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{
		GuideIDs: []string{"ai-quick-start"},
		From:     &from,
		Bucket:   "day",
	}, now)

	assert.Equal(t, []string{"ai-quick-start"}, result.Guides)
	require.GreaterOrEqual(t, len(result.Points), 2)
	assert.Equal(t, int64(1), result.Points[0].Count)
	assert.Equal(t, int64(1), result.Points[1].Count)
}

func TestAggregateCompletionsOverTimeAllTime(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	completions := []CompletionEvent{
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 10, 8, 0, 0, 0, time.UTC).Unix()},
		{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 12, 8, 0, 0, 0, time.UTC).Unix()},
	}

	result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{}, now)
	require.Len(t, result.Points, 11)
	assert.Nil(t, result.From)
	assert.Equal(t, int64(1), result.Points[0].Count)
	assert.Equal(t, int64(0), result.Points[1].Count)
	assert.Equal(t, int64(1), result.Points[2].Count)
}

func TestAggregateCompletionsOverTimeEmpty(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	result := AggregateCompletionsOverTime(nil, CompletionsOverTimeQuery{}, now)
	assert.Empty(t, result.Points)
}

func TestNormalizeBucket(t *testing.T) {
	assert.Equal(t, "day", normalizeBucket(""))
	assert.Equal(t, "week", normalizeBucket("WEEK"))
	assert.Equal(t, "month", normalizeBucket("month"))
}

func TestFilterCompletionEvents(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	from := time.Date(2026, 7, 18, 0, 0, 0, 0, time.UTC).Unix()
	events := []CompletionEvent{
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 17, 12, 0, 0, 0, time.UTC).Unix()},
		{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 18, 12, 0, 0, 0, time.UTC).Unix()},
		{UserID: "u2", GuideID: "slash-command-workflow-automation-quick-start", CompletedAt: time.Date(2026, 7, 19, 12, 0, 0, 0, time.UTC).Unix()},
	}

	filtered := FilterCompletionEvents(events, CompletionsOverTimeQuery{
		GuideIDs: []string{"ai-quick-start"},
		From:     &from,
	}, now)
	require.Len(t, filtered, 1)
	assert.Equal(t, "u1", filtered[0].UserID)
}
