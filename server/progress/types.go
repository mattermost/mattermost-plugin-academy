// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

// Record is one user's progress for a single guide.
// Completed modules are stored by stable string IDs (not indexes) so guides
// can add, remove, or reorder modules without invalidating saved progress.
type Record struct {
	// V is the schema version of this saved record (always 1 today).
	// Get treats V == 0 with no other fields as an empty KV slot. Bump V if
	// the JSON shape changes so readers can migrate older records in place.
	V                  int      `json:"v"`
	GuideID            string   `json:"guideId"`
	CompletedModuleIDs []string `json:"completedModuleIds"`
	UpdatedAt          int64    `json:"updatedAt"`
	// EverCompleted is set the first time the user completes every module in
	// the server-known curriculum. Kept for reporting even if modules are added later.
	EverCompleted bool  `json:"everCompleted"`
	CompletedAt   int64 `json:"completedAt,omitempty"`
}

// PutRequest is the body for saving progress. Completion is decided against
// the server catalog, not against any client-supplied module list.
type PutRequest struct {
	CompletedModuleIDs []string `json:"completedModuleIds"`
}

// Completion is a public summary of a finished guide (no module-level detail).
type Completion struct {
	GuideID     string `json:"guideId"`
	CompletedAt int64  `json:"completedAt"`
}

// CompletionEvent is one user's guide completion, used for admin reporting/export.
type CompletionEvent struct {
	UserID      string `json:"userId"`
	GuideID     string `json:"guideId"`
	CompletedAt int64  `json:"completedAt"`
}
