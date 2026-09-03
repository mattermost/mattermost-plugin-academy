// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"

	"github.com/mattermost/mattermost-plugin-academy/server/command"
	"github.com/mattermost/mattermost-plugin-academy/server/progress"
)

// Plugin implements the interface expected by the Mattermost server.
type Plugin struct {
	plugin.MattermostPlugin

	client          *pluginapi.Client
	commandClient   command.Command
	progressHandler *progress.Handler

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
	return nil
}

// GuideEnabled implements progress.Policy.
func (p *Plugin) GuideEnabled(guideID string) bool {
	return p.getConfiguration().guideEnabled(guideID)
}

// ProfileBadgesEnabled implements progress.Policy.
func (p *Plugin) ProfileBadgesEnabled() bool {
	return p.getConfiguration().profileBadgesEnabled()
}

// ExecuteCommand runs registered slash commands (currently /learn).
func (p *Plugin) ExecuteCommand(_ *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	response, err := p.commandClient.Handle(args)
	if err != nil {
		return nil, model.NewAppError("ExecuteCommand", "plugin.command.execute_command.app_error", nil, err.Error(), http.StatusInternalServerError)
	}
	return response, nil
}

// ServeHTTP handles plugin HTTP routes (progress API). Static public/ files are
// served by the Mattermost server separately.
func (p *Plugin) ServeHTTP(_ *plugin.Context, w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/api/v1/settings" {
		p.serveSettings(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/v1/admin/") {
		p.progressHandler.ServeAdminHTTP(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/v1/progress") {
		userID := r.Header.Get("Mattermost-User-Id")
		if userID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !p.userHasAccess(userID) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		p.progressHandler.ServeHTTP(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/v1/users/") {
		p.progressHandler.ServeHTTP(w, r)
		return
	}
	http.NotFound(w, r)
}

func (p *Plugin) serveSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Header.Get("Mattermost-User-Id")
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

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
