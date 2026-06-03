<template>
  <div class="tag-manager">
    <!-- 新建标签 -->
    <div class="tag-create">
      <input
        v-model="newTagName"
        type="text"
        class="tag-create-input"
        placeholder="输入新标签名..."
        @keydown.enter="createTag"
      />
      <button class="tag-create-btn" @click="createTag" :disabled="!newTagName.trim()">
        + 创建
      </button>
    </div>

    <!-- 标签列表 -->
    <div v-if="tags.length === 0" class="tag-empty">
      暂无标签，请先创建一个
    </div>

    <div v-else class="tag-list">
      <div v-for="tag in tags" :key="tag.id" class="tag-list-item">
        <!-- 正常显示模式 -->
        <template v-if="editingId !== tag.id">
          <div class="tag-info">
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-count">{{ tag.count }} 篇</span>
          </div>
          <div class="tag-actions">
            <button class="tag-action-btn" @click="startEdit(tag)" title="重命名">✏️</button>
            <button class="tag-action-btn danger" @click="deleteTag(tag)" title="删除">🗑️</button>
          </div>
        </template>

        <!-- 编辑模式 -->
        <template v-else>
          <input
            v-model="editName"
            type="text"
            class="tag-edit-input"
            @keydown.enter="saveEdit(tag)"
            @keydown.escape="cancelEdit"
            ref="editInputRef"
          />
          <div class="tag-actions">
            <button class="tag-action-btn" @click="saveEdit(tag)">✅</button>
            <button class="tag-action-btn" @click="cancelEdit">❌</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const api = (window as any).electronAPI

interface TagItem {
  id: string
  name: string
  count: number
}

const tags = ref<TagItem[]>([])
const newTagName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editInputRef = ref<HTMLInputElement[] | null>(null)

onMounted(async () => {
  await loadTags()
})

const loadTags = async () => {
  try {
    tags.value = await api.getAllTags()
  } catch (_e) {
    // 首次使用可能无标签
    tags.value = []
  }
}

const createTag = async () => {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    await api.createTag(name)
    newTagName.value = ''
    await loadTags()
  } catch (e: any) {
    alert(e.message || '创建标签失败')
  }
}

const deleteTag = async (tag: TagItem) => {
  if (!confirm(`确定要删除标签 "${tag.name}" 吗？\n这将同时移除所有文章的该标签关联。`)) return
  try {
    await api.deleteTag(tag.id)
    await loadTags()
  } catch (e: any) {
    alert(e.message || '删除标签失败')
  }
}

const startEdit = (tag: TagItem) => {
  editingId.value = tag.id
  editName.value = tag.name
  nextTick(() => {
    if (editInputRef.value && editInputRef.value.length > 0) {
      editInputRef.value[0]?.focus()
    }
  })
}

const saveEdit = async (tag: TagItem) => {
  const name = editName.value.trim()
  if (!name) return
  try {
    await api.updateTag(tag.id, name)
    editingId.value = null
    await loadTags()
  } catch (e: any) {
    alert(e.message || '重命名失败')
  }
}

const cancelEdit = () => {
  editingId.value = null
}
</script>

<style scoped>
.tag-manager {
  width: 100%;
}

.tag-create {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tag-create-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.tag-create-input:focus {
  border-color: #409eff;
}

.tag-create-btn {
  padding: 8px 16px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.tag-create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-create-btn:hover:not(:disabled) {
  background: #66b1ff;
}

.tag-empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 16px 0;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.tag-count {
  font-size: 12px;
  color: #909399;
}

.tag-actions {
  display: flex;
  gap: 4px;
}

.tag-action-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.tag-action-btn:hover {
  background: #f5f7fa;
}

.tag-action-btn.danger:hover {
  background: #fef0f0;
}

.tag-edit-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #409eff;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  margin-right: 8px;
}
</style>
