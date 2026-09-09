// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"

	"github.com/mattermost/mattermost-plugin-academy/server/access"
	"github.com/mattermost/mattermost-plugin-academy/server/command"
	"github.com/mattermost/mattermost-plugin-academy/server/progress"
)

// Plugin implements the interface expected by the Mattermost server.
type Plugin struct {
	plugin.MattermostPlugin

	client          *pluginapi.Client
	commandClient   command.Command
	progressHandler *progress.Handler
	router          http.Handler

	configurationLock sync.RWMutex
	configuration     *configuration
}

// OnActivate is invoked when the plugin is activated.
func (p *Plugin) OnActivate() error {
	p.client = pluginapi.NewClient(p.API, p.Driver)
	p.commandClient = command.NewCommandHandler(p.client)
	store := progress.NewStore(p.client)
	if err := store.EnsureIndexes(); err != nil {
		return fmt.Errorf("failed to migrate progress indexes: %w", err)
	}
	p.progressHandler = progress.NewHandler(store, p, p.client)
	p.router = p.buildRouter()
	return nil
}

// buildRouter is the single source of truth for the plugin's authorization
// surface. Every new route MUST be registered here with an explicit
// middleware wrapper.
func (p *Plugin) buildRouter() http.Handler {
	auth := access.Checker{
		IsSystemAdmin: p.userIsAdmin,
		UserAllowed:   p.userAccessCheck,
	}

	mux := http.NewServeMux()

	// Settings must stay reachable for users blocked from Academy, because
	// its response tells the webapp whether the caller has access.
	mux.Handle("GET /api/v1/settings", auth.RequireAuth(http.HandlerFunc(p.serveSettings)))

	mux.Handle("GET /api/v1/progress", auth.RequireAcademyAccess(http.HandlerFunc(p.progressHandler.ListProgress)))
	mux.Handle("GET /api/v1/progress/{guideId}", auth.RequireAcademyAccess(http.HandlerFunc(p.progressHandler.GetProgress)))
	mux.Handle("PUT /api/v1/progress/{guideId}", auth.RequireAcademyAccess(http.HandlerFunc(p.progressHandler.PutProgress)))
	mux.Handle("GET /api/v1/users/{userId}/completions", auth.RequireAcademyAccess(http.HandlerFunc(p.progressHandler.ListUserCompletions)))

	mux.Handle("GET /api/v1/admin/stats/completions-over-time", auth.RequireSystemAdmin(http.HandlerFunc(p.progressHandler.CompletionsOverTime)))
	mux.Handle("GET /api/v1/admin/stats/completions.csv", auth.RequireSystemAdmin(http.HandlerFunc(p.progressHandler.CompletionsExport)))

	return mux
}

// GuideEnabled implements progress.Policy.
func (p *Plugin) GuideEnabled(guideID string) bool {
	return p.getConfiguration().guideEnabled(guideID)
}

// ProfileBadgesEnabled implements progress.Policy.
func (p *Plugin) ProfileBadgesEnabled() bool {
	return p.getConfiguration().profileBadgesEnabled()
}

// ExecuteCommand runs registered slash commands (currently /academy).
func (p *Plugin) ExecuteCommand(_ *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	if args != nil && !p.userHasAccess(args.UserId) {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text:         fmt.Sprintf("Unknown command: %s", args.Command),
		}, nil
	}
	if p.commandClient == nil {
		return &model.CommandResponse{}, nil
	}
	response, err := p.commandClient.Handle(args)
	if err != nil {
		return nil, model.NewAppError("ExecuteCommand", "plugin.command.execute_command.app_error", nil, err.Error(), http.StatusInternalServerError)
	}
	return response, nil
}

// ServeHTTP dispatches plugin HTTP routes through buildRouter.
// Static public/ files are served by the Mattermost server separately.
func (p *Plugin) ServeHTTP(_ *plugin.Context, w http.ResponseWriter, r *http.Request) {
	if p.router == nil {
		http.NotFound(w, r)
		return
	}
	p.router.ServeHTTP(w, r)
}

func (p *Plugin) serveSettings(w http.ResponseWriter, r *http.Request) {
	userID := access.UserFromContext(r.Context())

	cfg := p.getConfiguration()
	disabled := cfg.disabledGuideIDs()
	if disabled == nil {
		disabled = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"enableProfileBadges": cfg.profileBadgesEnabled(),
		"userAllowed":         p.userHasAccess(userID),
		"disabledGuideIDs":    disabled,
		"isAdmin":             p.userIsAdmin(userID),
		"testMode":            cfg.testModeEnabled(),
	})
}

// userIsAdmin reports whether the user can administer the system.
func (p *Plugin) userIsAdmin(userID string) bool {
	if p.client == nil {
		return false
	}
	return p.client.User.HasPermissionTo(userID, model.PermissionManageSystem)
}

// userAccessCheck separates policy denials from infrastructure errors so
// the middleware can return 403 for the former and 500 for the latter.
// Unexpected errors (e.g. Team API failures) are logged before being surfaced.
func (p *Plugin) userAccessCheck(userID string) (bool, error) {
	err := p.checkUserAccess(userID)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, errUsageRestriction) {
		return false, nil
	}
	if p.client != nil {
		p.client.Log.Warn("Academy access check failed", "user_id", userID, "error", err.Error())
	}
	return false, err
}
