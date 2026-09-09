// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

// Platform is the Mattermost user/log surface the CSV export needs.
// Auth lookups live in the access package, not here.
type Platform interface {
	ListByUserIDs(userIDs []string) ([]*model.User, error)
	LogWarn(message string, keyValuePairs ...any)
}

type pluginPlatform struct {
	client *pluginapi.Client
}

func (p pluginPlatform) ListByUserIDs(userIDs []string) ([]*model.User, error) {
	return p.client.User.ListByUserIDs(userIDs)
}

func (p pluginPlatform) LogWarn(message string, keyValuePairs ...any) {
	p.client.Log.Warn(message, keyValuePairs...)
}
