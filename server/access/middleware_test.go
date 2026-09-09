package access

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newRequest(userID string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if userID != "" {
		r.Header.Set(mattermostUserIDHeader, userID)
	}
	return r
}

func captureUser(seen *string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*seen = UserFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})
}

func TestRequireAuth(t *testing.T) {
	c := Checker{}
	var seen string
	h := c.RequireAuth(captureUser(&seen))

	t.Run("rejects missing header", func(t *testing.T) {
		seen = ""
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest(""))
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Empty(t, seen)
	})

	t.Run("passes user id through context", func(t *testing.T) {
		seen = ""
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("user1"))
		require.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "user1", seen)
	})
}

func TestRequireAcademyAccess(t *testing.T) {
	c := Checker{UserAllowed: func(id string) bool { return id == "allowed" }}
	var seen string
	h := c.RequireAcademyAccess(captureUser(&seen))

	t.Run("401 when unauthenticated", func(t *testing.T) {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest(""))
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("403 when not on allow-list", func(t *testing.T) {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("blocked"))
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("200 when allowed", func(t *testing.T) {
		seen = ""
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("allowed"))
		require.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "allowed", seen)
	})

	t.Run("nil predicate fails closed", func(t *testing.T) {
		h := Checker{}.RequireAcademyAccess(captureUser(&seen))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("user1"))
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestRequireSystemAdmin(t *testing.T) {
	c := Checker{IsSystemAdmin: func(id string) bool { return id == "admin" }}
	var seen string
	h := c.RequireSystemAdmin(captureUser(&seen))

	t.Run("401 when unauthenticated", func(t *testing.T) {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest(""))
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("403 when not admin", func(t *testing.T) {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("user1"))
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("200 when admin", func(t *testing.T) {
		seen = ""
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("admin"))
		require.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "admin", seen)
	})

	t.Run("nil predicate fails closed", func(t *testing.T) {
		h := Checker{}.RequireSystemAdmin(captureUser(&seen))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, newRequest("user1"))
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}
