export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"

interface DecodeResult {
  success: boolean
  final_link?: string
  error?: string
  debug_info?: any
}

// Enhanced user agents for better compatibility
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getBrowserHeaders(): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    Referer: "https://google.com/",
  }
}

async function decodeTechyboyPayload(payload: string): Promise<DecodeResult> {
  try {
    console.log("TechyBoy/TaazaBull payload received:", payload.substring(0, 100) + "...")

    // Step A: 1st Base64 Decode
    let decoded_1: Uint8Array
    try {
      decoded_1 = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    } catch (e) {
      return { success: false, error: `Failed at first Base64 decode: ${e}` }
    }

    // Step B: 2nd Base64 Decode
    let decoded_2: Uint8Array
    try {
      const decoded_1_str = new TextDecoder().decode(decoded_1)
      decoded_2 = Uint8Array.from(atob(decoded_1_str), (c) => c.charCodeAt(0))
    } catch (e) {
      return { success: false, error: `Failed at second Base64 decode: ${e}` }
    }

    // Step C: ROT13 Decode
    let decoded_3_rot13: string
    try {
      const decoded_2_str = new TextDecoder().decode(decoded_2)
      decoded_3_rot13 = decoded_2_str.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= "Z" ? 65 : 97
        return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start)
      })
    } catch (e) {
      return { success: false, error: `Failed at ROT13 decode: ${e}` }
    }

    // Step D: 3rd Base64 Decode
    let decoded_4_json_bytes: Uint8Array
    try {
      decoded_4_json_bytes = Uint8Array.from(atob(decoded_3_rot13), (c) => c.charCodeAt(0))
    } catch (e) {
      return { success: false, error: `Failed at third Base64 decode: ${e}` }
    }

    // Parse the JSON object
    let final_json_data: any
    try {
      const json_str = new TextDecoder().decode(decoded_4_json_bytes)
      final_json_data = JSON.parse(json_str)
    } catch (e) {
      return { success: false, error: `Failed to parse JSON: ${e}` }
    }

    // Step E: Extract and decode the final link from the JSON's 'o' key
    const final_encoded_link = final_json_data.o
    if (!final_encoded_link) {
      return { success: false, error: "Decoding was successful, but the final link was not found in the JSON." }
    }

    try {
      const final_url_bytes = Uint8Array.from(atob(final_encoded_link), (c) => c.charCodeAt(0))
      const final_url = new TextDecoder().decode(final_url_bytes)
      return { success: true, final_link: final_url }
    } catch (e) {
      return { success: false, error: `Failed to decode final URL: ${e}` }
    }
  } catch (e) {
    return { success: false, error: `An error occurred during decoding: ${e}` }
  }
}

async function decodeHubcdnPayload(payload: string): Promise<DecodeResult> {
  try {
    console.log("HubCDN payload received:", payload.substring(0, 100) + "...")

    // HubCDN uses simple Base64 encoding
    try {
      const hubcdn_url_bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
      const hubcdn_url = new TextDecoder().decode(hubcdn_url_bytes)

      console.log("Decoded HubCDN URL:", hubcdn_url)

      // Extract the direct link from the hubcdn.fans/dl/?link= URL
      if (hubcdn_url.includes("hubcdn.fans/dl/?link=")) {
        // Extract everything after "link="
        const direct_link = hubcdn_url.split("link=", 2)[1]
        return { success: true, final_link: direct_link }
      } else {
        // If it's not in the expected format, return the full URL
        return { success: true, final_link: hubcdn_url }
      }
    } catch (e) {
      return { success: false, error: `Failed to decode HubCDN URL: ${e}` }
    }
  } catch (e) {
    return { success: false, error: `An error occurred during HubCDN decoding: ${e}` }
  }
}

