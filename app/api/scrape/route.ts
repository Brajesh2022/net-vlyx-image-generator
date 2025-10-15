import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const TARGET_URL = "https://hdhub4u.cologne/"

// Reordered CORS proxies with the working one first
const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/", // WORKING - Move to first position
  "https://api.codetabs.com/v1/proxy?quest=", // Keep as backup
  "https://api.allorigins.win/raw?url=", // Keep as backup
  "https://corsproxy.io/?", // Keep as backup
  "https://cors-anywhere.herokuapp.com/", // Keep as backup
]

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

interface ParsedMovieData {
  movies: Movie[]
  categories: string[]
  totalMovies: number
}

// Enhanced user agents that are more likely to bypass Cloudflare
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0",
]

// Get random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Enhanced headers to mimic real browser
function getBrowserHeaders(): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Charset": "utf-8",
    DNT: "1",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    Pragma: "no-cache",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
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

    // Add small delay for the working proxy
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

    // Check if we got Cloudflare challenge page
    if (html.includes("Just a moment...") || html.includes("cf-browser-verification") || html.includes("_cf_chl_opt")) {
      console.log(`Proxy ${proxyIndex + 1} returned Cloudflare challenge page`)
      throw new Error("Cloudflare challenge detected")
    }

    // Basic validation to ensure we got actual HTML content
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

function parseMovieData(html: string): ParsedMovieData {
  const $ = cheerio.load(html)
  const movies: Movie[] = []
  const categories = new Set<string>()

  // Parse movie items from the grid
  $(".thumb.col-md-2.col-sm-4.col-xs-6").each((index, element) => {
    const $element = $(element)

    // Extract movie details
    const $link = $element.find("a").first()
    const $img = $element.find("img").first()
    const $title = $element.find("figcaption p").first()

    const title = $title.text().trim() || $img.attr("alt") || "Unknown Title"
    const link = $link.attr("href") || ""
    const image = $img.attr("src") || ""
    const description = $title.text().trim() || ""

    // Try to extract category from title or description
    let category = "General"
    const titleLower = title.toLowerCase()

    if (titleLower.includes("bollywood") || titleLower.includes("hindi")) {
      category = "Bollywood"
    } else if (titleLower.includes("hollywood") || titleLower.includes("english")) {
      category = "Hollywood"
    } else if (titleLower.includes("south") || titleLower.includes("tamil") || titleLower.includes("telugu")) {
      category = "South Indian"
    } else if (titleLower.includes("web") || titleLower.includes("series")) {
      category = "Web Series"
    } else if (titleLower.includes("season")) {
      category = "TV Shows"
    }

    if (title && title !== "Unknown Title") {
      const fullLink = link.startsWith("http") ? link : `https://hdhub4u.cologne${link}`

      movies.push({
        title,
        image,
        link: fullLink,
        description,
        category,
      })

      categories.add(category)
    }
  })

  // Also try to parse from other possible selectors
  $(".recent-movies li, .thumbnail-wrapper figure").each((index, element) => {
    const $element = $(element)

    const $link = $element.find("a").first()
    const $img = $element.find("img").first()
    const $caption = $element.find("figcaption, .caption, .title").first()

    const title = $caption.text().trim() || $img.attr("alt") || $img.attr("title") || ""
    const link = $link.attr("href") || ""
    const image = $img.attr("src") || $img.attr("data-src") || ""
    const description = $caption.text().trim() || ""

    if (title && !movies.some((movie) => movie.title === title)) {
      let category = "General"
      const titleLower = title.toLowerCase()

      if (titleLower.includes("bollywood") || titleLower.includes("hindi")) {
        category = "Bollywood"
      } else if (titleLower.includes("hollywood")) {
        category = "Hollywood"
      } else if (titleLower.includes("south")) {
        category = "South Indian"
      } else if (titleLower.includes("web") || titleLower.includes("series")) {
        category = "Web Series"
      }

      const fullLink = link.startsWith("http") ? link : `https://hdhub4u.cologne${link}`

      movies.push({
        title,
        image,
        link: fullLink,
        description,
        category,
      })

      categories.add(category)
    }
  })

  return {
    movies,
    categories: Array.from(categories).sort(),
    totalMovies: movies.length,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("s") || ""
  const searchURL = searchTerm ? `${TARGET_URL}?s=${encodeURIComponent(searchTerm)}` : TARGET_URL

  try {
    console.log("Starting to fetch HTML from:", searchURL)

    const html = await fetchWithProxy(searchURL)
    console.log("HTML fetched successfully using proxy, length:", html.length)

    const parsedData = parseMovieData(html)
    console.log("Parsed data:", {
      moviesCount: parsedData.movies.length,
      categoriesCount: parsedData.categories.length,
    })

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error("Error in scrape API:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch and parse data",
        movies: [],
        categories: [],
        totalMovies: 0,
      },
      { status: 500 },
    )
  }
}

// POST endpoint for general URL scraping (used by VCloud page)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log("Fetching URL:", url)

    const html = await fetchWithProxy(url)
    console.log("HTML fetched successfully, length:", html.length)

    // Extract title from HTML
    const $ = cheerio.load(html)
    const title = $("title").text() || ""

    return NextResponse.json({
      html,
      title,
      success: true,
    })
  } catch (error) {
    console.error("Error in POST scrape API:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch URL",
        success: false,
      },
      { status: 500 },
    )
  }
}
