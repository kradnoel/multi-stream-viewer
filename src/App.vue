<script setup lang="ts">
import { computed, ref } from 'vue'
import ExitDialog from './components/ExitDialog.vue'
import StreamPane from './components/StreamPane.vue'
import { parseStreamUrl, type ParsedStream } from './lib/streams'

const input = ref('')
const streams = ref<ParsedStream[]>([])
const error = ref<string | null>(null)

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
}

const remove = (src: string): void => {
  streams.value = streams.value.filter((s) => s.src !== src)
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
