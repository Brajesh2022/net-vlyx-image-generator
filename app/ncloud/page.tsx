"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { decodeNCloudParams, replaceBrandingText } from "@/lib/utils"
import { ChevronLeft, Download, Play, Sparkles, Loader2, CheckCircle2, AlertCircle, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DownloadLink {
  url: string
  label: string
  isTrusted: boolean
  originalText: string
}

interface ProcessLog {
  message: string
  type: "info" | "success" | "error"
  timestamp: Date
}

export default function NCloudPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const key = searchParams.get("key")
  const directUrl = searchParams.get("url")
  const action = searchParams.get("action") as "stream" | "download" | null
  
  // Decode parameters from key (backward compatible) or use direct URL
  let params: { id: string; title: string; poster: string; sourceUrl?: string }
  
  if (directUrl) {
    // Direct URL fallback method - use the full URL
    params = {
      id: "", // Not needed when we have full URL
      title: action === "stream" ? "N-Cloud Stream" : "N-Cloud Download",
      poster: "/placeholder.svg",
      sourceUrl: directUrl, // Store the full URL
    }
  } else if (key) {
    // Try to decode the key
    const decoded = decodeNCloudParams(key)
    if (decoded && decoded.url) {
      // If we have the full URL, use it (PREFERRED)
      params = {
        id: decoded.id || "",
        title: decoded.title || "Unknown Title",
        poster: decoded.poster || "/placeholder.svg",
        sourceUrl: decoded.url, // Use the full URL from the encoded params
      }
    } else if (decoded && decoded.id) {
      // Fallback to ID only (legacy)
      params = {
        id: decoded.id,
        title: decoded.title || "Unknown Title",
        poster: decoded.poster || "/placeholder.svg",
        sourceUrl: undefined,
      }
    } else {
      // If decoding fails, fallback to empty
      params = {
        id: "",
        title: "Unknown Title",
        poster: "/placeholder.svg",
      }
    }
  } else {
    // Legacy direct parameters
    const legacyUrl = searchParams.get("url")
    params = {
      id: searchParams.get("id") || "",
      title: searchParams.get("title") || "Unknown Title",
      poster: searchParams.get("poster") || "/placeholder.svg",
      sourceUrl: legacyUrl || undefined,
    }
  }
  
  const { id, title, poster, sourceUrl } = params
  
  // Apply branding replacement to title
  const displayTitle = replaceBrandingText(title)

  const [logs, setLogs] = useState<ProcessLog[]>([])
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([])
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<DownloadLink | null>(null)
  const [isZipFile, setIsZipFile] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showStreamingPopup, setShowStreamingPopup] = useState(false)
  const [streamingUrl, setStreamingUrl] = useState<string>("")
  const [detectedOS, setDetectedOS] = useState<string>("")
  const [showMxProModal, setShowMxProModal] = useState(false)
  const [showDesktopHelpModal, setShowDesktopHelpModal] = useState(false)
  const [desktopHelpType, setDesktopHelpType] = useState<"windows" | "mac">("windows")
  const statusRef = useRef<HTMLDivElement>(null)

  const colorClasses = [
    "bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700",
    "bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700",
    "bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700",
    "bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-800 hover:to-sky-700",
    "bg-gradient-to-r from-fuchsia-700 to-fuchsia-600 hover:from-fuchsia-800 hover:to-fuchsia-700",
  ]

  const trustedPatterns = [
    { name: "Pixeldrain", regex: /pixeldrain\.dev/i },
    { name: "Pub-Dev", regex: /pub-.*?\.dev/i },
    { name: "FSL Server", regex: /fsl\.blockxpiracy\.org/i },
  ]

  // Process the N-Cloud link on mount or when parameters change
  useEffect(() => {
    // Define addLog inside useEffect to avoid closure issues
    const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
      setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])
      setTimeout(() => {
        if (statusRef.current) {
          statusRef.current.scrollTop = statusRef.current.scrollHeight
        }
      }, 100)
    }
    
    const processLink = async () => {
      console.log("useEffect triggered - id:", id, "sourceUrl:", sourceUrl)
      
      // Check if we have either sourceUrl or id
      if (!sourceUrl && !id) {
        console.log("NOT processing - missing both id and sourceUrl")
        setError("Missing N-Cloud URL or ID")
        setIsProcessing(false)
        return
      }

      try {
        console.log("Starting processing...")
        setIsProcessing(true)
        setError(null)
        addLog("Starting N-Cloud link processing...")
        
        // Step 1: Determine the URL to fetch
        let ncloudUrl: string
        
        if (sourceUrl) {
          // PREFERRED: Use the full URL directly (no reconstruction needed!)
          ncloudUrl = sourceUrl
          setOriginalUrl(sourceUrl) // Store for manual fallback
          addLog(`Step 1: Using provided URL: ${ncloudUrl}`)
          
          // Detect type for logging
          try {
            const hostname = new URL(sourceUrl).hostname.toLowerCase()
            if (hostname.includes('hubcloud')) {
              addLog(`Detected Hub-Cloud URL`)
            } else if (hostname.includes('vcloud')) {
              addLog(`Detected V-Cloud URL`)
            }
          } catch (e) {
            console.error("Error parsing URL:", e)
          }
        } else if (id) {
          // FALLBACK: Reconstruct URL from ID (legacy support)
          addLog(`Step 1: Reconstructing URL from ID: ${id}`)
          ncloudUrl = `https://vcloud.zip/${id}` // Default to vcloud
          setOriginalUrl(ncloudUrl) // Store for manual fallback
          addLog(`⚠️ Warning: Using fallback URL construction. Prefer passing full URL.`)
        } else {
          throw new Error("No URL or ID provided")
        }
        
        addLog(`Step 2: Fetching N-Cloud page...`)
        addLog(`🔗 Source URL: ${ncloudUrl}`, "info")

        const response1 = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: ncloudUrl }),
        })

        if (!response1.ok) throw new Error("Failed to fetch N-Cloud page")

        const data1 = await response1.json()
        addLog("Received response from N-Cloud page")

        // Extract the tokenized final URL - support both old and new patterns
        let finalUrl: string | null = null
        
        // Pattern 1 (OLD): JavaScript variable - var url = '...'
        const jsVarRegex = /var\s+url\s*=\s*'(.*?)'/
        const jsMatch = data1.html?.match(jsVarRegex)
        
        if (jsMatch && jsMatch[1]) {
          finalUrl = jsMatch[1]
          addLog("✅ Found tokenized URL (JavaScript variable pattern)")
        } else {
          // Pattern 2 (NEW): HTML link - <a href="/video/xxx?token=yyy">
          addLog("⚠️ JavaScript variable not found, trying HTML link pattern...")
          
          const parser = new DOMParser()
          const doc = parser.parseFromString(data1.html, "text/html")
          
          // Look for links containing "token=" parameter
          const links = Array.from(doc.querySelectorAll('a[href*="token="]'))
          
          if (links.length > 0) {
            const linkElement = links[0] as HTMLAnchorElement
            let hrefValue = linkElement.getAttribute('href') || ''
            
            // If it's a relative path, construct the full URL
            if (hrefValue.startsWith('/')) {
              const baseUrl = new URL(ncloudUrl)
              finalUrl = `${baseUrl.protocol}//${baseUrl.hostname}${hrefValue}`
            } else {
              finalUrl = hrefValue
            }
            
            addLog("✅ Found tokenized URL (HTML link pattern)")
          }
        }
        
        if (!finalUrl) {
          throw new Error("Could not find the tokenized URL in either JavaScript or HTML patterns")
        }

        addLog(`🔗 Tokenized URL: ${finalUrl}`)
        addLog("Fetching final download page...")

        // Step 3: Fetch the final page with download links
        addLog("Step 3: Fetching final download page...")

        const response2 = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: finalUrl }),
        })

        if (!response2.ok) throw new Error("Failed to fetch download page")

        const data2 = await response2.json()
        const pageTitle = data2.title || ""
        addLog(`📄 Page Title: ${pageTitle}`, "success")

        const isZip = pageTitle.toLowerCase().endsWith(".zip")
        setIsZipFile(isZip)

        if (isZip) {
          addLog("File type detected as ZIP, download only.")
        } else {
          addLog("Playable media detected, offering stream/download options.")
        }

        addLog("Parsing and sorting links...")

        // Parse HTML and extract download links
        const parser = new DOMParser()
        const doc = parser.parseFromString(data2.html, "text/html")
        const allLinks = Array.from(doc.querySelectorAll("a.btn"))

        const links: DownloadLink[] = []

        allLinks.forEach((link) => {
          const linkElement = link as HTMLAnchorElement
          const linkText = linkElement.textContent?.trim() || ""

          // Skip Telegram links
          if (linkText.includes("Telegram")) return

          const url = linkElement.href
          const hostMatch = trustedPatterns.find((p) => p.regex.test(url))

          // Extract label from text
          const bracketMatch = linkText.match(/\[(.*?)\]/)
          const shortText = bracketMatch && bracketMatch[1] ? bracketMatch[1].trim() : linkText.replace(/\s+/g, " ")

          links.push({
            url,
            label: replaceBrandingText(shortText),
            isTrusted: !!hostMatch,
            originalText: linkText,
          })
        })

        if (links.length === 0) {
          throw new Error("No valid download links found after filtering")
        }

        // Sort: trusted first
        const sortedLinks = [
          ...links.filter((l) => l.isTrusted),
          ...links.filter((l) => !l.isTrusted),
        ]

        setDownloadLinks(sortedLinks)
        addLog("Process completed successfully!", "success")
        setIsProcessing(false)
      } catch (err: any) {
        console.error("Processing failed:", err)
        addLog(`Error: ${err.message}`, "error")
        setError(err.message)
        setIsProcessing(false)
      }
    }

    processLink()
  }, [id, sourceUrl])

  const handleLinkClick = (link: DownloadLink) => {
    if (isZipFile) {
      window.open(link.url, "_blank")
    } else if (action) {
      // If action parameter is present, automatically perform that action
      if (action === "stream") {
        // Show streaming popup instead of direct action
        setStreamingUrl(link.url)
        setShowStreamingPopup(true)
      } else if (action === "download") {
        handleDownload(link.url)
      }
    } else {
      // No action parameter, show the two-option prompt
      setSelectedLink(link)
    }
  }

  // OS Detection function
  const detectOS = (): string => {
    if (typeof window === 'undefined') return 'Other'
    
    const userAgent = window.navigator.userAgent
    const platform = window.navigator.platform
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
    const iosPlatforms = ['iPhone', 'iPad', 'iPod']

    if (macosPlatforms.indexOf(platform) !== -1) return 'Mac'
    if (iosPlatforms.indexOf(platform) !== -1) return 'iOS'
    if (windowsPlatforms.indexOf(platform) !== -1) return 'Windows'
    if (/Android/.test(userAgent)) return 'Android'
    return 'Other'
  }

  // Download M3U file function
  const downloadM3u = (url: string) => {
    const m3uContent = `#EXTM3U\n#EXTINF:-1,Stream\n${url}`
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'stream.m3u'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  // Detect OS when streaming popup opens
  useEffect(() => {
    if (showStreamingPopup && !detectedOS) {
      setDetectedOS(detectOS())
    }
  }, [showStreamingPopup, detectedOS])

  const handleWatchOnline = (url: string) => {
    // Show streaming popup instead of directly launching
    setStreamingUrl(url)
    setShowStreamingPopup(true)
    setSelectedLink(null)
  }

  const handleDownload = (url: string) => {
    window.open(url, "_blank")
    setSelectedLink(null)
  }

  if (!id && !sourceUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid URL</h1>
          <p className="text-gray-400 mb-6">Missing N-Cloud URL or ID parameter</p>
          <Button 
            onClick={() => router.back()}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  // Blacklist filter - hide specific useless servers
  const isBlacklistedServer = (link: DownloadLink): boolean => {
    const blacklistedPatterns = [
      /10gbps/i,
      /gpdl2\.hubcdn\.fans/i,
      /server.*:.*10gbps/i
    ]
    
    return blacklistedPatterns.some(pattern => 
      pattern.test(link.label) || pattern.test(link.url)
    )
  }

  // Filter out blacklisted servers, but keep them if they're the only option
  const filteredLinks = downloadLinks.length === 1 
    ? downloadLinks 
    : downloadLinks.filter(link => !isBlacklistedServer(link))

  const trustedLinks = filteredLinks.filter((l) => l.isTrusted)
  const otherLinks = filteredLinks.filter((l) => !l.isTrusted)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/5 via-indigo-500/5 to-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-6 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse" />
                <img
                  src={poster}
                  alt={displayTitle}
                  className="relative w-40 sm:w-48 lg:w-56 h-auto rounded-xl shadow-2xl ring-1 ring-white/10"
                />
              </div>
            </div>

            {/* Title and Status */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                {displayTitle}
              </h1>
              
              {/* Status Indicator */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-300">Processing your link...</span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-300">Processing failed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300">
                      {action === "stream" ? "Ready to stream" : "Ready to download"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Server Options - Appears smoothly after processing */}
        {!isProcessing && !error && downloadLinks.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            <div className="space-y-6">
              {/* Show all servers directly if no trusted servers, otherwise show only trusted ones */}
              {(trustedLinks.length > 0 ? trustedLinks : otherLinks).length > 0 && (
                <div className="space-y-4">
                  {trustedLinks.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>
                        {action === "stream" ? "Recommended Servers • Streaming" : "Recommended Servers"}
                      </span>
                    </div>
                  )}
                  
                  {(trustedLinks.length > 0 ? trustedLinks : otherLinks).map((link, index) => (
                    <div
                      key={index}
                      className="group animate-slide-in-left"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <button
                        onClick={() => handleLinkClick(link)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl p-[2px] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20"
                      >
                        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              {action === "stream" ? (
                                <Play className="h-5 w-5 text-white" />
                              ) : (
                                <Download className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-white font-semibold text-base sm:text-lg truncate">
                                {link.label}
                              </p>
                              <p className="text-gray-400 text-xs sm:text-sm">
                                {trustedLinks.length > 0 
                                  ? (action === "stream" ? "Trusted • Fast Streaming" : "Trusted • Fast Download")
                                  : (action === "stream" ? "Available Server • Stream" : "Available Server")}
                              </p>
                            </div>
                          </div>
                          <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>

                      {/* Expanded actions for selected link */}
                      {selectedLink?.url === link.url && !isZipFile && (
                        <div className="mt-3 grid grid-cols-2 gap-3 animate-slide-down">
                          <button
                            onClick={() => handleWatchOnline(link.url)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/30"
                          >
                            <Play className="h-4 w-4" />
                            <span>Watch</span>
                          </button>
                          <button
                            onClick={() => handleDownload(link.url)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-sky-500/30"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Alternative Options - Only show if we have trusted servers AND other servers */}
              {trustedLinks.length > 0 && otherLinks.length > 0 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="w-full text-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all duration-300 text-sm font-medium"
                  >
                    {showMoreOptions ? "Hide" : "Show"} {otherLinks.length} Alternative Server{otherLinks.length > 1 ? "s" : ""}
                  </button>

                  {showMoreOptions && (
                    <div className="space-y-3 animate-fade-in">
                      {otherLinks.map((link, index) => (
                        <div
                          key={index}
                          className="group animate-slide-in-left"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <button
                            onClick={() => handleLinkClick(link)}
                            className={`w-full ${colorClasses[index % colorClasses.length]} rounded-xl p-[2px] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl`}
                          >
                            <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                  {action === "stream" ? (
                                    <Play className="h-4 w-4 text-white" />
                                  ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-white font-medium truncate">{link.label}</p>
                                  <p className="text-gray-400 text-xs">
                                    {action === "stream" ? "Alternative Server • Stream" : "Alternative Server"}
                                  </p>
                                </div>
                              </div>
                              <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>

                          {selectedLink?.url === link.url && !isZipFile && (
                            <div className="mt-2 grid grid-cols-2 gap-2 animate-slide-down">
                              <button
                                onClick={() => handleWatchOnline(link.url)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all duration-300"
                              >
                                <Play className="h-4 w-4" />
                                Watch
                              </button>
                              <button
                                onClick={() => handleDownload(link.url)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white text-sm font-medium transition-all duration-300"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Error State */}
        {!isProcessing && error && (
          <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 backdrop-blur-xl">
              <div className="text-center mb-6">
                <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-red-300 mb-3">We're Sorry!</h3>
                <p className="text-gray-300 text-lg mb-2">Automatic extraction failed</p>
                <p className="text-gray-400 text-sm mb-4">Error details: {error}</p>
              </div>
              
              {originalUrl && (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <p className="text-yellow-200 text-sm text-center">
                      Don't worry! You can still proceed manually to download your content.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => window.open(originalUrl, "_blank")}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-3"
                  >
                    <Download className="h-5 w-5" />
                    <span>Proceed Manually to Download</span>
                  </button>
                  
                  <p className="text-gray-500 text-xs text-center">
                    This will open the original page where you can manually download the content
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Hidden Debug Logs - Click on footer text to reveal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="mx-auto block text-xs text-gray-600 hover:text-gray-400 transition-colors duration-300 opacity-30 hover:opacity-100"
          >
            {showLogs ? "Hide" : "Show"} Debug Info
          </button>

          {showLogs && (
            <div className="mt-4 bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl p-4 animate-fade-in">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Process Logs</h4>
              <div
                ref={statusRef}
                className="bg-black/60 rounded-lg h-48 overflow-y-auto font-mono text-xs text-gray-400 p-3 custom-scrollbar"
              >
                {logs.length === 0 ? (
                  <p className="text-gray-600">No logs yet...</p>
                ) : (
                  logs.map((log, index) => (
                    <p
                      key={index}
                      className={
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      [{log.timestamp.toLocaleTimeString()}] {log.message}
                    </p>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streaming Popup Modal - Redesigned Beautiful Version */}
      {showStreamingPopup && (
        <Dialog open={showStreamingPopup} onOpenChange={setShowStreamingPopup}>
          <DialogContent className="max-w-4xl w-full bg-black/95 backdrop-blur-2xl border border-white/10 p-0 gap-0 max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-50 blur-3xl" />
            
            {/* Close Button - Floating */}
            <button
              onClick={() => setShowStreamingPopup(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 backdrop-blur-xl transition-all duration-300 group"
            >
              <X className="h-5 w-5 text-white/70 group-hover:text-red-400 group-hover:rotate-90 transition-all duration-300" />
            </button>

            {/* Content Container */}
            <div className="relative z-10">
              {/* Elegant Header */}
              <div className="relative px-6 sm:px-8 pt-8 pb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-60 animate-pulse" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Choose Your Player
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base">
                    Select the best option for your device
                  </p>
                </div>
              </div>

              {/* Important Notice Banner */}
              <div className="mx-6 sm:mx-8 mb-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 p-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-amber-200 text-sm sm:text-base font-medium">
                      If playback fails, try selecting a different server from the previous page
                    </p>
                  </div>
                </div>
              </div>

              {/* Device Selector - Premium Style */}
              <div className="mx-6 sm:mx-8 mb-6">
                <div className="relative">
                  <select
                    value={detectedOS}
                    onChange={(e) => setDetectedOS(e.target.value)}
                    className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl px-4 py-3.5 pr-10 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer hover:bg-white/10 text-base font-medium"
                  >
                    <option value="iOS" className="bg-gray-900">📱 iOS (iPhone/iPad)</option>
                    <option value="Android" className="bg-gray-900">🤖 Android</option>
                    <option value="Windows" className="bg-gray-900">🪟 Windows</option>
                    <option value="Mac" className="bg-gray-900">🍎 macOS</option>
                    <option value="Other" className="bg-gray-900">🐧 Other (Linux, etc)</option>
                  </select>
                  <ChevronLeft className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 pointer-events-none rotate-[-90deg]" />
                </div>
              </div>

              {/* Player Options - Beautiful Cards */}
              <div className="px-6 sm:px-8 pb-8 overflow-y-auto max-h-[calc(95vh-320px)] custom-scrollbar">
                {/* iOS Options */}
                {detectedOS === 'iOS' && (
                  <div className="group">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20 p-6 sm:p-8 hover:border-orange-500/40 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl" />
                          <img src="https://i.ibb.co/0VfBwckX/vlc-logo.png" alt="VLC" className="relative w-20 h-20 sm:w-24 sm:h-24" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h3 className="text-2xl font-bold text-white mb-2">VLC Player</h3>
                          <p className="text-gray-300 mb-1">Best choice for iOS devices</p>
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <Star className="h-4 w-4 text-orange-400 fill-orange-400" />
                            <span className="text-orange-400 text-sm font-medium">Recommended</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full sm:w-auto">
                          <a
                            href={`vlc://stream?url=${encodeURIComponent(streamingUrl)}`}
                            className="text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-8 py-3.5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
                          >
                            <Play className="h-5 w-5 inline mr-2" />
                            Play Now
                          </a>
                          <a
                            href="https://apps.apple.com/us/app/vlc-for-mobile/id650377962"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl px-8 py-3 transition-all duration-300"
                          >
                            Install VLC
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Android Options */}
                {detectedOS === 'Android' && (
                  <div className="space-y-4">
                    {/* VLC */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20 p-5 hover:border-orange-500/40 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-orange-500/20 rounded-xl blur-lg" />
                          <img src="https://i.ibb.co/0VfBwckX/vlc-logo.png" alt="VLC" className="relative w-16 h-16" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-1">VLC Player</h4>
                          <div className="flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
                            <span className="text-orange-400 text-xs font-medium">Most Reliable</span>
                          </div>
                        </div>
                        <a
                          href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-6 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg flex-shrink-0"
                        >
                          <Play className="h-4 w-4 inline mr-1.5" />
                          Play
                        </a>
                      </div>
                    </div>

                    {/* MX Player */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-500/20 p-5 hover:border-blue-500/40 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg" />
                          <img src="https://i.ibb.co/kVhq9tcq/mx-player.png" alt="MX Player" className="relative w-16 h-16 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-1">MX Player</h4>
                          <p className="text-gray-400 text-xs">Popular Android player</p>
                        </div>
                        <a
                          href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad')};end`}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl px-6 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg flex-shrink-0"
                        >
                          <Play className="h-4 w-4 inline mr-1.5" />
                          Play
                        </a>
                      </div>
                    </div>

                    {/* Other Players */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 border border-emerald-500/20 p-5 hover:border-emerald-500/40 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-white mb-1">Other Players</h4>
                            <p className="text-gray-400 text-xs">Choose from your installed apps</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <a
                            href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`}
                            className="text-center bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl px-5 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg"
                          >
                            Choose Player
                          </a>
                          <button
                            onClick={() => setShowMxProModal(true)}
                            className="text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl px-5 py-3 transition-all duration-300"
                          >
                            Get MX Pro
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Windows Options */}
                {detectedOS === 'Windows' && (
                  <div className="space-y-4">
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20 p-6 sm:p-8 hover:border-orange-500/40 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex flex-col items-center gap-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl" />
                          <img src="https://i.ibb.co/0VfBwckX/vlc-logo.png" alt="VLC" className="relative w-24 h-24" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-2xl font-bold text-white mb-2">VLC Media Player</h3>
                          <p className="text-gray-300">Click below to open in VLC</p>
                        </div>
                        <a
                          href={`vlc://${streamingUrl}`}
                          className="w-full sm:w-auto text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-10 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
                        >
                          <Play className="h-5 w-5 inline mr-2" />
                          Launch VLC
                        </a>
                        <button
                          onClick={() => {
                            downloadM3u(streamingUrl)
                            setDesktopHelpType('windows')
                            setShowDesktopHelpModal(true)
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium underline"
                        >
                          Having trouble? Try the .m3u file method
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mac & Other Options */}
                {(detectedOS === 'Mac' || detectedOS === 'Other') && (
                  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20 p-6 sm:p-8 hover:border-orange-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl" />
                        <img src="https://i.ibb.co/0VfBwckX/vlc-logo.png" alt="VLC" className="relative w-24 h-24" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white mb-2">VLC Media Player</h3>
                        <p className="text-gray-300">Download playlist file to play in VLC</p>
                      </div>
                      <button
                        onClick={() => {
                          downloadM3u(streamingUrl)
                          setDesktopHelpType('mac')
                          setShowDesktopHelpModal(true)
                        }}
                        className="w-full sm:w-auto text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-10 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
                      >
                        <Download className="h-5 w-5 inline mr-2" />
                        Download .m3u File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MX Player Pro Download Modal - Beautiful Design */}
      <Dialog open={showMxProModal} onOpenChange={setShowMxProModal}>
        <DialogContent className="max-w-lg bg-black/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-lg" />
            
            <div className="relative">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Download className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-white">MX Player Pro</DialogTitle>
                    <p className="text-gray-400 text-sm">Installation Guide</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    MX Player Pro has been removed from the Play Store. You can download the APK from trusted third-party sources.
                  </p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 space-y-3">
                  <h4 className="text-white font-semibold mb-3">Installation Steps:</h4>
                  <ol className="space-y-3 text-gray-300 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">1</span>
                      <span>Click the button below to visit a trusted source</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">2</span>
                      <span>Search for "MX Player Pro" on the website</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">3</span>
                      <span>Download the latest APK file</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">4</span>
                      <span>Install and allow from unknown sources if prompted</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => setShowMxProModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  Close
                </Button>
                <a
                  href="https://vlyx-mod.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg px-4 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Visit Site
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop Help Modal - Beautiful Design */}
      <Dialog open={showDesktopHelpModal} onOpenChange={setShowDesktopHelpModal}>
        <DialogContent className="max-w-lg bg-black/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-red-600/10 to-pink-600/10 rounded-lg" />
            
            <div className="relative">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-white">File Downloaded!</DialogTitle>
                    <p className="text-gray-400 text-sm">How to open stream.m3u</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-gray-300 text-sm">
                    A file called <code className="bg-black/50 px-2 py-1 rounded text-green-400 font-mono">stream.m3u</code> has been saved to your Downloads folder.
                  </p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 space-y-3">
                  <h4 className="text-white font-semibold mb-3">
                    {desktopHelpType === 'windows' ? '🪟 Windows Instructions:' : '🍎 macOS Instructions:'}
                  </h4>
                  {desktopHelpType === 'windows' ? (
                    <ol className="space-y-3 text-gray-300 text-sm">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">1</span>
                        <span>Right-click on the downloaded file</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">2</span>
                        <span>Hover over "Open with"</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">3</span>
                        <span>If VLC is not listed, click "Choose another app"</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">4</span>
                        <span>Select "VLC media player" and click "OK"</span>
                      </li>
                    </ol>
                  ) : (
                    <ol className="space-y-3 text-gray-300 text-sm">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">1</span>
                        <span>Double-click the file (should open in VLC)</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">2</span>
                        <span>If wrong app opens, right-click the file</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">3</span>
                        <span>Hover over "Open With"</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">4</span>
                        <span>Select "VLC" from the applications list</span>
                      </li>
                    </ol>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => setShowDesktopHelpModal(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(59, 130, 246, 0.7), rgba(147, 51, 234, 0.7));
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.5) rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}
