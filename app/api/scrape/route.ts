import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const BASE_URL = "https://www.vegamovies-nl.bike/"
const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

// Categories available on vegamovies-nl
const CATEGORIES = {
  home: "https://www.vegamovies-nl.bike/",
  bollywood: "https://www.vegamovies-nl.bike/category/bollywood/",
  "south-movies": "https://www.vegamovies-nl.bike/category/south-movies/",
  "dual-audio-movies": "https://www.vegamovies-nl.bike/dual-audio/dual-audio-movies/",
  "dual-audio-series": "https://www.vegamovies-nl.bike/dual-audio/dual-audio-series/",
  "hindi-dubbed": "https://www.vegamovies-nl.bike/category/hindi-dubbed/",
  animation: "https://www.vegamovies-nl.bike/category/animation/",
  horror: "https://www.vegamovies-nl.bike/category/horror/",
  "sci-fi": "https://www.vegamovies-nl.bike/category/sci-fi/",
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

// Fetch HTML from vegamovies-nl using the scraping API
async function fetchVegaMoviesHTML(url: string): Promise<string> {
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

// Parse vegamovies-nl HTML to extract movie data
function parseVegaMoviesData(html: string): ParsedMovieData {
  const $ = cheerio.load(html)
  const movies: Movie[] = []
  const categories = new Set<string>()

  // Parse movie items - vegamovies-nl uses article.post-item
  $("article.post-item").each((index, element) => {
    const $element = $(element)

    // Extract title and link
    const $titleElement = $element.find("h3.post-title > a, h2.entry-title > a").first()
    const title = ($titleElement.attr("title") || $titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    // Extract image - Use HIGH QUALITY version (remove resolution suffix)
    const $imageElement = $element.find("div.blog-pic img.blog-picture, img.blog-picture").first()
    let image = $imageElement.attr("src") || ""
    
    // Convert to high-res by removing resolution suffix like -300x450
    // Pattern: image-300x450.jpg -> image.jpg
    if (image) {
      image = image.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))$/i, "$1")
    }

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
      title,
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
      // vegamovies-nl search format
      targetUrl = `${BASE_URL}?s=${encodeURIComponent(searchTerm)}`
      if (page > 1) {
        targetUrl += `&page=${page}`
      }
    } else {
      // Handle category browsing
      const categoryUrl = CATEGORIES[category as keyof typeof CATEGORIES] || BASE_URL

      if (page > 1) {
        // Add pagination - vegamovies-nl uses /page/N/ format
        targetUrl = `${categoryUrl}page/${page}/`
      } else {
        targetUrl = categoryUrl
      }
    }

    console.log("Fetching content...")

    const html = await fetchVegaMoviesHTML(targetUrl)
    console.log("Successfully fetched content")

    const parsedData = parseVegaMoviesData(html)
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

    const html = await fetchVegaMoviesHTML(url)
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
