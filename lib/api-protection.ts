import { NextRequest } from 'next/server'

/**
 * Validates if a request is coming from the same origin (your website)
 * This prevents direct access to APIs from browsers or external sources
 */
export function validateOrigin(request: NextRequest): boolean {
  const referer = request.headers.get('referer')
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  
  // Construct allowed origins
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[]

  // Check if the request has a valid referer or origin from allowed sources
  let isValid = false
  
  if (origin && allowedOrigins.some(allowed => origin === allowed)) {
    isValid = true
  } else if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    isValid = true
  }

  return isValid
}

/**
 * Validates the request and returns an error response if invalid
 * Use this at the beginning of your API route handlers
 */
export function protectApiRoute(request: NextRequest): Response | null {
  // Check if request is from same origin
  if (!validateOrigin(request)) {
    return Response.json(
      { error: 'Unauthorized access. This API can only be accessed from our website.' },
      { status: 403 }
    )
  }

  // Additional security checks can be added here
  // For example: rate limiting, API keys, etc.

  return null // null means validation passed
}

/**
 * Generate a simple token for internal API calls
 * This can be used as an additional layer of protection
 */
export function generateApiToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return Buffer.from(`${timestamp}-${random}`).toString('base64')
}

/**
 * Validate an API token
 * Token should be generated within the last 5 minutes
 */
export function validateApiToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [timestamp] = decoded.split('-')
    const tokenTime = parseInt(timestamp, 10)
    const currentTime = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    // Token should be within 5 minutes old
    return currentTime - tokenTime < fiveMinutes
  } catch {
    return false
  }
}
