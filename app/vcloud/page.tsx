"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Download, Play, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function VCloudPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const title = searchParams.get("title") || "Unknown Title"
  const poster = searchParams.get("poster") || "/placeholder.svg"

  const [logs, setLogs] = useState<ProcessLog[]>([])
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([])
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<DownloadLink | null>(null)
  const [isZipFile, setIsZipFile] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
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

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])
    setTimeout(() => {
      if (statusRef.current) {
        statusRef.current.scrollTop = statusRef.current.scrollHeight
      }
    }, 100)
  }

  const processVCloudLink = async () => {
    if (!id) {
      setError("Missing VCloud ID")
      setIsProcessing(false)
      return
    }

    try {
      setIsProcessing(true)
      addLog("Starting VCloud link processing...")
      
      // Step 1: Extract Vcloud ID
      addLog(`Step 1: Processing VCloud ID: ${id}`)

      // Step 2: Fetch the intermediate page
      const vcloudZipUrl = `https://vcloud.zip/${id}`
      addLog(`Step 2: Fetching token page from ${vcloudZipUrl}...`)

      const response1 = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: vcloudZipUrl }),
      })

      if (!response1.ok) throw new Error("Failed to fetch VCloud page")

      const data1 = await response1.json()
      addLog("Received response from VCloud page")

      // Extract the tokenized final URL
      const urlRegex = /var\s+url\s*=\s*'(.*?)'/
      const match1 = data1.html?.match(urlRegex)

      if (!match1 || !match1[1]) throw new Error("Could not find the tokenized URL")

      const finalUrl = match1[1]
      addLog("Found tokenized URL, fetching final download page...")

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
      addLog(`Found title: ${pageTitle}`)

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
          label: shortText,
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

  useEffect(() => {
    if (id) {
      processVCloudLink()
    }
  }, [id])

  const handleLinkClick = (link: DownloadLink) => {
    if (isZipFile) {
      window.open(link.url, "_blank")
    } else {
      setSelectedLink(link)
    }
  }

  const handleWatchOnline = (url: string) => {
    const isAndroid = /Android/i.test(navigator.userAgent)
    const urlWithoutScheme = url.replace(/^https?:\/\//, "")
    let streamUrl

    if (isAndroid) {
      streamUrl = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;S.browser_fallback_url=${encodeURIComponent(url)};end`
    } else {
      streamUrl = `vlc://${urlWithoutScheme}`
    }

    window.location.href = streamUrl
    setSelectedLink(null)
  }

  const handleDownload = (url: string) => {
    window.open(url, "_blank")
    setSelectedLink(null)
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid URL</h1>
          <p className="text-gray-400 mb-6">Missing VCloud ID parameter</p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const trustedLinks = downloadLinks.filter((l) => l.isTrusted)
  const otherLinks = downloadLinks.filter((l) => !l.isTrusted)

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
          <Link href="/">
            <Button
              variant="outline"
              className="mb-6 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
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
                  alt={title}
                  className="relative w-40 sm:w-48 lg:w-56 h-auto rounded-xl shadow-2xl ring-1 ring-white/10"
                />
              </div>
            </div>

            {/* Title and Status */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                {title}
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
                    <span className="text-sm text-green-300">Ready to download</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Download Options - Appears smoothly after processing */}
        {!isProcessing && !error && downloadLinks.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            <div className="space-y-6">
              {/* Show all servers directly if no trusted servers, otherwise show only trusted ones */}
              {(trustedLinks.length > 0 ? trustedLinks : otherLinks).length > 0 && (
                <div className="space-y-4">
                  {trustedLinks.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Recommended Servers</span>
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
                              <Download className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-white font-semibold text-base sm:text-lg truncate">
                                {link.label}
                              </p>
                              <p className="text-gray-400 text-xs sm:text-sm">
                                {trustedLinks.length > 0 ? "Trusted • Fast Download" : "Available Server"}
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
                                  <span className="text-xs font-bold">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-white font-medium truncate">{link.label}</p>
                                  <p className="text-gray-400 text-xs">Alternative Server</p>
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center backdrop-blur-xl">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-300 mb-2">Processing Failed</h3>
              <p className="text-gray-400">{error}</p>
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
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
