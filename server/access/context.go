// Package access is the HTTP auth layer for the Academy plugin. It reads
// Mattermost-User-Id in one place, passes the validated user through
// request context, and provides middleware to gate handlers.
package access

import (
	"context"
	"net/http"
)

const mattermostUserIDHeader = "Mattermost-User-Id"

type ctxKey struct{}

// WithUser seeds a validated user id on ctx. Exported for tests that call
// handlers directly without going through middleware.
func WithUser(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, ctxKey{}, userID)
}

// UserFromContext returns the authenticated user id, or "" if the request
// never passed through RequireAuth.
func UserFromContext(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}

func userIDFromRequest(r *http.Request) string {
	return r.Header.Get(mattermostUserIDHeader)
}
