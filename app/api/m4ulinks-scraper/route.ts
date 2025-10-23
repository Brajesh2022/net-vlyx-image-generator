import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

const SCRAPING_API = "https://vlyx-scrapping.vercel.app/api/index"

interface LinkData {
  title: string // e.g., "Episodes: 1:" or "480p [2.6GB]"
  episodeNumber?: number // Extracted episode number if it's an episode
  quality?: string // Extracted quality if it's a quality section
  size?: string // Extracted size (e.g., "1GB", "8.4GB")
  links: {
    name: string
    url: string
    isVCloud: boolean
    isHubCloud: boolean
  }[]
}

async function fetchM4ULinksHTML(url: string): Promise<string> {
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

function parseM4ULinks(html: string): LinkData[] {
  const $ = cheerio.load(html)
  const linkData: LinkData[] = []

  // Parse download sections (div.download-links-div)
  $("div.download-links-div h4, div.download-links-div h5").each((i, el) => {
    const $header = $(el)
    const title = $header.text().trim()
    
    // Try to extract episode number from title
    // Patterns: "-:Episodes: 1:-", "Episodes: 2:", "Episode 3"
    let episodeNumber: number | undefined
    const episodeMatch = title.match(/-?:?Episodes?:?\s*(\d+)\s*:-?/i)
    if (episodeMatch) {
      episodeNumber = parseInt(episodeMatch[1])
    }
    
    // Extract quality using simple formula: remove brackets and their content
    // Examples: "480p [1GB]" -> "480p", "1080p HQ [8.4GB]" -> "1080p HQ", "720p HEVC [1.8GB]" -> "720p HEVC"
    let quality: string | undefined
    let size: string | undefined
    
    // Extract size from brackets
    const sizeMatch = title.match(/\[([^\]]+)\]/)
    if (sizeMatch) {
      size = sizeMatch[1].trim()
    }
    
    // Remove everything in brackets including the brackets to get quality
    const qualityText = title.replace(/\[.*?\]/g, '').trim()
    // Check if it contains a quality indicator (e.g., 480p, 720p, 1080p, 2160p, 4K)
    if (/\d+p|4K/i.test(qualityText)) {
      quality = qualityText
    }
    
    // Find the download buttons in the next sibling div
    const $downloadDiv = $header.next("div.downloads-btns-div")
    
    if ($downloadDiv.length) {
      const links: any[] = []
      
      // Extract all links from this section
      $downloadDiv.find("a[href]").each((j, linkEl) => {
        const $link = $(linkEl)
        const url = $link.attr("href") || ""
        const name = $link.text().trim()
        
        if (url) {
          // Check if it's a vcloud or hubcloud link by URL or name
          const isVCloud = url.includes("vcloud.") || 
                          url.includes("gdlink.dev") ||
                          name.toLowerCase().includes("vcloud") || 
                          name.toLowerCase().includes("gdflix")
                          
          const isHubCloud = url.includes("hubcloud.") || 
                            url.includes("dgdrive.pro") ||
                            name.toLowerCase().includes("hubcloud") || 
                            name.toLowerCase().includes("hub-cloud")
          
          links.push({
            name,
            url,
            isVCloud,
            isHubCloud,
          })
        }
      })
      
      if (links.length > 0) {
        linkData.push({
          title,
          episodeNumber,
          quality,
          size,
          links,
        })
      }
    }
  })

  return linkData
}

export async function GET(request: NextRequest) {
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const linkUrl = searchParams.get("url")

  if (!linkUrl) {
    return NextResponse.json({ error: "Link URL is required" }, { status: 400 })
  }

  try {
    console.log("Fetching m4ulinks page...")
    const html = await fetchM4ULinksHTML(linkUrl)
    console.log("Successfully fetched m4ulinks page")

    const linkData = parseM4ULinks(html)
    
    // Determine if this is episode-wise or quality-wise structure
    const hasEpisodes = linkData.some(item => item.episodeNumber !== undefined)
    const hasQualities = linkData.some(item => item.quality !== undefined)
    
    return NextResponse.json({ 
      linkData,
      type: hasEpisodes ? "episode" : (hasQualities ? "quality" : "unknown"),
      totalEpisodes: hasEpisodes ? Math.max(...linkData.filter(i => i.episodeNumber).map(i => i.episodeNumber!)) : 0
    })
  } catch (error: any) {
    console.error("Error in m4ulinks scraper API:", error)
    return NextResponse.json(
      { error: "Failed to fetch download links" },
      { status: 500 }
    )
  }
}
