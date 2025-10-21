import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

// Categories with latest filter (by date)
const LATEST_CATEGORIES = ["bollywood", "south-movies", "animation", "korean"]

const CATEGORIES: Record<string, string> = {
  "sci-fi": "https://www.vegamovies-nl.autos/sci-fi/",
  action: "https://www.vegamovies-nl.autos/action/",
  drama: "https://www.vegamovies-nl.autos/drama/",
  comedy: "https://www.vegamovies-nl.autos/comedy/",
  thriller: "https://www.vegamovies-nl.autos/thriller/",
  romance: "https://www.vegamovies-nl.autos/romance/",
  horror: "https://www.vegamovies-nl.autos/horror/",
  animation: "https://www.vegamovies-nl.autos/animation/",
  bollywood: "https://www.vegamovies-nl.autos/bollywood/",
  korean: "https://www.vegamovies-nl.autos/korean/",
  "south-movies": "https://www.vegamovies-nl.autos/south-movies/",
  "dual-audio-movies": "https://www.vegamovies-nl.autos/dual-audio-movies/",
  "dual-audio-series": "https://www.vegamovies-nl.autos/dual-audio-series/",
  "hindi-dubbed": "https://www.vegamovies-nl.autos/hindi-dubbed/",
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

function parseVegaMoviesData(html: string, limit: number = 0): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []

  // Parse movies from the page (limit = 0 means no limit, get all)
  // NEW DESIGN (2025): article.entry-card | OLD DESIGN: article.post-item
  $("article.entry-card, article.post-item").each((index, element) => {
    // If limit is set and reached, stop
    if (limit > 0 && movies.length >= limit) return false

    const $element = $(element)

    // NEW DESIGN: h2.entry-title > a | OLD DESIGN: h3.post-title > a
    const $titleElement = $element.find("h2.entry-title > a, h3.entry-title > a, h3.post-title > a").first()
    const title = ($titleElement.attr("title") || $titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    // NEW DESIGN: a.ct-media-container img | OLD DESIGN: div.blog-pic img.blog-picture
    const $imageElement = $element.find("a.ct-media-container img, img.wp-post-image, div.blog-pic img.blog-picture, img.blog-picture").first()
    
    // Check both src and data-src (lazy loading support)
    // Also check srcset for responsive images
    let image = $imageElement.attr("data-src") || $imageElement.attr("src") || ""
    
    // If image is empty or is a base64 placeholder, try srcset
    if (!image || image.startsWith("data:image")) {
      const srcset = $imageElement.attr("srcset") || ""
      if (srcset) {
        // Extract first URL from srcset
        const firstUrl = srcset.split(",")[0].trim().split(" ")[0]
        if (firstUrl && !firstUrl.startsWith("data:")) {
          image = firstUrl
        }
      }
    }

    // NOTE: We use the thumbnail URLs as-is (e.g., image-165x248.png)
    // These are optimized thumbnails that exist and load quickly

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
  const limit = searchParams.get('limit') || '0' // 0 = no limit (get all), 10 = for home page
  
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
  
  // Build URL with proper pagination format: /page/2/?filters
  // Remove trailing slash from base URL
  categoryUrl = categoryUrl.replace(/\/$/, '')
  
  // Add page path if not first page
  if (page !== '1') {
    categoryUrl += `/page/${page}/`
  } else {
    categoryUrl += '/'
  }
  
  // Add filter query parameters
  if (!useLatest) {
    categoryUrl += '?archive_query=comment&alphabet_filter'
  } else {
    categoryUrl += '?alphabet_filter'
  }

  try {
    console.log(`Fetching ${category} content (filter: ${useLatest ? 'latest' : 'popular'}, page: ${page}, limit: ${limit})...`)
    console.log(`URL: ${categoryUrl}`)

    const html = await fetchVegaMoviesHTML(categoryUrl)
    const movies = parseVegaMoviesData(html, parseInt(limit))

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
