export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SOURCES = {
  vegaA: "https://vegamovise.biz",
  vegaB: "https://bollyhub.one",
  luxLike: "https://www.vegamovies-nl.autos/",
}

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
  source?: string
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
    DNT: "1",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
  }
}

async function fetchWithProxy(url: string, proxyIndex = 0): Promise<string> {
  if (proxyIndex >= CORS_PROXIES.length) {
    // Try direct fetch as last resort
    const response = await fetch(url, { headers: getBrowserHeaders() })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.text()
  }

  const proxy = CORS_PROXIES[proxyIndex]
  const proxyUrl = proxy + encodeURIComponent(url)

  try {
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getBrowserHeaders(),
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    const html = await response.text()

    // Check if we got Cloudflare challenge page
    if (html.includes("Just a moment...") || html.includes("cf-browser-verification") || html.includes("_cf_chl_opt")) {
      throw new Error("Cloudflare challenge detected")
    }
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      throw new Error("Invalid HTML response")
    }
    return html
  } catch {
    return fetchWithProxy(url, proxyIndex + 1)
  }
}

// Helpers
function toAbsolute(src: string | undefined, base: string): string {
  if (!src) return ""
  if (src.startsWith("//")) return "https:" + src
  if (src.startsWith("/")) return `${base}${src}`
  return src
}

function detectCategory(title: string, classNames: string): string {
  const t = title.toLowerCase()
  if (t.includes("bollywood") || t.includes("hindi") || classNames.includes("bollywood")) return "Bollywood"
  if (t.includes("hollywood") || t.includes("english") || classNames.includes("hollywood")) return "Hollywood"
  if (t.includes("south") || t.includes("tamil") || t.includes("telugu") || t.includes("malayalam"))
    return "South Indian"
  if (
    t.includes("web") ||
    t.includes("series") ||
    classNames.includes("web-series") ||
    classNames.includes("dual-audio-series")
  )
    return "Web Series"
  if (t.includes("season")) return "TV Shows"
  if (t.includes("punjabi") || classNames.includes("punjabi")) return "Punjabi"
  if (t.includes("dubbed") || classNames.includes("hindi-dubbed") || classNames.includes("dual-audio")) return "Dubbed"
  return "General"
}

// Parsers
function parseVegaLike(html: string, base: string): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []
  $(".blog-items .post-item, article.post-item").each((_, el: any) => {
    const $el = $(el)
    const $titleLink = $el.find(".post-title a, h2.post-title a, h3.entry-title a").first()
    const $thumbLink = $el.find(".blog-pic-wrap a.blog-img, .post-thumbnail a").first()
    let $img = $el.find("img.blog-picture").first()
    if (!$img.length) $img = $el.find(".featured-image img, .post-thumbnail img, .blog-img img, img").first()

    const title = ($titleLink.text() || $img.attr("alt") || "").trim()
    const href = $titleLink.attr("href") || $thumbLink.attr("href") || ""
    const image = toAbsolute($img.attr("src") || $img.attr("data-src"), base)
    if (!title || !href) return
    const link = href.startsWith("http") ? href : `${base}${href}`

    const category = detectCategory(title, $el.attr("class") || "")
    movies.push({ title, image, link, description: title, category, source: base })
  })
  return movies
}

function parseLuxLike(html: string, base: string): Movie[] {
  // Updated parser for vegamovies-nl.autos new design (2025)
  const $ = cheerio.load(html)
  const movies: Movie[] = []
  
  // New design uses article.entry-card instead of article.post-item
  $("article.entry-card, article.post-item").each((_, el: any) => {
    const $el = $(el)
    
    // New design structure:
    // <h2 class="entry-title"><a href="URL">TITLE</a></h2>
    // Also support old design for backward compatibility
    const $titleLink = $el.find("h2.entry-title > a, h3.entry-title > a, .post-title a, h2.post-title a, h3.entry-title a").first()
    
    // New design: <a class="ct-media-container"><img /></a>
    // Old design: various selectors
    const $thumbLink = $el.find("a.ct-media-container, .blog-pic-wrap a.blog-img, .post-thumbnail a").first()
    
    let $img = $el.find("a.ct-media-container img, img.wp-post-image").first()
    if (!$img.length) $img = $el.find("img.blog-picture, .featured-image img, .post-thumbnail img, .blog-img img, img").first()

    const title = ($titleLink.text() || $img.attr("alt") || "").trim()
    const href = $titleLink.attr("href") || $thumbLink.attr("href") || ""
    const image = toAbsolute($img.attr("src") || $img.attr("data-src"), base)
    
    if (!title || !href) return
    const link = href.startsWith("http") ? href : `${base}${href}`

    const category = detectCategory(title, $el.attr("class") || "")
    movies.push({ title, image, link, description: title, category, source: base })
  })
  
  return movies
}

