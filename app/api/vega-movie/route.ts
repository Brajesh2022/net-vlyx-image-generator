import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

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
  downloadSections: {
    title: string
    downloads: {
      quality: string
      size: string
      links: {
        label: string
        url: string
        style: string
        season: string | null
      }[]
    }[]
    season: string | null
  }[]
  hasBloggerImages: boolean
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

  // Unified content scope for parsing across Vega templates
  const CONTENT_SCOPE = ".single-service-content, .entry-inner, .entry-content"

  // Extract title
  // Support multiple title selectors for different website designs:
  // - h1.page-title: vegamovies-nl new design (2025)
  // - h1.entry-title: vegamovies old design and other vega sites
  // - .entry-title: fallback for various templates
  const title = $("h1.page-title, h1.entry-title, .entry-title").first().text().trim() || "Unknown Title"

  // Extract poster - try multiple selectors for VegaMovies
  let poster = ""
  const posterSelectors = [
    ".entry-inner img",
    ".single-feature-image img",
    ".post-thumbnail img",
    ".featured-image img",
    "article img[src*='.jpg'], article img[src*='.png'], article img[src*='.webp']",
  ]

  for (const selector of posterSelectors) {
    const posterEl = $(selector).first()
    if (posterEl.length && posterEl.attr("src")) {
      poster = posterEl.attr("src") || ""
      // Skip if it's a screenshot (usually contains imgbb.top)
      if (poster && !poster.includes("imgbb.top")) {
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
  const movieInfo: any = {
    language: "",
    releasedYear: "",
    quality: "",
    size: "",
    format: "",
  }

  // Use unified scope text instead of only .entry-inner
  const infoText = $(CONTENT_SCOPE).text()

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

  // Extract plot
  const plotMatch = infoText.match(/(?:Movie-SYNOPSIS\/PLOT:|Series-SYNOPSIS\/PLOT:)\s*([^]+?)(?=Screenshots:|$)/)
  const plot = plotMatch ? plotMatch[1].replace(/\s+/g, " ").trim() : ""

  // Extract screenshots - prioritize blogger.googleusercontent.com images
  const screenshots: string[] = []
  const bloggerImages: string[] = []
  const otherImages: string[] = []

  // First, collect all images and categorize them
  const allImageSelectors = [
    ".entry-inner img",
    ".entry-content img", 
    ".single-service-content img",
    "img[src*='imgbb.top']",
    "img[src*='imageban.ru']",
    "img[src*='imgbox.com']",
    "img[src*='fastpic.ru']",
    "img[src*='postimg.cc']",
  ]

  allImageSelectors.forEach((selector) => {
    $(selector).each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src")
      if (src && src !== poster) {
        // Clean up screenshot URLs
        let cleanSrc = src
        if (cleanSrc.startsWith("//")) {
          cleanSrc = "https:" + cleanSrc
        }
        
        // Categorize images based on source
        if (cleanSrc.includes("blogger.googleusercontent.com")) {
          if (!bloggerImages.includes(cleanSrc)) {
            bloggerImages.push(cleanSrc)
          }
        } else if (
          cleanSrc.includes("imgbb.top") || 
          cleanSrc.includes("screenshot") || 
          cleanSrc.includes("image") ||
          cleanSrc.includes("imageban.ru") ||
          cleanSrc.includes("imgbox.com") ||
          cleanSrc.includes("fastpic.ru") ||
          cleanSrc.includes("postimg.cc")
        ) {
          if (!otherImages.includes(cleanSrc)) {
            otherImages.push(cleanSrc)
          }
        }
      }
    })
  })

  // Also check synopsis content for images
  const content = $(CONTENT_SCOPE).html() || ""
  const synopsisMatch = content.match(/<h3[^>]*>.*?SYNOPSIS.*?<\/h3>(.*?)(?=<h[345]|<hr|$)/gi)
  if (synopsisMatch) {
    synopsisMatch.forEach((section: string) => {
      const imgMatches = section.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)
      if (imgMatches) {
        imgMatches.forEach((imgTag: string) => {
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
          if (srcMatch && srcMatch[1]) {
            let cleanSrc = srcMatch[1]
            if (cleanSrc.startsWith("//")) {
              cleanSrc = "https:" + cleanSrc
            }
            
            if (cleanSrc.includes("blogger.googleusercontent.com")) {
              if (!bloggerImages.includes(cleanSrc)) {
                bloggerImages.push(cleanSrc)
              }
            } else if (!otherImages.includes(cleanSrc)) {
              otherImages.push(cleanSrc)
            }
          }
        })
      }
    })
  }

  // Prioritize blogger.googleusercontent.com images
  if (bloggerImages.length > 0) {
    screenshots.push(...bloggerImages)
  } else {
    // Fallback to other images if no blogger images found
    screenshots.push(...otherImages)
  }

  // Enhanced function to extract season from text
  const extractSeasonFromText = (text: string): string | null => {
    const cleanText = text.toLowerCase()

    // Pattern 1: "Season 4", "Season-4", "Season_4"
    const seasonMatch1 = cleanText.match(/season[\s\-_]*(\d+)/i)
    if (seasonMatch1) {
      return seasonMatch1[1]
    }

    // Pattern 2: "S4", "S04", "S-4"
    const seasonMatch2 = cleanText.match(/\bs[-_]*(\d+)/i)
    if (seasonMatch2) {
      return seasonMatch2[1]
    }

    // Pattern 3: "(Season 4)", "(S4)"
    const seasonMatch3 = cleanText.match(/$$(?:season[\s\-_]*)?(\d+)$$/i)
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

  $(`${CONTENT_SCOPE} h3, ${CONTENT_SCOPE} h5`).each((i: number, el: any) => {
    const headerText = $(el).text().trim()
    const headerHtml = $(el).html() || ""

    const isSeasonSection =
      headerText.toLowerCase().includes("download") &&
      (headerText.toLowerCase().includes("season") || headerText.match(/season\s*\d+/i))

    const isQualitySection =
      /(480p|720p|1080p|2160p|4K)/i.test(headerText) || /(480p|720p|1080p|2160p|4K)/i.test(headerHtml)

    if (isSeasonSection || isQualitySection) {
      let seasonNumber = extractSeasonFromText(headerText)

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
      if (!seasonNumber) {
        const surroundingText = $(el).parent().text()
        seasonNumber = extractSeasonFromText(surroundingText)
      }

      const qualityMatch =
        headerText.match(/(480p|720p|1080p|2160p|4K)/i) || headerHtml.match(/(480p|720p|1080p|2160p|4K)/i)
      const sizeMatch = headerText.match(/\[([^\]]+)\]/) || headerHtml.match(/\[([^\]]+)\]/)
      const quality = qualityMatch ? qualityMatch[1] : ""
      const size = sizeMatch ? sizeMatch[1] : ""

      const links: any[] = []
      $(el)
        .nextUntil("h3, h5, hr")
        .each((_, block) => {
          $(block)
            .find("a[href]")
            .each((j: number, linkEl: any) => {
              const linkUrl = $(linkEl).attr("href")
              const textFromAnchor = ($(linkEl).text() || "").trim()
              const textFromButton = ($(linkEl).find("button").text() || "").trim()
              const linkText = textFromAnchor || textFromButton
              const buttonStyle = $(linkEl).find("button").attr("style") || $(linkEl).attr("style") || ""
              if (linkUrl) {
                links.push({
                  label: linkText || "Download",
                  url: linkUrl,
                  style: buttonStyle,
                  season: seasonNumber,
                })
              }
            })
        })

      const $next = $(el).next()
      if ($next.is("a[href]")) {
        const linkUrl = $next.attr("href")
        const textFromAnchor = ($next.text() || "").trim()
        const textFromButton = ($next.find("button").text() || "").trim()
        const linkText = textFromAnchor || textFromButton
        const buttonStyle = $next.find("button").attr("style") || $next.attr("style") || ""
        if (linkUrl) {
          links.push({
            label: linkText || "Download",
            url: linkUrl,
            style: buttonStyle,
            season: seasonNumber,
          })
        }
      }

      if (links.length > 0) {
        downloadSections.push({
          title:
            seasonNumber && !headerText.toLowerCase().includes("season")
              ? `Season ${seasonNumber} - ${headerText}`
              : headerText,
          downloads: [{ quality, size, links }],
          season: seasonNumber,
        })
      }
    }
  })

  $(`${CONTENT_SCOPE} h3[style*='text-align: center'], ${CONTENT_SCOPE} h5[style*='text-align: center']`).each(
    (i: number, el: any) => {
      const headerText = $(el).text().trim()
      const headerHtml = $(el).html() || ""
      const qualityPatterns = /(480p|720p|1080p|2160p|4K)/i
      const sizePatterns = /\[([^\]]+)\]/

      if (qualityPatterns.test(headerText) || qualityPatterns.test(headerHtml)) {
        let seasonNumber: string | null = null
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
        if (!seasonNumber) {
          const parentText = $(el).parent().text()
          seasonNumber = extractSeasonFromText(parentText)
        }

        const qualityMatch = headerText.match(qualityPatterns) || headerHtml.match(qualityPatterns)
        const sizeMatch = headerText.match(sizePatterns) || headerHtml.match(sizePatterns)
        const quality = qualityMatch ? qualityMatch[1] : ""
        const size = sizeMatch ? sizeMatch[1] : ""

        const links: any[] = []
        let nextEl = $(el).next()
        while (nextEl.length && !nextEl.is("h3, h5, hr")) {
          if (nextEl.is("p, div, center")) {
            nextEl.find("a[href]").each((j, linkEl) => {
              const linkUrl = $(linkEl).attr("href")
              const textFromAnchor = ($(linkEl).text() || "").trim()
              const textFromButton = ($(linkEl).find("button").text() || "").trim()
              const linkText = textFromAnchor || textFromButton
              const buttonStyle = $(linkEl).find("button").attr("style") || $(linkEl).attr("style") || ""
              const serviceName = textFromAnchor || textFromButton || "Download"
              if (linkUrl) {
                links.push({
                  label: serviceName,
                  url: linkUrl,
                  style: buttonStyle || "vegamovies-button-new",
                  season: seasonNumber,
                })
              }
            })
          }
          nextEl = nextEl.next()
        }

        if (links.length > 0) {
          const sectionTitle =
            seasonNumber && !headerText.toLowerCase().includes("season")
              ? `Season ${seasonNumber} - ${headerText}`
              : headerText || "Downloads"

          const existingSection = downloadSections.find(
            (section) => section.title === sectionTitle && section.season === seasonNumber,
          )
          if (!existingSection) {
            downloadSections.push({
              title: sectionTitle,
              downloads: [{ quality, size, links }],
              season: seasonNumber,
            })
          }
        }
      }
    },
  )

  // Robustly capture all button-based NextDrive links and merge with any sections found above
  const buttonItems: Array<{
    sectionTitle: string
    quality: string
    size: string
    link: { label: string; url: string; style: string; season: string | null }
    season: string | null
  }> = []

  $(`${CONTENT_SCOPE} button.dwd-button`).each((_, btn) => {
    const $btn = $(btn)
    const $a = $btn.closest("a[href]")
    const url = $a.attr("href")
    if (!url) return

    let header = $btn.closest("p, div, center").prevAll("h5, h3").first()
    if (!header.length) header = $btn.closest(CONTENT_SCOPE).find("h5, h3").last()

    const headerText = (header.text() || "").trim()
    const qualityMatch = headerText.match(/(480p|720p|1080p|2160p|4K)/i)
    const sizeMatch = headerText.match(/\[([^\]]+)\]/)
    const quality = qualityMatch ? qualityMatch[1] : ""
    const size = sizeMatch ? sizeMatch[1] : ""
    const seasonInHeader = extractSeasonFromText(headerText)

    const linkObj = {
      label: ($btn.text() || "Download").trim(),
      url,
      style: $btn.attr("style") || $a.attr("style") || "",
      season: seasonInHeader,
    }

    const sectionTitle =
      seasonInHeader && !headerText.toLowerCase().includes("season")
        ? `Season ${seasonInHeader} - ${headerText}`
        : headerText || "Downloads"

    buttonItems.push({
      sectionTitle,
      quality,
      size,
      link: linkObj,
      season: seasonInHeader,
    })
  })

  // Merge buttonItems into downloadSections (avoid duplicates by URL)
  for (const item of buttonItems) {
    let section = downloadSections.find((s) => s.title === item.sectionTitle && s.season === item.season)
    if (!section) {
      section = {
        title: item.sectionTitle,
        downloads: [],
        season: item.season,
      }
      downloadSections.push(section)
    }
    let downloadEntry = section.downloads.find((d: any) => d.quality === item.quality && d.size === item.size)
    if (!downloadEntry) {
      downloadEntry = { quality: item.quality, size: item.size, links: [] }
      section.downloads.push(downloadEntry)
    }
    const hasUrl = downloadEntry.links.some((l: any) => l.url === item.link.url)
    if (!hasUrl) {
      downloadEntry.links.push(item.link)
    }
  }

  // associate each with nearest preceding h5/h3, and merge into downloadSections.
  const globalNexLinks: Array<{
    sectionTitle: string
    quality: string
    size: string
    link: { label: string; url: string; style: string; season: string | null }
    season: string | null
  }> = []

  $("a[href*='nexdrive.'], a[href*='nexdrive/']").each((_, aEl) => {
    const $a = $(aEl)
    const url = $a.attr("href") || ""
    if (!url) return

    const textFromAnchor = ($a.text() || "").trim()
    const textFromButton = ($a.find("button").text() || "").trim()
    const label = textFromAnchor || textFromButton || "Download"
    const style = $a.find("button").attr("style") || $a.attr("style") || ""

    // Find the nearest preceding header for quality/size/season
    let header = $a.closest("p, div, center").prevAll("h5, h3").first()
    if (!header.length) {
      // climb up DOM and try previous headers
      header = $a.parents().prevAll("h5, h3").first()
    }
    if (!header.length) {
      // fallback to last header inside our broader content scope
      header = $(CONTENT_SCOPE).find("h5, h3").last()
    }

    const headerText = (header.text() || "").trim()
    const qualityMatch = headerText.match(/(480p|720p|1080p|2160p|4K)/i)
    const sizeMatch = headerText.match(/\[([^\]]+)\]/)
    const quality = qualityMatch ? qualityMatch[1] : ""
    const size = sizeMatch ? sizeMatch[1] : ""
    const seasonInHeader = extractSeasonFromText(headerText)

    const sectionTitle =
      seasonInHeader && !headerText.toLowerCase().includes("season")
        ? `Season ${seasonInHeader} - ${headerText}`
        : headerText || "Downloads"

    globalNexLinks.push({
      sectionTitle,
      quality,
      size,
      link: { label, url, style, season: seasonInHeader },
      season: seasonInHeader,
    })
  })

  // Merge globalNexLinks into downloadSections (avoid duplicates by URL)
  for (const item of globalNexLinks) {
    let section = downloadSections.find((s) => s.title === item.sectionTitle && s.season === item.season)
    if (!section) {
      section = { title: item.sectionTitle, downloads: [], season: item.season }
      downloadSections.push(section)
    }
    let downloadEntry = section.downloads.find((d: any) => d.quality === item.quality && d.size === item.size)
    if (!downloadEntry) {
      downloadEntry = { quality: item.quality, size: item.size, links: [] }
      section.downloads.push(downloadEntry)
    }
    const hasUrl = downloadEntry.links.some((l: any) => l.url === item.link.url)
    if (!hasUrl) {
      downloadEntry.links.push(item.link)
    }
  }

  // Fallback: if still no sections, build a single grouping from buttons
  if (downloadSections.length === 0) {
    const fallbackDownloads: any[] = []
    $(`${CONTENT_SCOPE} button.dwd-button`).each((_, btn) => {
      const $btn = $(btn)
      const $a = $btn.closest("a[href]")
      const url = $a.attr("href")
      if (!url) return

      let header = $btn.closest("p, div, center").prevAll("h5, h3").first()
      if (!header.length) header = $btn.closest(CONTENT_SCOPE).find("h5, h3").last()
      const headerText = (header.text() || "").trim()

      const qualityMatch = headerText.match(/(480p|720p|1080p|2160p|4K)/i)
      const sizeMatch = headerText.match(/\[([^\]]+)\]/)
      const quality = qualityMatch ? qualityMatch[1] : ""
      const size = sizeMatch ? sizeMatch[1] : ""

      const link = {
        label: ($btn.text() || "Download").trim(),
        url,
        style: $btn.attr("style") || $a.attr("style") || "",
        season: extractSeasonFromText(headerText),
      }

      // Merge into fallbackDownloads by quality/size
      let entry = fallbackDownloads.find((d) => d.quality === quality && d.size === size)
      if (!entry) {
        entry = { quality, size, links: [] }
        fallbackDownloads.push(entry)
      }
      if (!entry.links.some((l: any) => l.url === link.url)) {
        entry.links.push(link)
      }
    })

    if (fallbackDownloads.length) {
      downloadSections.push({
        title: "Downloads",
        downloads: fallbackDownloads,
        season: null,
      })
    }
  }

  return {
    title,
    poster,
    imdbRating,
    imdbLink,
    movieInfo,
    plot,
    screenshots,
    downloadSections,
    hasBloggerImages: bloggerImages.length > 0,
  }
}

