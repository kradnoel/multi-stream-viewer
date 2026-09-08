<script setup lang="ts">
import { ref } from 'vue'
import ExitDialog from './components/ExitDialog.vue'
import StreamPane from './components/StreamPane.vue'
import { parseStreamUrl, type ParsedStream } from './lib/streams'

const input = ref('')
const stream = ref<ParsedStream | null>(null)
const error = ref<string | null>(null)

/**
 * One pane for now. The grid replaces this single ref with a list, which is why
 * the pane takes a whole ParsedStream rather than reaching for app state.
 */
const play = (): void => {
  const parsed = parseStreamUrl(input.value)

  if (!parsed) {
    error.value = 'Paste a Twitch or YouTube link, or a direct .m3u8 URL.'
    return
  }

  error.value = null
  stream.value = parsed
}
</script>

<template>
  <div class="app">
    <form class="url-bar" @submit.prevent="play">
      <input
        v-model="input"
        class="url-input"
        type="url"
        placeholder="https://twitch.tv/… , https://youtube.com/watch?v=… , or a .m3u8 URL"
        aria-label="Stream URL"
      />
      <button class="url-submit" type="submit">Play</button>
    </form>

    <p v-if="error" class="url-error" role="alert">{{ error }}</p>

    <main class="stage">
      <StreamPane v-if="stream" :key="stream.src" :stream="stream" />
      <p v-else class="empty">Paste a stream URL above to start watching.</p>
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
  display: flex;
}

.stage > * {
  flex: 1;
  min-width: 0;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--p-surface-500);
  border: 1px dashed var(--p-surface-300);
  font-size: 14px;
}
</style>
