import { type NextRequest, NextResponse } from "next/server"

// CORS proxies with the working one first
const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/", // WORKING - Move to first position
  "https://api.codetabs.com/v1/proxy?quest=", // Keep as backup
]

// Enhanced user agents
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

    if (html.includes("Just a moment...") || html.includes("cf-browser-verification")) {
      throw new Error("Cloudflare challenge detected")
    }

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

// Enhanced button link extraction function
async function extractButtonLink(html: string, buttonText: string, baseUrl: string): Promise<string> {
  const cheerio = await import("cheerio")
  const $ = cheerio.load(html)

  const selectors = [
    "button",
    "a",
    '[role="button"]',
    'input[type="button"]',
    'input[type="submit"]',
    ".btn",
    ".button",
  ]

  for (const selector of selectors) {
    const elements = $(selector)

    for (let i = 0; i < elements.length; i++) {
      const element = elements.eq(i)
      const text = element.text().trim()
      const href = element.attr("href")
      const onclick = element.attr("onclick")

      // Handle different button text patterns
      let isMatch = false

      if (buttonText === "Download File [") {
        // Pattern match for "Download File [X MB]" or "Download File [X GB]"
        isMatch = text.match(/Download\s+File\s+\[[\d.]+\s*[KMGT]?B\]/i) !== null
      } else if (buttonText === "Download [PixelServer : 2]") {
        // Exact match for PixelServer button
        isMatch = text.includes("Download [PixelServer : 2]")
      } else {
        // Exact match for other buttons
        isMatch = text.includes(buttonText)
      }

      if (isMatch) {
        console.log(`Found button with text: "${text}"`)

        if (href && href !== "#" && !href.startsWith("javascript:")) {
          const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href
          console.log(`Button href: ${fullUrl}`)
          return fullUrl
        }

        if (onclick) {
          const urlMatch = onclick.match(/(?:window\.open|location\.href|document\.location)\s*=?\s*['"]([^'"]+)['"]/)
          if (urlMatch && urlMatch[1]) {
            const fullUrl = urlMatch[1].startsWith("http") ? urlMatch[1] : new URL(urlMatch[1], baseUrl).href
            console.log(`Button onclick URL: ${fullUrl}`)
            return fullUrl
          }
        }

        // Check parent elements for href
        let parent = element.parent()
        while (parent.length && parent.get(0)?.tagName !== "BODY") {
          const parentHref = parent.attr("href")
          if (parentHref && parentHref !== "#" && !parentHref.startsWith("javascript:")) {
            const fullUrl = parentHref.startsWith("http") ? parentHref : new URL(parentHref, baseUrl).href
            console.log(`Parent href: ${fullUrl}`)
            return fullUrl
          }
          parent = parent.parent()
        }
      }
    }
  }

  throw new Error(`Button with text "${buttonText}" not found`)
}