// Normalize title for comparison
function normalize(str: string) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// Extract sequel number if present (e.g., "Panchayat 2" -> 2, "Season 3" -> 3)
function extractSequelNumber(title: string): number | null {
  const normalized = normalize(title)
  // Match patterns like: "title 2", "title season 2", "title s02", "title part 2"
  const patterns = [
    /\b(\d+)\s*$/,           // "Panchayat 2" -> 2
    /season\s*(\d+)/,        // "Season 2" -> 2
    /s\s*0*(\d+)/,           // "S02" -> 2
    /part\s*(\d+)/,          // "Part 2" -> 2
    /chapter\s*(\d+)/,       // "Chapter 2" -> 2
  ]
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      return Number.parseInt(match[1], 10)
    }
  }
  return null
}

// Get base title without sequel number (e.g., "Panchayat 2" -> "panchayat")
function getBaseTitle(title: string): string {
  const normalized = normalize(title)
  return normalized
    .replace(/\b(season|s|part|chapter)\s*0*\d+\b/g, "")
    .replace(/\b\d+\s*$/, "")
    .trim()
}

// Score for search relevance
function bestMatchScore(title: string, q: string): number {
  const t = normalize(title)
  const query = normalize(q)
  const baseTitle = getBaseTitle(title)
  const sequelNum = extractSequelNumber(title)
  
  if (!t || !query) return 0
  
  // Exact match gets highest score
  if (t === query) return 10000
  
  // Base title matches exactly (e.g., "Panchayat" search matches "Panchayat 2")
  if (baseTitle === query && sequelNum !== null) {
    // Score: 9000 for season 1, 8999 for season 2, etc. (descending order)
    return 9000 - sequelNum
  }
  
  // Starts with query exactly
  if (t.startsWith(query + " ")) {
    const num = extractSequelNumber(title)
    return num !== null ? 8000 - num : 8000
  }
  
  // Contains query as whole word
  if (new RegExp(`\\b${query}\\b`).test(t)) return 7000
  
  // Contains query as substring
  if (t.includes(query)) return 6000
  
  // Partial match
  return 100
}

export async function GET(request: NextRequest) {
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("s")?.trim() || ""

  // Build site-specific search URLs
  const urls = {
    vegaA: searchTerm
      ? `${SOURCES.vegaA}/index.php?do=search&subaction=search&story=${encodeURIComponent(searchTerm)}`
      : SOURCES.vegaA,
    vegaB: searchTerm
      ? `${SOURCES.vegaB}/index.php?do=search&subaction=search&story=${encodeURIComponent(searchTerm)}`
      : SOURCES.vegaB,
    luxLike: searchTerm ? `${SOURCES.luxLike}/search/${encodeURIComponent(searchTerm)}` : SOURCES.luxLike,
  }

  try {
    // Fetch all three in parallel
    const [vegaAHtml, vegaBHtml, luxLikeHtml] = await Promise.allSettled([
      fetchWithProxy(urls.vegaA),
      fetchWithProxy(urls.vegaB),
      fetchWithProxy(urls.luxLike),
    ])

    let movies: Movie[] = []
    const categories = new Set<string>()

    if (vegaAHtml.status === "fulfilled") {
      const list = parseVegaLike(vegaAHtml.value, SOURCES.vegaA)
      list.forEach((m) => categories.add(m.category))
      movies = movies.concat(list)
    }
    if (vegaBHtml.status === "fulfilled") {
      const list = parseVegaLike(vegaBHtml.value, SOURCES.vegaB)
      list.forEach((m) => categories.add(m.category))
      movies = movies.concat(list)
    }
    if (luxLikeHtml.status === "fulfilled") {
      const list = parseLuxLike(luxLikeHtml.value, SOURCES.luxLike)
      list.forEach((m) => categories.add(m.category))
      movies = movies.concat(list)
    }

    // Deduplicate by exact title match (case-insensitive)
    const seenTitles = new Map<string, Movie>()
    const deduped = movies.filter((m) => {
      const titleKey = m.title.trim().toLowerCase()
      
      if (seenTitles.has(titleKey)) {
        // Keep the one with more complete information (prefer longer description or valid image)
        const existing = seenTitles.get(titleKey)!
        if (m.description.length > existing.description.length || (m.image && !existing.image)) {
          seenTitles.set(titleKey, m)
          return false // Remove the existing one
        }
        return false // Duplicate, skip this one
      }
      
      seenTitles.set(titleKey, m)
      return true
    })

    // Sort by best match if searchTerm provided, otherwise alphabetical
    const sorted = searchTerm
      ? deduped.sort((a, b) => {
          const sa = bestMatchScore(a.title, searchTerm)
          const sb = bestMatchScore(b.title, searchTerm)
          
          // Primary sort by relevance score
          if (sa !== sb) return sb - sa
          
          // Secondary sort: alphabetical order for same relevance
          return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        })
      : deduped.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }))

    return NextResponse.json({
      movies: sorted,
      categories: Array.from(categories).sort(),
      totalMovies: sorted.length,
    } satisfies ParsedMovieData)
  } catch (error) {
    console.error("Aggregator scrape error:", error)
    return NextResponse.json(
      { error: "Failed to aggregate results", movies: [], categories: [], totalMovies: 0 },
      { status: 500 },
    )
  }
}
