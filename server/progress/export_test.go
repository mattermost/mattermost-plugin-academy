// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteCompletionsCSV(t *testing.T) {
	var buf bytes.Buffer
	err := writeCompletionsCSV(&buf, []CompletionEvent{
		{UserID: "uid1", GuideID: "ai-quick-start", CompletedAt: 1720000000},
	}, map[string]*model.User{
		"uid1": {Id: "uid1", Username: "alice", Email: "a@example.com", FirstName: "Alice", LastName: "A"},
	})
	require.NoError(t, err)

	out := buf.String()
	assert.Contains(t, out, "user_id,username,email,first_name,last_name,guide_id,completed_at")
	assert.Contains(t, out, "uid1,alice,a@example.com,Alice,A,ai-quick-start,")
}

func TestWriteCompletionsCSVSanitizesFormulas(t *testing.T) {
	var buf bytes.Buffer
	err := writeCompletionsCSV(&buf, []CompletionEvent{
		{UserID: "uid1", GuideID: "ai-quick-start", CompletedAt: 1720000000},
	}, map[string]*model.User{
		"uid1": {Id: "uid1", Username: "=cmd", Email: "+evil@example.com", FirstName: "@Alice", LastName: "-1+1"},
	})
	require.NoError(t, err)

	out := buf.String()
	assert.Contains(t, out, "'=cmd")
	assert.Contains(t, out, "'+evil@example.com")
	assert.Contains(t, out, "'@Alice")
	assert.Contains(t, out, "'-1+1")
	assert.NotContains(t, out, ",=cmd,")
}

func TestSanitizeCSVCell(t *testing.T) {
	assert.Equal(t, "alice", sanitizeCSVCell("alice"))
	assert.Equal(t, "'=cmd|' /C calc'!A0", sanitizeCSVCell("=cmd|' /C calc'!A0"))
	assert.Equal(t, "'+1+1", sanitizeCSVCell("+1+1"))
	assert.Equal(t, "'\tformula", sanitizeCSVCell("\tformula"))
	assert.Equal(t, "", sanitizeCSVCell(""))
}

func TestParseCompletionsQuery(t *testing.T) {
	ok := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats/completions-over-time?guides=ai-quick-start&from=1&to=10&bucket=week", nil)
	q, err := parseCompletionsQuery(ok)
	require.NoError(t, err)
	assert.Equal(t, []string{"ai-quick-start"}, q.GuideIDs)
	require.NotNil(t, q.From)
	require.NotNil(t, q.To)
	assert.Equal(t, int64(1), *q.From)
	assert.Equal(t, int64(10), *q.To)
	assert.Equal(t, "week", q.Bucket)

	badGuide := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats/completions-over-time?guides=Nope", nil)
	_, err = parseCompletionsQuery(badGuide)
	require.Error(t, err)

	badRange := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats/completions-over-time?from=10&to=10", nil)
	_, err = parseCompletionsQuery(badRange)
	require.Error(t, err)

	badFrom := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats/completions-over-time?from=nope", nil)
	_, err = parseCompletionsQuery(badFrom)
	require.Error(t, err)
}
