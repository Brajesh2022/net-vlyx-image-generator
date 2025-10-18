import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

// Categories with latest filter (by date)
const LATEST_CATEGORIES = ["bollywood", "south-movies", "animation", "korean"]

const CATEGORIES: Record<string, string> = {
  "sci-fi": "https://www.vegamovies-nl.cafe/sci-fi/",
  action: "https://www.vegamovies-nl.cafe/action/",
  drama: "https://www.vegamovies-nl.cafe/drama/",
  comedy: "https://www.vegamovies-nl.cafe/comedy/",
  thriller: "https://www.vegamovies-nl.cafe/thriller/",
  romance: "https://www.vegamovies-nl.cafe/romance/",
  horror: "https://www.vegamovies-nl.cafe/horror/",
  animation: "https://www.vegamovies-nl.cafe/animation/",
  bollywood: "https://www.vegamovies-nl.cafe/bollywood/",
  korean: "https://www.vegamovies-nl.cafe/korean/",
  "south-movies": "https://www.vegamovies-nl.cafe/south-movies/",
  "dual-audio-movies": "https://www.vegamovies-nl.cafe/dual-audio-movies/",
  "dual-audio-series": "https://www.vegamovies-nl.cafe/dual-audio-series/",
  "hindi-dubbed": "https://www.vegamovies-nl.cafe/hindi-dubbed/",
}

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

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

    if (!htmlSource || htmlSource.length < 100) {
      throw new Error("Invalid HTML response - too short")
    }

    return htmlSource
  } catch (error) {
    console.error("Error fetching from scraping API:", error)
    throw error
  }
}

function parseVegaMoviesData(html: string, limit: number = 10): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []

  $("article.post-item").each((index, element) => {
    if (movies.length >= limit) return false

    const $element = $(element)

    const $titleElement = $element.find("h3.post-title > a, h2.entry-title > a").first()
    const title = ($titleElement.attr("title") || $titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    const $imageElement = $element.find("div.blog-pic img.blog-picture, img.blog-picture").first()
    let image = $imageElement.attr("src") || ""

    if (image) {
      image = image.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))$/i, "$1")
    }

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
      title,
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
  const filter = searchParams.get('filter') || 'auto' // auto, latest, popular
  const page = searchParams.get('page') || '1'
  
  let categoryUrl = CATEGORIES[category]

  if (!categoryUrl) {
    return NextResponse.json({ error: "Invalid category", movies: [] }, { status: 400 })
  }

  // Apply filter based on category and user selection
  let useLatest = LATEST_CATEGORIES.includes(category)
  
  if (filter === 'latest') {
    useLatest = true
  } else if (filter === 'popular') {
    useLatest = false
  }
  
  // Add filter to URL
  if (!useLatest) {
    categoryUrl += '?archive_query=comment'
  }
  
  // Add page parameter if not first page
  if (page !== '1') {
    categoryUrl += (categoryUrl.includes('?') ? '&' : '?') + `page=${page}`
  }

  try {
    console.log(`Fetching ${category} content (filter: ${useLatest ? 'latest' : 'popular'}, page: ${page})...`)

    const html = await fetchVegaMoviesHTML(categoryUrl)
    const movies = parseVegaMoviesData(html, page === '1' ? 10 : 20)

    console.log(`Successfully fetched ${movies.length} items for ${category}`)
    return NextResponse.json({ movies, hasMore: movies.length >= (page === '1' ? 10 : 20) })
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
