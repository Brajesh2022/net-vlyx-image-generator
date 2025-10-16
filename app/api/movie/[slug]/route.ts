import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const TARGET_URL = "https://hdhub4u.cologne/"

// Reordered CORS proxies with the working one first
const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/", // WORKING - Move to first position
  "https://api.codetabs.com/v1/proxy?quest=", // Keep as backup
  "https://api.allorigins.win/raw?url=", // Keep as backup
  "https://corsproxy.io/?", // Keep as backup
  "https://cors-anywhere.herokuapp.com/", // Keep as backup
]

interface DownloadLink {
  title: string
  url: string
  quality: string
  size: string
  format?: string
  server: string
  status: string
  speed?: string
}

interface Episode {
  number: number
  title: string
  description: string
  duration: string
  downloadLinks: DownloadLink[]
}

interface CastMember {
  name: string
  role: string
  photo?: string
}

interface Quality {
  name: string
  size: string
}

interface MovieDetail {
  title: string
  description: string
  synopsis?: string
  image: string
  category: string
  rating?: string
  year?: string
  duration?: string
  episodes?: number
  views?: string
  downloads?: string
  director?: string
  producer?: string
  writer?: string
  music?: string
  releaseDate?: string
  language?: string
  platform?: string
  totalRuntime?: string
  trailer?: {
    url?: string
    thumbnail?: string
    duration?: string
    views?: string
    likes?: string
  }
  screenshots?: string[]
  downloadLinks: DownloadLink[]
  episodeList?: Episode[]
  cast?: CastMember[]
  qualities?: Quality[]
}

interface ParsedMovieDetail {
  movie: MovieDetail
  error?: string
}

// Enhanced user agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
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
    "Cache-Control": "max-age=0",
  }
}

