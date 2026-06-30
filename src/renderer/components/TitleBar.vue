<template>
  <div class="titlebar">
    <div class="titlebar-title">Lumina</div>
    <button class="settings-btn" @click="$emit('open-settings')" title="设置">
      ⚙️
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'open-settings': []
}>()
</script>

<style scoped>
.titlebar {
  height: 40px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
}

.titlebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.settings-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.settings-btn:hover {
  background: #f5f7fa;
}
</style>
