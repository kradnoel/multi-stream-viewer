import localforage from 'localforage'
import type { ParsedStream } from './streams'

/**
 * The version this build writes, and the highest it can read.
 *
 * It exists from the first save rather than from the first migration: data
 * written without a version is unversioned forever, and every later migration
 * is then guessing what wrote the file.
 */
export const SCHEMA_VERSION = 1

/** A named set of streams, reopened as a group. */
export interface Preset {
  name: string
  streams: ParsedStream[]
  /** ISO 8601, so a stored preset says when it was written without a clock. */
  savedAt: string
}

export interface PresetState {
  schemaVersion: number
  presets: Preset[]
}

/**
 * Raises the state one version. Keyed by the version it reads, so applying
 * `1` turns a v1 document into a v2 one.
 *
 * Empty today because nothing has changed shape yet. The loop that walks it is
 * tested with a migration of its own, so the machinery is known to work before
 * a real migration depends on it.
 */
export type Migration = (state: PresetState) => PresetState
export const MIGRATIONS: Record<number, Migration> = {}

export const emptyState = (): PresetState => ({ schemaVersion: SCHEMA_VERSION, presets: [] })

/**
 * Turns whatever was on disk into state this build can use.
 *
 * A document from a newer build is refused rather than guessed at: its fields
 * may mean something this code does not implement, and silently dropping them
 * loses a user's presets. The message names both numbers, because "incompatible
 * data" tells someone nothing about what to do next.
 */
export function readState(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
): PresetState {
  if (raw === null || raw === undefined) return emptyState()

  if (typeof raw !== 'object' || !('schemaVersion' in raw)) {
    throw new Error('Saved presets are unreadable: no schema version in the stored data.')
  }

  const stored = raw as PresetState

  if (typeof stored.schemaVersion !== 'number' || !Array.isArray(stored.presets)) {
    throw new Error('Saved presets are unreadable: the stored data has the wrong shape.')
  }

  if (stored.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Saved presets are version ${stored.schemaVersion}; this build reads version ${SCHEMA_VERSION}. Update the app to open them.`,
    )
  }

  let state = stored
  while (state.schemaVersion < SCHEMA_VERSION) {
    const migration = migrations[state.schemaVersion]
    if (!migration) {
      throw new Error(
        `Saved presets are version ${state.schemaVersion} and nothing can raise them to version ${SCHEMA_VERSION}.`,
      )
    }
    state = migration(state)
  }

  return state
}

/** Replaces the preset of the same name, so saving twice does not duplicate. */
export function withPreset(state: PresetState, preset: Preset): PresetState {
  return {
    schemaVersion: SCHEMA_VERSION,
    presets: [...state.presets.filter((p) => p.name !== preset.name), preset],
  }
}

export function withoutPreset(state: PresetState, name: string): PresetState {
  return {
    schemaVersion: SCHEMA_VERSION,
    presets: state.presets.filter((p) => p.name !== name),
  }
}

const KEY = 'presets'

const store = localforage.createInstance({
  name: 'multi-stream-viewer',
  storeName: 'state',
})

/** Reads the stored presets. Throws if the data is newer than this build. */
export async function loadState(): Promise<PresetState> {
  return readState(await store.getItem<unknown>(KEY))
}

export async function saveState(state: PresetState): Promise<void> {
  await store.setItem(KEY, state)
}
