package access

import "net/http"

// Checker holds the two authorization predicates the middleware needs.
// Function fields (not an interface) keep the plugin from having to build
// an adapter type just to wire itself in.
type Checker struct {
	IsSystemAdmin func(userID string) bool
	UserAllowed   func(userID string) bool
}

// RequireAuth rejects requests without Mattermost-User-Id and injects the
// validated user id into the request context.
func (c Checker) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := userIDFromRequest(r)
		if userID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), userID)))
	})
}

// RequireAcademyAccess enforces authentication and the Academy allow-list.
// Fails closed if UserAllowed is nil.
func (c Checker) RequireAcademyAccess(next http.Handler) http.Handler {
	return c.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c.UserAllowed == nil || !c.UserAllowed(UserFromContext(r.Context())) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	}))
}

// RequireSystemAdmin enforces authentication and PermissionManageSystem.
// Fails closed if IsSystemAdmin is nil.
func (c Checker) RequireSystemAdmin(next http.Handler) http.Handler {
	return c.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c.IsSystemAdmin == nil || !c.IsSystemAdmin(UserFromContext(r.Context())) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	}))
}
