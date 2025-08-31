import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

// CORS proxies with the working one first
const CORS_PROXIES = ["https://thingproxy.freeboard.io/fetch/", "https://api.codetabs.com/v1/proxy?quest="]

// Enhanced user agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

interface VlyxQuality {
  quality: string
  hubdriveLink?: string
  hubcdnLink?: string
  hubcloudLink?: string
  gofileLink?: string
  preferredLink: string
  linkType: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other"
}

interface VlyxProcessResult {
  success: boolean
  type: "single" | "quality_selection"
  qualities?: VlyxQuality[]
  directLink?: string
  linkType?: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other"
  error?: string
  originalUrl?: string // Add this to track the original URL for manual fallback
}

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

async function fetchWithProxy(url: string, proxyIndex = 0): Promise<string> {
  if (proxyIndex >= CORS_PROXIES.length) {
    // Try direct fetch as last resort
    try {
      const response = await fetch(url, {
        headers: getBrowserHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.text()
    } catch (error) {
      throw new Error(`All proxy attempts failed. Last error: ${error}`)
    }
  }

  const proxy = CORS_PROXIES[proxyIndex]
  const proxyUrl = proxy + encodeURIComponent(url)

  try {
    console.log(`Trying proxy ${proxyIndex + 1}/${CORS_PROXIES.length}: ${proxy}`)

    if (proxyIndex === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getBrowserHeaders(),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    if (html.includes("Just a moment...") || html.includes("cf-browser-verification")) {
      throw new Error("Cloudflare challenge detected")
    }

    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      throw new Error("Invalid HTML response")
    }

    console.log(`Successfully fetched with proxy ${proxyIndex + 1}`)
    return html
  } catch (error) {
    console.log(`Proxy ${proxyIndex + 1} failed:`, error)
    return fetchWithProxy(url, proxyIndex + 1)
  }
}

function extractFileIdFromHubdriveUrl(url: string): string | null {
  const match = url.match(/hubdrive\.wales\/file\/(\d+)/)
  return match ? match[1] : null
}

function determineLinkType(url: string): "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other" {
  if (url.includes("hubdrive.wales")) return "hubdrive"
  if (url.includes("hubcdn.fans") || url.includes("hubdcdn.fans")) return "hubcdn"
  if (url.includes("hubcloud.one")) return "hubcloud"
  if (url.includes("gofile.io")) return "gofile"
  return "other"
}

function selectPreferredLink(
  hubdriveLink?: string,
  hubcdnLink?: string,
  hubcloudLink?: string,
  gofileLink?: string,
): { link: string; type: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other" } {
  // Priority: hubdrive > hubcdn > hubcloud > gofile
  if (hubdriveLink) return { link: hubdriveLink, type: "hubdrive" }
  if (hubcdnLink) return { link: hubcdnLink, type: "hubcdn" }
  if (hubcloudLink) return { link: hubcloudLink, type: "hubcloud" }
  if (gofileLink) return { link: gofileLink, type: "gofile" }
  return { link: "", type: "other" }
}

function parseVlyxPage(html: string, originalUrl: string): VlyxProcessResult {
  const $ = cheerio.load(html)

  // Check if this is a quality selection page (Type 2)
  const qualityHeaders = $("h3, h5").filter((_, element) => {
    const text = $(element).text()
    return text.match(/\d+p/i) && (text.includes("–") || text.includes("-"))
  })

  if (qualityHeaders.length > 0) {
    // Type 2: Quality selection page
    const qualities: VlyxQuality[] = []

    qualityHeaders.each((_, element) => {
      const $header = $(element)
      const headerText = $header.text()

      // Extract quality from header text
      const qualityMatch = headerText.match(/(\d+p(?:\s+10Bit\s+HEVC)?)/i)
      if (!qualityMatch) return

      const quality = qualityMatch[1].trim()

      // Find links in this header
      const links = $header.find("a[href]")
      let hubdriveLink: string | undefined
      let hubcdnLink: string | undefined
      let hubcloudLink: string | undefined
      let gofileLink: string | undefined

      links.each((_, linkElement) => {
        const $link = $(linkElement)
        const href = $link.attr("href")
        const linkText = $link.text().toLowerCase()

        if (href) {
          if (href.includes("hubdrive.wales")) {
            hubdriveLink = href
          } else if (href.includes("hubcdn.fans") || href.includes("hubdcdn.fans")) {
            hubcdnLink = href
          } else if (href.includes("hubcloud.one")) {
            hubcloudLink = href
          } else if (href.includes("gofile.io")) {
            gofileLink = href
          }
        }
      })

      const { link: preferredLink, type: linkType } = selectPreferredLink(
        hubdriveLink,
        hubcdnLink,
        hubcloudLink,
        gofileLink,
      )

      if (preferredLink) {
        qualities.push({
          quality,
          hubdriveLink,
          hubcdnLink,
          hubcloudLink,
          gofileLink,
          preferredLink,
          linkType,
        })
      }
    })

    if (qualities.length > 0) {
      return {
        success: true,
        type: "quality_selection",
        qualities,
        originalUrl,
      }
    }
  }

  // Type 1: Single download page - look for direct links
  const allLinks = $("a[href]")
  let hubdriveLink: string | undefined
  let hubcdnLink: string | undefined
  let hubcloudLink: string | undefined
  let gofileLink: string | undefined

  allLinks.each((_, element) => {
    const $link = $(element)
    const href = $link.attr("href")

    if (href) {
      if (href.includes("hubdrive.wales") && !hubdriveLink) {
        hubdriveLink = href
      } else if ((href.includes("hubcdn.fans") || href.includes("hubdcdn.fans")) && !hubcdnLink) {
        hubcdnLink = href
      } else if (href.includes("hubcloud.one") && !hubcloudLink) {
        hubcloudLink = href
      } else if (href.includes("gofile.io") && !gofileLink) {
        gofileLink = href
      }
    }
  })

  const { link: preferredLink, type: linkType } = selectPreferredLink(
    hubdriveLink,
    hubcdnLink,
    hubcloudLink,
    gofileLink,
  )

  if (preferredLink) {
    return {
      success: true,
      type: "single",
      directLink: preferredLink,
      linkType,
      originalUrl,
      // Include all found links for fallback
      qualities: [
        {
          quality: "Single Quality",
          hubdriveLink,
          hubcdnLink,
          hubcloudLink,
          gofileLink,
          preferredLink,
          linkType,
        },
      ],
    }
  }

  return {
    success: false,
    error: "No supported download links found on the page",
    originalUrl,
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data || !data.url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    const url = data.url.trim()

    if (!url) {
      return NextResponse.json({ success: false, error: "URL cannot be empty" }, { status: 400 })
    }

    console.log(`Processing Vlyx URL: ${url}`)

    // Fetch the page content
    const html = await fetchWithProxy(url)
    console.log(`HTML fetched successfully, length: ${html.length}`)

    // Parse the page
    const result = parseVlyxPage(html, url)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to process Vlyx page",
          originalUrl: url,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error(`Error in Vlyx processing: ${error}`)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error occurred",
      },
      { status: 500 },
    )
  }
}