async function fetchWithProxy(url: string, proxyIndex = 0): Promise<string> {
  if (proxyIndex >= CORS_PROXIES.length) {
    // Try direct fetch as last resort
    try {
      const response = await fetch(url, {
        headers: getBrowserHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.text()
    } catch (error) {
      throw new Error(`All proxy attempts failed. Last error: ${error}`)
    }
  }

  const proxy = CORS_PROXIES[proxyIndex]
  const proxyUrl = proxy + encodeURIComponent(url)

  try {
    console.log(`Trying proxy ${proxyIndex + 1}/${CORS_PROXIES.length}: ${proxy}`)

    // Add small delay for the working proxy
    if (proxyIndex === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getBrowserHeaders(),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Check if we got Cloudflare challenge page
    if (html.includes("Just a moment...") || html.includes("cf-browser-verification") || html.includes("_cf_chl_opt")) {
      console.log(`Proxy ${proxyIndex + 1} returned Cloudflare challenge page`)
      throw new Error("Cloudflare challenge detected")
    }

    // Basic validation to ensure we got actual HTML content
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      throw new Error("Invalid HTML response")
    }

    console.log(`Successfully fetched with proxy ${proxyIndex + 1}`)
    return html
  } catch (error) {
    console.log(`Proxy ${proxyIndex + 1} failed:`, error)
    return fetchWithProxy(url, proxyIndex + 1)
  }
}

function parseMovieDetail(html: string, originalUrl: string): MovieDetail {
  const $ = cheerio.load(html)

  // Extract basic movie information
  const title = $("h1").first().text().trim() || $(".post-title").text().trim() || "Unknown Title"
  const description = $(".post-content p").first().text().trim() || $("meta[name='description']").attr("content") || ""
  const image = $(".post-thumbnail img").attr("src") || $("meta[property='og:image']").attr("content") || ""

  // Extract movie metadata
  const category = extractCategory(title)
  const rating = $(".rating").text().trim() || "8.5"
  const year = extractYear(html, title)
  const duration = extractDuration(html)

  // Extract trailer information with better YouTube detection
  const trailer = extractTrailerInfo($, html)

  // Add this line after extracting the trailer
  const screenshots = extractScreenshots($)

  // Extract download links
  const downloadLinks = extractDownloadLinks($)

  // Extract episodes if it's a series
  const episodeList = extractEpisodes($)

  // NEW: Remove duplicate links from download section if they exist in episodes
  const deduplicatedDownloadLinks = removeDuplicateLinksFromDownloadSection(downloadLinks, episodeList)

  // Extract cast information
  const cast = extractCast($)

  // Extract available qualities - Use deduplicated download links
  const qualities = extractQualities($, deduplicatedDownloadLinks)

  // Extract additional metadata
  const director = extractMetadata($, ["director", "directed by"])
  const producer = extractMetadata($, ["producer", "produced by"])
  const writer = extractMetadata($, ["writer", "written by"])
  const music = extractMetadata($, ["music", "music by"])
  const language = extractMetadata($, ["language"]) || "Hindi"
  const platform = extractMetadata($, ["platform", "streaming on"])

  // Add screenshots to the return object
  return {
    title,
    description,
    synopsis: description,
    image,
    category,
    rating,
    year,
    duration,
    episodes: episodeList.length,
    views: extractViews($),
    downloads: extractDownloads($),
    director,
    producer,
    writer,
    music,
    releaseDate: extractReleaseDate($),
    language,
    platform,
    totalRuntime: calculateTotalRuntime(episodeList, duration),
    trailer,
    screenshots,
    downloadLinks: deduplicatedDownloadLinks, // Use deduplicated links
    episodeList: episodeList.length > 0 ? episodeList : undefined,
    cast: cast.length > 0 ? cast : undefined,
    qualities: qualities.length > 0 ? qualities : undefined,
  }
}

// NEW: Function to remove duplicate links from download section if they exist in episodes
function removeDuplicateLinksFromDownloadSection(
  downloadLinks: DownloadLink[],
  episodeList: Episode[],
): DownloadLink[] {
  if (!episodeList || episodeList.length === 0) {
    return downloadLinks
  }

  // Collect all episode URLs for comparison
  const episodeUrls = new Set<string>()

  episodeList.forEach((episode) => {
    episode.downloadLinks.forEach((link) => {
      if (link.url && link.url !== "#") {
        episodeUrls.add(link.url)
      }
    })
  })

  // Filter out download links that exist in episodes
  const filteredDownloadLinks = downloadLinks.filter((downloadLink) => {
    if (!downloadLink.url || downloadLink.url === "#") {
      return false
    }

    // If this URL exists in any episode, exclude it from download section
    return !episodeUrls.has(downloadLink.url)
  })

  console.log(`Removed ${downloadLinks.length - filteredDownloadLinks.length} duplicate links from download section`)

  return filteredDownloadLinks
}

function extractCategory(title: string): string {
  const titleLower = title.toLowerCase()

  if (titleLower.includes("bollywood") || titleLower.includes("hindi")) {
    return "Bollywood"
  } else if (titleLower.includes("hollywood") || titleLower.includes("english")) {
    return "Hollywood"
  } else if (titleLower.includes("south") || titleLower.includes("tamil") || titleLower.includes("telugu")) {
    return "South Indian"
  } else if (titleLower.includes("web") || titleLower.includes("series")) {
    return "Web Series"
  } else if (titleLower.includes("season")) {
    return "TV Shows"
  }

  return "General"
}

function extractYear(html: string, title: string): string {
  // Try to extract year from various sources
  const yearMatches = html.match(/\b(19|20)\d{2}\b/g)
  if (yearMatches) {
    return yearMatches[yearMatches.length - 1] // Get the last year found
  }

  // Try to extract from title
  const titleYearMatch = title.match(/\b(19|20)\d{2}\b/)
  if (titleYearMatch) {
    return titleYearMatch[0]
  }

  return "2024"
}

function extractDuration(html: string): string {
  // Look for duration patterns
  const durationMatches = html.match(/(\d+)\s*(?:min|minutes|hrs|hours)/gi)
  if (durationMatches) {
    return durationMatches[0]
  }

  return "120 min"
}

function extractTrailerInfo($: cheerio.CheerioAPI, html: string): MovieDetail["trailer"] {
  // Enhanced YouTube detection
  let trailerUrl = ""

  // Look for YouTube iframe embeds
  $("iframe").each((_, element) => {
    const src = $(element).attr("src")
    if (src && (src.includes("youtube.com") || src.includes("youtu.be"))) {
      trailerUrl = src
      return false // Break loop
    }
  })

  // Look for YouTube links in the content
  if (!trailerUrl) {
    $("a").each((_, element) => {
      const href = $(element).attr("href")
      const text = $(element).text().toLowerCase()
      if (
        href &&
        (href.includes("youtube.com") || href.includes("youtu.be")) &&
        (text.includes("trailer") || text.includes("watch"))
      ) {
        trailerUrl = href
        return false // Break loop
      }
    })
  }

  // Search in raw HTML for YouTube URLs
  if (!trailerUrl) {
    const youtubeMatches = html.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
    )
    if (youtubeMatches && youtubeMatches.length > 0) {
      trailerUrl = youtubeMatches[0]
    }
  }

  // Extract video ID and create proper embed URL
  if (trailerUrl) {
    let videoId = ""

    if (trailerUrl.includes("youtube.com/watch")) {
      const match = trailerUrl.match(/[?&]v=([^&]+)/)
      videoId = match ? match[1] : ""
    } else if (trailerUrl.includes("youtu.be/")) {
      const match = trailerUrl.match(/youtu\.be\/([^?]+)/)
      videoId = match ? match[1] : ""
    } else if (trailerUrl.includes("youtube.com/embed/")) {
      const match = trailerUrl.match(/embed\/([^?]+)/)
      videoId = match ? match[1] : ""
    }

    if (videoId) {
      // Clean video ID of any additional parameters
      videoId = videoId.split("&")[0].split("?")[0]

      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

      return {
        url: embedUrl,
        thumbnail: thumbnailUrl,
        duration: "2:39",
        views: "1.2M",
        likes: "45K",
      }
    }
  }

  return undefined
}

function extractScreenshots($: cheerio.CheerioAPI): string[] {
  const screenshots: string[] = []

  // Look for screenshots section
  $("h2, h3").each((_, element) => {
    const $header = $(element)
    const headerText = $header.text().toLowerCase()

    // Check if this is a screenshots header
    if (headerText.includes("screen-shots") || headerText.includes("screenshots")) {
      // Find the next element that contains images
      let $next = $header.next()
      while ($next.length && screenshots.length < 10) {
        // Look for images in this section
        $next.find("img").each((_, imgElement) => {
          const $img = $(imgElement)
          const src = $img.attr("src")

          if (src && !screenshots.includes(src)) {
            // Convert relative URLs to absolute URLs
            const fullUrl = src.startsWith("http") ? src : `https://hdhub4u.cologne/${src}`
            screenshots.push(fullUrl)
          }
        })

        // Also check for direct images in the current element
        if ($next.is("img")) {
          const src = $next.attr("src")
          if (src && !screenshots.includes(src)) {
            const fullUrl = src.startsWith("http") ? src : `https://hdhub4u.cologne/${src}`
            screenshots.push(fullUrl)
          }
        }

        $next = $next.next()

        // Stop if we hit another major section
        if ($next.find("h2, h3").length > 0) break
      }
    }
  })

  // Also look for images in h3 tags that might contain screenshots
  $("h3").each((_, element) => {
    const $h3 = $(element)
    $h3.find("img").each((_, imgElement) => {
      const $img = $(imgElement)
      const src = $img.attr("src")
      const alt = $img.attr("alt") || ""

      // Check if this looks like a screenshot
      if (src && (alt.includes("frame") || alt.includes("vlcsnap") || src.includes("images/"))) {
        const fullUrl = src.startsWith("http") ? src : `https://hdhub4u.cologne/${src}`
        if (!screenshots.includes(fullUrl)) {
          screenshots.push(fullUrl)
        }
      }
    })
  })

  return screenshots.slice(0, 8) // Limit to 8 screenshots
}

function extractDownloadLinks($: cheerio.CheerioAPI): DownloadLink[] {
  const links: DownloadLink[] = []

        console.log("Starting enhanced download link extraction...")

   // Enhanced pattern recognition for all the user's provided formats
   const qualityPatterns = [
     // Pattern 1: "480p Links [350MB]" or "720p Links [800MB]"
     /(\d+p)\s*Links?\s*\[([^\]]+)\]/i,
     
     // Pattern 2: "480p⚡[640MB]" (with lightning emoji)
     /(\d+p)⚡\[([^\]]+)\]/i,
     
     // Pattern 3: "720p HEVC [930MB]" or "720p x264 [1.3GB]"
     /(\d+p)\s*(HEVC|x264|WEB-DL)?\s*\[([^\]]*)\]/i,
     
     // Pattern 4: "1080p x264 2.1GB]" (missing opening bracket)
     /(\d+p)\s*(HEVC|x264|WEB-DL)?\s*([0-9.]+\s*[KMGT]?B)\]/i,
     
     // Pattern 5: "1080p WEB-DL [10.4GB]"
     /(\d+p)\s+(WEB-DL|HEVC|x264)\s+\[([^\]]+)\]/i,
     
     // Pattern 6: "HQ 1080p [3.7GB]" (High Quality variant)
     /(HQ\s+\d+p)\s*\[([^\]]+)\]/i,
     
     // Pattern 7: "1080p WEB-DL [6.1GB]" (without x264/HEVC)
     /(\d+p)\s+(WEB-DL)\s+\[([^\]]+)\]/i,
     
     // NEW Pattern 8: "480p Pack [1.5GB]" or "720p HEVC Pack [2.2GB]" or "1080p HEVC Pack [4.7GB]"
     /(\d+p)\s*(HEVC|x264)?\s*Pack\s*\[([^\]]+)\]/i,
     
     // NEW Pattern 9: "720p x264 Pack [3.2GB]" (with codec before Pack)
     /(\d+p)\s+(HEVC|x264|WEB-DL)\s+Pack\s*\[([^\]]+)\]/i
   ]

   // Function to check if a link should be ignored (SAMPLE links, announcements, etc.)
   const shouldIgnoreLink = (text: string, linkText: string): boolean => {
     const ignorePatterns = [
       /\[SAMPLE\]/i,
       /!! EXTENDED-CUT VERSiON !!/i,
       /!! Now in ORG HiNDi DD5\.1 Audio !!/i,
       /EXTENDED-CUT/i,
       /VERSiON/i
     ]
     
     return ignorePatterns.some(pattern => pattern.test(text) || pattern.test(linkText))
   }

  // First, look specifically for download sections
  const downloadSectionIndicators = [
    "DOWNLOAD LINKS",
    "download links", 
    ": DOWNLOAD LINKS :",
    "Download Links"
  ]

  let downloadSectionFound = false
  let streamSectionFound = false

  // Find download section specifically
  $("h2, h3").each((_, element) => {
    const $header = $(element)
    const headerText = $header.text().trim()
    
    if (downloadSectionIndicators.some(indicator => headerText.includes(indicator))) {
      downloadSectionFound = true
      console.log("Found download section:", headerText)
      
      // Process all elements after this header until we hit another major section
      let $current = $header.next()
      let processedCount = 0
      
      while ($current.length && processedCount < 20) {
        // Stop if we hit another major section
        if ($current.is("h2") && ($current.text().includes("Storyline") || $current.text().includes("Download") || $current.text().includes("Watch"))) {
          break
        }
        
        // Process h3 and h4 elements that contain quality links
        if ($current.is("h3, h4")) {
          const elementText = $current.text().trim()
          const elementHtml = $current.html() || ""
          
          console.log("Processing element:", elementText)
          
                                // Skip elements that should be ignored (SAMPLE links, announcements, etc.)
           if (shouldIgnoreLink(elementText, elementHtml)) {
             console.log("Skipping ignored element:", elementText.substring(0, 50))
             return
           }

           // Check if this is a streaming link (Watch Online, WATCH, PLAYER, etc.)
           const isStreamingElement = 
             elementText.toLowerCase().includes("watch online") ||
             elementText.toLowerCase().includes("watch") ||
             elementText.toLowerCase().includes("stream") ||
             elementText.toLowerCase().includes("player") ||
             elementHtml.includes("color: #08e8de") || // Cyan color for WATCH links
             elementHtml.includes("WATCH") ||
             elementHtml.includes("PLAYER")
          
          if (isStreamingElement) {
            // Process streaming links
            $current.find("a[href]").each((_, linkElement) => {
              const $link = $(linkElement)
              let url = $link.attr("href")
              const linkText = $link.text().trim()
              
              if (url && !url.includes("#") && isValidDownloadUrl(url)) {
                const server = extractServerFromUrl(url)
                
                // Transform URLs based on server type
                if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
                  const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                  if (fileIdMatch) {
                    url = `/download/${fileIdMatch[1]}`
                  }
                }
                
                links.push({
                  title: linkText || "Watch Online",
                  url,
                  quality: "Unknown", // Streaming links often don't specify quality
                  size: "Unknown",
                  server,
                  status: "Stream",
                  speed: getSpeedForServer(server),
                })
                
                console.log("Added streaming link:", linkText)
              }
            })
          } else {
            // Process download quality links
            let qualityMatch = null
            let matchedPattern = ""
            
            // Try each quality pattern
            for (const pattern of qualityPatterns) {
              qualityMatch = elementText.match(pattern)
              if (qualityMatch) {
                matchedPattern = pattern.toString()
                break
              }
            }
            
                         if (qualityMatch) {
               let quality = qualityMatch[1] // e.g., "480p", "720p", "1080p", "HQ 1080p"
               let codec = qualityMatch[2] || "" // e.g., "HEVC", "x264", "WEB-DL"
               let size = qualityMatch[3] || "Unknown" // e.g., "350MB", "1.3GB"
               
               // Handle HQ format - extract the actual quality from "HQ 1080p"
               if (quality.startsWith("HQ ")) {
                 quality = quality.replace("HQ ", "") // "HQ 1080p" -> "1080p"
                 codec = "HQ" // Mark as High Quality
               }
               
               console.log(`Found quality: ${quality}, codec: ${codec}, size: ${size} using pattern: ${matchedPattern}`)
              
              // Extract the link from this element
              $current.find("a[href]").each((_, linkElement) => {
                const $link = $(linkElement)
                let url = $link.attr("href")
                const linkText = $link.text().trim()
                
                if (url && !url.includes("#") && isValidDownloadUrl(url)) {
                  const server = extractServerFromUrl(url)
                  
                  // Transform URLs based on server type
                  if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
                    const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                    if (fileIdMatch) {
                      url = `/download/${fileIdMatch[1]}`
                    }
                  }
                  
                  // Clean up the size format
                  let cleanSize = size
                  if (size && size !== "Unknown") {
                    // Handle malformed sizes like "2.1GB]" or "850MB]"
                    cleanSize = size.replace(/[^\d.KMGTB]/gi, '').trim()
                    if (!cleanSize.match(/[KMGT]?B$/i) && cleanSize.match(/^\d/)) {
                      // If it's just numbers, assume MB for small numbers, GB for large
                      const numValue = parseFloat(cleanSize)
                      if (numValue < 100) {
                        cleanSize += "GB"
                      } else {
                        cleanSize += "MB"
                      }
                    }
                  }
                  
                  const title = codec ? `${quality} ${codec} [${cleanSize}]` : `${quality} [${cleanSize}]`
                  
                  links.push({
                    title,
                    url,
                    quality,
                    size: cleanSize,
                    format: codec,
                    server,
                    status: "Active",
                    speed: getSpeedForServer(server),
                  })
                  
                  console.log(`Added download link: ${title} -> ${server}`)
                }
              })
            } else {
              // If no quality pattern matched, try to extract individual links
              $current.find("a[href]").each((_, linkElement) => {
                const $link = $(linkElement)
                let url = $link.attr("href")
                const linkText = $link.text().trim()
                
                if (url && !url.includes("#") && isValidDownloadUrl(url) && !links.some(l => l.url === url)) {
                  // Try to extract quality and size from the link text itself
                  const quality = extractQualityFromText(linkText)
                  const size = extractSizeFromText(linkText)
                  const server = extractServerFromUrl(url)
                  
                  // Only add if we can determine quality or it's a known server
                  if (quality !== "Unknown" || ["NetVlyx Server", "VlyJes Server", "Vlyx Server"].includes(server)) {
                    if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
                      const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                      if (fileIdMatch) {
                        url = `/download/${fileIdMatch[1]}`
                      }
                    }
                    
                    links.push({
                      title: linkText || `${quality} Download`,
                      url,
                      quality,
                      size: size || "Unknown",
                      server,
                      status: "Active",
                      speed: getSpeedForServer(server),
                    })
                    
                    console.log(`Added individual link: ${linkText} -> ${server}`)
                  }
                }
              })
            }
          }
        }
        
        $current = $current.next()
        processedCount++
      }
    }
  })

  // If no specific download section was found, fall back to general scanning
  if (!downloadSectionFound) {
    console.log("No download section found, using fallback scanning...")
    
    $("h3, h4").each((_, element) => {
      const $header = $(element)
      const headerText = $header.text().trim()
      
      // Try quality patterns on all headers
      for (const pattern of qualityPatterns) {
        const qualityMatch = headerText.match(pattern)
        if (qualityMatch) {
          const quality = qualityMatch[1]
          const codec = qualityMatch[2] || ""
          const size = qualityMatch[3] || "Unknown"
          
          $header.find("a[href]").each((_, linkElement) => {
            const $link = $(linkElement)
            let url = $link.attr("href")
            const linkText = $link.text().trim()
            
            if (url && !url.includes("#") && isValidDownloadUrl(url) && !links.some(l => l.url === url)) {
              const server = extractServerFromUrl(url)
              
              if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
                const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                if (fileIdMatch) {
                  url = `/download/${fileIdMatch[1]}`
                }
              }
              
              // Determine if this is a streaming link
              const isStreamLink = 
                linkText.toLowerCase().includes("watch") ||
                linkText.toLowerCase().includes("stream") ||
                server === "HDStream4u"
              
              links.push({
                title: codec ? `${quality} ${codec} [${size}]` : `${quality} [${size}]`,
                url,
                quality,
                size,
                format: codec,
                server,
                status: isStreamLink ? "Stream" : "Active",
                speed: getSpeedForServer(server),
              })
            }
          })
          break // Found a match, no need to try other patterns
        }
      }
         })
   }

   // Additional scan for standalone quality links that might be outside nested structures
   console.log("Scanning for standalone quality links...")
   $("h3, h4").each((_, element) => {
     const $element = $(element)
     const elementText = $element.text().trim()
     const elementHtml = $element.html() || ""
     
     // Skip if already processed or should be ignored
     if (shouldIgnoreLink(elementText, elementHtml) || links.some(l => l.title === elementText)) {
       return
     }
     
     // Try quality patterns on standalone elements
     for (const pattern of qualityPatterns) {
       const qualityMatch = elementText.match(pattern)
       if (qualityMatch) {
         let quality = qualityMatch[1]
         let codec = qualityMatch[2] || ""
         let size = qualityMatch[3] || "Unknown"
         
         // Handle HQ format
         if (quality.startsWith("HQ ")) {
           quality = quality.replace("HQ ", "")
           codec = "HQ"
         }
         
         $element.find("a[href]").each((_, linkElement) => {
           const $link = $(linkElement)
           let url = $link.attr("href")
           const linkText = $link.text().trim()
           
           if (url && !url.includes("#") && isValidDownloadUrl(url) && !links.some(l => l.url === url)) {
             const server = extractServerFromUrl(url)
             
             // Transform URLs based on server type
             if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
               const fileIdMatch = url.match(/\/file\/([^/?]+)/)
               if (fileIdMatch) {
                 url = `/download/${fileIdMatch[1]}`
               }
             }
             
             // Determine if this is a streaming link
             const isStreamLink = 
               linkText.toLowerCase().includes("watch") ||
               linkText.toLowerCase().includes("stream") ||
               server === "HDStream4u"
             
             const title = codec ? `${quality} ${codec} [${size}]` : `${quality} [${size}]`
             
             links.push({
               title,
               url,
               quality,
               size,
               format: codec,
               server,
               status: isStreamLink ? "Stream" : "Active",
               speed: getSpeedForServer(server),
             })
             
             console.log(`Added standalone link: ${title} -> ${server}`)
           }
         })
         break // Found a match, no need to try other patterns
       }
     }
   })

   console.log(`Extracted ${links.length} total links`)
   return links
}

