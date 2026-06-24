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

      <button class="btn-suggest" :disabled="isSuggesting || !articleId" @click="fetchSuggestions">
        {{ isSuggesting ? 'AI 生成中...' : 'AI 建议标签' }}
      </button>
      <div v-if="suggestError" class="suggest-error">{{ suggestError }}</div>
      <div v-if="suggestions.length" class="suggest-list">
        <label v-for="s in suggestions" :key="s.name" class="suggest-item">
          <input type="checkbox" v-model="s.checked" />
          <span>{{ s.name }}</span>
          <span v-if="s.existing" class="suggest-existing">已有</span>
        </label>
      </div>

      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="handleConfirm" class="btn-confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ articleId?: string }>()

const $emit = defineEmits<{
  close: []
  confirm: [tagNames: string[]]
}>()

const tagName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isSuggesting = ref(false)
const suggestError = ref('')
const suggestions = ref<Array<{ name: string; checked: boolean; existing: boolean }>>([])

onMounted(() => {
  inputRef.value?.focus()
})

const fetchSuggestions = async () => {
  if (!window.electronAPI?.suggestTags || !props.articleId) return
  isSuggesting.value = true
  suggestError.value = ''
  try {
    const existingTags = await window.electronAPI.getAllTags()
    const existingNames = new Set(existingTags.map((t) => t.name))
    const names = await window.electronAPI.suggestTags(props.articleId)
    suggestions.value = names.map((name) => ({
      name,
      checked: true,
      existing: existingNames.has(name)
    }))
    if (!names.length) suggestError.value = '未获得建议标签'
  } catch (e) {
    suggestError.value = `获取建议失败：${e instanceof Error ? e.message : String(e)}`
  } finally {
    isSuggesting.value = false
  }
}

const handleConfirm = () => {
  const picked = suggestions.value.filter((s) => s.checked).map((s) => s.name)
  if (tagName.value.trim()) picked.push(tagName.value.trim())
  const unique = Array.from(new Set(picked))
  if (unique.length) $emit('confirm', unique)
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

input[type='text'] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

input[type='text']:focus {
  outline: none;
  border-color: #4a90e2;
}

.btn-suggest {
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px solid #4a90e2;
  border-radius: 4px;
  background: #fff;
  color: #4a90e2;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-suggest:hover:not(:disabled) {
  background: #eef5fd;
}

.btn-suggest:disabled {
  border-color: #ccc;
  color: #aaa;
  cursor: not-allowed;
}

.suggest-error {
  margin-top: 8px;
  font-size: 13px;
  color: #d9534f;
}

.suggest-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.suggest-existing {
  font-size: 12px;
  color: #888;
  background: #f0f0f0;
  border-radius: 3px;
  padding: 1px 6px;
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
