// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

// Platform is the Mattermost user/log surface admin HTTP routes need.
// Tests substitute an in-memory stub so handlers do not need a live server.
type Platform interface {
	HasPermissionTo(userID string, permission *model.Permission) bool
	ListByUserIDs(userIDs []string) ([]*model.User, error)
	LogWarn(message string, keyValuePairs ...any)
}

type pluginPlatform struct {
	client *pluginapi.Client
}

func (p pluginPlatform) HasPermissionTo(userID string, permission *model.Permission) bool {
	return p.client.User.HasPermissionTo(userID, permission)
}

func (p pluginPlatform) ListByUserIDs(userIDs []string) ([]*model.User, error) {
	return p.client.User.ListByUserIDs(userIDs)
}

func (p pluginPlatform) LogWarn(message string, keyValuePairs ...any) {
	p.client.Log.Warn(message, keyValuePairs...)
}
