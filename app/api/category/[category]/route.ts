import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

// Categories with latest filter (by date)
const LATEST_CATEGORIES = ["bollywood", "south-hindi-movies", "anime", "korean", "hollywood"]

const CATEGORIES: Record<string, string> = {
  action: "https://movies4u.rip/category/action/",
  anime: "https://movies4u.rip/category/anime/",
  bollywood: "https://movies4u.rip/category/bollywood/",
  drama: "https://movies4u.rip/category/drama/",
  horror: "https://movies4u.rip/category/horror/",
  korean: "https://movies4u.rip/category/korean/",
  "south-hindi-movies": "https://movies4u.rip/category/south-hindi-movies/",
  "south-movies": "https://movies4u.rip/category/south-hindi-movies/", // Alias
  hollywood: "https://movies4u.rip/category/hollywood/",
  animation: "https://movies4u.rip/category/anime/", // Alias for anime
  "sci-fi": "https://movies4u.rip/category/action/", // Map to action for now
}

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

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

    if (!htmlSource || htmlSource.length < 100) {
      throw new Error("Invalid HTML response - too short")
    }

    return htmlSource
  } catch (error) {
    console.error("Error fetching from scraping API:", error)
    throw error
  }
}

function parseMovies4UData(html: string, limit: number = 0): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []

  // Parse movies from the page (limit = 0 means no limit, get all)
  // movies4u.rip uses: <article id="post-XXXXX" class="post">
  $("article.post").each((index, element) => {
    // If limit is set and reached, stop
    if (limit > 0 && movies.length >= limit) return false

    const $element = $(element)

    // Extract title from: <h2 class="entry-title"><a>Title</a></h2>
    const $titleElement = $element.find("h2.entry-title > a").first()
    const title = ($titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    // Extract image from: <img src="...">
    const $imageElement = $element.find("figure img").first()
    let image = $imageElement.attr("src") || ""

    // Extract video quality label if present: <span class="video-label">HDTS</span>
    const videoLabel = $element.find("span.video-label").text().trim()

    if (!title || !link) return

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
    }

    movies.push({
      title: videoLabel ? `${title} [${videoLabel}]` : title,
      image,
      link,
      description: title,
      category,
    })
  })

  return movies
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { category } = await params
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'latest' // Always use latest for movies4u
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '0' // 0 = no limit (get all), 10 = for home page
  
  let categoryUrl = CATEGORIES[category]

  if (!categoryUrl) {
    return NextResponse.json({ error: "Invalid category", movies: [] }, { status: 400 })
  }

  // Build URL with proper pagination format: /page/2/
  // Remove trailing slash from base URL
  categoryUrl = categoryUrl.replace(/\/$/, '')
  
  // Add page path if not first page
  if (page !== '1') {
    categoryUrl += `/page/${page}/`
  } else {
    categoryUrl += '/'
  }

  try {
    console.log(`Fetching ${category} content from movies4u.rip (page: ${page}, limit: ${limit})...`)
    console.log(`URL: ${categoryUrl}`)

    const html = await fetchMovies4UHTML(categoryUrl)
    const movies = parseMovies4UData(html, parseInt(limit))

    console.log(`Successfully fetched ${movies.length} items for ${category} (page ${page})`)
    
    // Determine if there are more pages
    // If limit was set (homepage), always show more available
    // If no limit (category page), check if we got enough movies
    const hasMore = limit !== '0' ? true : movies.length >= 15

    return NextResponse.json({ movies, hasMore })
  } catch (error) {
    console.error(`Error in ${category} API:`, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch category content",
        movies: [],
        hasMore: false,
      },
      { status: 500 }
    )
  }
}
