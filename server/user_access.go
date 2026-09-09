// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"fmt"
	"slices"

	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/pkg/errors"
)

var errUsageRestriction = errors.New("usage restriction")

func (p *Plugin) isMemberOfTeam(teamID, userID string) (bool, error) {
	member, err := p.client.Team.GetMember(teamID, userID)
	if errors.Is(err, pluginapi.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return member != nil && member.DeleteAt == 0, nil
}

// checkUserAccess returns nil when the user may use Academy.
func (p *Plugin) checkUserAccess(userID string) error {
	cfg := p.getConfiguration().userAccess()

	switch cfg.UserAccessLevel {
	case UserAccessLevelAll:
		return nil
	case UserAccessLevelAllow:
		if slices.Contains(cfg.UserIDs, userID) {
			return nil
		}
		for _, teamID := range cfg.TeamIDs {
			isMember, err := p.isMemberOfTeam(teamID, userID)
			if err != nil {
				return err
			}
			if isMember {
				return nil
			}
		}
		return fmt.Errorf("user not allowed: %w", errUsageRestriction)
	case UserAccessLevelBlock:
		if slices.Contains(cfg.UserIDs, userID) {
			return fmt.Errorf("user blocked: %w", errUsageRestriction)
		}
		for _, teamID := range cfg.TeamIDs {
			isMember, err := p.isMemberOfTeam(teamID, userID)
			if err != nil {
				return err
			}
			if isMember {
				return fmt.Errorf("user's team blocked: %w", errUsageRestriction)
			}
		}
		return nil
	case UserAccessLevelNone:
		return fmt.Errorf("academy blocked for all users: %w", errUsageRestriction)
	default:
		return fmt.Errorf("unknown user access level")
	}
}

func (p *Plugin) userHasAccess(userID string) bool {
	return p.checkUserAccess(userID) == nil
}
