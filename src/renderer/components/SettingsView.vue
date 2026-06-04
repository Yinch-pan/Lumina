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
          <input
        type="text"
            class="form-input"
            placeholder="gpt-4"
            v-model="llmConfig.model"
        />
        <div class="form-hint">例如：gpt-4, gpt-3.5-turbo, claude-3-opus</div>
        </div>

        <button class="btn-primary" @click="saveLLMConfig">保存 LLM 配置</button>
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

        <button class="btn-primary" @click="saveReadingSettings">保存阅读设置</button>
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
  'settings-updated': []
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
  } catch (error) {
    console.error('Failed to load settings', error)
  }
})

const saveLLMConfig = async () => {
  if (!window.electronAPI) {
    alert('当前环境不支持保存设置')
    return
  }

  try {
    await window.electronAPI.saveLLMConfig(llmConfig.value)
    alert('LLM 配置已保存')
  } catch (error) {
    console.error('Failed to save LLM config', error)
    alert(`保存失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const saveReadingSettings = async () => {
  if (!window.electronAPI) {
    alert('当前环境不支持保存设置')
    return
  }

  try {
    await window.electronAPI.saveSetting('reading.fontSize', readingSettings.value.fontSize)
    await window.electronAPI.saveSetting('reading.lineHeight', readingSettings.value.lineHeight)
    await window.electronAPI.saveSetting('reading.theme', readingSettings.value.theme)
    emit('settings-updated')
    alert('阅读设置已保存')
  } catch (error) {
    console.error('Failed to save reading settings', error)
    alert(`保存失败：${error instanceof Error ? error.message : String(error)}`)
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
  background: #ffffff;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e4e7ed;
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
  background: #f8f9fa;
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
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
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
</style>
