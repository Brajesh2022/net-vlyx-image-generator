import { type NextRequest, NextResponse } from "next/server"

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getBrowserHeaders(referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": getRandomUserAgent(),
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    DNT: "1",
    Connection: "keep-alive",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
  }
  
  if (referer) {
    headers.Referer = referer
    headers.Origin = referer
  }
  
  return headers
}

async function tryFetchImage(url: string, referer?: string): Promise<Response> {
  const headers = getBrowserHeaders(referer)
  
  // Try different approaches to bypass hotlinking protection
  const attempts = [
    // Attempt 1: With full referer
    () => fetch(url, { headers, signal: AbortSignal.timeout(10000) }),
    
    // Attempt 2: Without referer 
    () => {
      const { Referer, Origin, ...headersWithoutReferer } = headers
      return fetch(url, { 
        headers: headersWithoutReferer,
        signal: AbortSignal.timeout(10000) 
      })
    },
    
    // Attempt 3: With generic referer
    () => fetch(url, { 
      headers: { ...headers, Referer: "https://www.google.com/", Origin: "https://www.google.com" },
      signal: AbortSignal.timeout(10000) 
    }),
    
    // Attempt 4: With minimal headers
    () => fetch(url, { 
      headers: { "User-Agent": getRandomUserAgent() },
      signal: AbortSignal.timeout(10000) 
    }),
  ]
  
  for (const attempt of attempts) {
    try {
      const response = await attempt()
      if (response.ok) {
        return response
      }
    } catch (error) {
      console.log("Fetch attempt failed:", error)
    }
  }
  
  throw new Error("All fetch attempts failed")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get("url")
  
  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
  }

  try {
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(imageUrl)
    
    // Extract domain for referer
    const urlObj = new URL(decodedUrl)
    const referer = `${urlObj.protocol}//${urlObj.host}`

    console.log("Proxying image...")

    const response = await tryFetchImage(decodedUrl, referer)

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const imageBuffer = await response.arrayBuffer()

    // Create response with proper headers
    const proxyResponse = new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })

    return proxyResponse
  } catch (error) {
    console.error("Error proxying image:", error)
    
    // Return a movie-themed placeholder image instead of error
    const fallbackImageUrl = "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    
    try {
      const fallbackResponse = await fetch(fallbackImageUrl)
      const fallbackBuffer = await fallbackResponse.arrayBuffer()
      
      return new NextResponse(fallbackBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Failed to proxy image and fallback failed" },
        { status: 500 }
      )
    }
  }
}
