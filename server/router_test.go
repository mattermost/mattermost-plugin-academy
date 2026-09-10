package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/mattermost/mattermost-plugin-academy/server/progress"
)

// TestEveryRouteRequiresAuthentication guards against a route being added
// to buildRouter without a middleware wrapper.
func TestEveryRouteRequiresAuthentication(t *testing.T) {
	p := &Plugin{}
	cfg := defaultUserAccessConfig()
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	// nil store is fine — middleware short-circuits before any handler runs.
	p.progressHandler = progress.NewHandler(nil, p, nil)
	router := p.buildRouter()

	routes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/settings"},
		{http.MethodGet, "/api/v1/progress"},
		{http.MethodGet, "/api/v1/progress/ai-quick-start"},
		{http.MethodPut, "/api/v1/progress/ai-quick-start"},
		{http.MethodGet, "/api/v1/users/user1/completions"},
		{http.MethodGet, "/api/v1/admin/stats/completions-over-time"},
		{http.MethodGet, "/api/v1/admin/stats/completions.csv"},
	}

	for _, rt := range routes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			r := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			assert.Equal(t, http.StatusUnauthorized, w.Code, "route %s %s must reject unauthenticated requests", rt.method, rt.path)
		})
	}
}

// TestAdminRoutesRequireSystemAdmin asserts that an authenticated non-admin
// user is refused on every admin stats route through the configured router.
// With nil client, userIsAdmin returns false, standing in for "not admin".
func TestAdminRoutesRequireSystemAdmin(t *testing.T) {
	p := &Plugin{}
	cfg := defaultUserAccessConfig()
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	p.progressHandler = progress.NewHandler(nil, p, nil)
	router := p.buildRouter()

	adminRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/admin/stats/completions-over-time"},
		{http.MethodGet, "/api/v1/admin/stats/completions.csv"},
	}

	for _, rt := range adminRoutes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			r := httptest.NewRequest(rt.method, rt.path, nil)
			r.Header.Set("Mattermost-User-Id", "regular-user")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			assert.Equal(t, http.StatusForbidden, w.Code, "route %s %s must require system admin", rt.method, rt.path)
		})
	}
}

// TestAcademyAllowListEnforcedOnEveryProgressRoute asserts that a blocked
// user is refused on every progress and peer-completion route.
func TestAcademyAllowListEnforcedOnEveryProgressRoute(t *testing.T) {
	p := &Plugin{}
	cfg := UserAccessConfig{UserAccessLevel: UserAccessLevelNone}
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	p.progressHandler = progress.NewHandler(nil, p, nil)
	router := p.buildRouter()

	blockedRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/progress"},
		{http.MethodGet, "/api/v1/progress/ai-quick-start"},
		{http.MethodPut, "/api/v1/progress/ai-quick-start"},
		{http.MethodGet, "/api/v1/users/user1/completions"},
	}

	for _, rt := range blockedRoutes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			r := httptest.NewRequest(rt.method, rt.path, nil)
			r.Header.Set("Mattermost-User-Id", "blocked-user")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			assert.Equal(t, http.StatusForbidden, w.Code, "route %s %s must enforce Academy allow-list", rt.method, rt.path)
		})
	}
}

func TestServeHTTPRejectsOversizedBody(t *testing.T) {
	p := &Plugin{}
	cfg := defaultUserAccessConfig()
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	p.progressHandler = progress.NewHandler(nil, p, nil)
	p.router = p.buildRouter()

	r := httptest.NewRequest(http.MethodPut, "/api/v1/progress/ai-quick-start", strings.NewReader(strings.Repeat("a", progress.MaxRequestBodyBytes+1)))
	r.Header.Set("Mattermost-User-Id", "user1")
	w := httptest.NewRecorder()
	p.ServeHTTP(nil, w, r)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}