// In the extractEpisodes function, I'll enhance the episode parsing logic to better handle streaming links
// Replace the existing extractEpisodes function with this improved version:

function extractEpisodes($: cheerio.CheerioAPI): Episode[] {
  const episodes: Episode[] = []

  // NEW: First check for "Single Episode Links" section format
  const singleEpisodeSection = extractSingleEpisodeLinks($)
  if (singleEpisodeSection.length > 0) {
    console.log(`Found ${singleEpisodeSection.length} episodes from Single Episode Links, skipping general extraction`)
    episodes.push(...singleEpisodeSection)
    // Return early to avoid conflicts with general episode extraction
    return episodes.sort((a, b) => a.number - b.number)
  }

  // Enhanced episode detection - handle multiple patterns
  const episodeSelectors = ["h3", "h4", "h2"]

  episodeSelectors.forEach((selector) => {
    $(selector).each((_, element) => {
      const $header = $(element)
      const headerText = $header.text().trim()

      // Enhanced episode pattern matching - including the new format
      const episodePatterns = [
        /EPiSODE\s*(\d+)/i, 
        /Episode\s*(\d+)/i, 
        /EP\s*(\d+)/i, 
        /E(\d+)(?:\s*–|\s*-|\s*:)/i,  // E01 –, E02 -, E03 :
        /E(\d+)/i
      ]

      let episodeMatch = null
      let episodeNumber = 0

      // Try each pattern
      for (const pattern of episodePatterns) {
        episodeMatch = headerText.match(pattern)
        if (episodeMatch) {
          episodeNumber = Number.parseInt(episodeMatch[1])
          break
        }
      }

      if (episodeMatch && episodeNumber > 0) {
        const episodeLinks: DownloadLink[] = []

        // Extract all links from the same header element
        $header.find("a[href]").each((_, linkElement) => {
          const $link = $(linkElement)
          let url = $link.attr("href")
          const linkText = $link.text().trim()
          const linkHtml = $link.html() || ""

          if (url && !url.includes("#") && linkText && isValidDownloadUrl(url)) {
            const server = extractServerFromUrl(url)

            // Enhanced streaming detection
            const isStreamingLink =
              linkText.toLowerCase().includes("watch") ||
              linkText.toLowerCase().includes("stream") ||
              linkText.toLowerCase().includes("online") ||
              linkHtml.includes("color: #00ffff") || // Cyan colored WATCH links
              linkHtml.includes("color: #ffcc00") || // Yellow colored links
              linkHtml.toLowerCase().includes("watch") ||
              server === "HDStream4u" ||
              url.includes("hubstream.art") ||
              url.includes("hdstream4u.com")

            // Transform URLs to internal routes based on server type
            if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
              const fileIdMatch = url.match(/\/file\/([^/?]+)/)
              if (fileIdMatch) {
                url = `/download/${fileIdMatch[1]}`
              }
            }

            // Determine quality from the overall page context or set as Unknown
            let quality = "Unknown"
            const pageText = $.text().toLowerCase()
            if (pageText.includes("1080p")) quality = "1080p"
            else if (pageText.includes("720p")) quality = "720p"
            else if (pageText.includes("4k")) quality = "4K"
            else if (pageText.includes("480p")) quality = "480p"

            // Create appropriate link entry
            episodeLinks.push({
              title: isStreamingLink
                ? `Episode ${episodeNumber} - Watch Online`
                : `Episode ${episodeNumber} - Download`,
              url,
              quality,
              size: quality !== "Unknown" ? getSizeForQuality(quality) : "Unknown",
              server,
              status: isStreamingLink ? "Stream" : "Download",
              speed: getSpeedForServer(server),
            })
          }
        })

        // Also check for links in the next sibling elements (for some layouts)
        let $next = $header.next()
        let checkCount = 0
        while ($next.length && checkCount < 3) {
          // Limit to avoid infinite loops
          const nextText = $next.text().toLowerCase()

          // Stop if we hit another episode
          if (nextText.match(/episode\s*\d+|episod\s*\d+/i)) {
            break
          }

          $next.find("a[href]").each((_, linkElement) => {
            const $link = $(linkElement)
            let url = $link.attr("href")
            const linkText = $link.text().trim()
            const linkHtml = $link.html() || ""

            if (url && !url.includes("#") && linkText && isValidDownloadUrl(url)) {
              const server = extractServerFromUrl(url)

              const isStreamingLink =
                linkText.toLowerCase().includes("watch") ||
                linkText.toLowerCase().includes("stream") ||
                linkHtml.includes("color: #00ffff") ||
                linkHtml.includes("color: #ffcc00") ||
                server === "HDStream4u" ||
                url.includes("hubstream.art")

              // Transform URLs
              if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
                const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                if (fileIdMatch) {
                  url = `/download/${fileIdMatch[1]}`
                }
              }

              let quality = "Unknown"
              const contextText = ($header.text() + " " + $next.text()).toLowerCase()
              if (contextText.includes("1080p")) quality = "1080p"
              else if (contextText.includes("720p")) quality = "720p"
              else if (contextText.includes("4k")) quality = "4K"
              else if (contextText.includes("480p")) quality = "480p"

              episodeLinks.push({
                title: isStreamingLink
                  ? `Episode ${episodeNumber} - Watch Online`
                  : `Episode ${episodeNumber} - Download`,
                url,
                quality,
                size: quality !== "Unknown" ? getSizeForQuality(quality) : "Unknown",
                server,
                status: isStreamingLink ? "Stream" : "Download",
                speed: getSpeedForServer(server),
              })
            }
          })

          $next = $next.next()
          checkCount++
        }

        // Only add episode if it has real links
        if (episodeLinks.length > 0) {
          // Check if episode already exists (avoid duplicates)
          const existingEpisode = episodes.find((ep) => ep.number === episodeNumber)
          if (existingEpisode) {
            // Merge links if episode already exists
            existingEpisode.downloadLinks.push(...episodeLinks)
          } else {
            episodes.push({
              number: episodeNumber,
              title: `Episode ${episodeNumber}`,
              description: `Episode ${episodeNumber} of the series with exciting plot developments and character growth.`,
              duration: "45 min",
              downloadLinks: episodeLinks,
            })
          }
        }
      }
    })
  })

  // Enhanced fallback: Look for episode links in paragraph elements
  $("p").each((_, element) => {
    const $p = $(element)
    const text = $p.text()

    const episodeMatch = text.match(/EPiSODE\s*(\d+)|Episode\s*(\d+)/i)
    if (episodeMatch) {
      const episodeNumber = Number.parseInt(episodeMatch[1] || episodeMatch[2])

      if (episodeNumber > 0 && !episodes.find((ep) => ep.number === episodeNumber)) {
        const episodeLinks: DownloadLink[] = []

        $p.find("a[href]").each((_, linkElement) => {
          const $link = $(linkElement)
          let url = $link.attr("href")
          const linkText = $link.text().trim()
          const linkHtml = $link.html() || ""

          if (url && !url.includes("#") && linkText && isValidDownloadUrl(url)) {
            const server = extractServerFromUrl(url)

            const isStreamingLink =
              linkText.toLowerCase().includes("watch") ||
              linkHtml.includes("color: #00ffff") ||
              linkHtml.includes("color: #ffcc00") ||
              server === "HDStream4u"

            if (url.includes("hubdrive.wales/file/")) {
              const fileIdMatch = url.match(/\/file\/([^/?]+)/)
              if (fileIdMatch) {
                url = `/download/${fileIdMatch[1]}`
              }
            }

            let quality = "Unknown"
            const contextText = text.toLowerCase()
            if (contextText.includes("1080p")) quality = "1080p"
            else if (contextText.includes("720p")) quality = "720p"
            else if (contextText.includes("4k")) quality = "4K"
            else if (contextText.includes("480p")) quality = "480p"

            episodeLinks.push({
              title: isStreamingLink
                ? `Episode ${episodeNumber} - Watch Online`
                : `Episode ${episodeNumber} - Download`,
              url,
              quality,
              size: quality !== "Unknown" ? getSizeForQuality(quality) : "Unknown",
              server,
              status: isStreamingLink ? "Stream" : "Download",
              speed: getSpeedForServer(server),
            })
          }
        })

        if (episodeLinks.length > 0) {
          episodes.push({
            number: episodeNumber,
            title: `Episode ${episodeNumber}`,
            description: `Episode ${episodeNumber} of the series with exciting plot developments and character growth.`,
            duration: "45 min",
            downloadLinks: episodeLinks,
          })
        }
      }
    }
  })

  // Sort episodes by number and remove duplicates
  const uniqueEpisodes = episodes.reduce((acc, episode) => {
    const existing = acc.find((ep) => ep.number === episode.number)
    if (existing) {
      // Merge download links and remove duplicates
      const existingUrls = new Set(existing.downloadLinks.map((link) => link.url))
      const newLinks = episode.downloadLinks.filter((link) => !existingUrls.has(link.url))
      existing.downloadLinks.push(...newLinks)
    } else {
      acc.push(episode)
    }
    return acc
  }, [] as Episode[])

  uniqueEpisodes.sort((a, b) => a.number - b.number)
  return uniqueEpisodes
}

