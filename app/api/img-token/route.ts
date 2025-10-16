import { NextResponse } from 'next/server'

// Simple token generation for client-side image requests
// Uses Web Crypto API (works in Edge runtime)
export const runtime = 'edge'

async function generateToken(): Promise<string> {
  const timestamp = Date.now().toString()
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const random = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Create signature using Web Crypto API
  const secret = process.env.IMAGE_PROXY_SECRET || 'change-this-in-production-2024'
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const data = encoder.encode(`${timestamp}:${random}`)
  const signature = await crypto.subtle.sign('HMAC', key, data)
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  const token = `${timestamp}:${random}:${signatureHex}`
  return btoa(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function GET() {
  try {
    const token = await generateToken()
    
    return NextResponse.json(
      { token, expiresIn: 60000 },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error generating token:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
