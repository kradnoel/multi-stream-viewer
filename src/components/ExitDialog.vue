<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { listen  } from '@tauri-apps/api/event'
import { exit } from '@tauri-apps/plugin-process'
const isOpen = ref(false)
//const dontAskAgain = ref(false)
let unlisten

onMounted(async () => {
  unlisten = await listen('show-exit-dialog', () => {
    isOpen.value = true
  })
})

onUnmounted(() => {
  if (unlisten) unlisten()
})

const handleExit = async () => {
  await exit(0)
}

const handleCancel = () => {
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
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.30s ease forwards;
}

@keyframes fadeIn {
  to {
    background: rgba(0, 0, 0, 0.5);
  }
}

.dialog {
  background: #1e1e1e;
  border-radius: 8px;
  min-width: 350px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transform: scale(0.95);
  opacity: 0;
  animation: scaleIn 0.30s ease forwards;
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
  border-bottom: 1px solid #333;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.icon {
  background: #0078d4;
  color: white;
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
  color: #ccc;
}

.dialog-body p {
  margin: 0 0 16px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
}

</style>