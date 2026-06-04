<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
  <div class="dialog">
      <h3>添加标签</h3>
      <input
      ref="inputRef"
        v-model="tagName"
        type="text"
        placeholder="请输入标签名称"
        @keyup.enter="handleConfirm"
        @keyup.esc="$emit('close')"
    />
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="handleConfirm" class="btn-confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const $emit = defineEmits<{
  close: []
  confirm: [tagName: string]
}>()

const tagName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

const handleConfirm = () => {
  if (tagName.value.trim()) {
    $emit('confirm', tagName.value.trim())
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 24px;
  border-radius: 8px;
  min-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4a90e2;
}

.dialog-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e8e8e8;
}

.btn-confirm {
  background: #4a90e2;
  color: white;
}

.btn-confirm:hover {
  background: #357abd;
}
</style>
