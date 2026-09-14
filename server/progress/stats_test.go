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

func TestAggregateCompletionsOverTimeCapsPoints(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	from := int64(0)
	to := int64(1_000_000_000_000_000)
	result := AggregateCompletionsOverTime(nil, CompletionsOverTimeQuery{
		From:   &from,
		To:     &to,
		Bucket: "day",
	}, now)
	require.Len(t, result.Points, maxCompletionsOverTimePoints)
}

func TestNormalizeBucket(t *testing.T) {
	day, err := normalizeBucket("")
	require.NoError(t, err)
	assert.Equal(t, "day", day)

	explicitDay, err := normalizeBucket("day")
	require.NoError(t, err)
	assert.Equal(t, "day", explicitDay)

	week, err := normalizeBucket("WEEK")
	require.NoError(t, err)
	assert.Equal(t, "week", week)

	month, err := normalizeBucket("month")
	require.NoError(t, err)
	assert.Equal(t, "month", month)

	auto, err := normalizeBucket("AUTO")
	require.NoError(t, err)
	assert.Equal(t, "auto", auto)

	_, err = normalizeBucket("hour")
	require.EqualError(t, err, "invalid bucket")
}

func TestBucketForSpan(t *testing.T) {
	assert.Equal(t, "day", bucketForSpan(30*24*time.Hour))
	assert.Equal(t, "day", bucketForSpan(45*24*time.Hour))
	assert.Equal(t, "week", bucketForSpan(180*24*time.Hour))
	assert.Equal(t, "month", bucketForSpan(365*24*time.Hour))
}

func TestAggregateCompletionsOverTimeAutoBucket(t *testing.T) {
	now := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)

	t.Run("short all-time span uses day", func(t *testing.T) {
		completions := []CompletionEvent{
			{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 10, 8, 0, 0, 0, time.UTC).Unix()},
			{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 12, 8, 0, 0, 0, time.UTC).Unix()},
		}
		result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{Bucket: "auto"}, now)
		assert.Equal(t, "day", result.Bucket)
		require.Len(t, result.Points, 11)
	})

	t.Run("six-month span uses week", func(t *testing.T) {
		from := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC).Unix()
		completions := []CompletionEvent{
			{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 1, 25, 8, 0, 0, 0, time.UTC).Unix()},
			{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 15, 8, 0, 0, 0, time.UTC).Unix()},
		}
		result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{
			From:   &from,
			Bucket: "auto",
		}, now)
		assert.Equal(t, "week", result.Bucket)
		assert.Greater(t, len(result.Points), 1)
		assert.Less(t, len(result.Points), 40)
	})

	t.Run("year span uses month", func(t *testing.T) {
		from := time.Date(2025, 7, 20, 0, 0, 0, 0, time.UTC).Unix()
		completions := []CompletionEvent{
			{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2025, 8, 1, 8, 0, 0, 0, time.UTC).Unix()},
			{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC).Unix()},
		}
		result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{
			From:   &from,
			Bucket: "auto",
		}, now)
		assert.Equal(t, "month", result.Bucket)
		require.Len(t, result.Points, 13)
		assert.Equal(t, int64(0), result.Points[0].Count)
		assert.Equal(t, int64(1), result.Points[1].Count)
		assert.Equal(t, int64(1), result.Points[11].Count)
	})

	t.Run("all-time six-month history uses week", func(t *testing.T) {
		completions := []CompletionEvent{
			{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 1, 25, 8, 0, 0, 0, time.UTC).Unix()},
			{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 7, 15, 8, 0, 0, 0, time.UTC).Unix()},
		}
		result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{Bucket: "auto"}, now)
		assert.Equal(t, "week", result.Bucket)
		assert.Greater(t, len(result.Points), 1)
		assert.Less(t, len(result.Points), 40)
	})

	t.Run("all-time year of history uses month", func(t *testing.T) {
		completions := []CompletionEvent{
			{UserID: "u1", GuideID: "ai-quick-start", CompletedAt: time.Date(2025, 8, 1, 8, 0, 0, 0, time.UTC).Unix()},
			{UserID: "u2", GuideID: "ai-quick-start", CompletedAt: time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC).Unix()},
		}
		result := AggregateCompletionsOverTime(completions, CompletionsOverTimeQuery{Bucket: "auto"}, now)
		assert.Equal(t, "month", result.Bucket)
		require.Len(t, result.Points, 12)
		assert.Equal(t, int64(1), result.Points[0].Count)
		assert.Equal(t, int64(1), result.Points[10].Count)
	})

	t.Run("empty auto stays day", func(t *testing.T) {
		result := AggregateCompletionsOverTime(nil, CompletionsOverTimeQuery{Bucket: "auto"}, now)
		assert.Equal(t, "day", result.Bucket)
		assert.Empty(t, result.Points)
	})

	t.Run("explicit day is kept on a long span", func(t *testing.T) {
		from := time.Date(2025, 7, 20, 0, 0, 0, 0, time.UTC).Unix()
		result := AggregateCompletionsOverTime(nil, CompletionsOverTimeQuery{
			From:   &from,
			Bucket: "day",
		}, now)
		assert.Equal(t, "day", result.Bucket)
		assert.Greater(t, len(result.Points), 300)
	})
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
