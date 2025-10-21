import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { protectApiRoute } from "@/lib/api-protection"

// CORS proxies to bypass restrictions
const CORS_PROXIES = [
  "https://thingproxy.freeboard.io/fetch/",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
]

interface EpisodeDownload {
  episodeNumber: number
  servers: Array<{
    name: string
    url: string
    style?: string
  }>
}

interface MovieDownload {
  servers: Array<{
    name: string
    url: string
    style?: string
  }>
  alternatives?: Array<{
    name: string
    url: string
  }>
}

interface NextDriveData {
  type: "episode" | "movie"
  title: string
  episodes?: EpisodeDownload[]
  movie?: MovieDownload
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
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
  }
}

function buildProxyUrl(proxy: string, targetUrl: string): string {
  try {
    const u = new URL(targetUrl)
    if (proxy.includes("freeboard.io/fetch")) {
      return `${proxy}${u.toString()}`
    }
    if (proxy.includes("codetabs.com")) {
      return `${proxy}${encodeURIComponent(u.toString())}`
    }
    if (proxy.includes("allorigins.win")) {
      return `${proxy}${encodeURIComponent(u.toString())}`
    }
    if (proxy.includes("corsproxy.io")) {
      return `${proxy}${encodeURIComponent(u.toString())}`
    }
    return `${proxy}${encodeURIComponent(u.toString())}`
  } catch {
    return proxy + encodeURIComponent(targetUrl)
  }
}

type Attempt = {
  viaProxy?: string | null
  fetchUrl: string
  status?: number
  ok?: boolean
  error?: string
  finalUrl?: string
  redirected?: boolean
  // external scraper details (optional)
  viaExternal?: boolean
  externalMethod?: string
  titleHeader?: string
  bytes?: number
  reason?: string
}

async function fetchWithProxy(url: string, proxyIndex = 0, attempts?: Attempt[]): Promise<string> {
  const toggleTrailingSlash = (inputUrl: string): string => {
    try {
      const u = new URL(inputUrl)
      if (u.pathname.endsWith("/")) {
        u.pathname = u.pathname.slice(0, -1)
      } else {
        u.pathname = `${u.pathname}/`
      }
      return u.toString()
    } catch {
      return inputUrl
    }
  }

  if (proxyIndex >= CORS_PROXIES.length) {
    try {
      const response = await fetch(url, {
        headers: getBrowserHeaders(),
        redirect: "follow",
      })
      attempts?.push({
        viaProxy: null,
        fetchUrl: url,
        status: response.status,
        ok: response.ok,
        finalUrl: (response as any).url,
        redirected: (response as any).redirected,
      })

      if (!response.ok) {
        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get("location")
          if (loc) {
            const nextUrl = new URL(loc, url).toString()
            return await fetchWithProxy(nextUrl, proxyIndex, attempts)
          } else {
            const toggled = toggleTrailingSlash(url)
            if (toggled !== url) {
              return await fetchWithProxy(toggled, proxyIndex, attempts)
            }
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.text()
    } catch (error: any) {
      attempts?.push({
        viaProxy: null,
        fetchUrl: url,
        error: error?.message || String(error),
      })
      throw new Error(`All proxy attempts failed. Last error: ${error}`)
    }
  }

  const proxy = CORS_PROXIES[proxyIndex]
  const proxyUrl = buildProxyUrl(proxy, url)

  try {
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getBrowserHeaders(),
      signal: AbortSignal.timeout(30000),
      redirect: "follow",
    })

    attempts?.push({
      viaProxy: proxy,
      fetchUrl: proxyUrl,
      status: response.status,
      ok: response.ok,
      finalUrl: (response as any).url,
      redirected: (response as any).redirected,
    })

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location")
      if (loc) {
        const nextUrl = new URL(loc, url).toString()
        return await fetchWithProxy(nextUrl, proxyIndex, attempts)
      } else {
        const toggled = toggleTrailingSlash(url)
        if (toggled !== url) {
          return await fetchWithProxy(toggled, proxyIndex, attempts)
        }
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      throw new Error("Invalid HTML response")
    }
    return html
  } catch (error: any) {
    attempts?.push({
      viaProxy: proxy,
      fetchUrl: proxyUrl,
      error: error?.message || String(error),
    })
    return fetchWithProxy(url, proxyIndex + 1, attempts)
  }
}

