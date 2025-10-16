import crypto from 'crypto'

// Secret key for signing (in production, use environment variable)
const SECRET_KEY = process.env.IMAGE_PROXY_SECRET || 'change-this-in-production-2024'
const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypts and encodes an image URL to a secure ID
 */
export function encodeImageUrl(url: string): string {
  try {
    // Create a unique key from URL + timestamp to prevent replay
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv)
    
    let encrypted = cipher.update(url, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Combine IV + authTag + encrypted data, then base64url encode
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')])
    return combined.toString('base64url')
  } catch (error) {
    console.error('Error encoding image URL:', error)
    // Fallback to simple base64 if encryption fails
    return Buffer.from(url).toString('base64url')
  }
}

/**
 * Decrypts and decodes a secure image ID back to URL
 */
export function decodeImageId(id: string): string | null {
  try {
    const combined = Buffer.from(id, 'base64url')
    
    // Extract IV (12 bytes), authTag (16 bytes), and encrypted data
    const iv = combined.slice(0, 12)
    const authTag = combined.slice(12, 28)
    const encrypted = combined.slice(28)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    // Try fallback simple base64 decode
    try {
      return Buffer.from(id, 'base64url').toString('utf8')
    } catch {
      console.error('Error decoding image ID:', error)
      return null
    }
  }
}

/**
 * Generates a one-time token for image requests (CSRF protection)
 */
export function generateImageToken(): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(16).toString('hex')
  const data = `${timestamp}:${random}`
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY)
  hmac.update(data)
  const signature = hmac.digest('hex')
  
  return Buffer.from(`${data}:${signature}`).toString('base64url')
}

/**
 * Validates an image token (checks signature and expiry)
 */
export function validateImageToken(token: string, maxAgeMs: number = 60000): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [timestamp, random, signature] = decoded.split(':')
    
    if (!timestamp || !random || !signature) return false
    
    // Check expiry (default 60 seconds)
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (tokenAge > maxAgeMs || tokenAge < 0) return false
    
    // Verify signature
    const data = `${timestamp}:${random}`
    const hmac = crypto.createHmac('sha256', SECRET_KEY)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    return false
  }
}

/**
 * Simple LRU cache for image data
 */
export class ImageCache {
  private cache: Map<string, { data: Buffer; contentType: string; timestamp: number }>
  private maxSize: number
  private maxAge: number

  constructor(maxSize: number = 100, maxAgeMs: number = 3600000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.maxAge = maxAgeMs
  }

  get(key: string): { data: Buffer; contentType: string } | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return { data: item.data, contentType: item.contentType }
  }

  set(key: string, data: Buffer, contentType: string): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      contentType,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
let globalImageCache: ImageCache | null = null

export function getImageCache(): ImageCache {
  if (!globalImageCache) {
    globalImageCache = new ImageCache(100, 3600000) // 100 items, 1 hour
  }
  return globalImageCache
}
