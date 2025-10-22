import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const MOVIES4U_BASE = "https://movies4u.contact"
const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

interface SearchResult {
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

function parseMovies4USearch(html: string): SearchResult[] {
  const $ = cheerio.load(html)
  const results: SearchResult[] = []

  // Parse search results from <article> tags as described in the user's HTML snippet
  $("article").each((index, element) => {
    const $element = $(element)

    // Extract title from <h3> tag's link text
    const $titleLink = $element.find("h3.entry-title a").first()
    const title = $titleLink.text().trim()
    
    // Extract page URL from <a> tag's href attribute
    const link = $titleLink.attr("href") || ""
    
    // Extract thumbnail from <img> tag's src attribute
    const $image = $element.find("img").first()
    const image = $image.attr("src") || $image.attr("data-src") || ""

    if (!title || !link) return

    // Determine category from title
    let category = "General"
    const titleLower = title.toLowerCase()

    if (titleLower.includes("bollywood") || titleLower.includes("hindi")) {
      category = "Bollywood"
    } else if (titleLower.includes("hollywood") || titleLower.includes("english")) {
      category = "Hollywood"
    } else if (titleLower.includes("south") || titleLower.includes("tamil") || titleLower.includes("telugu")) {
      category = "South Indian"
    } else if (titleLower.includes("web") || titleLower.includes("series") || titleLower.includes("season")) {
      category = "Web Series"
    }

    results.push({
      title,
      image,
      link,
      description: title,
      category,
    })
  })

  return results
}

export async function GET(request: NextRequest) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const searchQuery = searchParams.get('s') || searchParams.get('q') || ''

  if (!searchQuery) {
    return NextResponse.json({ error: "Search query is required", results: [] }, { status: 400 })
  }

  try {
    // Build search URL for movies4u.contact
    const searchUrl = `${MOVIES4U_BASE}/?s=${encodeURIComponent(searchQuery)}`
    
    console.log(`Searching movies4u.contact for: "${searchQuery}"`)
    console.log(`URL: ${searchUrl}`)

    const html = await fetchMovies4UHTML(searchUrl)
    const results = parseMovies4USearch(html)

    console.log(`Successfully found ${results.length} results for "${searchQuery}"`)

    return NextResponse.json({ 
      results,
      total: results.length,
      query: searchQuery 
    })
  } catch (error) {
    console.error(`Error in movies4u search API:`, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch search results",
        results: [],
        total: 0,
      },
      { status: 500 }
    )
  }
}
