// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import "github.com/mattermost/mattermost/server/public/pluginapi"

// kvAPI is the KV operations the store needs, so tests can use an in-memory map.
type kvAPI interface {
	Get(key string, value any) error
	Set(key string, value any) error
	Delete(key string) error
	ListKeys(page, count int) ([]string, error)
	SetAtomicWithRetries(key string, valueFunc func(oldValue []byte) (any, error)) error
}

type pluginKV struct {
	kv *pluginapi.KVService
}

func (p pluginKV) Get(key string, value any) error {
	return p.kv.Get(key, value)
}

func (p pluginKV) Set(key string, value any) error {
	_, err := p.kv.Set(key, value)
	return err
}

func (p pluginKV) Delete(key string) error {
	return p.kv.Delete(key)
}

func (p pluginKV) ListKeys(page, count int) ([]string, error) {
	return p.kv.ListKeys(page, count)
}

func (p pluginKV) SetAtomicWithRetries(key string, valueFunc func(oldValue []byte) (any, error)) error {
	return p.kv.SetAtomicWithRetries(key, valueFunc)
}