async function fetchViaExternalScraper(url: string, attempts?: Attempt[]): Promise<string> {
  const apiUrl = `https://vlyx-scrapping.vercel.app/api/index?url=${encodeURIComponent(url)}`
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
      redirect: "follow",
    })
    const text = await res.text()
    attempts?.push({
      viaProxy: "external-scraper",
      fetchUrl: apiUrl,
      status: res.status,
      ok: res.ok,
      finalUrl: (res as any).url,
      redirected: (res as any).redirected,
      viaExternal: true,
      externalMethod: res.headers.get("X-Scraper-Method") || undefined,
      titleHeader: res.headers.get("X-Page-Title") || undefined,
      bytes: text.length,
    })
    if (!res.ok || text.length < 200 || (!text.includes("<html") && !text.includes("<!DOCTYPE"))) {
      throw new Error(`External scraper returned invalid response (status ${res.status}, len ${text.length})`)
    }
    return text
  } catch (e: any) {
    attempts?.push({
      viaProxy: "external-scraper",
      fetchUrl: apiUrl,
      error: e?.message || String(e),
      viaExternal: true,
    })
    throw e
  }
}

function extractServerName(buttonText: string): string {
  const text = buttonText.replace(/⚡/g, "").replace(/🚀/g, "").trim()

  // Check for Hub-Cloud / HubCloud (same as V-Cloud/NCloud)
  if (text.includes("Hub-Cloud") || text.includes("HubCloud") || /\bHub[\s-]?Cloud\b/i.test(text)) return "Hub-Cloud"
  if (text.includes("V-Cloud")) return "V-Cloud"
  if (text.includes("GDToT")) return "GDToT"
  if (text.includes("GDFlix") || /\bGDFlix\b/i.test(text)) return "GDFlix"
  if (text.includes("G-Direct") || /\bG[\s-]?Direct\b/i.test(text) || /\bInstant\b/i.test(text)) return "G-Direct"
  if (text.includes("Filepress") || /\bFilePress\b/i.test(text)) return "Filepress"
  if (text.includes("DropGalaxy")) return "DropGalaxy"
  if (text.includes("G-Drive") || /\bG[\s-]?Drive\b/i.test(text)) return "G-Drive"

  const bracketMatch = text.match(/\[(.*?)\]/)
  if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim()

  // fixed: correctly capture content inside parentheses
  const parenMatch = text.match(/$$(.*?)$$/)
  if (parenMatch && parenMatch[1]) return parenMatch[1].trim()

  return (
    text
      .replace(/\[.*?\]/g, "")
      // fixed: remove any parenthetical content during fallback cleanup
      .replace(/$$.*?$$/g, "")
      .trim() || "Download"
  )
}

function parseNextDriveContent(html: string): NextDriveData {
  const $ = cheerio.load(html)

  const title =
    $("h1.post-title.entry-title").text().trim() ||
    $(".post-title").text().trim() ||
    $("title").text().trim() ||
    "Unknown Title"

  const episodeHeaders =
    $('h4:contains("Episodes:")').length > 0 ||
    $('h4:contains("-:Episodes:")').length > 0 ||
    $('h4:contains("-:Episode:")').length > 0 ||
    $(".entry").text().includes("Episodes:") ||
    $(".entry").text().includes("-:Episode:") ||
    $("h4").text().includes("-:Episode:")

  if (episodeHeaders) {
    const episodes: EpisodeDownload[] = []

    $("h4").each((index, element) => {
      const $header = $(element)
      const headerText = $header.text()

      let episodeMatch = headerText.match(/Episodes?:?\s*(\d+)/i)
      if (!episodeMatch) {
        episodeMatch = headerText.match(/-:Episode:\s*(\d+):-/i)
      }
      if (!episodeMatch) {
        episodeMatch = headerText.match(/Episode\s*(\d+)/i)
      }

      if (episodeMatch) {
        const episodeNumber = Number.parseInt(episodeMatch[1])
        const servers: Array<{ name: string; url: string; style?: string }> = []

        let $nextElement = $header.next()
        let elementCount = 0

        while ($nextElement.length && !$nextElement.is("h4") && elementCount < 5) {
          if ($nextElement.is("hr")) {
            $nextElement = $nextElement.next()
            elementCount++
            continue
          }

          $nextElement.find("a[href]").each((linkIndex, linkElement) => {
            const $link = $(linkElement)
            const url = $link.attr("href")
            const buttonText = $link.text() || $link.find("button").text()
            if (url && url !== "#" && buttonText) {
              const serverName = extractServerName(buttonText)
              servers.push({
                name: serverName,
                url: url,
                style: $link.find("button").attr("style"),
              })
            }
          })

          if ($nextElement.is("a[href]")) {
            const url = $nextElement.attr("href")
            const buttonText = $nextElement.text() || $nextElement.find("button").text()
            if (url && url !== "#" && buttonText) {
              const serverName = extractServerName(buttonText)
              servers.push({
                name: serverName,
                url: url,
                style: $nextElement.find("button").attr("style"),
              })
            }
          }

          $nextElement = $nextElement.next()
          elementCount++
        }

        if (servers.length > 0) {
          episodes.push({
            episodeNumber,
            servers,
          })
        }
      }
    })

    if (episodes.length > 0) {
      return {
        type: "episode",
        title,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
      }
    }
  }

  const servers: Array<{ name: string; url: string; style?: string }> = []
  const alternatives: Array<{ name: string; url: string }> = []

  $(".entry a[href], .entry-inner a[href], .post-inner a[href]").each((index: number, element: any) => {
    const $link = $(element)
    const url = $link.attr("href")
    const buttonText = $link.text() || $link.find("button").text()

    if (
      url &&
      url !== "#" &&
      buttonText &&
      (buttonText.includes("Download") ||
        buttonText.includes("G-Direct") ||
        buttonText.includes("Filepress") ||
        buttonText.includes("DropGalaxy") ||
        buttonText.includes("V-Cloud") ||
        buttonText.includes("Hub-Cloud") ||
        buttonText.includes("HubCloud") ||
        buttonText.includes("GDFlix") ||
        $link.find("button").length > 0)
    ) {
      const serverName = extractServerName(buttonText)
      servers.push({
        name: serverName,
        url: url,
        style: $link.find("button").attr("style"),
      })
    }
  })

  $(".su-box-content a[href], .alert a[href]").each((index: number, element: any) => {
    const $link = $(element)
    const url = $link.attr("href")
    const text = $link.text().trim()

    if (
      url &&
      url !== "#" &&
      text &&
      (url.includes("gofile.io") ||
        url.includes("1fichier.com") ||
        url.includes("vikingfile.com") ||
        url.includes("megaup.net") ||
        url.includes("mediafire.com") ||
        url.includes("dropbox.com"))
    ) {
      let name = text
      if (url.includes("gofile.io")) name = "GoFile"
      else if (url.includes("1fichier.com")) name = "1Fichier"
      else if (url.includes("vikingfile.com")) name = "VikingFile"
      else if (url.includes("megaup.net")) name = "MegaUp"
      else if (url.includes("mediafire.com")) name = "MediaFire"
      else if (url.includes("dropbox.com")) name = "Dropbox"

      alternatives.push({ name, url })
    }
  })

  return {
    type: "movie",
    title,
    movie: {
      servers,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    },
  }
}