export async function GET(request: NextRequest) {
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const movieUrl = searchParams.get("url")
  const debug = searchParams.get("debug") === "1"

  if (!movieUrl) {
    return NextResponse.json({ error: "Movie URL is required" }, { status: 400 })
  }

  try {
    console.log("Fetching content...")
    const html = await fetchWithProxy(movieUrl)
    console.log("Successfully fetched content")

    const movieDetails = parseMovieDetails(html)

    if (!debug) {
      return NextResponse.json(movieDetails)
    }

    const $ = cheerio.load(html)
    // Debug selector counts use unified scope
    const CONTENT_SCOPE = ".single-service-content, .entry-inner, .entry-content"

    const selectorCounts = {
      h3h5Total: $(`${CONTENT_SCOPE} h3, ${CONTENT_SCOPE} h5`).length,
      centeredHeaders: $(
        `${CONTENT_SCOPE} h3[style*='text-align: center'], ${CONTENT_SCOPE} h5[style*='text-align: center']`,
      ).length,
      dwdButtons: $(`${CONTENT_SCOPE} button.dwd-button`).length,
      anchors: $("a[href]").length,
      anchorsInScope: $(`${CONTENT_SCOPE} a[href]`).length,
      nexdriveAnchors: $(`a[href*='nexdrive.'], a[href*='nexdrive/']`).length,
      nexdriveAnchorsInScope: $(`${CONTENT_SCOPE} a[href*='nexdrive.'], ${CONTENT_SCOPE} a[href*='nexdrive/']`).length,
      // Global-only counts for clarity
      globalH3H5Total: $("h3, h5").length,
      globalDwdButtons: $("button.dwd-button").length,
    }

    const sampleHeaders: string[] = []
    $(`${CONTENT_SCOPE} h5, ${CONTENT_SCOPE} h3`)
      .slice(0, 5)
      .each((_, el) => sampleHeaders.push($(el).text().trim()))

    const sampleLinks: { text: string; href: string }[] = []
    $(`${CONTENT_SCOPE} a[href]`)
      .filter((_, el) => {
        const href = ($(el).attr("href") || "").toLowerCase()
        return href.includes("nexdrive.") || href.includes("nexdrive/")
      })
      .slice(0, 5)
      .each((_, el) => {
        const textFromAnchor = ($(el).text() || "").trim()
        const textFromButton = ($(el).find("button").text() || "").trim()
        sampleLinks.push({
          text: textFromAnchor || textFromButton || "(no text)",
          href: $(el).attr("href") || "",
        })
      })

    const sampleGlobalLinks: { text: string; href: string }[] = []
    $(`a[href*='nexdrive.'], a[href*='nexdrive/']`)
      .slice(0, 5)
      .each((_, el) => {
        const textFromAnchor = ($(el).text() || "").trim()
        const textFromButton = ($(el).find("button").text() || "").trim()
        sampleGlobalLinks.push({
          text: textFromAnchor || textFromButton || "(no text)",
          href: $(el).attr("href") || "",
        })
      })

    const parsedSectionsCount = movieDetails?.downloadSections?.length || 0
    const totalParsedLinks =
      movieDetails?.downloadSections?.reduce(
        (sum: number, s: any) => sum + s.downloads.reduce((s2: number, d: any) => s2 + (d.links?.length || 0), 0),
        0,
      ) || 0

    const htmlPreview = html.slice(0, 1200)
    const note =
      parsedSectionsCount === 0
        ? "No sections parsed. Global nexdrive parsing enabled; verify global vs in-scope counts."
        : "Sections parsed; verify links lead to NextDrive."

    console.log(
      "[v0] Vega counts:",
      selectorCounts,
      "parsedSections:",
      parsedSectionsCount,
      "totalLinks:",
      totalParsedLinks,
    )

    return NextResponse.json({
      ...movieDetails,
      debug: {
        requestedUrl: movieUrl,
        finalUrl: movieUrl,
        htmlLength: html?.length ?? 0,
        selectorCounts,
        parsedSectionsCount,
        totalParsedLinks,
        sampleHeaders,
        sampleLinks,
        sampleGlobalLinks,
        htmlPreview,
        note,
      },
    })
  } catch (error: any) {
    console.error("[v0] Vega GET error:", error?.message || String(error))
    const errJson = { error: "Failed to fetch movie details" }
    if (debug) {
      return NextResponse.json(
        {
          ...errJson,
          debug: {
            requestedUrl: movieUrl,
            finalUrl: null,
            htmlLength: 0,
            selectorCounts: null,
            parsedSectionsCount: 0,
            totalParsedLinks: 0,
            sampleHeaders: [],
            sampleLinks: [],
            sampleGlobalLinks: [],
            htmlPreview: "",
            note: error?.message || "Unknown error",
          },
        },
        { status: 500 },
      )
    }
    return NextResponse.json(errJson, { status: 500 })
  }
}