// NEW: Function to extract episodes from "Single Episode Links" section
function extractSingleEpisodeLinks($: cheerio.CheerioAPI): Episode[] {
  const episodes: Episode[] = []

  console.log("=== Starting Single Episode Links extraction ===")

  // Look for "Single Episode Links" section header
  $("h2, h3").each((_, element) => {
    const $header = $(element)
    const headerText = $header.text().trim()

    // Check if this is the "Single Episode Links" header
    if (headerText.toLowerCase().includes("single episode") || 
        headerText.toLowerCase().includes("episode links") ||
        headerText.toLowerCase().includes("episode wise")) {
      console.log("Found Single Episode Links section:", headerText)
      
      // Process the content after this header
      let $next = $header.next()
      let iterationCount = 0
      
      while ($next.length && iterationCount < 20) {
        const nextText = $next.text()
        
        // Stop if we hit another major section header
        if ($next.is("h2") && !nextText.toLowerCase().includes("episode")) {
          break
        }

        // Process h4 elements directly (the format shows h4 tags)
        if ($next.is("h4")) {
          const $episodeEl = $next
          const episodeText = $episodeEl.text().trim()
          
          console.log("Processing h4 element:", episodeText)
          
          // Match E01, E02, E03 format - more precise pattern
          const episodeMatch = episodeText.match(/E(\d+)\s*(?:–|—|-|:)/i)
          if (episodeMatch) {
            const episodeNumber = parseInt(episodeMatch[1])
            console.log(`Found episode ${episodeNumber} in text: "${episodeText}"`)
            
            if (episodeNumber > 0) {
              const episodeLinks: DownloadLink[] = []
              
              // Extract all links for this specific episode
              $episodeEl.find("a[href]").each((linkIndex, linkElement) => {
                const $link = $(linkElement)
                let url = $link.attr("href")
                const linkText = $link.text().trim()
                
                console.log(`  Link ${linkIndex + 1} for E${episodeNumber.toString().padStart(2, '0')}: "${linkText}" -> ${url}`)
                
                if (url && !url.includes("#") && linkText && isValidDownloadUrl(url)) {
                  const server = extractServerFromUrl(url)
                  
                  // Determine if it's a streaming or download link based on text
                  const isStreamingLink = linkText.toLowerCase().includes("watch") ||
                                        linkText.toLowerCase().includes("stream") ||
                                        linkText.toLowerCase().includes("online") ||
                                        server === "HDStream4u"
                  
                  // Transform URLs to internal routes based on server type
                  if (url.includes("hubdrive.wales/file/")) {
                    const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                    if (fileIdMatch) {
                      url = `/download/${fileIdMatch[1]}`
                    }
                  }
                  
                  // Determine quality from context
                  let quality = "Unknown"
                  const fullPageText = $.text().toLowerCase()
                  if (fullPageText.includes("1080p")) quality = "1080p"
                  else if (fullPageText.includes("720p")) quality = "720p"
                  else if (fullPageText.includes("4k")) quality = "4K"
                  else if (fullPageText.includes("480p")) quality = "480p"
                  
                  const linkTitle = isStreamingLink 
                    ? `Episode ${episodeNumber} - ${linkText}` 
                    : `Episode ${episodeNumber} - ${linkText}`
                  
                  episodeLinks.push({
                    title: linkTitle,
                    url,
                    quality,
                    size: quality !== "Unknown" ? getSizeForQuality(quality) : "Unknown",
                    server,
                    status: isStreamingLink ? "Stream" : "Download",
                    speed: getSpeedForServer(server),
                  })
                  
                  console.log(`    Added link: ${linkTitle} -> ${server} (${url})`)
                }
              })
              
              // Only add episode if it has links and doesn't already exist
              if (episodeLinks.length > 0) {
                const existingEpisode = episodes.find(ep => ep.number === episodeNumber)
                if (existingEpisode) {
                  // Merge links if episode already exists
                  console.log(`Merging ${episodeLinks.length} links into existing episode ${episodeNumber}`)
                  existingEpisode.downloadLinks.push(...episodeLinks)
                } else {
                  console.log(`Creating new episode ${episodeNumber} with ${episodeLinks.length} links`)
                  episodes.push({
                    number: episodeNumber,
                    title: `Episode ${episodeNumber}`,
                    description: `Episode ${episodeNumber} of the series`,
                    duration: "45 min",
                    downloadLinks: episodeLinks,
                  })
                }
              } else {
                console.log(`No valid links found for episode ${episodeNumber}`)
              }
            }
          } else {
            console.log("No episode pattern match found in:", episodeText.substring(0, 50))
          }
        }
        
        $next = $next.next()
        iterationCount++
      }
      
      return false // Break the each loop since we found the section
    }
  })

  // Fallback: Also check for direct h4 elements containing episode patterns (in case they're not nested properly)
  if (episodes.length === 0) {
    console.log("No episodes found in nested structure, trying direct h4 scan...")
    
    $("h4").each((_, element) => {
      const $h4 = $(element)
      const h4Text = $h4.text().trim()
      
      // Look for E01 – Drive | Instant | Watch pattern
      const episodeMatch = h4Text.match(/E(\d+)\s*(?:–|—|-|:)/i)
      if (episodeMatch) {
        const episodeNumber = parseInt(episodeMatch[1])
        console.log(`Direct h4 scan - Found episode ${episodeNumber}: "${h4Text}"`)
        
        if (episodeNumber > 0) {
          const episodeLinks: DownloadLink[] = []
          
          // Extract all links from this h4 element
          $h4.find("a[href]").each((linkIndex, linkElement) => {
            const $link = $(linkElement)
            let url = $link.attr("href")
            const linkText = $link.text().trim()
            
            console.log(`  Direct h4 - Link ${linkIndex + 1} for E${episodeNumber.toString().padStart(2, '0')}: "${linkText}" -> ${url}`)
            
            if (url && !url.includes("#") && linkText && isValidDownloadUrl(url)) {
              const server = extractServerFromUrl(url)
              
              const isStreamingLink = linkText.toLowerCase().includes("watch") ||
                                    linkText.toLowerCase().includes("stream") ||
                                    linkText.toLowerCase().includes("online") ||
                                    server === "HDStream4u"
              
              // Transform URLs
              if (url.includes("hubdrive.wales/file/")) {
                const fileIdMatch = url.match(/\/file\/([^/?]+)/)
                if (fileIdMatch) {
                  url = `/download/${fileIdMatch[1]}`
                }
              }
              
              let quality = "Unknown"
              const fullPageText = $.text().toLowerCase()
              if (fullPageText.includes("1080p")) quality = "1080p"
              else if (fullPageText.includes("720p")) quality = "720p"
              else if (fullPageText.includes("4k")) quality = "4K"
              else if (fullPageText.includes("480p")) quality = "480p"
              
              const linkTitle = `Episode ${episodeNumber} - ${linkText}`
              
              episodeLinks.push({
                title: linkTitle,
                url,
                quality,
                size: quality !== "Unknown" ? getSizeForQuality(quality) : "Unknown",
                server,
                status: isStreamingLink ? "Stream" : "Download",
                speed: getSpeedForServer(server),
              })
              
              console.log(`    Direct h4 - Added link: ${linkTitle} -> ${server} (${url})`)
            }
          })
          
          if (episodeLinks.length > 0) {
            const existingEpisode = episodes.find(ep => ep.number === episodeNumber)
            if (existingEpisode) {
              console.log(`Direct h4 - Merging ${episodeLinks.length} links into existing episode ${episodeNumber}`)
              existingEpisode.downloadLinks.push(...episodeLinks)
            } else {
              console.log(`Direct h4 - Creating new episode ${episodeNumber} with ${episodeLinks.length} links`)
              episodes.push({
                number: episodeNumber,
                title: `Episode ${episodeNumber}`,
                description: `Episode ${episodeNumber} of the series`,
                duration: "45 min",
                downloadLinks: episodeLinks,
              })
            }
          }
        }
      }
    })
  }

  // Sort episodes by number
  episodes.sort((a, b) => a.number - b.number)
  
  console.log(`=== Final extracted ${episodes.length} episodes from Single Episode Links ===`)
  episodes.forEach(ep => {
    console.log(`Episode ${ep.number}: ${ep.downloadLinks.length} links`)
    ep.downloadLinks.forEach((link, index) => {
      console.log(`  Link ${index + 1}: ${link.title} -> ${link.server} (${link.url})`)
    })
  })
  
  return episodes
}

