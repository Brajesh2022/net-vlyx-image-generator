export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const TARGET_URL = "https://luxmovies.food"

// CORS proxies to bypass restrictions
const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
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

  // Parse movie items from the blog-items based on the actual HTML structure
  $(".blog-items.movie-grid article.post-item, article.post").each((index: number, element: any) => {
    const $element = $(element)

    // Extract movie details using multiple selectors to catch different layouts
    const $titleLink = $element.find("h3.entry-title.post-title a, .entry-title a, h2.entry-title a").first()
    const $thumbnailLink = $element.find(".blog-pic-wrap a.blog-img, .featured-image a, .post-thumbnail a").first()
    
    // Try multiple image selectors for better poster detection
    let $img = $element.find("img.blog-picture").first()
    if (!$img.length) {
      $img = $element.find(".featured-image img, .post-thumbnail img, .blog-img img, img").first()
    }

    const title = $titleLink.text().trim() || $img.attr("alt") || "Unknown Title"
    const link = $titleLink.attr("href") || $thumbnailLink.attr("href") || ""
    
    // Enhanced image extraction with multiple fallbacks
    let image = $img.attr("src") || $img.attr("data-src") || ""
    
    // If no image found, try to find any image within the article
    if (!image) {
      const $anyImg = $element.find("img").first()
      image = $anyImg.attr("src") || $anyImg.attr("data-src") || ""
    }
    
    // Clean up image URL if needed
    if (image && image.startsWith("//")) {
      image = "https:" + image
    }
    
    const description = title // Use title as description for now

    // Try to extract category from title or class names
    let category = "General"
    const titleLower = title.toLowerCase()
    const classNames = $element.attr("class") || ""

    if (titleLower.includes("bollywood") || titleLower.includes("hindi") || classNames.includes("bollywood")) {
      category = "Bollywood"
    } else if (titleLower.includes("hollywood") || titleLower.includes("english") || classNames.includes("hollywood")) {
      category = "Hollywood"
    } else if (titleLower.includes("south") || titleLower.includes("tamil") || titleLower.includes("telugu") || titleLower.includes("malayalam")) {
      category = "South Indian"
    } else if (titleLower.includes("web") || titleLower.includes("series") || classNames.includes("web-series")) {
      category = "Web Series"
    } else if (titleLower.includes("season")) {
      category = "TV Shows"
    } else if (titleLower.includes("punjabi") || classNames.includes("punjabi")) {
      category = "Punjabi"
    } else if (titleLower.includes("dubbed") || classNames.includes("hindi-dubbed") || classNames.includes("dual-audio")) {
      category = "Dubbed"
    } else if (titleLower.includes("marathi") || classNames.includes("marathi")) {
      category = "Marathi"
    } else if (titleLower.includes("kannada") || classNames.includes("kannada")) {
      category = "Kannada"
    } else if (titleLower.includes("comedy") && classNames.includes("comedy")) {
      category = "Comedy"
    } else if (titleLower.includes("action") && classNames.includes("action")) {
      category = "Action"
    } else if (titleLower.includes("drama") && classNames.includes("drama")) {
      category = "Drama"
    }

    if (title && title !== "Unknown Title" && link) {
      const fullLink = link.startsWith("http") ? link : `${TARGET_URL}${link}`

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
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("s") || ""
  const searchURL = searchTerm ? `${TARGET_URL}/search/${encodeURIComponent(searchTerm)}` : TARGET_URL

  try {
    console.log("Fetching content...")

    const html = await fetchWithProxy(searchURL)
    console.log("Successfully fetched content")

    const parsedData = parseMovieData(html)
    console.log("Parsed LuxMovies data:", {
      moviesCount: parsedData.movies.length,
      categoriesCount: parsedData.categories.length,
    })

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error("Error in scrape-lux API:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch and parse data from LuxMovies",
        movies: [],
        categories: [],
        totalMovies: 0,
      },
      { status: 500 },
    )
  }
}
