import { type NextRequest, NextResponse } from "next/server"
import { protectApiRoute } from "@/lib/api-protection"

interface ExtractionResult {
  success: boolean
  sourceCode?: string
  error?: string
  size?: string
  title?: string
  method?: string
}

// Helper function to validate URL
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch (_) {
    return false
  }
}

// Helper function to extract title from HTML
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : "Unknown Title"
}

// Helper function to clean and format HTML
function cleanHtml(html: string): string {
  // Remove excessive whitespace but maintain structure
  return html
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .trim()
}

// Method 1: Enhanced fetch with anti-bot headers
async function fetchWithStandardHeaders(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'DNT': '1',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(20000), // Increased timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Enhanced Standard Fetch'
    }
  } catch (error) {
    return {
      success: false,
      error: `Enhanced standard fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Enhanced Standard Fetch'
    }
  }
}

// Method 2: Enhanced mobile user agent with realistic headers
async function fetchWithMobileHeaders(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'DNT': '1',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(18000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Enhanced Mobile Safari'
    }
  } catch (error) {
    return {
      success: false,
      error: `Enhanced mobile fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Enhanced Mobile Safari'
    }
  }
}

// Method 3: Fetch with search engine bot headers
async function fetchWithBotHeaders(url: string): Promise<ExtractionResult> {
  try {
    // Try multiple search engine bots
    const botUserAgents = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
    ]
    
    const userAgent = botUserAgents[Math.floor(Math.random() * botUserAgents.length)]
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Search Engine Bot'
    }
  } catch (error) {
    return {
      success: false,
      error: `Search engine bot fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Search Engine Bot'
    }
  }
}

// Method 4: Simple fetch without special headers
async function fetchSimple(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // Shorter timeout for simple fetch
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Simple Fetch'
    }
  } catch (error) {
    return {
      success: false,
      error: `Simple fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Simple Fetch'
    }
  }
}

// Method 5: Fetch with social media crawler headers (often whitelisted)
async function fetchWithSocialCrawler(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Social Crawler'
    }
  } catch (error) {
    return {
      success: false,
      error: `Social crawler failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Social Crawler'
    }
  }
}

// Method 6: Fetch with Twitter crawler headers
async function fetchWithTwitterBot(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Twitterbot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Twitter Bot'
    }
  } catch (error) {
    return {
      success: false,
      error: `Twitter bot failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Twitter Bot'
    }
  }
}

// Method 7: Fetch with delay and Firefox headers
async function fetchWithDelayedFirefox(url: string): Promise<ExtractionResult> {
  try {
    // Add a small delay to avoid rapid requests
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'TE': 'trailers',
      },
      signal: AbortSignal.timeout(18000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Delayed Firefox'
    }
  } catch (error) {
    return {
      success: false,
      error: `Delayed Firefox failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Delayed Firefox'
    }
  }
}

// Method 8: Advanced browser simulation with session-like headers
async function fetchWithAdvancedBrowser(url: string): Promise<ExtractionResult> {
  try {
    // Add delay to simulate human behavior
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'DNT': '1',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/search?q=' + encodeURIComponent(url),
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Advanced Browser Simulation'
    }
  } catch (error) {
    return {
      success: false,
      error: `Advanced browser simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Advanced Browser Simulation'
    }
  }
}

// Method 9: Try accessing through different path variations
async function fetchWithPathVariations(url: string): Promise<ExtractionResult> {
  try {
    // Try the original URL with different query parameters or modifications
    const variations = [
      url,
      url + (url.includes('?') ? '&' : '?') + 'ref=direct',
      url + (url.includes('?') ? '&' : '?') + 'utm_source=google',
      url.replace(/\/$/, '') + '/', // Add or remove trailing slash
    ]

    for (const variantUrl of variations) {
      try {
        const response = await fetch(variantUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          signal: AbortSignal.timeout(15000),
        })

        if (response.ok) {
          const html = await response.text()
          const cleanedHtml = cleanHtml(html)
          
          return {
            success: true,
            sourceCode: cleanedHtml,
            size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
            title: extractTitle(html),
            method: `Path Variation (${variantUrl !== url ? 'modified' : 'original'})`
          }
        }
      } catch (error) {
        // Continue to next variation
        console.log(`Path variation ${variantUrl} failed:`, error)
      }
    }

    throw new Error('All path variations failed')
  } catch (error) {
    return {
      success: false,
      error: `Path variations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Path Variations'
    }
  }
}

// Method 10: Fetch with minimal curl headers
async function fetchWithCurlHeaders(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'curl/7.68.0',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const cleanedHtml = cleanHtml(html)
    
    return {
      success: true,
      sourceCode: cleanedHtml,
      size: Buffer.byteLength(cleanedHtml, 'utf8').toString(),
      title: extractTitle(html),
      method: 'Curl Headers'
    }
  } catch (error) {
    return {
      success: false,
      error: `Curl fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'Curl Headers'
    }
  }
}

export async function POST(request: NextRequest) {
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: "Valid URL is required" 
        },
        { status: 400 }
      )
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid URL format. Please provide a valid HTTP or HTTPS URL." 
        },
        { status: 400 }
      )
    }

    console.log(`Starting source extraction for: ${url}`)

    // Array of extraction methods to try in order (most likely to succeed first)
    const extractionMethods = [
      () => fetchWithStandardHeaders(url),
      () => fetchWithSocialCrawler(url),
      () => fetchWithTwitterBot(url),
      () => fetchWithMobileHeaders(url),
      () => fetchWithBotHeaders(url),
      () => fetchWithDelayedFirefox(url),
      () => fetchWithAdvancedBrowser(url),
      () => fetchWithPathVariations(url),
      () => fetchSimple(url),
      () => fetchWithCurlHeaders(url),
    ]

    let lastError = ""
    let attemptedMethods: string[] = []

    // Try each method until one succeeds
    for (const method of extractionMethods) {
      try {
        console.log(`Attempting extraction method...`)
        const result = await method()
        
        attemptedMethods.push(result.method || 'Unknown')
        
        if (result.success) {
          console.log(`✅ Success with method: ${result.method}`)
          return NextResponse.json({
            success: true,
            sourceCode: result.sourceCode,
            size: result.size,
            title: result.title,
            method: result.method,
            attemptedMethods
          })
        } else {
          lastError = result.error || 'Unknown error'
          console.log(`❌ Failed with method: ${result.method} - ${lastError}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        lastError = errorMessage
        console.log(`❌ Method failed with exception: ${errorMessage}`)
      }
    }

    // If all methods failed
    console.log(`🚫 All extraction methods failed for: ${url}`)
    return NextResponse.json(
      { 
        success: false, 
        error: `All extraction methods failed. Last error: ${lastError}. Attempted methods: ${attemptedMethods.join(', ')}`,
        attemptedMethods
      },
      { status: 500 }
    )

  } catch (error) {
    console.error("Source extraction API error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error during source extraction" 
      },
      { status: 500 }
    )
  }
}
