import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const BASE_URL = "https://www.vegamovies-nl.run/"
const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
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
function parseVegaMoviesData(html: string, limit: number = 10): Movie[] {
  const $ = cheerio.load(html)
  const movies: Movie[] = []

  $("article.post-item").each((index, element) => {
    if (limit > 0 && movies.length >= limit) return false // Stop when we have enough (only if limit is set)

    const $element = $(element)

    const $titleElement = $element.find("h3.post-title > a, h2.entry-title > a").first()
    const title = ($titleElement.attr("title") || $titleElement.text() || "").trim()
    const link = $titleElement.attr("href") || ""

    const $imageElement = $element.find("div.blog-pic img.blog-picture, img.blog-picture").first()
    let image = $imageElement.attr("src") || ""

    // Convert to high-res by removing resolution suffix
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

export async function GET(request: NextRequest) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  try {
    console.log("Fetching latest content from home...")

    const html = await fetchVegaMoviesHTML(BASE_URL)
    const movies = parseVegaMoviesData(html, 10)

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
