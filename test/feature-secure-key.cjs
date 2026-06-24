const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { SettingsService } = require('../dist/main/services/SettingsService.js')
const { encryptSecret, decryptSecret, isEncrypted } = require('../dist/main/security/secureStore.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-key-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const settings = new SettingsService(repo)

  // 保存后读回应保持一致(读写对称，无论 safeStorage 是否可用)
  await settings.saveLLMConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'sk-secret-123', model: 'demo' })
  const cfg = await settings.getLLMConfig()
  assert.equal(cfg.apiKey, 'sk-secret-123')
  assert.equal(cfg.baseUrl, 'https://api.example.com/v1')
  assert.equal(cfg.model, 'demo')

  // encryptSecret/decryptSecret 往返一致
  assert.equal(decryptSecret(encryptSecret('hello')), 'hello')
  // 空串
  assert.equal(encryptSecret(''), '')
  assert.equal(decryptSecret(''), '')
  // 明文(无前缀)被 decrypt 原样返回
  assert.equal(decryptSecret('plain-text-key'), 'plain-text-key')

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main().then(() => { console.log('Secure key tests passed'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
