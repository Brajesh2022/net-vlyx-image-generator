import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

interface MovieDetails {
  title: string
  poster: string
  imdbRating: string
  imdbLink: string
  movieInfo: {
    movieName?: string
    seriesName?: string
    season?: string
    episode?: string
    language: string
    releasedYear: string
    quality: string
    size: string
    format: string
    subtitle?: string
  }
  plot: string
  screenshots: string[]
  watchOnlineUrl: string | null // NEW: Watch Online URL
  downloadSections: {
    title: string
    downloads: {
      quality: string
      size: string
      links: {
        label: string
        url: string
        style: string
      }[]
    }[]
  }[]
  hasBloggerImages: boolean
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

function parseMovies4UMovie(html: string): MovieDetails {
  const $ = cheerio.load(html)

  // Extract title from h1
  const title = $("h1").first().text().trim() || "Unknown Title"

  // Extract poster - look for the featured image
  let poster = ""
  const posterSelectors = [
    ".post-thumbnail img",
    ".entry-meta img",
    ".entry-inner img",
    "img[src*='.webp']",
    "img[src*='.jpg']",
  ]

  for (const selector of posterSelectors) {
    const $poster = $(selector).first()
    if ($poster.length) {
      poster = $poster.attr("src") || $poster.attr("data-src") || ""
      if (poster && !poster.includes("screenshot") && !poster.includes("ss-img")) {
        break
      }
    }
  }

  // Extract IMDb rating and link
  let imdbRating = ""
  let imdbLink = ""
  const imdbElement = $('a[href*="imdb.com"]').first()
  if (imdbElement.length) {
    imdbLink = imdbElement.attr("href") || ""
    const ratingText = imdbElement.text()
    const ratingMatch = ratingText.match(/(\d+\.?\d*\/10)/)
    imdbRating = ratingMatch ? ratingMatch[1] : ""
  }

  // Extract movie info
  const infoText = $(".single-service-content, .entry-content, .entry-inner").text()
  const movieInfo: any = {
    language: "",
    releasedYear: "",
    quality: "",
    size: "",
    format: "",
  }

  // Extract various fields
  const movieNameMatch = infoText.match(/Movie Name:\s*([^\n\r]+)/)
  const seriesNameMatch = infoText.match(/Series Name:\s*([^\n\r]+)/)
  const seasonMatch = infoText.match(/Season:\s*([^\n\r]+)/)
  const episodeMatch = infoText.match(/Episode:\s*([^\n\r]+)/)
  const languageMatch = infoText.match(/Language:\s*([^\n\r]+)/)
  const yearMatch = infoText.match(/Released? Year:\s*([^\n\r]+)/)
  const qualityMatch = infoText.match(/Quality:\s*([^\n\r]+)/)
  const sizeMatch = infoText.match(/Size:\s*([^\n\r]+)/)
  const formatMatch = infoText.match(/Format:\s*([^\n\r]+)/)
  const subtitleMatch = infoText.match(/Subtitle:\s*([^\n\r]+)/)

  if (movieNameMatch) movieInfo.movieName = movieNameMatch[1].trim()
  if (seriesNameMatch) movieInfo.seriesName = seriesNameMatch[1].trim()
  if (seasonMatch) movieInfo.season = seasonMatch[1].trim()
  if (episodeMatch) movieInfo.episode = episodeMatch[1].trim()
  if (languageMatch) movieInfo.language = languageMatch[1].trim()
  if (yearMatch) movieInfo.releasedYear = yearMatch[1].trim()
  if (qualityMatch) movieInfo.quality = qualityMatch[1].trim()
  if (sizeMatch) movieInfo.size = sizeMatch[1].trim()
  if (formatMatch) movieInfo.format = formatMatch[1].trim()
  if (subtitleMatch) movieInfo.subtitle = subtitleMatch[1].trim()

  // Extract plot/storyline
  const plotMatch = infoText.match(/Storyline:\s*([^]+?)(?=Screenshots:|$)/)
  const plot = plotMatch ? plotMatch[1].replace(/\s+/g, " ").trim() : ""

  // Extract screenshots from div.container.ss-img as per user's example
  const screenshots: string[] = []
  // More specific selector to avoid getting posters
  $("div.container.ss-img img").each((i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || ""
    // Filter out posters and ads - screenshots are usually from ibb.co or similar
    if (src && !screenshots.includes(src) && !src.includes("poster") && !src.includes("banner")) {
      screenshots.push(src)
    }
  })
  
  // Fallback to div.ss-img if container.ss-img didn't work
  if (screenshots.length === 0) {
    $("div.ss-img img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || ""
      if (src && !screenshots.includes(src) && !src.includes("poster") && !src.includes("banner")) {
        screenshots.push(src)
      }
    })
  }

