<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { ParsedStream } from '../lib/streams'
import { hlsPlayer, twitchPlayer, youtubePlayer, type Player } from '../lib/players'

const props = defineProps<{
  stream: ParsedStream
  /** Whether this is the pane the user is listening to. Exactly one ever is. */
  audible: boolean
}>()

const emit = defineEmits<{ close: []; focus: [] }>()

const error = ref<string | null>(null)

/**
 * The pane's player, once its element exists.
 *
 * Held so focus changes can reach it and so it can be torn down: an hls.js
 * instance keeps network requests and buffers running, so dropping a pane
 * without destroying it leaks both.
 */
let player: Player | null = null

const teardown = (): void => {
  player?.destroy()
  player = null
}

const adopt = (next: Player): void => {
  teardown()
  player = next
  player.setMuted(!props.audible)
}

// The element does not exist until the template renders, so each player is
// created from its ref callback rather than from a watcher.
const onVideoMounted = (element: HTMLVideoElement | null): void => {
  if (!element || props.stream.kind !== 'hls') return
  error.value = null
  void hlsPlayer(element, props.stream.src, (message) => {
    error.value = message
  }).then(adopt)
}

const onFrameMounted = (element: HTMLIFrameElement | null): void => {
  if (!element) return
  adopt(props.stream.kind === 'twitch' ? twitchPlayer(element) : youtubePlayer(element))
}

// Muting is a message to a player that is already running, so moving the audio
// never reloads a pane and never disturbs the one that had it.
watch(
  () => props.audible,
  (audible) => player?.setMuted(!audible),
)

onBeforeUnmount(teardown)
</script>

<template>
  <div class="pane" :class="{ 'pane-audible': audible }" @pointerdown="emit('focus')">
    <header class="pane-header">
      <button
        class="pane-audio"
        type="button"
        :aria-pressed="audible"
        :title="audible ? 'Playing sound' : 'Listen to this stream'"
        @click.stop="emit('focus')"
      >
        {{ audible ? '🔊' : '🔇' }}
      </button>
      <span class="pane-kind">{{ stream.kind }}</span>
      <span class="pane-id">{{ stream.id }}</span>
      <button class="pane-close" type="button" aria-label="Close pane" @click.stop="emit('close')">
        ×
      </button>
    </header>

    <div class="pane-body">
      <p v-if="error" class="pane-error">{{ error }}</p>

      <iframe
        v-else-if="stream.kind !== 'hls'"
        :ref="(el) => onFrameMounted(el as HTMLIFrameElement | null)"
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

/* The audible pane is the one piece of state a glance has to find, so it is
   marked on the pane itself rather than only on its button. */
.pane-audible {
  border-color: var(--p-primary-color);
}

.pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  font-size: 12px;
}

.pane-audio {
  padding: 0;
  font-size: 13px;
  line-height: 1;
  background: none;
  border: 0;
  cursor: pointer;
  opacity: 0.55;
}

.pane-audible .pane-audio {
  opacity: 1;
}

.pane-kind {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-primary-color);
  font-weight: 600;
}

.pane-id {
  flex: 1;
  color: var(--p-surface-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pane-close {
  padding: 0 4px;
  font: inherit;
  font-size: 16px;
  line-height: 1;
  color: var(--p-surface-500);
  background: none;
  border: 0;
  cursor: pointer;
}

.pane-close:hover {
  color: var(--p-surface-900);
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
