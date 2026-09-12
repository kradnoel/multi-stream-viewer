<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExitDialog from './components/ExitDialog.vue'
import StreamPane from './components/StreamPane.vue'
import { parseStreamUrl, type ParsedStream } from './lib/streams'
import {
  emptyState,
  loadState,
  saveState,
  withPreset,
  withoutPreset,
  type Preset,
  type PresetState,
} from './lib/presets'

const input = ref('')
const streams = ref<ParsedStream[]>([])
const error = ref<string | null>(null)

/**
 * The stream the user is listening to, or null for silence.
 *
 * One value rather than a flag per pane: the rule is that exactly one pane is
 * audible, and a single source of truth cannot express two.
 */
const audible = ref<string | null>(null)

const presetName = ref('')
const presets = ref<PresetState>(emptyState())

/**
 * Reading can fail on purpose: presets written by a newer build are refused
 * rather than guessed at, and the message says so. The app still opens, because
 * unreadable presets are no reason to be unable to watch anything.
 */
onMounted(async () => {
  try {
    presets.value = await loadState()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Saved presets could not be read.'
  }
})

/**
 * Writes first and shows second, so the list never claims something was saved
 * that was not. A failed write leaves the app exactly as it was, plus a message.
 */
const persist = async (next: PresetState): Promise<boolean> => {
  try {
    await saveState(next)
    presets.value = next
    return true
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? `Presets could not be saved: ${cause.message}`
        : 'Presets could not be saved.'
    console.error('Writing presets failed.', cause)
    return false
  }
}

const save = (): void => {
  const name = presetName.value.trim()

  if (!name) {
    error.value = 'Name the preset before saving it.'
    return
  }
  if (streams.value.length === 0) {
    error.value = 'Add a stream before saving a preset.'
    return
  }

  error.value = null

  void persist(
    withPreset(presets.value, {
      name,
      savedAt: new Date().toISOString(),
      // Copied, so editing the grid afterwards does not rewrite what was saved.
      streams: [...streams.value],
    }),
  ).then((written) => {
    // The name stays in the box when the write failed, so nothing is retyped.
    if (written) presetName.value = ''
  })
}

/** Replaces the grid, rather than adding to it: a preset is a whole set. */
const open = (preset: Preset): void => {
  error.value = null
  streams.value = [...preset.streams]
  audible.value = preset.streams[0]?.src ?? null
}

const forget = (name: string): void => {
  void persist(withoutPreset(presets.value, name))
}

const saved = computed(() => [...presets.value.presets].sort((a, b) => a.name.localeCompare(b.name)))

const add = (): void => {
  const parsed = parseStreamUrl(input.value)

  if (!parsed) {
    error.value = 'Paste a Twitch or YouTube link, or a direct .m3u8 URL.'
    return
  }

  // src is what actually distinguishes two panes: the same channel pasted twice
  // would be a second player fighting the first for bandwidth.
  if (streams.value.some((s) => s.src === parsed.src)) {
    error.value = 'That stream is already open.'
    return
  }

  error.value = null
  streams.value.push(parsed)
  input.value = ''

  // The first stream added is the one you came to hear; later ones join muted
  // so they cannot talk over it.
  if (audible.value === null) audible.value = parsed.src
}

const remove = (src: string): void => {
  streams.value = streams.value.filter((s) => s.src !== src)

  // Closing the pane you were listening to leaves the app silent rather than
  // moving the sound to one you did not choose.
  if (audible.value === src) audible.value = null
}

/**
 * Columns for the current pane count, squarest-first: 1, 2, 2, 2, 3, 3...
 *
 * Rows follow from the count, so the grid stays close to square instead of
 * growing in one direction. The panes themselves letterbox whatever aspect the
 * cell ends up with.
 */
const columns = computed(() => Math.ceil(Math.sqrt(streams.value.length || 1)))
</script>

<template>
  <div class="app">
    <form class="url-bar" @submit.prevent="add">
      <input
        v-model="input"
        class="url-input"
        type="url"
        placeholder="https://twitch.tv/… , https://youtube.com/watch?v=… , or a .m3u8 URL"
        aria-label="Stream URL"
      />
      <button class="url-submit" type="submit">Add</button>
    </form>

    <div class="presets">
      <form class="preset-save" @submit.prevent="save">
        <input
          v-model="presetName"
          class="preset-input"
          type="text"
          placeholder="Name this set"
          aria-label="Preset name"
        />
        <button class="preset-submit" type="submit">Save</button>
      </form>

      <ul v-if="saved.length" class="preset-list">
        <li v-for="preset in saved" :key="preset.name" class="preset">
          <button class="preset-open" type="button" @click="open(preset)">{{ preset.name }}</button>
          <button
            class="preset-forget"
            type="button"
            :aria-label="`Forget ${preset.name}`"
            @click="forget(preset.name)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>

    <p v-if="error" class="url-error" role="alert">{{ error }}</p>

    <main
      class="stage"
      :class="{ 'stage-empty': streams.length === 0 }"
      :style="{ '--columns': columns }"
    >
      <StreamPane
        v-for="stream in streams"
        :key="stream.src"
        :stream="stream"
        :audible="stream.src === audible"
        @focus="audible = stream.src"
        @close="remove(stream.src)"
      />
      <p v-if="streams.length === 0" class="empty">Paste a stream URL above to start watching.</p>
    </main>

    <ExitDialog />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.url-bar {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  font: inherit;
  font-size: 14px;
  color: var(--p-surface-900);
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-400);
}

.url-input:focus {
  outline: 2px solid var(--p-primary-color);
  outline-offset: -2px;
}

/* 32px to match the kit's button height, as the exit dialog does. */
.url-submit {
  height: 32px;
  padding: 0 16px;
  font: inherit;
  font-size: 14px;
  color: var(--p-primary-contrast-color);
  background: var(--p-primary-color);
  border: 1px solid transparent;
  cursor: pointer;
}

.presets {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.preset-save {
  display: flex;
  gap: 6px;
}

.preset-input {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  font: inherit;
  font-size: 13px;
  color: var(--p-surface-900);
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-400);
}

.preset-input:focus {
  outline: 2px solid var(--p-primary-color);
  outline-offset: -2px;
}

.preset-submit {
  height: 26px;
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-400);
  cursor: pointer;
}

/* Saved sets are chips rather than a dropdown: with a handful of presets the
   whole list is worth seeing, and opening one is then a single click. */
.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.preset {
  display: flex;
  align-items: center;
  border: 1px solid var(--p-surface-300);
  background: var(--p-surface-0);
}

.preset-open {
  padding: 0 8px;
  height: 24px;
  font: inherit;
  font-size: 13px;
  color: var(--p-surface-800);
  background: none;
  border: 0;
  cursor: pointer;
}

.preset-forget {
  padding: 0 6px;
  height: 24px;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  color: var(--p-surface-500);
  background: none;
  border: 0;
  cursor: pointer;
}

.preset-forget:hover {
  color: var(--p-surface-900);
}

.url-error {
  margin: 0;
  font-size: 13px;
  color: #da1e28;
}

.stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: 8px;
}

.stage-empty {
  display: flex;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--p-surface-500);
  border: 1px dashed var(--p-surface-300);
  font-size: 14px;
}
</style>