  // Extract "Watch Online" URL from div.watch-links-div as per user's example
  let watchOnlineUrl: string | null = null
  const $watchLink = $("div.watch-links-div a.btn-zip, div.watch-links-div a.btn").first()
  if ($watchLink.length) {
    watchOnlineUrl = $watchLink.attr("href") || null
  }

  // Extract download sections from div.download-links-div
  // Convert to vegamovies-compatible format
  const downloadSections: any[] = []
  
  $("div.download-links-div h4, div.download-links-div h5").each((i, el) => {
    const $header = $(el)
    const headerText = $header.text().trim()
    
    // Extract FULL quality from the header including HEVC, etc.
    // Examples: "720p HEVC", "1080p", "2160p 4K", "720p"
    // Match pattern: [number]p followed by optional HEVC/4K
    const qualityMatch = headerText.match(/(\d+p(?:\s+(?:HEVC|4K|HDR|10bit))?)/i)
    if (!qualityMatch) return // Skip if no quality found
    
    const quality = qualityMatch[1].trim() // e.g., "720p HEVC" or "1080p"
    
    // Extract size from header (e.g., [120MB/E] or [1.4GB/E])
    const sizeMatch = headerText.match(/\[([^\]]+)\]/)
    const size = sizeMatch ? sizeMatch[1] : ""
    
    // Find the download buttons in the next sibling div
    const $downloadDiv = $header.next("div.downloads-btns-div")
    
    if ($downloadDiv.length) {
      const links: any[] = []
      
      // Extract "Download Links" URL (class="btn")
      const $downloadLink = $downloadDiv.find('a.btn:not(.btn-zip)').first()
      const downloadUrl = $downloadLink.attr("href") || ""
      if (downloadUrl) {
        links.push({
          label: "Download Links",
          url: downloadUrl,
          style: "",
        })
      }
      
      // Extract "BATCH/ZIP" URL (class="btn-zip")
      const $batchLink = $downloadDiv.find('a.btn-zip').first()
      const batchUrl = $batchLink.attr("href")
      if (batchUrl) {
        links.push({
          label: "BATCH/ZIP",
          url: batchUrl,
          style: "",
        })
      }
      
      if (links.length > 0) {
        // Format compatible with vegamovies structure
        downloadSections.push({
          title: headerText,
          downloads: [{
            quality,
            size,
            links,
          }],
        })
      }
    }
  })

  return {
    title,
    poster,
    imdbRating,
    imdbLink,
    movieInfo,
    plot,
    screenshots,
    watchOnlineUrl,
    downloadSections,
    hasBloggerImages: false, // movies4u doesn't use blogger images
  }
}

export async function GET(request: NextRequest) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const movieUrl = searchParams.get("url")

  if (!movieUrl) {
    return NextResponse.json({ error: "Movie URL is required" }, { status: 400 })
  }

  try {
    console.log("Fetching movies4u movie page...")
    const html = await fetchMovies4UHTML(movieUrl)
    console.log("Successfully fetched movies4u movie page")

    const movieDetails = parseMovies4UMovie(html)

    return NextResponse.json(movieDetails)
  } catch (error: any) {
    console.error("Error in movies4u movie API:", error)
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 }
    )
  }
}
