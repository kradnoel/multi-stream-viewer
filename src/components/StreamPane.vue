<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { ParsedStream } from '../lib/streams'

const props = defineProps<{ stream: ParsedStream }>()

const video = ref<HTMLVideoElement | null>(null)
const error = ref<string | null>(null)

/**
 * hls.js instance for the current manifest, if this pane is playing one.
 * Held so it can be torn down: each instance keeps network requests and buffers
 * running, so replacing a stream without destroying the old one leaks both.
 */
let hls: { destroy: () => void } | null = null

const teardown = (): void => {
  if (hls) {
    hls.destroy()
    hls = null
  }
}

/**
 * Attaches a manifest to the <video> element.
 *
 * Safari plays HLS natively, so on macOS the manifest is set as the src
 * directly. WebView2 (Windows) and WebKitGTK (Linux) do not, and need hls.js
 * driving Media Source Extensions. The library is imported dynamically so the
 * 592KB chunk (187KB gzipped) only loads for panes that play a manifest.
 */
const attachHls = async (src: string, element: HTMLVideoElement): Promise<void> => {
  teardown()
  error.value = null

  if (element.canPlayType('application/vnd.apple.mpegurl')) {
    element.src = src
    return
  }

  try {
    const { default: Hls } = await import('hls.js')

    if (!Hls.isSupported()) {
      error.value = 'This webview cannot play HLS.'
      return
    }

    const instance = new Hls({ enableWorker: true })
    hls = instance

    instance.on(Hls.Events.ERROR, (_event, data) => {
      // Non-fatal errors are recovered by hls.js on its own; surfacing them
      // would flicker a message during ordinary network hiccups.
      if (data.fatal) {
        error.value = `Playback failed: ${data.details}`
      }
    })

    instance.loadSource(src)
    instance.attachMedia(element)
  } catch (cause) {
    error.value = 'Could not load the HLS player.'
    console.error('hls.js failed to load.', cause)
  }
}

watch(
  () => props.stream,
  (stream) => {
    if (stream.kind !== 'hls') {
      teardown()
      return
    }
    if (video.value) void attachHls(stream.src, video.value)
  },
  { immediate: true },
)

// The element does not exist until the template renders, so the first manifest
// is attached from the ref callback rather than the watcher above.
const onVideoMounted = (element: HTMLVideoElement | null): void => {
  video.value = element
  if (element && props.stream.kind === 'hls') void attachHls(props.stream.src, element)
}

onBeforeUnmount(teardown)
</script>

<template>
  <div class="pane">
    <header class="pane-header">
      <span class="pane-kind">{{ stream.kind }}</span>
      <span class="pane-id">{{ stream.id }}</span>
    </header>

    <div class="pane-body">
      <p v-if="error" class="pane-error">{{ error }}</p>

      <iframe
        v-else-if="stream.kind !== 'hls'"
        :src="stream.src"
        class="pane-media"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen
        referrerpolicy="strict-origin"
      ></iframe>

      <video
        v-else
        :ref="(el) => onVideoMounted(el as HTMLVideoElement | null)"
        class="pane-media"
        controls
        autoplay
        muted
        playsinline
      ></video>
    </div>
  </div>
</template>

<style scoped>
.pane {
  display: flex;
  flex-direction: column;
  background: var(--p-surface-900);
  border: 1px solid var(--p-surface-300);
  overflow: hidden;
}

.pane-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  font-size: 12px;
}

.pane-kind {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-primary-color);
  font-weight: 600;
}

.pane-id {
  color: var(--p-surface-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pane-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

/* 16:9 is the aspect every one of these services delivers; letterboxing inside
   the pane is the player's job, not ours. */
.pane-media {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: #000;
}

.pane-error {
  margin: 0;
  padding: 16px;
  color: var(--p-surface-0);
  font-size: 13px;
}
</style>
