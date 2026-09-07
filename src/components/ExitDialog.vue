<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { exit } from '@tauri-apps/plugin-process'

const isOpen = ref(false)

/** Disposes of the window-event subscription when the component goes away. */
let unlisten: UnlistenFn | undefined

// The Rust side prevents the window from closing and emits this instead, so the
// dialog is the only thing that can end the process on Windows and Linux.
onMounted(async () => {
  unlisten = await listen('show-exit-dialog', () => {
    isOpen.value = true
  })
})

onUnmounted(() => {
  if (unlisten) unlisten()
})

/** Terminates the application. The window was never allowed to close on its own. */
const handleExit = async (): Promise<void> => {
  await exit(0)
}

/** Dismisses the dialog and leaves the window open. */
const handleCancel = (): void => {
  isOpen.value = false
}
</script>

<template>
  <div v-if="isOpen" class="dialog-overlay">
    <div class="dialog">
      <div class="dialog-header">
        <div class="dialog-title">
          <span class="icon">?</span>
          <span>Confirm Exit</span>
        </div>
        <span class="close-btn" @click="handleCancel">×</span>
      </div>

      <div class="dialog-body">
        <p>Are you sure you want to exit?</p>
        <!-- <label class="checkbox">
          <input type="checkbox" v-model="dontAskAgain" />
          Don't ask again
        </label> -->
      </div>

      <div class="dialog-footer">
        <button class="btn btn-danger" @click="handleExit()">Exit</button>
        <button class="btn btn-light" @click="handleCancel()">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Colours come from the carbonless token set so the dialog follows the theme
   instead of carrying its own palette. Danger has no token in the kit, so the
   one destructive colour is declared here for both schemes. */
.dialog-overlay {
  --danger: #da1e28;
  --danger-hover: #b81922;

  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  to {
    background: rgba(0, 0, 0, 0.5);
  }
}

.dialog {
  background: var(--p-surface-0);
  color: var(--p-surface-900);
  min-width: 350px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transform: scale(0.95);
  opacity: 0;
  animation: scaleIn 0.3s ease forwards;
}

@keyframes scaleIn {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--p-surface-200);
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.icon {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.dialog-body {
  padding: 20px 16px;
  color: var(--p-surface-700);
}

.dialog-body p {
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--p-surface-200);
}

.close-btn {
  color: var(--p-surface-500);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--p-surface-900);
}

/* 32px to match the kit's button height. */
.btn {
  height: 32px;
  padding: 0 12px;
  font-size: 14px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease-in-out;
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-danger:hover {
  background: var(--danger-hover);
}

.btn-light {
  background: transparent;
  color: var(--p-surface-900);
  border-color: var(--p-surface-400);
}

.btn-light:hover {
  background: var(--p-surface-100);
}

@media (prefers-reduced-motion: reduce) {
  .dialog-overlay,
  .dialog {
    animation-duration: 0.01ms;
  }
}
</style>
