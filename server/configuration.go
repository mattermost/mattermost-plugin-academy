package main

import (
	"encoding/json"
	"reflect"
	"slices"
	"strings"

	"github.com/pkg/errors"
)

// UserAccessLevel controls who may use Academy (same model as Agents).
type UserAccessLevel int

const (
	UserAccessLevelAll UserAccessLevel = iota
	UserAccessLevelAllow
	UserAccessLevelBlock
	UserAccessLevelNone
)

// UserAccessConfig is stored as the UserAccessConfig custom plugin setting.
type UserAccessConfig struct {
	UserAccessLevel  UserAccessLevel `json:"userAccessLevel"`
	UserIDs          []string        `json:"userIDs"`
	TeamIDs          []string        `json:"teamIDs"`
	DisabledGuideIDs []string        `json:"disabledGuideIDs"`

	// TestMode shows plugin-gated content and admin-audience guides to everyone.
	// Off by default.
	TestMode bool `json:"testMode"`
}

// UnmarshalJSON accepts a JSON object or a JSON-encoded string (Mattermost defaults).
func (c *UserAccessConfig) UnmarshalJSON(data []byte) error {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" || trimmed == "null" || trimmed == `""` {
		*c = defaultUserAccessConfig()
		return nil
	}

	if len(trimmed) >= 2 && trimmed[0] == '"' {
		var asString string
		if err := json.Unmarshal(data, &asString); err != nil {
			return err
		}
		asString = strings.TrimSpace(asString)
		if asString == "" {
			*c = defaultUserAccessConfig()
			return nil
		}
		data = []byte(asString)
	}

	type raw UserAccessConfig
	var parsed raw
	if err := json.Unmarshal(data, &parsed); err != nil {
		return err
	}
	*c = UserAccessConfig(parsed)
	if c.UserIDs == nil {
		c.UserIDs = []string{}
	}
	if c.TeamIDs == nil {
		c.TeamIDs = []string{}
	}
	if c.DisabledGuideIDs == nil {
		c.DisabledGuideIDs = []string{}
	}
	return nil
}

func defaultUserAccessConfig() UserAccessConfig {
	return UserAccessConfig{
		UserAccessLevel:  UserAccessLevelAll,
		UserIDs:          []string{},
		TeamIDs:          []string{},
		DisabledGuideIDs: []string{},
		TestMode:         false,
	}
}

// configuration captures the plugin's external configuration as exposed in the Mattermost server
// configuration, as well as values computed from the configuration. Any public fields will be
// deserialized from the Mattermost server configuration in OnConfigurationChange.
//
// As plugins are inherently concurrent (hooks being called asynchronously), and the plugin
// configuration can change at any time, access to the configuration must be synchronized. The
// strategy used in this plugin is to guard a pointer to the configuration, and clone the entire
// struct whenever it changes. You may replace this with whatever strategy you choose.
//
// If you add non-reference types to your configuration struct, be sure to rewrite Clone as a deep
// copy appropriate for your types.
type configuration struct {
	// EnableProfileBadges controls profile-popover badges. Nil means unset → default on.
	// Uses Truthy because Mattermost plugin defaults are JSON strings ("true"/"false").
	EnableProfileBadges *Truthy
	UserAccessConfig    *UserAccessConfig
}

// Truthy unmarshals Mattermost plugin bools from either a JSON boolean or "true"/"false" string.
type Truthy bool

func (t *Truthy) UnmarshalJSON(data []byte) error {
	switch strings.ToLower(strings.Trim(string(data), `"`)) {
	case "true", "1":
		*t = true
	case "false", "0", "null", "":
		*t = false
	default:
		return errors.Errorf("invalid bool value %s", string(data))
	}
	return nil
}

func (t Truthy) MarshalJSON() ([]byte, error) {
	return json.Marshal(bool(t))
}

// Clone deep-copies configuration reference fields.
func (c *configuration) Clone() *configuration {
	if c == nil {
		return &configuration{}
	}
	clone := *c
	if c.EnableProfileBadges != nil {
		v := *c.EnableProfileBadges
		clone.EnableProfileBadges = &v
	}
	if c.UserAccessConfig != nil {
		ua := *c.UserAccessConfig
		ua.UserIDs = append([]string(nil), c.UserAccessConfig.UserIDs...)
		ua.TeamIDs = append([]string(nil), c.UserAccessConfig.TeamIDs...)
		ua.DisabledGuideIDs = append([]string(nil), c.UserAccessConfig.DisabledGuideIDs...)
		clone.UserAccessConfig = &ua
	}
	return &clone
}

func (c *configuration) profileBadgesEnabled() bool {
	if c == nil || c.EnableProfileBadges == nil {
		return true
	}
	return bool(*c.EnableProfileBadges)
}

func (c *configuration) testModeEnabled() bool {
	return c.userAccess().TestMode
}

func (c *configuration) userAccess() UserAccessConfig {
	if c == nil || c.UserAccessConfig == nil {
		return defaultUserAccessConfig()
	}
	return *c.UserAccessConfig
}

func (c *configuration) disabledGuideIDs() []string {
	return c.userAccess().DisabledGuideIDs
}

func (c *configuration) guideEnabled(guideID string) bool {
	return !slices.Contains(c.disabledGuideIDs(), guideID)
}

// getConfiguration retrieves the active configuration under lock, making it safe to use
// concurrently. The active configuration may change underneath the client of this method, but
// the struct returned by this API call is considered immutable.
func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{}
	}

	return p.configuration
}

// setConfiguration replaces the active configuration under lock.
//
// Do not call setConfiguration while holding the configurationLock, as sync.Mutex is not
// reentrant. In particular, avoid using the plugin API entirely, as this may in turn trigger a
// hook back into the plugin. If that hook attempts to acquire this lock, a deadlock may occur.
//
// This method panics if setConfiguration is called with the existing configuration. This almost
// certainly means that the configuration was modified without being cloned and may result in an
// unsafe access.
func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		// Ignore assignment if the configuration struct is empty. Go will optimize the
		// allocation for same to point at the same memory address, breaking the check
		// above.
		if reflect.ValueOf(*configuration).NumField() == 0 {
			return
		}

		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

// OnConfigurationChange is invoked when configuration changes may have been made.
func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	// Load the public configuration fields from the Mattermost server configuration.
	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	p.setConfiguration(configuration)

	return nil
}
