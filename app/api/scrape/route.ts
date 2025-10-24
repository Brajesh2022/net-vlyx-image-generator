export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const BASE_URL = "https://movies4u.rip/"
const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

// Categories available on movies4u.rip
const CATEGORIES = {
  home: "https://movies4u.rip/",
  action: "https://movies4u.rip/category/action/",
  anime: "https://movies4u.rip/category/anime/",
  bollywood: "https://movies4u.rip/category/bollywood/",
  drama: "https://movies4u.rip/category/drama/",
  horror: "https://movies4u.rip/category/horror/",
  korean: "https://movies4u.rip/category/korean/",
  "south-hindi-movies": "https://movies4u.rip/category/south-hindi-movies/",
  "south-movies": "https://movies4u.rip/category/south-hindi-movies/",
  hollywood: "https://movies4u.rip/category/hollywood/",
  animation: "https://movies4u.rip/category/anime/",
  "sci-fi": "https://movies4u.rip/category/action/",
}

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
  hasMore?: boolean
}

// Fetch HTML from movies4u using the scraping API
async function fetchMovies4UHTML(url: string): Promise<string> {
  const apiUrl = `${SCRAPING_API}?url=${encodeURIComponent(url)}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const htmlSource = await response.text()

    // Basic validation
    if (!htmlSource || htmlSource.length < 100) {
      throw new Error("Invalid HTML response - too short")
    }

    return htmlSource
  } catch (error) {
    console.error("Error fetching from scraping API:", error)
    throw error
  }
}

// Parse movies4u HTML to extract movie data
function parseMovies4UData(html: string): ParsedMovieData {
  const $ = cheerio.load(html)
  const movies: Movie[] = []
  const categories = new Set<string>()

  // Parse movie items - movies4u.rip uses: <article id="post-XXXXX" class="post">
  $("article.post").each((index, element) => {
    const $element = $(element)

    // Extract title and link from: <h2 class="entry-title"><a>Title</a></h2>
    const $titleElement = $element.find("h2.entry-title > a").first()
    const title = ($titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    // Extract image from: <img src="...">
    const $imageElement = $element.find("figure img").first()
    let image = $imageElement.attr("src") || ""

    // Extract video quality label if present: <span class="video-label">HDTS</span> or WEB-DL
    const videoLabel = $element.find("span.video-label").text().trim()

    if (!title || !link) return

    // Detect category from title or class
    let category = "General"
    const titleLower = title.toLowerCase()
    const elementClass = $element.attr("class") || ""

    if (titleLower.includes("bollywood") || titleLower.includes("hindi") || elementClass.includes("bollywood")) {
      category = "Bollywood"
    } else if (titleLower.includes("hollywood") || titleLower.includes("english")) {
      category = "Hollywood"
    } else if (
      titleLower.includes("south") ||
      titleLower.includes("tamil") ||
      titleLower.includes("telugu") ||
      titleLower.includes("malayalam")
    ) {
      category = "South Indian"
    } else if (
      titleLower.includes("web") ||
      titleLower.includes("series") ||
      elementClass.includes("web-series") ||
      elementClass.includes("dual-audio-series")
    ) {
      category = "Web Series"
    } else if (titleLower.includes("season")) {
      category = "TV Shows"
    } else if (titleLower.includes("dual audio") || elementClass.includes("dual-audio")) {
      category = "Dual Audio"
    } else if (titleLower.includes("dubbed") || elementClass.includes("hindi-dubbed")) {
      category = "Hindi Dubbed"
    } else if (titleLower.includes("animation")) {
      category = "Animation"
    } else if (titleLower.includes("horror")) {
      category = "Horror"
    } else if (titleLower.includes("sci-fi") || titleLower.includes("science fiction")) {
      category = "Sci-Fi"
    }

    movies.push({
      title: videoLabel ? `${title} [${videoLabel}]` : title,
      image,
      link,
      description: title,
      category,
    })

    categories.add(category)
  })

  return {
    movies,
    categories: Array.from(categories).sort(),
    totalMovies: movies.length,
    hasMore: movies.length > 0, // If we got movies, there might be more pages
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
  const category = searchParams.get("category") || "home"
  const page = Number.parseInt(searchParams.get("page") || "1", 10)

  try {
    let targetUrl = ""

    // Handle search
    if (searchTerm) {
      // movies4u.rip search format
      targetUrl = `${BASE_URL}?s=${encodeURIComponent(searchTerm)}`
      if (page > 1) {
        targetUrl += `&paged=${page}`
      }
    } else {
      // Handle category browsing
      const categoryUrl = CATEGORIES[category as keyof typeof CATEGORIES] || BASE_URL

      if (page > 1) {
        // Add pagination - movies4u.rip uses /page/N/ format
        targetUrl = `${categoryUrl}page/${page}/`
      } else {
        targetUrl = categoryUrl
      }
    }

    console.log("Fetching content from movies4u.rip...")

    const html = await fetchMovies4UHTML(targetUrl)
    console.log("Successfully fetched content")

    const parsedData = parseMovies4UData(html)
    console.log("Parsed data:", {
      moviesCount: parsedData.movies.length,
      categoriesCount: parsedData.categories.length,
      page,
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
        hasMore: false,
      },
      { status: 500 },
    )
  }
}

// POST endpoint for general URL scraping (used by VCloud page for backward compatibility)
export async function POST(request: NextRequest) {
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log("Fetching content...")

    const html = await fetchMovies4UHTML(url)
    console.log("Successfully fetched content")

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
