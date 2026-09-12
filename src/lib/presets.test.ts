import { describe, expect, test } from 'bun:test'
import golden from './fixtures/golden-preset.json'
import {
  SCHEMA_VERSION,
  emptyState,
  readState,
  withPreset,
  withoutPreset,
  type Migration,
  type PresetState,
} from './presets'

const preset = (name: string) => ({ name, savedAt: '2026-09-12T20:00:00.000Z', streams: [] })

describe('readState', () => {
  test('an empty store opens as an empty set at the current version', () => {
    expect(readState(null)).toEqual(emptyState())
    expect(readState(undefined).schemaVersion).toBe(SCHEMA_VERSION)
  })

  test('state written by a newer build is refused, naming both versions', () => {
    const fromTheFuture = { schemaVersion: SCHEMA_VERSION + 2, presets: [] }

    expect(() => readState(fromTheFuture)).toThrow(
      `Saved presets are version ${SCHEMA_VERSION + 2}; this build reads version ${SCHEMA_VERSION}. Update the app to open them.`,
    )
  })

  test('data with no version is refused rather than assumed to be version 1', () => {
    expect(() => readState({ presets: [] })).toThrow(/no schema version/)
  })

  test('data of the right version but the wrong shape is refused', () => {
    expect(() => readState({ schemaVersion: 1, presets: 'nope' })).toThrow(/wrong shape/)
  })

  // The migration loop is what a future release depends on, so it is exercised
  // now with a migration of its own rather than after one is written in anger.
  test('an older version is raised by the migration for its version', () => {
    const migrations: Record<number, Migration> = {
      0: (state) => ({ ...state, schemaVersion: 1, presets: [...state.presets, preset('added')] }),
    }
    const old = { schemaVersion: 0, presets: [preset('kept')] } as PresetState

    const state = readState(old, migrations)

    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.presets.map((p) => p.name)).toEqual(['kept', 'added'])
  })

  test('an older version with no migration is refused rather than read as-is', () => {
    const old = { schemaVersion: 0, presets: [] } as PresetState

    expect(() => readState(old, {})).toThrow(/nothing can raise them/)
  })
})

// Tamper with the fixture and this fails: it is the check that a preset written
// by an earlier build still opens into the arrangement it described.
describe('the golden preset', () => {
  test('opens into three panes in the order it was saved', () => {
    const state = readState(golden)

    expect(state.presets).toHaveLength(1)
    const [saved] = state.presets
    expect(saved.name).toBe('Friday night')
    expect(saved.streams.map((s) => s.kind)).toEqual(['twitch', 'youtube', 'hls'])
    expect(saved.streams.map((s) => s.id)).toEqual([
      'qtcinderella',
      'jfKfPfyJRdk',
      'https://example.com/live/stream.m3u8',
    ])
  })
})

describe('editing the set', () => {
  test('saving a name twice replaces it instead of duplicating', () => {
    const first = withPreset(emptyState(), preset('Friday night'))
    const second = withPreset(first, { ...preset('Friday night'), savedAt: '2026-09-13T10:00:00.000Z' })

    expect(second.presets).toHaveLength(1)
    expect(second.presets[0].savedAt).toBe('2026-09-13T10:00:00.000Z')
  })

  test('removing one leaves the rest', () => {
    const state = withPreset(withPreset(emptyState(), preset('a')), preset('b'))

    expect(withoutPreset(state, 'a').presets.map((p) => p.name)).toEqual(['b'])
  })
})