// Also enhance the extractServerFromUrl function to better detect streaming servers
function extractServerFromUrl(url: string): string {
  // Check for HubDrive links first and rename them to NetVlyx Server
  if (url.includes("hubdrive.wales/file/") || (url.includes("hubdrive") && url.includes("/file/"))) {
    return "NetVlyx Server"
  }
  // Check for HubCDN links and rename them to VlyJes Server
  if (url.includes("hubcdn.fans/file/")) {
    return "VlyJes Server"
  }
  // Check for TechyBoy4u and TaazaBull24 links and rename them to Vlyx Server
  if (url.includes("techyboy4u.com/?id=") || url.includes("taazabull24.com/?id=")) {
    return "Vlyx Server"
  }
  // Check for streaming servers
  if (url.includes("hubstream.art") || url.includes("hubstream")) return "HDStream4u"
  if (url.includes("hdstream4u.com")) return "HDStream4u"
  if (url.includes("drive.google")) return "Google Drive"
  if (url.includes("mediafire")) return "MediaFire"
  if (url.includes("mega.nz")) return "MEGA"
  if (url.includes("dropbox")) return "Dropbox"
  if (url.includes("hubcdn")) return "HubCDN"
  if (url.includes("techyboy4u")) return "TechyBoy4u"
  return "Direct Link"
}

