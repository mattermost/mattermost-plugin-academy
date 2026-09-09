package access

import "net/http"

// Checker holds the authorization predicates the middleware needs.
// Function fields (not an interface) keep the plugin from having to build
// an adapter type just to wire itself in.
//
// UserAllowed returns (true, nil) if allowed, (false, nil) for a policy
// denial (→ 403), or (_, err) for an infrastructure failure (→ 500).
// Callers are expected to log err before returning it.
type Checker struct {
	IsSystemAdmin func(userID string) bool
	UserAllowed   func(userID string) (bool, error)
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
// Fails closed if UserAllowed is nil. Distinguishes policy denials (403)
// from infrastructure errors (500) so a Team API blip doesn't look like an
// authorization decision.
func (c Checker) RequireAcademyAccess(next http.Handler) http.Handler {
	return c.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c.UserAllowed == nil {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		allowed, err := c.UserAllowed(UserFromContext(r.Context()))
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		if !allowed {
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
