<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1 class="settings-title">设置</h1>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="settings-content">
      <!-- LLM 配置 -->
      <div class="settings-section">
        <h2 class="section-title">🤖 大语言模型配置</h2>
        <div class="section-description">
          配置 OpenAI-compatible API 以使用 AI 摘要和翻译功能
        </div>

        <div class="form-group">
          <label class="form-label">Base URL</label>
          <input
            type="text"
            class="form-input"
            placeholder="https://api.openai.com/v1"
            v-model="llmConfig.baseUrl"
          />
          <div class="form-hint">支持 OpenAI、Azure OpenAI、本地模型等</div>
      </div>

        <div class="form-group">
          <label class="form-label">API Key</label>
          <input
            type="password"
          class="form-input"
          placeholder="sk-..."
            v-model="llmConfig.apiKey"
          />
          <div class="form-hint">您的 API Key 将安全存储在本地</div>
        </div>

        <div class="form-group">
        <label class="form-label">Model</label>
          <div class="model-input-row">
            <select
              v-if="availableModels.length > 0"
              class="form-select model-select"
              v-model="llmConfig.model"
            >
              <option v-for="m in availableModels" :key="m" :value="m">{{ m }}</option>
            </select>
            <input
              v-else
              type="text"
              class="form-input model-input"
              placeholder="gpt-4"
              v-model="llmConfig.model"
            />
            <button
              class="btn-secondary"
              :disabled="isLoadingModels"
              @click="fetchModels"
            >
              {{ isLoadingModels ? '获取中...' : '获取模型列表' }}
            </button>
          </div>
          <div class="form-hint">点击"获取模型列表"自动填充，或手动输入模型名称</div>
          <div v-if="modelError" class="form-error">{{ modelError }}</div>
        </div>

        <button class="btn-primary" :disabled="isSaving" @click="saveLLMConfig">保存 LLM 配置</button>
        <div v-if="statusMessage" class="form-hint">{{ statusMessage }}</div>
      </div>

      <!-- 阅读设置 -->
      <div class="settings-section">
        <h2 class="section-title">📖 阅读设置</h2>

        <div class="form-group">
          <label class="form-label">字体大小</label>
          <select class="form-select" v-model="readingSettings.fontSize">
          <option value="14">小 (14px)</option>
            <option value="16">中 (16px)</option>
            <option value="18">大 (18px)</option>
            <option value="20">特大 (20px)</option>
        </select>
        </div>

        <div class="form-group">
        <label class="form-label">行距</label>
          <select class="form-select" v-model="readingSettings.lineHeight">
            <option value="1.5">紧凑 (1.5)</option>
            <option value="1.8">标准 (1.8)</option>
        <option value="2.0">宽松 (2.0)</option>
          </select>
        </div>

     <div class="form-group">
          <label class="form-label">主题</label>
          <select class="form-select" v-model="readingSettings.theme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        <button class="btn-primary" :disabled="isSaving" @click="saveReadingSettings">保存阅读设置</button>
      </div>

      <!-- LLM 用量统计 -->
      <div class="settings-section">
        <h2 class="section-title">📊 AI 用量统计</h2>
        <div class="section-description">
          查看 AI 摘要和翻译的使用情况
        </div>

        <div class="usage-stats">
          <div class="stat-item">
            <span class="stat-label">总调用次数</span>
            <span class="stat-value">{{ usageStats.totalCalls }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总 Token 数</span>
            <span class="stat-value">{{ usageStats.totalTokens.toLocaleString() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">摘要次数</span>
            <span class="stat-value">{{ usageStats.summaryCalls }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">翻译次数</span>
            <span class="stat-value">{{ usageStats.translationCalls }}</span>
          </div>
        </div>

        <div v-if="usageStats.byModel.length > 0" class="model-stats">
          <h3 class="subsection-title">按模型统计</h3>
          <div v-for="model in usageStats.byModel" :key="model.model" class="model-item">
            <span class="model-name">{{ model.model }}</span>
            <span class="model-stats-text">{{ model.calls }} 次调用, {{ model.tokens.toLocaleString() }} tokens</span>
          </div>
        </div>
      </div>

      <!-- 应用信息 -->
      <div class="settings-section">
      <h2 class="section-title">ℹ️ 关于 Mercury</h2>
        <div class="info-item">
          <span class="info-label">版本</span>
       <span class="info-value">1.0.0 (Demo)</span>
      </div>
        <div class="info-item">
          <span class="info-label">数据目录</span>
        <span class="info-value">~/.local/share/mercury/</span>
        </div>
        <div class="info-item">
          <span class="info-label">GitHub</span>
          <a href="https://github.com/Yinch-pan/Mercury" target="_blank" class="info-link">
            Yinch-pan/Mercury
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  'close': []
  'settings-changed': []
}>()

const llmConfig = ref({
  baseUrl: '',
  apiKey: '',
  model: ''
})

const readingSettings = ref({
  fontSize: '16',
  lineHeight: '1.8',
  theme: 'light'
})

const isSaving = ref(false)
const statusMessage = ref('')
const isLoadingModels = ref(false)
const modelError = ref('')
const availableModels = ref<string[]>([])

const usageStats = ref({
  totalCalls: 0,
  totalTokens: 0,
  summaryCalls: 0,
  translationCalls: 0,
  byModel: [] as Array<{ model: string; calls: number; tokens: number }>
})

onMounted(async () => {
  if (!window.electronAPI) {
    return
  }

  try {
    // 加载 LLM 配置
    const config = await window.electronAPI.getLLMConfig()
    llmConfig.value = {
      baseUrl: config.baseUrl || '',
      apiKey: config.apiKey || '',
      model: config.model || ''
    }

    // 加载阅读设置
    const fontSize = await window.electronAPI.getSetting('reading.fontSize')
    const lineHeight = await window.electronAPI.getSetting('reading.lineHeight')
    const theme = await window.electronAPI.getSetting('reading.theme')

    if (fontSize) readingSettings.value.fontSize = fontSize
    if (lineHeight) readingSettings.value.lineHeight = lineHeight
    if (theme) readingSettings.value.theme = theme

    // 加载 LLM 用量统计
    const stats = await window.electronAPI.getLLMUsageStats()
    usageStats.value = stats
  } catch (error) {
    console.error('Failed to load settings', error)
  }
})

const saveLLMConfig = async () => {
  if (!window.electronAPI) {
    alert('当前环境不支持保存设置')
    return
  }

  isSaving.value = true
  statusMessage.value = ''
  try {
    await window.electronAPI.saveLLMConfig({
      baseUrl: llmConfig.value.baseUrl,
      apiKey: llmConfig.value.apiKey,
      model: llmConfig.value.model
    })
    statusMessage.value = 'LLM 配置已保存'
  } catch (error) {
    console.error('Failed to save LLM config', error)
    statusMessage.value = `保存失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isSaving.value = false
  }
}

const fetchModels = async () => {
  if (!window.electronAPI) {
    modelError.value = '当前环境不支持获取模型列表'
    return
  }

  isLoadingModels.value = true
  modelError.value = ''
  try {
    const models = await window.electronAPI.fetchLLMModels()
    availableModels.value = models
    // 清空当前模型，强制用户从列表中选择
    llmConfig.value.model = models.length > 0 ? models[0] : ''
  } catch (error) {
    console.error('Failed to fetch models', error)
    modelError.value = `获取失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingModels.value = false
  }
}

const saveReadingSettings = async () => {
  if (!window.electronAPI) {
    alert('当前环境不支持保存设置')
    return
  }

  isSaving.value = true
  statusMessage.value = ''
  try {
    await window.electronAPI.saveSetting('reading.fontSize', readingSettings.value.fontSize)
    await window.electronAPI.saveSetting('reading.lineHeight', readingSettings.value.lineHeight)
    await window.electronAPI.saveSetting('reading.theme', readingSettings.value.theme)
    statusMessage.value = '阅读设置已保存'
    emit('settings-changed')
  } catch (error) {
    console.error('Failed to save reading settings', error)
    statusMessage.value = `保存失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.settings-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-color);
  color: var(--text-color);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  color: #606266;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e4e7ed;
  color: #409eff;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.settings-section {
  background: var(--hover-bg);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.section-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
  background: var(--card-bg);
  color: var(--text-color);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #409eff;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.form-error {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 6px;
}

.model-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-select,
.model-input {
  flex: 1;
}

.btn-secondary {
  padding: 10px 16px;
  background: #ffffff;
  color: #409eff;
  border: 1px solid #409eff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-secondary:hover {
  background: #ecf5ff;
}

.btn-secondary:disabled {
  color: #c0c4cc;
  border-color: #e4e7ed;
  cursor: not-allowed;
  background: #ffffff;
}

.btn-primary {
  padding: 10px 20px;
  background: #409eff;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #66b1ff;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #606266;
}

.info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

.info-link {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.model-stats {
  margin-top: 16px;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
}

.model-item:last-child {
  border-bottom: none;
}

.model-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.model-stats-text {
  font-size: 14px;
  color: #606266;
}
</style>