async function decodeLinkMain(protectedUrl: string): Promise<DecodeResult> {
  try {
    console.log("Fetching protected content...")

    const response = await fetch(protectedUrl, {
      headers: getBrowserHeaders(),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    console.log("Successfully fetched content")

    // Debug: Log a portion of the HTML to see what we're working with
    console.log("HTML sample (first 1000 chars):", html.substring(0, 1000))
    console.log("HTML sample (last 1000 chars):", html.substring(html.length - 1000))

    // Enhanced TechyBoy4u/TaazaBull24 patterns - try multiple variations
    const techyboyPatterns = [
      /s\$\$'o',\s*'([^']+)',\s*\d+\*1000\$\$/g, // Original pattern
      /s\$\$'o',\s*"([^"]+)",\s*\d+\*1000\$\$/g, // Double quotes variation
      /'o',\s*'([^']+)',\s*\d+\*1000/g, // Simplified pattern
      /"o",\s*"([^"]+)",\s*\d+\*1000/g, // Double quotes simplified
      /setTimeout$$[^,]+,\s*'([^']+)',\s*\d+$$/g, // Alternative setTimeout pattern
      /setTimeout$$[^,]+,\s*"([^"]+)",\s*\d+$$/g, // Alternative setTimeout with double quotes
    ]

    let techyboyMatch = null
    for (const pattern of techyboyPatterns) {
      techyboyMatch = pattern.exec(html)
      if (techyboyMatch) {
        console.log(`TechyBoy pattern matched: ${pattern}`)
        break
      }
      pattern.lastIndex = 0 // Reset regex
    }

    if (techyboyMatch) {
      const payload = techyboyMatch[1]
      console.log("TechyBoy4U/TaazaBull24 payload found. Starting decoding process...")
      return await decodeTechyboyPayload(payload)
    }

    // Enhanced HubCDN patterns - try multiple variations
    const hubcdnPatterns = [
      /var reurl = "https:\/\/[^"]*\?r=([^"]+)";/g, // Original pattern
      /reurl\s*=\s*"https:\/\/[^"]*\?r=([^"]+)"/g, // Simplified pattern
      /var\s+reurl\s*=\s*'https:\/\/[^']*\?r=([^']+)'/g, // Single quotes variation
      /"https:\/\/hubcdn\.fans\/[^"]*\?r=([^"]+)"/g, // Direct hubcdn pattern
      /'https:\/\/hubcdn\.fans\/[^']*\?r=([^']+)'/g, // Direct hubcdn with single quotes
      /\?r=([A-Za-z0-9+/=]+)/g, // Just look for r= parameter
    ]

    let hubcdnMatch = null
    for (const pattern of hubcdnPatterns) {
      hubcdnMatch = pattern.exec(html)
      if (hubcdnMatch) {
        console.log(`HubCDN pattern matched: ${pattern}`)
        break
      }
      pattern.lastIndex = 0 // Reset regex
    }

    if (hubcdnMatch) {
      const payload = hubcdnMatch[1]
      console.log("HubCDN payload found. Starting decoding process...")
      return await decodeHubcdnPayload(payload)
    }

    // If no patterns match, try to find any Base64-like strings for debugging
    const base64Patterns = [
      /[A-Za-z0-9+/]{50,}={0,2}/g, // Look for Base64-like strings
      /'([A-Za-z0-9+/]{30,}={0,2})'/g, // Base64 in single quotes
      /"([A-Za-z0-9+/]{30,}={0,2})"/g, // Base64 in double quotes
    ]

    const foundBase64: string[] = []
    for (const pattern of base64Patterns) {
      let match
      while ((match = pattern.exec(html)) !== null && foundBase64.length < 5) {
        foundBase64.push(match[1] || match[0])
      }
      pattern.lastIndex = 0
    }

    console.log("Found potential Base64 strings:", foundBase64)

    // Look for common JavaScript patterns that might contain the payload
    const jsPatterns = [
      /setTimeout$$[^)]+$$/g,
      /setInterval$$[^)]+$$/g,
      /window\.location\s*=\s*[^;]+/g,
      /document\.location\s*=\s*[^;]+/g,
    ]

    const foundJsPatterns: string[] = []
    for (const pattern of jsPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null && foundJsPatterns.length < 10) {
        foundJsPatterns.push(match[0])
      }
      pattern.lastIndex = 0
    }

    console.log("Found JS patterns:", foundJsPatterns)

    console.error("Could not find payload in page source")
    return {
      success: false,
      error: "Could not find the payload on the page. The site's structure may have changed.",
      debug_info: {
        url: protectedUrl,
        htmlLength: html.length,
        foundBase64: foundBase64,
        foundJsPatterns: foundJsPatterns,
        htmlSample: html.substring(0, 500),
      },
    }
  } catch (e) {
    console.error(`Error in decode link: ${e}`)
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        return { success: false, error: "Request timeout: Could not fetch the URL within 15 seconds." }
      }
      return { success: false, error: `Network error: Could not fetch the URL. ${e.message}` }
    }
    return { success: false, error: `An unexpected error occurred: ${e}` }
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data || !data.url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    const url = data.url.trim()

    // Basic URL validation
    if (!url) {
      return NextResponse.json({ success: false, error: "URL cannot be empty" }, { status: 400 })
    }

    // Check if URL is from a supported domain
    const supportedDomains = ["techyboy4u.com", "taazabull24.com", "hubcdn.fans"]
    if (!supportedDomains.some((domain) => url.includes(domain))) {
      return NextResponse.json(
        { success: false, error: "URL must be from techyboy4u.com, taazabull24.com, or hubcdn.fans" },
        { status: 400 },
      )
    }

    console.log("Processing decode request...")

    // Decode the link
    const result = await decodeLinkMain(url)

    if (result.success) {
      return NextResponse.json({
        success: true,
        final_url: result.final_link,
      })
    } else {
      console.error("Decode failed:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Unknown error occurred",
          debug_info: result.debug_info,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error(`Error in decode endpoint: ${error}`)
    return NextResponse.json({ success: false, error: "Internal server error occurred" }, { status: 500 })
  }
}
