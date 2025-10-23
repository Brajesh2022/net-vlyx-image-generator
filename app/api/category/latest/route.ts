import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const BASE_URL = "https://movies4u.rip/"
const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
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
function parseMovies4UData(html: string, limit: number = 10): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []

  // movies4u.rip uses: <article id="post-XXXXX" class="post">
  $("article.post").each((index, element) => {
    if (limit > 0 && movies.length >= limit) return false // Stop when we have enough (only if limit is set)

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

export async function GET(request: NextRequest) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  try {
    console.log("Fetching latest content from movies4u.rip home...")

    const html = await fetchMovies4UHTML(BASE_URL)
    const movies = parseMovies4UData(html, 10)

    console.log(`Successfully fetched ${movies.length} latest items`)
    return NextResponse.json({ movies })
  } catch (error) {
    console.error("Error in latest API:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch latest content",
        movies: [],
      },
      { status: 500 }
    )
  }
}
