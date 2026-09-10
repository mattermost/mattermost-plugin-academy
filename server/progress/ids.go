// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"errors"
	"strings"
)

const (
	// MaxRequestBodyBytes is a conservative global HTTP body cap. Academy
	// has no file uploads and progress payloads are a few hundred bytes.
	MaxRequestBodyBytes = 64 << 10
	maxRequestModuleIDs = 256
	maxStoredModuleIDs  = 1024
)

var (
	errTooManyModuleIDs       = errors.New("too many module ids")
	errInvalidModuleID        = errors.New("invalid module id")
	errTooManyStoredModuleIDs = errors.New("too many completed modules")
)

func validGuideID(id string) bool {
	if id == "" || len(id) > 128 {
		return false
	}
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			continue
		}
		return false
	}
	return true
}

func validUserID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			continue
		}
		return false
	}
	return true
}

func validateModuleIDs(ids []string) error {
	if len(ids) > maxRequestModuleIDs {
		return errTooManyModuleIDs
	}
	for _, id := range ids {
		if !validGuideID(strings.TrimSpace(id)) {
			return errInvalidModuleID
		}
	}
	return nil
}

func validatePutRequest(req PutRequest) error {
	if err := validateModuleIDs(req.CompletedModuleIDs); err != nil {
		return err
	}
	return validateModuleIDs(req.ModuleIDs)
}