function parseNextDriveContentWithFallback(html: string): NextDriveData {
  const base = parseNextDriveContent(html)
  if (
    (base.type === "movie" && (!base.movie || base.movie.servers.length === 0)) ||
    (base.type === "episode" && (!base.episodes || base.episodes.length === 0))
  ) {
    const $ = cheerio.load(html)
    const servers: Array<{ name: string; url: string; style?: string }> = []

    $("a[href]").each((_, el) => {
      const $a = $(el)
      const href = $a.attr("href") || ""
      const text = ($a.text() || $a.find("button").text() || "").trim()
      if (!href || href === "#") return
      const label = text
      if (!label) return
      const meaningful =
        /G-Direct|V-Cloud|Hub-Cloud|HubCloud|GDFlix|GDToT|Filepress|DropGalaxy|G-Drive|Download/i.test(label) || $a.find("button").length > 0
      if (meaningful) {
        servers.push({ name: extractServerName(label), url: href, style: $a.find("button").attr("style") })
      }
    })

    if (servers.length > 0) {
      return {
        type: "movie",
        title: base.title || "Unknown Title",
        movie: { servers },
      }
    }
  }
  return base
}

export async function GET(request: NextRequest) {
  // Protect API route - only allow requests from same origin
  const protectionError = protectApiRoute(request)
  if (protectionError) {
    return protectionError
  }

  const { searchParams } = new URL(request.url)
  const driveid = searchParams.get("driveid")
  const link = searchParams.get("link")
  const debugFlag = searchParams.get("debug")

  if (!driveid && !link) {
    return NextResponse.json({ error: "Either 'driveid' or 'link' is required" }, { status: 400 })
  }

  const hostCandidates = ["https://nexdrive.pro", "https://nexdrive.biz", "https://nexdrive.ink"]
  const requestedUrl = link ? link : `${hostCandidates[0]}/${driveid}/`

  try {
    const attempts: Attempt[] = []
    let html: string | null = null

    if (link) {
      const linkUrl = (() => {
        try {
          const u = new URL(link)
          if (u.pathname && !u.pathname.endsWith("/")) {
            u.pathname = `${u.pathname}/`
          }
          return u.toString()
        } catch {
          return link!
        }
      })()

      const isInk = (() => {
        try {
          return new URL(linkUrl).hostname.endsWith("nexdrive.ink")
        } catch {
          return /nexdrive\.ink/i.test(linkUrl)
        }
      })()

      if (isInk) {
        // .ink domain — use external fetch first, then proxy as a fallback
        try {
          html = await fetchViaExternalScraper(linkUrl, attempts)
        } catch {
          // fallback to existing proxy path if external fails
          try {
            html = await fetchWithProxy(linkUrl, 0, attempts)
          } catch {
            // keep html null; will be handled below
          }
        }
      } else {
        // non-.ink: try normal proxies first
        try {
          html = await fetchWithProxy(linkUrl, 0, attempts)
        } catch {
          html = null
        }
        // if HTML looks blocked/empty, try external scraper as fallback
        if (!html || html.length < 500 || (!html.includes("<html") && !html.includes("<!DOCTYPE"))) {
          try {
            html = await fetchViaExternalScraper(linkUrl, attempts)
          } catch {
            // leave as is; error handled below
          }
        }
      }
    } else {
      // driveid flow: try known hosts; we won't know if .ink needed unless we hit it
      for (const host of hostCandidates) {
        const url = `${host}/${driveid}/`
        try {
          html = await fetchWithProxy(url, 0, attempts)
          if (html) break
        } catch {
          // try next host
        }
      }
      // if still no good HTML, try external on the last host candidate
      if (!html) {
        const fallbackUrl = `${hostCandidates[hostCandidates.length - 1]}/${driveid}/`
        try {
          html = await fetchViaExternalScraper(fallbackUrl, attempts)
        } catch {
          // will throw below
        }
      }
      if (!html) {
        throw new Error("All NextDrive hosts failed")
      }
    }

    if (!html) {
      throw new Error("Failed to fetch HTML from both proxies and external scraper")
    }

    const parsedData = parseNextDriveContentWithFallback(html)

    if (debugFlag === "1" || debugFlag === "true") {
      const $ = cheerio.load(html || "")
      const selectorCounts = {
        'h4:contains("Episodes:")': $('h4:contains("Episodes:")').length,
        'h4:contains("-:Episodes:")': $('h4:contains("-:Episodes:")').length,
        'h4:contains("-:Episode:")': $('h4:contains("-:Episode:")').length,
        "h4.total": $("h4").length,
        "a.total": $("a[href]").length,
        "a.contains(V-Cloud)": $('a:contains("V-Cloud")').length,
        "a.contains(Hub-Cloud)": $('a:contains("Hub-Cloud")').length,
        "a.contains(HubCloud)": $('a:contains("HubCloud")').length,
        "a.contains(GDFlix)": $('a:contains("GDFlix")').length,
        "a.contains(G-Direct)": $('a:contains("G-Direct")').length,
        "a.contains(GDToT)": $('a:contains("GDToT")').length,
        "a.contains(Filepress)": $('a:contains("Filepress")').length,
        "a.contains(DropGalaxy)": $('a:contains("DropGalaxy")').length,
      }

      const sampleHeaders = $("h4")
        .map((_, el) => $(el).text().trim())
        .get()
        .slice(0, 10)

      const sampleLinks = $("a[href]")
        .map((_, el) => {
          const $a = $(el)
          return { text: ($a.text() || $a.find("button").text() || "").trim(), href: $a.attr("href") || "" }
        })
        .get()
        .filter((l) => l.text || l.href)
        .slice(0, 20)

      const episodesFound = parsedData.type === "episode" ? (parsedData.episodes ? parsedData.episodes.length : 0) : 0
      const anchorsFound = $("a[href]").length

      const lastAttempt = attempts[attempts.length - 1]
      const externalAttempt = attempts.find((a) => a.viaExternal)

      const debug = {
        requestedUrl,
        finalUrl: lastAttempt?.finalUrl,
        status: lastAttempt?.status,
        proxyUsed: lastAttempt?.viaProxy || null,
        attempts,
        usedExternal: !!externalAttempt,
        externalMethod: externalAttempt?.externalMethod,
        externalTitleHeader: externalAttempt?.titleHeader,
        fetched: !!html,
        htmlLength: html?.length || 0,
        htmlSnippet: (html || "").slice(0, 4000),
        selectorCounts,
        episodesFound,
        anchorsFound,
        reasonNoServers:
          parsedData.type === "movie" &&
          (!parsedData.movie || !parsedData.movie.servers || parsedData.movie.servers.length === 0)
            ? "Parsed zero servers; check selectorCounts and sampleLinks."
            : undefined,
        sampleHeaders,
        sampleLinks,
      }

      return NextResponse.json({ data: parsedData, debug })
    }

    return NextResponse.json(parsedData)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch and parse NextDrive data"
    return NextResponse.json(
      {
        error: message,
        type: "movie",
        title: "Unknown",
        movie: { servers: [] },
      },
      { status: 500 },
    )
  }
}