// Enhance the isValidDownloadUrl function to include more streaming domains
function isValidDownloadUrl(url: string): boolean {
  // Check if URL is not empty, not a placeholder, and contains valid download domains
  if (!url || url === "#" || url === "" || url.includes("javascript:")) {
    return false
  }

  // List of valid download/streaming domains
  const validDomains = [
    "techyboy4u.com",
    "taazabull24.com",
    "hubdrive",
    "hubcdn",
    "hdstream4u.com",
    "hubstream.art", // Add hubstream.art for streaming
    "hubstream", // Add hubstream for streaming
    "drive.google",
    "mediafire",
    "mega.nz",
    "dropbox",
    "gdtot",
    "gofile",
    "1fichier",
    "uptobox",
    "rapidgator",
    "nitroflare",
    "turbobit",
    "uploaded.net",
    "zippyshare",
    "sendspace",
    "4shared",
  ]

  // Check if URL contains any valid domain
  return validDomains.some((domain) => url.toLowerCase().includes(domain))
}

function extractCast($: cheerio.CheerioAPI): CastMember[] {
  const cast: CastMember[] = []

  // Look for cast information
  $(".cast-member, .actor, [class*='cast']").each((_, element) => {
    const $member = $(element)
    const name = $member.find(".name, .actor-name").text().trim() || $member.text().trim()
    const role = $member.find(".role, .character").text().trim()
    const photo = $member.find("img").attr("src")

    if (name) {
      cast.push({
        name,
        role: role || "Actor",
        photo,
      })
    }
  })

  return cast
}