// New function to handle HubCloud extraction
async function extractHubCloudLink(hubCloudUrl: string): Promise<string> {
  console.log(`Processing HubCloud URL: ${hubCloudUrl}`)

  // Step 1: Fetch HubCloud page and extract "Generate Direct Download Link" button
  console.log("Step 1: Extracting generation link from HubCloud...")
  const step1Html = await fetchWithProxy(hubCloudUrl)
  const generationLink = await extractButtonLink(step1Html, "Generate Direct Download Link", hubCloudUrl)
  console.log(`Generation link found: ${generationLink}`)

  // Step 2: Fetch generation link and extract final download link
  console.log("Step 2: Extracting final download link...")
  const step2Html = await fetchWithProxy(generationLink)

  // Try primary button first
  try {
    const finalDownloadUrl = await extractButtonLink(step2Html, "Download [PixelServer : 2]", generationLink)
    console.log(`Final download link found: ${finalDownloadUrl}`)
    return finalDownloadUrl
  } catch (primaryError) {
    console.log("Primary button not found, trying fallback...")

    // Try fallback button pattern
    try {
      const fallbackDownloadUrl = await extractButtonLink(step2Html, "Download File [", generationLink)
      console.log(`Fallback download link found: ${fallbackDownloadUrl}`)
      return fallbackDownloadUrl
    } catch (fallbackError) {
      throw new Error("Both primary and fallback download buttons not found")
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, extractHubCloud } = await request.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // Handle HubCloud extraction
    if (extractHubCloud) {
      try {
        const urlObj = new URL(url)
        if (!urlObj.hostname.includes("hubcloud")) {
          return NextResponse.json({ error: "Please enter a valid HubCloud URL" }, { status: 400 })
        }
      } catch (e) {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
      }

      console.log("HubCloud extraction requested")
      const finalDownloadUrl = await extractHubCloudLink(url)
      return NextResponse.json({ downloadUrl: finalDownloadUrl })
    }

    // Validate HubDrive URL format for regular extraction
    try {
      const urlObj = new URL(url)
      if (!urlObj.hostname.includes("hubdrive") || !urlObj.pathname.includes("/file/")) {
        return NextResponse.json({ error: "Please enter a valid HubDrive URL" }, { status: 400 })
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    console.log(`Processing HubDrive URL: ${url}`)

    // Step 1: Fetch original URL and extract server link
    console.log("Step 1: Extracting server link...")
    const step1Html = await fetchWithProxy(url)
    const serverLink = await extractButtonLink(step1Html, "HubCloud Server", url)
    console.log(`Server link found: ${serverLink}`)

    // Step 2: Fetch server link and extract download generation link
    console.log("Step 2: Extracting download generation link...")
    const step2Html = await fetchWithProxy(serverLink)
    const downloadGenLink = await extractButtonLink(step2Html, "Generate Direct Download Link", serverLink)
    console.log(`Download generation link found: ${downloadGenLink}`)

    // Step 3: Fetch download generation link and extract final download link
    console.log("Step 3: Extracting final download link...")
    let finalDownloadUrl = ""

    try {
      const step3Html = await fetchWithProxy(downloadGenLink)
      finalDownloadUrl = await extractButtonLink(step3Html, "Download [PixelServer : 2]", downloadGenLink)
      console.log(`Final download link found: ${finalDownloadUrl}`)
    } catch (error) {
      console.log("Step 3 failed with primary method, trying Method 2...")

      // Method 2: Replace domain with 90fpsconfig.in
      const method2Url = downloadGenLink.replace(/https?:\/\/[^/]+/, "https://90fpsconfig.in")
      console.log(`Trying Method 2 with URL: ${method2Url}`)

      try {
        const method2Html = await fetchWithProxy(method2Url)
        finalDownloadUrl = await extractButtonLink(method2Html, "Download [PixelServer : 2]", method2Url)
        console.log(`Final download link found using Method 2: ${finalDownloadUrl}`)
      } catch (method2Error) {
        console.log("Method 2 also failed, trying direct extraction from original step 3...")

        // Method 3: Try to extract any direct download link from step 3 HTML
        try {
          const step3Html = await fetchWithProxy(downloadGenLink)

          // Look for any direct download links in the HTML
          const cheerio = await import("cheerio")
          const $ = cheerio.load(step3Html)

          let directLink = ""

          // Look for links that point to file hosting services
          $("a[href]").each((_, element) => {
            const href = $(element).attr("href")
            const text = $(element).text().trim()

            if (href && (href.includes("r2.dev") || href.includes("hubcdn.fans") || href.includes("pixel.hubcdn"))) {
              console.log(`Found direct download link: ${href}`)
              directLink = href
              return false // Break the loop
            }
          })

          if (directLink) {
            finalDownloadUrl = directLink
            console.log(`Direct download link found: ${finalDownloadUrl}`)
          } else {
            throw new Error("No direct download links found")
          }
        } catch (method3Error) {
          throw new Error(
            "All extraction methods failed. The download link may not be available or the page structure has changed.",
          )
        }
      }
    }

    return NextResponse.json({ downloadUrl: finalDownloadUrl })
  } catch (error) {
    console.log(`Extraction error: ${error instanceof Error ? error.message : "Unknown error"}`)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Extraction failed. Please try again.",
      },
      { status: 500 },
    )
  }
}
