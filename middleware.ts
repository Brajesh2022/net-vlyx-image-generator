import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect all API routes
  if (pathname.startsWith('/api/')) {
    // Get the referer and origin
    const referer = request.headers.get('referer')
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    
    // Allow requests from the same origin (your website)
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean)

    // Check if the request is from the same origin
    let isAllowedOrigin = false
    
    if (origin && allowedOrigins.some(allowed => origin === allowed)) {
      isAllowedOrigin = true
    } else if (referer) {
      isAllowedOrigin = allowedOrigins.some(allowed => 
        allowed && referer.startsWith(allowed)
      )
    }

    // For direct browser access (no referer/origin), block the request
    // This prevents users from directly visiting /api/scrape in their browser
    if (!referer && !origin) {
      return NextResponse.json(
        { error: 'Direct access to API endpoints is not allowed' },
        { status: 403 }
      )
    }

    // If the request is not from an allowed origin, block it
    if (!isAllowedOrigin) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Add security headers to API responses
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
  }

  // For all other routes, add security headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
