import { safeStorage } from 'electron'

const ENC_PREFIX = 'enc:v1:'

/** 加密字符串。safeStorage 不可用时返回原文(开发兜底)。 */
export function encryptSecret(plain: string): string {
  if (!plain) return ''
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64')
    }
  } catch {
    // fall through to plaintext
  }
  return plain
}

/** 解密字符串。非加密前缀视为明文直接返回。 */
export function decryptSecret(stored: string): string {
  if (!stored) return ''
  if (!stored.startsWith(ENC_PREFIX)) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'))
  } catch {
    return ''
  }
}

/** 判断存储值是否已加密。 */
export function isEncrypted(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(ENC_PREFIX)
}
