package main

import (
	"net/http"
	"net/http/httptest"
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