function extractQualities($: cheerio.CheerioAPI, downloadLinks: DownloadLink[]): Quality[] {
  const qualitySet = new Set<string>()

  // ONLY extract from real download links - no fake qualities
  downloadLinks.forEach((link) => {
    if (link.url && !link.url.includes("#")) {
      qualitySet.add(link.quality)
    }
  })

  // Only return qualities if we have real download links
  return Array.from(qualitySet).map((quality) => ({
    name: quality,
    size: getSizeForQuality(quality),
  }))
}

function extractMetadata($: cheerio.CheerioAPI, keywords: string[]): string | undefined {
  const text = $.text().toLowerCase()

  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[:\\s]+([^\\n,]+)`, "i")
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return undefined
}

function extractViews($: cheerio.CheerioAPI): string {
  return "1.2M" // Mock data
}

function extractDownloads($: cheerio.CheerioAPI): string {
  return "850K" // Mock data
}

function extractReleaseDate($: cheerio.CheerioAPI): string | undefined {
  return "2024-01-15" // Mock data
}

function calculateTotalRuntime(episodes: Episode[], defaultDuration?: string): string | undefined {
  if (episodes.length === 0) {
    return defaultDuration
  }

  const totalMinutes = episodes.reduce((total, episode) => {
    const duration = episode.duration || "45 min"
    const minutes = Number.parseInt(duration.match(/\d+/)?.[0] || "45")
    return total + minutes
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${minutes}m (${episodes.length} episodes)`
}

