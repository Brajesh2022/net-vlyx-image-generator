import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

// In-memory cache for Edge runtime (persists across requests in same instance)
const cache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>()
const MAX_CACHE_SIZE = 50
const CACHE_TTL = 3600000 // 1 hour

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

async function validateToken(token: string | null): Promise<boolean> {
  if (!token) return false
  
  try {
    // Decode base64url
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    const [timestamp, random, signature] = decoded.split(':')
    
    if (!timestamp || !random || !signature) return false
    
    // Check expiry (60 seconds)
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (tokenAge > 60000 || tokenAge < 0) return false
    
    // Verify signature using Web Crypto API
    const secret = process.env.IMAGE_PROXY_SECRET || 'change-this-in-production-2024'
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const data = encoder.encode(`${timestamp}:${random}`)
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    )
    
    return await crypto.subtle.verify('HMAC', key, signatureBytes, data)
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

function decodeImageId(id: string): string | null {
  try {
    // Simple base64url decode for Edge runtime
    const decoded = atob(id.replace(/-/g, '+').replace(/_/g, '/'))
    
    // Basic validation - should be a URL
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded
    }
    
    return null
  } catch (error) {
    return null
  }
}

function isValidReferer(referer: string | null, origin: string | null): boolean {
  if (!referer && !origin) return false
  
  const validHosts = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
    'localhost',
  ].filter(Boolean)
  
  const checkUrl = referer || origin
  if (!checkUrl) return false
  
  try {
    const url = new URL(checkUrl)
    return validHosts.some(host => url.hostname.includes(host as string))
  } catch {
    return false
  }
}

async function fetchImage(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const urlObj = new URL(url)
  const referer = `${urlObj.protocol}//${urlObj.host}`
  
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': referer,
    'Origin': referer,
  }
  
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  
  const data = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  
  return { data, contentType }
}

function getCachedImage(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  return { data: cached.data, contentType: cached.contentType }
}

function setCachedImage(key: string, data: ArrayBuffer, contentType: string) {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  
  cache.set(key, {
    data,
    contentType,
    timestamp: Date.now(),
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Security checks
    const token = request.headers.get('x-image-token') || request.nextUrl.searchParams.get('t')
    const referer = request.headers.get('referer')
    const origin = request.headers.get('origin')
    
    // Validate token
    const isValidToken = await validateToken(token)
    
    // Validate referer/origin
    const isValidSource = isValidReferer(referer, origin)
    
    // Require BOTH token AND valid referer (defense in depth)
    if (!isValidToken || !isValidSource) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
    
    // Decode image ID to URL
    const imageUrl = decodeImageId(id)
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Invalid image ID' },
        { status: 400 }
      )
    }
    
    // Check cache first
    const cached = getCachedImage(id)
    if (cached) {
      return new NextResponse(cached.data, {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=3600, immutable',
          'X-Cache': 'HIT',
        },
      })
    }
    
    // Fetch and cache
    const { data, contentType } = await fetchImage(imageUrl)
    
    // Cache small images (< 500KB)
    if (data.byteLength < 500000) {
      setCachedImage(id, data, contentType)
    }
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Error proxying image:', error)
    
    // Return empty response for errors (client will handle fallback)
    return new NextResponse(null, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
