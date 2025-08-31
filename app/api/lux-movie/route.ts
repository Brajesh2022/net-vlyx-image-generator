import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

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
  }
  plot: string
  screenshots: string[]
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
}

const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
]

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getBrowserHeaders(): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    DNT: "1",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  }
}

async function fetchWithProxy(url: string, proxyIndex = 0): Promise<string> {
  if (proxyIndex >= CORS_PROXIES.length) {
    try {
      const response = await fetch(url, { headers: getBrowserHeaders() })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.text()
    } catch (error) {
      throw new Error(`All proxy attempts failed. Last error: ${error}`)
    }
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

    if (html.includes("Just a moment...") || html.includes("cf-browser-verification")) {
      throw new Error("Cloudflare challenge detected")
    }

    return html
  } catch (error) {
    return fetchWithProxy(url, proxyIndex + 1)
  }
}

function parseMovieDetails(html: string): MovieDetails {
  const $ = cheerio.load(html)

  // Extract title
  const title = $("h1.entry-title").text().trim() || "Unknown Title"

  // Extract poster - try multiple selectors and clean up URL
  let poster = ""
  const posterSelectors = [
    ".single-feature-image img",
    ".featured-image img",
    ".post-thumbnail img",
    ".entry-content img:first-child",
    "article img:first-child"
  ]
  
  for (const selector of posterSelectors) {
    const posterEl = $(selector).first()
    if (posterEl.length && posterEl.attr("src")) {
      poster = posterEl.attr("src") || ""
      // Skip if it's clearly a screenshot (usually contains imgbb.top)
      if (poster && !poster.includes("imgbb.top") && !poster.includes("screenshot")) {
        break
      }
    }
  }
  
  // Clean up poster URL
  if (poster && poster.startsWith("//")) {
    poster = "https:" + poster
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
  const movieInfo: any = {
    language: "",
    releasedYear: "",
    quality: "",
    size: "",
    format: ""
  }

  // Parse movie/series info from structured text
  const infoText = $(".entry-content").text()
  
  // Extract various fields using LuxMovies patterns
  const movieNameMatch = infoText.match(/Movie Name:\s*([^\n\r]+)/)
  const seriesNameMatch = infoText.match(/(?:Series Name|Full Name):\s*([^\n\r]+)/)
  const seasonMatch = infoText.match(/Season:\s*([^\n\r]+)/)
  const episodeMatch = infoText.match(/Episode:\s*([^\n\r]+)/)
  const languageMatch = infoText.match(/Language:\s*([^\n\r]+)/)
  const yearMatch = infoText.match(/Released Year:\s*([^\n\r]+)/)
  const qualityMatch = infoText.match(/Quality:\s*([^\n\r]+)/)
  const sizeMatch = infoText.match(/Size:\s*([^\n\r]+)/)
  const formatMatch = infoText.match(/Format:\s*([^\n\r]+)/)

  if (movieNameMatch) movieInfo.movieName = movieNameMatch[1].trim()
  if (seriesNameMatch) movieInfo.seriesName = seriesNameMatch[1].trim()
  if (seasonMatch) movieInfo.season = seasonMatch[1].trim()
  if (episodeMatch) movieInfo.episode = episodeMatch[1].trim()
  if (languageMatch) movieInfo.language = languageMatch[1].trim()
  if (yearMatch) movieInfo.releasedYear = yearMatch[1].trim()
  if (qualityMatch) movieInfo.quality = qualityMatch[1].trim()
  if (sizeMatch) movieInfo.size = sizeMatch[1].trim()
  if (formatMatch) movieInfo.format = formatMatch[1].trim()

  // Extract plot
  const plotMatch = infoText.match(/(?:Movie synopsis\/PLOT|Series synopsis\/PLOT):\s*([^]+?)(?=SCREENSHOTS:|$)/)
  const plot = plotMatch ? plotMatch[1].replace(/\s+/g, ' ').trim() : ""

  // Extract screenshots
  const screenshots: string[] = []
  
  // Try multiple approaches to find screenshots for LuxMovies
  const screenshotSelectors = [
    ".entry-content img[src*='imgbb.top']",
    ".entry-content img[src*='screenshot']",
    "img[src*='imgbb.top']",
    "img[src*='screenshot']",
    ".entry-content p img",
    "img[src*='imageban.ru']",
    "img[src*='imgbox.com']",
    "img[src*='fastpic.ru']",
    "img[src*='postimg.cc']"
  ]
  
  screenshotSelectors.forEach(selector => {
    $(selector).each((i: number, el: any) => {
      const src = $(el).attr("src") || $(el).attr("data-src")
      if (src && !screenshots.includes(src) && src !== poster) {
        // Clean up screenshot URLs
        let cleanSrc = src
        if (cleanSrc.startsWith("//")) {
          cleanSrc = "https:" + cleanSrc
        }
        screenshots.push(cleanSrc)
      }
    })
  })

  // Enhanced function to extract season from text
  const extractSeasonFromText = (text: string): string | null => {
    const cleanText = text.toLowerCase()
    
    // Pattern 1: "Season 4", "Season-4", "Season_4"
    const seasonMatch1 = cleanText.match(/season[\s\-_]*(\d+)/i)
    if (seasonMatch1) {
      return seasonMatch1[1]
    }
    
    // Pattern 2: "S4", "S04", "S-4"
    const seasonMatch2 = cleanText.match(/\bs[\-_]*(\d+)/i)
    if (seasonMatch2) {
      return seasonMatch2[1]
    }
    
    // Pattern 3: "(Season 4)", "(S4)"
    const seasonMatch3 = cleanText.match(/\((?:season[\s\-_]*)?(\d+)\)/i)
    if (seasonMatch3) {
      return seasonMatch3[1]
    }
    
    // Pattern 4: "4th season", "1st season"
    const seasonMatch4 = cleanText.match(/(\d+)(?:st|nd|rd|th)?\s*season/i)
    if (seasonMatch4) {
      return seasonMatch4[1]
    }
    
    return null
  }

  // Extract download sections with enhanced season detection
  const downloadSections: any[] = []
  
  // Method 1: Look for season-specific download sections
  $(".entry-content h3, .entry-content h5, .entry-inner h3, .entry-inner h5").each((i: number, el: any) => {
    const headerText = $(el).text().trim()
    const headerHtml = $(el).html() || ""
    
    // Check if this is a season download section
    const isSeasonSection = headerText.toLowerCase().includes("download") && 
                           (headerText.toLowerCase().includes("season") || 
                            headerText.match(/season\s*\d+/i))
    
    // Check if this is a quality section within a season
    const isQualitySection = headerText.includes("480p") || 
                            headerText.includes("720p") || 
                            headerText.includes("1080p") || 
                            headerText.includes("2160p") ||
                            headerText.includes("4K")
    
    if (isSeasonSection || isQualitySection) {
      // Extract season from the section context
      let seasonNumber = null
      
      // First, try to find season in the current header
      seasonNumber = extractSeasonFromText(headerText)
      
      // If not found, look in the previous headers for season context
      if (!seasonNumber) {
        let prevEl = $(el).prev()
        let searchDepth = 0
        while (prevEl.length && searchDepth < 5) {
          const prevText = prevEl.text().trim()
          if (prevText.toLowerCase().includes("download") && prevText.toLowerCase().includes("season")) {
            seasonNumber = extractSeasonFromText(prevText)
            break
          }
          prevEl = prevEl.prev()
          searchDepth++
        }
      }
      
      // If still not found, look in the broader context
      if (!seasonNumber) {
        const surroundingText = $(el).parent().text()
        seasonNumber = extractSeasonFromText(surroundingText)
      }
      
      const downloads: any[] = []
      
      // Extract quality and size from header
      const qualityMatch = headerText.match(/(480p|720p|1080p|2160p|4K)/i)
      const sizeMatch = headerText.match(/\[([^\]]+)\]/)
      
      const quality = qualityMatch ? qualityMatch[1] : ""
      const size = sizeMatch ? sizeMatch[1] : ""
      
      // Find download links after this header
      const links: any[] = []
      $(el).nextUntil("h3, h5, hr").find("a").each((j: number, linkEl: any) => {
        const linkUrl = $(linkEl).attr("href")
        const linkText = $(linkEl).text().trim()
        const buttonStyle = $(linkEl).find("button").attr("style") || $(linkEl).attr("style") || ""
        
        if (linkUrl && linkText) {
          links.push({
            label: linkText,
            url: linkUrl,
            style: buttonStyle,
            season: seasonNumber // Add season information to each link
          })
        }
      })
      
      if (links.length > 0) {
        downloads.push({ quality, size, links })
      }
      
      if (downloads.length > 0) {
        // Create section title with season information
        let sectionTitle = headerText
        if (seasonNumber && !sectionTitle.toLowerCase().includes("season")) {
          sectionTitle = `Season ${seasonNumber} - ${sectionTitle}`
        }
        
        downloadSections.push({
          title: sectionTitle,
          downloads,
          season: seasonNumber
        })
      }
    }
  })

  // Method 2: Enhanced parsing for LuxMovies specific format
  $(".entry-content h3[style*='text-align: center'], .entry-inner h3[style*='text-align: center']").each((i: number, el: any) => {
    const headerText = $(el).text().trim()
    const headerHtml = $(el).html() || ""
    
    // Check for quality patterns in both text and HTML
    const qualityPatterns = /(480p|720p|1080p|2160p|4K)/i
    const sizePatterns = /\[([^\]]+)\]/
    
    if (qualityPatterns.test(headerText) || qualityPatterns.test(headerHtml)) {
      // Extract season context from surrounding elements
      let seasonNumber = null
      
      // Look for season information in previous elements
      let prevEl = $(el).prev()
      let searchDepth = 0
      while (prevEl.length && searchDepth < 10) {
        const prevText = prevEl.text().trim()
        if (prevText.toLowerCase().includes("download") && prevText.toLowerCase().includes("season")) {
          seasonNumber = extractSeasonFromText(prevText)
          break
        }
        prevEl = prevEl.prev()
        searchDepth++
      }
      
      // If not found, check the broader context
      if (!seasonNumber) {
        const parentText = $(el).parent().text()
        seasonNumber = extractSeasonFromText(parentText)
      }
      
      const downloads: any[] = []
      
      // Extract quality and size from header (more flexible)
      const qualityMatch = headerText.match(qualityPatterns) || headerHtml.match(qualityPatterns)
      const sizeMatch = headerText.match(sizePatterns) || headerHtml.match(sizePatterns)
      
      const quality = qualityMatch ? qualityMatch[1] : ""
      const size = sizeMatch ? sizeMatch[1] : ""
      
      // Find download links in the next paragraph(s)
      const links: any[] = []
      let nextEl = $(el).next()
      
      // Look through multiple next elements to find download links
      while (nextEl.length && !nextEl.is("h3, h5, hr")) {
        if (nextEl.is("p")) {
          nextEl.find("a").each((j: number, linkEl: any) => {
            const linkUrl = $(linkEl).attr("href")
            const linkText = $(linkEl).text().trim() || $(linkEl).find("button").text().trim()
            const buttonStyle = $(linkEl).find("button").attr("style") || $(linkEl).attr("style") || ""
            
            // Extract service name from button text or style
            let serviceName = linkText
            if (linkText.includes("G-Direct")) serviceName = "G-Direct [Instant]"
            else if (linkText.includes("V-Cloud")) serviceName = "V-Cloud [Resumable]"
            else if (linkText.includes("GDToT")) serviceName = "GDToT [G-Drive]"
            else if (linkText.includes("⚡")) serviceName = linkText.replace(/⚡/g, "").trim()
            
            if (linkUrl && serviceName) {
              links.push({
                label: serviceName,
                url: linkUrl,
                style: buttonStyle || "luxmovies-button-new",
                season: seasonNumber // Add season information
              })
            }
          })
        }
        nextEl = nextEl.next()
      }
      
      if (links.length > 0) {
        downloads.push({ quality, size, links })
        
        // Create section title with season information
        let sectionTitle = headerText
        if (seasonNumber && !sectionTitle.toLowerCase().includes("season")) {
          sectionTitle = `Season ${seasonNumber} - ${sectionTitle}`
        }
        
        // Check if this section already exists to avoid duplicates
        const existingSection = downloadSections.find(section => 
          section.title === sectionTitle && section.season === seasonNumber
        )
        if (!existingSection) {
          downloadSections.push({
            title: sectionTitle,
            downloads,
            season: seasonNumber
          })
        }
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
    downloadSections
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const movieUrl = searchParams.get("url")

  if (!movieUrl) {
    return NextResponse.json({ error: "Movie URL is required" }, { status: 400 })
  }

  try {
    console.log("Fetching LuxMovies page:", movieUrl)
    const html = await fetchWithProxy(movieUrl)
    const movieDetails = parseMovieDetails(html)
    
    return NextResponse.json(movieDetails)
  } catch (error) {
    console.error("Error fetching LuxMovies page:", error)
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 }
    )
  }
}