function getSizeForQuality(quality: string): string {
  // Return "Unknown" instead of fixed sizes to avoid displaying incorrect file sizes
  // The actual size should be extracted from the HTML content
  return "Unknown"
}

function extractQualityFromText(text: string): string {
   // Enhanced quality extraction with more specific patterns
   const qualityPatterns = [
     // HQ quality format: "HQ 1080p"
     /HQ\s+(\d+p)/i,
     
     // Direct quality matches
     /\b(4K|2160p|1080p|720p|480p|360p)\b/i,
     
     // Quality with lightning emoji
     /(\d+p)⚡/i,
     
     // Quality followed by "Links"
     /(\d+p)\s*Links?/i,
     
     // Quality with codec
     /(\d+p)\s*(HEVC|x264|WEB-DL)/i
   ]

   for (const pattern of qualityPatterns) {
     const qualityMatch = text.match(pattern)
     if (qualityMatch) {
       const quality = qualityMatch[1] || qualityMatch[0]
       return quality === "2160p" ? "4K" : quality
     }
   }

   // Look for other quality indicators
   if (text.toLowerCase().includes("uhd") || text.toLowerCase().includes("ultra")) return "4K"
   if (text.toLowerCase().includes("full hd") || text.toLowerCase().includes("fullhd")) return "1080p"
   if (text.toLowerCase().includes("hd") && !text.toLowerCase().includes("720p") && !text.toLowerCase().includes("480p")) return "720p"

   return "Unknown"
}

function extractSizeFromText(text: string): string {
  // Enhanced size extraction patterns
  const sizePatterns = [
    // Size in brackets (normal case): [350MB], [1.3GB]
    /\[([^\]]*(?:\d+(?:\.\d+)?)\s*(?:GB|MB|KB)[^\]]*)\]/i,
    
    // Size with lightning emoji: ⚡[640MB]
    /⚡\[([^\]]*(?:\d+(?:\.\d+)?)\s*(?:GB|MB|KB)[^\]]*)\]/i,
    
    // Malformed size (missing opening bracket): 2.1GB]
    /(\d+(?:\.\d+)?)\s*(GB|MB|KB)\]/i,
    
    // Size in parentheses: (350MB)
    /\(([^)]*(?:\d+(?:\.\d+)?)\s*(?:GB|MB|KB)[^)]*)\)/i,
    
    // Size anywhere in text: 1.3 GB, 850 MB
    /\b(\d+(?:\.\d+)?)\s*(GB|MB|KB)\b/i
  ]

  for (const pattern of sizePatterns) {
    const sizeMatch = text.match(pattern)
    if (sizeMatch) {
      // Extract the actual size value from the matched group
      if (pattern === sizePatterns[2]) { // Malformed case
        return `${sizeMatch[1]}${sizeMatch[2]}`
      } else if (pattern === sizePatterns[4]) { // Size anywhere case
        return `${sizeMatch[1]}${sizeMatch[2]}`
      } else {
        // For bracketed cases, extract size from the content
        const content = sizeMatch[1]
        const innerSizeMatch = content.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i)
        if (innerSizeMatch) {
          return `${innerSizeMatch[1]}${innerSizeMatch[2]}`
        }
      }
    }
  }

  return "Unknown"
}

function getSpeedForServer(server: string): string {
  switch (server) {
    case "NetVlyx Server":
    case "VlyJes Server":
    case "Vlyx Server":
    case "Google Drive":
      return "Fast"
    case "MediaFire":
    case "MEGA":
      return "Medium"
    default:
      return "Medium"
  }
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params

  try {
    // Reconstruct the full URL from the slug
    const movieURL = `${TARGET_URL}${slug}/`

    console.log("Fetching movie details...")

    const html = await fetchWithProxy(movieURL)
    console.log("Successfully fetched movie details")

    const movieDetail = parseMovieDetail(html, movieURL)
    console.log("Parsed movie detail:", {
      title: movieDetail.title,
      downloadLinksCount: movieDetail.downloadLinks.length,
      episodesCount: movieDetail.episodeList?.length || 0,
      qualitiesCount: movieDetail.qualities?.length || 0,
    })

    const response: ParsedMovieDetail = {
      movie: movieDetail,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in movie detail API:", error)

    const response: ParsedMovieDetail = {
      movie: {
        title: "Movie Not Found",
        description: "Unable to fetch movie details",
        image: "",
        category: "Unknown",
        downloadLinks: [],
      },
      error: error instanceof Error ? error.message : "Failed to fetch movie details",
    }

    return NextResponse.json(response, { status: 500 })
  }
}
