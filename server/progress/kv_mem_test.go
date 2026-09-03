// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package progress

import (
	"bytes"
	"encoding/json"
	"errors"
	"sort"
	"sync"
)

var errConcurrentKV = errors.New("concurrent kv update")

type memKV struct {
	mu        sync.Mutex
	data      map[string][]byte
	listCalls int
}

func newMemKV() *memKV {
	return &memKV{data: map[string][]byte{}}
}

func (m *memKV) Get(key string, o any) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	data, ok := m.data[key]
	if !ok || len(data) == 0 {
		return nil
	}
	if bytesOut, ok := o.(*[]byte); ok {
		*bytesOut = append([]byte(nil), data...)
		return nil
	}
	return json.Unmarshal(data, o)
}

func marshalKVValue(value any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	if b, ok := value.([]byte); ok {
		return b, nil
	}
	return json.Marshal(value)
}

func (m *memKV) Set(key string, value any) error {
	raw, err := marshalKVValue(value)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if raw == nil {
		delete(m.data, key)
		return nil
	}
	m.data[key] = raw
	return nil
}

func (m *memKV) Delete(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.data, key)
	return nil
}

func (m *memKV) ListKeys(page, count int) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.listCalls++
	keys := make([]string, 0, len(m.data))
	for k := range m.data {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	start := page * count
	if start >= len(keys) {
		return []string{}, nil
	}
	end := min(start+count, len(keys))
	return keys[start:end], nil
}

func (m *memKV) SetAtomicWithRetries(key string, valueFunc func(oldValue []byte) (any, error)) error {
	var oldVal []byte
	if err := m.Get(key, &oldVal); err != nil {
		return err
	}
	newVal, err := valueFunc(oldVal)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if !bytes.Equal(m.data[key], oldVal) {
		return errConcurrentKV
	}
	raw, err := marshalKVValue(newVal)
	if err != nil {
		return err
	}
	if raw == nil {
		delete(m.data, key)
		return nil
	}
	m.data[key] = raw
	return nil
}
