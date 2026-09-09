package main

import (
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost-plugin-academy/server/command"
)

type stubCommand struct {
	called bool
}

func (s *stubCommand) Handle(_ *model.CommandArgs) (*model.CommandResponse, error) {
	s.called = true
	return &model.CommandResponse{GotoLocation: "/academy"}, nil
}

var _ command.Command = (*stubCommand)(nil)

func TestExecuteCommandDeniesUsersWithoutAccess(t *testing.T) {
	p := &Plugin{}
	cfg := UserAccessConfig{UserAccessLevel: UserAccessLevelNone}
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	stub := &stubCommand{}
	p.commandClient = stub

	resp, appErr := p.ExecuteCommand(nil, &model.CommandArgs{
		UserId:  "blocked",
		Command: "/academy",
	})
	require.Nil(t, appErr)
	assert.False(t, stub.called)
	assert.Empty(t, resp.GotoLocation)
	assert.Equal(t, model.CommandResponseTypeEphemeral, resp.ResponseType)
	assert.Equal(t, "Unknown command: /academy", resp.Text)
}

func TestExecuteCommandAllowsUsersWithAccess(t *testing.T) {
	p := &Plugin{}
	cfg := defaultUserAccessConfig()
	p.setConfiguration(&configuration{UserAccessConfig: &cfg})
	stub := &stubCommand{}
	p.commandClient = stub

	resp, appErr := p.ExecuteCommand(nil, &model.CommandArgs{
		UserId:  "allowed",
		Command: "/academy",
	})
	require.Nil(t, appErr)
	assert.True(t, stub.called)
	assert.Equal(t, "/academy", resp.GotoLocation)
}
