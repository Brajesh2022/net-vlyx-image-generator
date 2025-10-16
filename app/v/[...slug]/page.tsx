"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { decodeMovieUrl, encodeVlyxDriveParams, replaceBrandingText } from "@/lib/utils"
import {
  Star,
  Download,
  Share,
  Eye,
  Film,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  X,
  PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"

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
      }[]
    }[]
  }[]
}

interface TMDbDetails {
  title: string
  poster: string | null
  backdrop: string | null
  overview: string
  release_date: string
  rating: string | null
  cast: Array<{
    name: string
    character: string
    profile_image: string | null
  }>
  images: string[]
  trailer: string | null
  trailerKey: string | null
  contentType: "movie" | "tv" | null
}

const VegaDebugPopup = dynamic(() => import("@/components/vega-debug-popup"), { ssr: false })

export default function VegaMoviePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  // Extract encoded slug from params
  const encodedSlug = Array.isArray(params?.slug) ? params.slug.join("/") : (params?.slug as string) || ""
  
  // Try to decode the URL first (new format)
  let slug = encodedSlug
  let srcHost = searchParams.get("src") || "https://vegamovise.biz"
  
  const decodedUrl = decodeMovieUrl(encodedSlug)
  if (decodedUrl) {
    // Successfully decoded - use decoded values
    slug = decodedUrl.slug
    srcHost = decodedUrl.sourceUrl
  } else if (searchParams.get("src")) {
    // Fallback to old format if src parameter exists
    slug = encodedSlug
    srcHost = searchParams.get("src") || "https://vegamovise.biz"
  }
  // If neither works, use defaults (already set above)
  
  const debugMode = searchParams.get("debug") === "1" // enable debug panel when ?debug=1

  // Build URL respecting .html endings (no trailing slash when .html)
  const vegaUrl = slug.endsWith(".html") ? `${srcHost}/${slug}` : `${srcHost}/${slug}/`

  const {
    data: movieDetails,
    isLoading,
    error,
  } = useQuery<MovieDetails>({
    queryKey: ["vega-movie", vegaUrl, debugMode], // include debug in cache key
    queryFn: async () => {
      const url = `/api/vega-movie?url=${encodeURIComponent(vegaUrl)}${debugMode ? "&debug=1" : ""}` // pass debug flag
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text().catch(() => "")
        console.log("Failed to fetch content")
        throw new Error("Failed to fetch movie details")
      }
      const json = await response.json()
      console.log("Successfully fetched content")
      return json
    },
    enabled: !!slug,
  })

  // Fetch enhanced details from TMDb if we have an IMDb link
  const { data: tmdbDetails, isLoading: tmdbLoading } = useQuery<TMDbDetails>({
    queryKey: ["tmdb-details", movieDetails?.imdbLink],
    queryFn: async () => {
      if (!movieDetails?.imdbLink) return null

      // Extract IMDb ID from link
      const imdbMatch = movieDetails.imdbLink.match(/tt\d+/)
      if (!imdbMatch) return null

      const imdbId = imdbMatch[0]
      const response = await fetch(`/api/tmdb-details?imdb_id=${imdbId}`)
      if (!response.ok) return null

      return await response.json()
    },
    enabled: !!movieDetails?.imdbLink,
  })

  const [selectedScreenshot, setSelectedScreenshot] = useState<number>(0)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState<string>("")
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedMode, setSelectedMode] = useState<"download" | "watch" | null>(null) // Download or Watch mode
  const [downloadType, setDownloadType] = useState<"episode" | "bulk" | null>(null) // Episode-wise or Bulk
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedDownload, setSelectedDownload] = useState<any>(null)
  const [showOtherOptions, setShowOtherOptions] = useState(false) // For showing non-N-Cloud options in modal
  const [showTmdbGallery, setShowTmdbGallery] = useState(false) // Track if TMDB gallery should be shown
  const [imageZoom, setImageZoom] = useState<number>(1) // Track image zoom level
  const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 }) // Track image position when zoomed

  // Touch handling for mobile swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const touchStartDistance = useRef<number>(0) // For pinch zoom
  const isPinching = useRef<boolean>(false)

  // Get Vegamovies collage image (the poster from Vegamovies which is a collage of all screenshots)
  const vegaCollageImage = movieDetails?.poster || null
  
  // Use TMDb poster if available, otherwise fall back to Vegamovies poster
  const displayPoster =
    tmdbDetails?.poster ||
    movieDetails?.poster ||
    "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=900"
  const displayBackdrop = tmdbDetails?.backdrop || displayPoster
  const displayOverview = tmdbDetails?.overview || movieDetails?.plot || ""
  
  // Determine which images to display
  const hasTmdbImages = tmdbDetails?.images && tmdbDetails.images.length > 0
  const hasVegaCollage = !!vegaCollageImage
  
  // TMDB gallery images (separate from Vega collage)
  const tmdbGalleryImages = hasTmdbImages ? tmdbDetails.images : []
  
  // Display images for the modal (all images including Vega collage)
  const displayImages = hasVegaCollage 
    ? (showTmdbGallery && hasTmdbImages ? [vegaCollageImage, ...tmdbDetails.images] : [vegaCollageImage])
    : (hasTmdbImages ? tmdbDetails.images : movieDetails?.screenshots || [])

  // Scroll to download section function
  const scrollToDownloadSection = () => {
    const downloadSection = document.getElementById("download-section")
    if (downloadSection) {
      downloadSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  // Handle quality selection with N-Cloud auto-selection logic
  const handleQualitySelect = (quality: string) => {
    setSelectedQuality(quality)
    setShowOtherOptions(false) // Reset other options toggle
    
    const { episodeDownloads, batchDownloads } = separateDownloads()
    let filteredDownloads = []

    // Filter based on mode and download type
    if (selectedMode === "watch") {
      // For watch mode, filter out bulk/zip downloads
      filteredDownloads = episodeDownloads.filter(
        (item) => item.download.quality === quality
      )
    } else if (selectedMode === "download") {
      if (downloadType === "bulk") {
        filteredDownloads = batchDownloads.filter(
          (item) => item.download.quality === quality
        )
      } else {
        filteredDownloads = episodeDownloads.filter(
          (item) => item.download.quality === quality
        )
      }
    }

    // Check for N-Cloud links
    const ncloudLinks = filteredDownloads.filter((item) => isNCloudLink(item.link.label))

    if (ncloudLinks.length === 1) {
      // Auto-select the single N-Cloud option and show confirmation
      setSelectedDownload(ncloudLinks[0])
      setShowConfirmModal(true)
    } else {
      // Show all options (either no N-Cloud or multiple N-Cloud options)
      setShowDownloadModal(true)
    }
  }

  // Zoom handlers
  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.5, 1))
  }

  const handleResetZoom = () => {
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }

  // Get distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }

  // Touch handlers for swipe navigation and pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      isPinching.current = true
      touchStartDistance.current = getTouchDistance(e.touches)
    } else if (e.touches.length === 1) {
      touchStartX.current = e.targetTouches[0].clientX
      isPinching.current = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching.current) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches)
      const zoomDelta = (currentDistance - touchStartDistance.current) / 100
      setImageZoom((prev) => Math.max(1, Math.min(3, prev + zoomDelta)))
      touchStartDistance.current = currentDistance
    } else if (e.touches.length === 1 && !isPinching.current) {
      touchEndX.current = e.targetTouches[0].clientX
    }
  }

  const handleTouchEnd = () => {
    if (isPinching.current) {
      isPinching.current = false
      return
    }

    if (!displayImages || displayImages.length === 0) return

    const swipeThreshold = 50
    const swipeDistance = touchStartX.current - touchEndX.current

    if (Math.abs(swipeDistance) > swipeThreshold && imageZoom === 1) {
      if (swipeDistance > 0) {
        // Swipe left - next image
        setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
        handleResetZoom()
      } else {
        // Swipe right - previous image
        setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
        handleResetZoom()
      }
    }
  }

  // Mouse wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  // Enhanced season extraction function
  const extractSeasonFromTitle = (title: string): string | null => {
    // Clean title for better matching
    const cleanTitle = title.toLowerCase()

    // Pattern 1: "Season 4", "Season-4", "Season_4"
    const seasonMatch1 = cleanTitle.match(/season[\s\-_]*(\d+)/i)
    if (seasonMatch1) {
      return seasonMatch1[1]
    }

    // Pattern 2: "S4", "S04", "S-4"
    const seasonMatch2 = cleanTitle.match(/\bs[-_]*(\d+)/i)
    if (seasonMatch2) {
      return seasonMatch2[1]
    }

    // Pattern 3: "(Season 4)", "(S4)"
    const seasonMatch3 = cleanTitle.match(/$$(?:season[\s\-_]*)?(\d+)$$/i)
    if (seasonMatch3) {
      return seasonMatch3[1]
    }

    // Pattern 4: "season-1 panchayat", "4th season"
    const seasonMatch4 = cleanTitle.match(/(?:season[\s\-_]*(\d+)|(\d+)(?:st|nd|rd|th)?\s*season)/i)
    if (seasonMatch4) {
      return seasonMatch4[1] || seasonMatch4[2]
    }

    return null
  }

  // Enhanced server name extraction function
  const extractServerName = (label: string): string => {
    const lowerLabel = label.toLowerCase()

    if (lowerLabel.includes("v-cloud")) return "v-cloud"
    if (lowerLabel.includes("vcloud")) return "v-cloud"
    if (lowerLabel.includes("gdtot")) return "g-drive"
    if (lowerLabel.includes("g-drive")) return "g-drive"
    if (lowerLabel.includes("gdrive")) return "g-drive"
    if (lowerLabel.includes("filepress")) return "filepress"
    if (lowerLabel.includes("dropgalaxy")) return "dropgalaxy"
    if (lowerLabel.includes("mega")) return "mega"
    if (lowerLabel.includes("mediafire")) return "mediafire"

    return ""
  }

  // Function to check if a link is N-Cloud (formerly v-cloud)
  const isNCloudLink = (label: string): boolean => {
    const lowerLabel = label.toLowerCase()
    return lowerLabel.includes("v-cloud") || lowerLabel.includes("vcloud") || lowerLabel.includes("n-cloud") || lowerLabel.includes("ncloud")
  }
  
  // Clean server/link names with branding replacement
  const cleanServerName = (name: string): string => {
    return replaceBrandingText(name)
  }

  // Function to sort downloads with v-cloud priority
  const sortDownloadsWithNCloudPriority = (downloads: any[]): any[] => {
    return downloads.sort((a, b) => {
      const aIsNCloud = isNCloudLink(a.link.label)
      const bIsNCloud = isNCloudLink(b.link.label)

      if (aIsNCloud && !bIsNCloud) return -1
      if (!aIsNCloud && bIsNCloud) return 1
      return 0
    })
  }

  // Enhanced Vlyx-Drive URL generation function with encoding
  const generateVlyxDriveUrl = (url: string, label: string, sectionSeason?: string | null): string => {
    // Check if it's ANY nextdrive URL (broader pattern to catch all nextdrive domains)
    const isNextDrive = /nex?drive/i.test(url)
    
    if (isNextDrive) {
      const tmdbType = tmdbDetails?.contentType === "tv" ? "tv" : "movie"
      const tmdbIdWithType = `${tmdbType}${movieDetails?.imdbLink?.match(/tt(\d+)/)?.[1] || ""}`
      const serverName = extractServerName(label)
      let seasonNumber = sectionSeason
      if (!seasonNumber) {
        seasonNumber = extractSeasonFromTitle(movieDetails?.title || "")
      }
      
      // Use encoding for security
      const encodedKey = encodeVlyxDriveParams({
        link: url,
        tmdbid: tmdbIdWithType,
        ...(seasonNumber && { season: seasonNumber }),
        ...(serverName && { server: serverName })
      })
      
      return `/vlyxdrive?key=${encodedKey}`
    }
    
    // For non-nextdrive links, return original URL
    return url
  }

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showScreenshotModal || !displayImages || displayImages.length === 0) return

      if (e.key === "ArrowLeft") {
        setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
        handleResetZoom()
      } else if (e.key === "ArrowRight") {
        setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
        handleResetZoom()
      } else if (e.key === "Escape") {
        setShowScreenshotModal(false)
        handleResetZoom()
      } else if (e.key === "+") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      } else if (e.key === "0") {
        handleResetZoom()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showScreenshotModal, displayImages])

  // Get unique qualities from download sections
  const getAvailableQualities = () => {
    if (!movieDetails?.downloadSections) return []

    const qualities = new Set<string>()
    movieDetails.downloadSections.forEach((section) => {
      section.downloads.forEach((download) => {
        if (download.quality) {
          qualities.add(download.quality)
        }
      })
    })

    return Array.from(qualities).sort((a, b) => {
      const qualityOrder = ["480p", "720p", "1080p", "2160p", "4K"]
      return qualityOrder.indexOf(a) - qualityOrder.indexOf(b)
    })
  }

  // Get size for quality
  const getSizeForQuality = (quality: string): string => {
    if (!movieDetails?.downloadSections) return "Unknown"

    for (const section of movieDetails.downloadSections) {
      for (const download of section.downloads) {
        if (download.quality === quality && download.size) {
          return download.size
        }
      }
    }

    // Fallback sizes
    switch (quality) {
      case "2160p":
      case "4K":
        return "8–12GB"
      case "1080p":
        return "2–4GB"
      case "720p":
        return "1–2GB"
      case "480p":
        return "500–800MB"
      default:
        return "Unknown"
    }
  }

  const isValidDownloadLink = (url?: string | null) => {
    if (!url) return false
    const trimmed = url.trim()
    if (!trimmed || trimmed === "#" || /^javascript:/i.test(trimmed)) return false
    // allow http(s) and our internal nextdrive route and raw nexdrive hosts
    if (/^https?:\/\//i.test(trimmed)) return true
    if (/^\/nextdrive\/\?/.test(trimmed)) return true
    if (/nexdrive\.(?:pro|biz|ink)\//i.test(trimmed)) return true
    return false
  }

  const separateDownloads = () => {
    if (!movieDetails?.downloadSections) return { episodeDownloads: [], batchDownloads: [] }

    const episodeDownloads: any[] = []
    const batchDownloads: any[] = []

    movieDetails.downloadSections.forEach((section) => {
      section.downloads.forEach((download) => {
        download.links.forEach((link) => {
          if (!isValidDownloadLink(link?.url)) return

          const linkText = (link.label || "").toLowerCase()
          const sectionTitle = (section.title || "").toLowerCase()

          if (
            linkText.includes("batch") ||
            linkText.includes("zip") ||
            linkText.includes("complete") ||
            linkText.includes("season") ||
            sectionTitle.includes("batch") ||
            sectionTitle.includes("zip") ||
            sectionTitle.includes("complete")
          ) {
            batchDownloads.push({
              section: section.title,
              download,
              link,
              season: section.season || link.season,
            })
          } else {
            episodeDownloads.push({
              section: section.title,
              download,
              link,
              season: section.season || link.season,
            })
          }
        })
      })
    })

    return { episodeDownloads, batchDownloads }
  }

  if (isLoading) {
    return <MovieDetailSkeleton />
  }

  if (error || !movieDetails) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Film className="h-24 w-24 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-gray-400 mb-6">
            The movie you're looking for doesn't exist or failed to load from VegaMovies.
          </p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Enhanced Movie Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background with better gradient overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-sm"
            style={{
              backgroundImage: `url('${displayBackdrop}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        </div>

        {/* Navigation */}
        <div className="relative z-10 pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/">
              <Button
                variant="outline"
                className="mb-8 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50 transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Content - Improved Layout */}
        <div className="relative z-10 flex items-center min-h-[85vh] pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Content - Takes more space on large screens */}
              <div className="lg:col-span-7 xl:col-span-8 animate-slide-up">
                {/* Rating and Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  {(movieDetails.imdbRating || tmdbDetails?.rating) && (
                    <div className="flex items-center gap-2 bg-yellow-600/20 backdrop-blur-sm rounded-full px-4 py-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-yellow-500 font-bold text-lg">
                        {tmdbDetails?.rating || movieDetails.imdbRating}
                      </span>
                      <span className="text-gray-300 text-sm">IMDb</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-gray-300">
                    <span>
                      {movieDetails.movieInfo.releasedYear || tmdbDetails?.release_date?.split("-")[0] || "2024"}
                    </span>
                    {movieDetails.movieInfo.language && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span>{movieDetails.movieInfo.language}</span>
                      </>
                    )}
                    {movieDetails.movieInfo.quality && (
                      <>
                        <span className="text-gray-500 hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{movieDetails.movieInfo.quality}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                  {movieDetails.title}
                </h1>

                {/* Description */}
                {displayOverview && (
                  <p className="text-xl text-gray-200 mb-8 max-w-3xl leading-relaxed">{displayOverview}</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 md:gap-4 mb-6 md:mb-8">
                  <Button
                    className="px-5 py-2.5 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full text-white font-semibold text-sm md:text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    onClick={scrollToDownloadSection}
                  >
                    <Download className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="px-5 py-2.5 md:px-8 md:py-4 bg-green-600/20 backdrop-blur-sm rounded-full text-white font-semibold text-sm md:text-lg hover:bg-green-600/30 transition-all duration-300 border-green-600/50"
                    onClick={scrollToDownloadSection}
                  >
                    <Eye className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                    Watch
                  </Button>
                  {movieDetails.imdbLink && (
                    <Button
                      variant="outline"
                      className="px-5 py-2.5 md:px-8 md:py-4 bg-white/10 backdrop-blur-sm rounded-full text-white font-semibold text-sm md:text-lg hover:bg-white/20 transition-all duration-300 border-white/30"
                      onClick={() => window.open(movieDetails.imdbLink, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                      IMDb
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="px-4 py-2.5 md:px-6 md:py-4 bg-white/5 backdrop-blur-sm rounded-full text-white hover:bg-white/15 transition-all duration-300"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </div>

                {/* Movie Stats - Hidden on mobile to save space */}
                <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-md">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{movieDetails.movieInfo.episode || "1"}</div>
                    <div className="text-sm text-gray-400">{movieDetails.movieInfo.episode ? "Episodes" : "Movie"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{movieDetails.movieInfo.quality || "HD"}</div>
                    <div className="text-sm text-gray-400">Quality</div>
                  </div>
                  <div className="text-center hidden lg:block">
                    <div className="text-2xl font-bold text-white">{tmdbDetails?.cast?.length || "N/A"}</div>
                    <div className="text-sm text-gray-400">Cast</div>
                  </div>
                </div>
              </div>

              {/* Movie Poster - Better responsive design */}
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end animate-slide-up">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src={displayPoster || "/placeholder.svg"}
                    alt={movieDetails.title}
                    className="relative w-64 sm:w-72 lg:w-80 h-auto rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Section - Show if we have trailer */}
      {tmdbDetails?.trailerKey && (
        <section className="py-20 bg-gradient-to-b from-black to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Official Trailer</h2>
              <p className="text-gray-400 text-lg">Watch the official trailer</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900">
                <iframe
                  src={`https://www.youtube.com/embed/${tmdbDetails.trailerKey}`}
                  title="Movie Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Images Gallery Section */}
      {displayImages && displayImages.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Gallery</h2>
              <p className="text-gray-400 text-lg">
                {hasVegaCollage 
                  ? "Screenshot collage and high quality images from the movie"
                  : "High quality images and scenes from the movie"}
              </p>
            </div>

            {/* Show Vegamovies collage as single full-width/full-height image when available */}
            {hasVegaCollage && (
              <div className="mb-8">
                <div 
                  className="relative w-full overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-[1.01] shadow-2xl group"
                  onClick={() => {
                    setSelectedScreenshot(0)
                    setShowScreenshotModal(true)
                  }}
                >
                  <img
                    src={vegaCollageImage || "/placeholder.svg"}
                    alt="Movie Screenshot Collage"
                    className="w-full h-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = displayPoster
                    }}
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* View icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>

                {/* View More Images Button - Only show if TMDB has images and not yet shown */}
                {hasTmdbImages && !showTmdbGallery && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={() => setShowTmdbGallery(true)}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border border-blue-500 hover:border-purple-400 rounded-full font-semibold transition-all duration-300 hover:scale-105"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      View More Images
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TMDB Image Grid - Show when button is clicked or when no Vega collage */}
            {(showTmdbGallery || !hasVegaCollage) && tmdbGalleryImages.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {tmdbGalleryImages.map((image, index) => (
                    <div
                      key={index}
                      className="group relative aspect-video overflow-hidden rounded-lg sm:rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10"
                      onClick={() => {
                        setSelectedScreenshot(hasVegaCollage ? index + 1 : index)
                        setShowScreenshotModal(true)
                      }}
                    >
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Movie Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = displayPoster
                        }}
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Play/View Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>

                      {/* Image Number */}
                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-white text-xs font-medium">{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View All Button */}
                <div className="text-center">
                  <Button
                    onClick={() => {
                      setSelectedScreenshot(hasVegaCollage ? 1 : 0)
                      setShowScreenshotModal(true)
                    }}
                    className="px-6 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border border-blue-500 hover:border-purple-400 rounded-full font-semibold transition-all duration-300 hover:scale-105 text-sm sm:text-base"
                  >
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    View All Images
                  </Button>
                </div>
              </>
            )}

            {/* Fallback: Show screenshots if no Vega collage and no TMDB images */}
            {!hasVegaCollage && !hasTmdbImages && movieDetails?.screenshots && movieDetails.screenshots.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {movieDetails.screenshots.map((image, index) => (
                    <div
                      key={index}
                      className="group relative aspect-video overflow-hidden rounded-lg sm:rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10"
                      onClick={() => {
                        setSelectedScreenshot(index)
                        setShowScreenshotModal(true)
                      }}
                    >
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Movie Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = displayPoster
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>

                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-white text-xs font-medium">{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => {
                      setSelectedScreenshot(0)
                      setShowScreenshotModal(true)
                    }}
                    className="px-6 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border border-blue-500 hover:border-purple-400 rounded-full font-semibold transition-all duration-300 hover:scale-105 text-sm sm:text-base"
                  >
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    View All Images
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Download & Watch Section */}
      <section id="download-section" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Download & Watch Options</h2>
            <p className="text-gray-400 text-sm md:text-lg">Choose how you want to enjoy this content</p>
          </div>

          {/* Step 1: Mode Selection (Download or Watch) */}
          {!selectedMode && (
            <div className="mb-12 md:mb-16 animate-fade-in">
              <h3 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">What would you like to do?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
                <button
                  onClick={() => setSelectedMode("download")}
                  className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/30 hover:border-blue-400 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                >
                  <Download className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  <h4 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Download</h4>
                  <p className="text-sm md:text-base text-gray-400">Save to your device</p>
                </button>
                <button
                  onClick={() => setSelectedMode("watch")}
                  className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-600/20 to-teal-600/20 border-2 border-green-500/30 hover:border-green-400 hover:from-green-600/30 hover:to-teal-600/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                >
                  <Eye className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-green-400 group-hover:text-green-300 transition-colors" />
                  <h4 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Watch Online</h4>
                  <p className="text-sm md:text-base text-gray-400">Stream instantly</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Download Type Selection (if bulk downloads available) */}
          {selectedMode === "download" && !downloadType && (() => {
            const { episodeDownloads, batchDownloads } = separateDownloads()
            const hasBulkOptions = batchDownloads.length > 0
            
            if (!hasBulkOptions) {
              // Auto-select episode-wise if no bulk downloads
              setTimeout(() => setDownloadType("episode"), 0)
              return null
            }

            return (
              <div className="mb-12 md:mb-16 animate-fade-in">
                <button
                  onClick={() => {
                    setSelectedMode(null)
                    setDownloadType(null)
                  }}
                  className="mb-6 md:mb-8 text-sm md:text-base text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to mode selection
                </button>
                <h3 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Choose Download Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
                  <button
                    onClick={() => setDownloadType("episode")}
                    className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-600/20 to-teal-600/20 border-2 border-green-500/30 hover:border-green-400 hover:from-green-600/30 hover:to-teal-600/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  >
                    <PlayCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-green-400 group-hover:text-green-300 transition-colors" />
                    <h4 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Episode-wise</h4>
                    <p className="text-sm md:text-base text-gray-400">Download individual episodes</p>
                  </button>
                  <button
                    onClick={() => setDownloadType("bulk")}
                    className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500/30 hover:border-purple-400 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  >
                    <Download className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <h4 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Bulk Download</h4>
                    <p className="text-sm md:text-base text-gray-400">Download complete package</p>
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Step 3: Quality Selection */}
          {((selectedMode === "watch") || (selectedMode === "download" && downloadType)) && (() => {
            const availableQualities = getAvailableQualities()

            return availableQualities.length > 0 ? (
              <div className="mb-12 md:mb-16 animate-fade-in">
                <button
                  onClick={() => {
                    setDownloadType(null)
                    if (selectedMode === "watch") setSelectedMode(null)
                  }}
                  className="mb-6 md:mb-8 text-sm md:text-base text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <h3 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8 text-center">Select Quality</h3>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                  {availableQualities.map((quality, index) => (
                    <Button
                      key={index}
                      onClick={() => handleQualitySelect(quality)}
                      className="px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-2 border-blue-500 hover:border-purple-400 hover:scale-105 hover:shadow-xl"
                    >
                      {selectedMode === "download" ? (
                        <Download className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                      ) : (
                        <Eye className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                      )}
                      {quality}
                      <span className="ml-2 md:ml-3 text-xs md:text-sm opacity-80 bg-black/30 px-2 py-1 rounded-full">
                        {getSizeForQuality(quality)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
                  <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold text-gray-300 mb-2">No Options Available</h3>
                  <p className="text-sm md:text-base text-gray-400">
                    Links are not currently available for this content. Please check back later.
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Cast Section - Only show if we have TMDb cast data */}
      {tmdbDetails?.cast && tmdbDetails.cast.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-black to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Cast & Crew</h2>
              <p className="text-gray-400 text-lg">Meet the talented people behind this production</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {tmdbDetails.cast.slice(0, 10).map((actor, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-4">
                    <img
                      src={
                        actor.profile_image ||
                        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg"
                      }
                      alt={actor.name}
                      className="w-full aspect-[3/4] object-cover rounded-xl mx-auto transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">{actor.name}</h4>
                  <p className="text-gray-400 text-xs">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Image Modal */}
      {showScreenshotModal && displayImages && displayImages.length > 0 && (
        <Dialog open={showScreenshotModal} onOpenChange={(open) => {
          setShowScreenshotModal(open)
          if (!open) handleResetZoom()
        }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] bg-black/95 border-gray-700 p-2">
            <div className="relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                onClick={() => {
                  setShowScreenshotModal(false)
                  handleResetZoom()
                }}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Zoom Controls */}
              <div className="absolute top-2 left-2 z-20 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 1}
                >
                  <span className="text-lg font-bold">−</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full px-3 py-2"
                  onClick={handleResetZoom}
                >
                  <span className="text-xs font-medium">{Math.round(imageZoom * 100)}%</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 3}
                >
                  <span className="text-lg font-bold">+</span>
                </Button>
              </div>

              {/* Image Display */}
              <div
                className="relative aspect-video w-full max-h-[80vh] overflow-auto rounded-lg"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                <img
                  src={displayImages[selectedScreenshot] || "/placeholder.svg"}
                  alt={`Movie Image ${selectedScreenshot + 1}`}
                  className="w-full h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    cursor: imageZoom > 1 ? 'move' : 'default'
                  }}
                />

                {/* Navigation Arrows - Only show when not zoomed */}
                {imageZoom === 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3"
                      onClick={() => {
                        setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
                        handleResetZoom()
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3"
                      onClick={() => {
                        setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
                        handleResetZoom()
                      }}
                    >
                      <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Image Counter */}
              <div className="text-center mt-4">
                <span className="text-gray-400 text-sm sm:text-base">
                  {selectedScreenshot + 1} of {displayImages.length}
                </span>
              </div>

              {/* Thumbnail Navigation */}
              <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedScreenshot(index)
                      handleResetZoom()
                    }}
                    className={`flex-shrink-0 w-12 h-9 sm:w-16 sm:h-12 rounded overflow-hidden border-2 transition-all ${
                      index === selectedScreenshot ? "border-blue-500" : "border-transparent hover:border-gray-500"
                    }`}
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Zoom Help Text */}
              <div className="text-center mt-2">
                <p className="text-xs text-gray-500">
                  <span className="hidden sm:inline">Use mouse wheel or </span>+/- to zoom • Pinch on mobile
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={(open) => {
        setShowDownloadModal(open)
        if (!open) setShowOtherOptions(false) // Reset when modal closes
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                {selectedMode === "watch" ? (
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0 mt-1" />
                ) : (
                  <Download className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0 mt-1" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="break-words">
                    {selectedMode === "watch" ? "Watch" : "Download"} <span className="text-blue-400">{selectedQuality}</span>
                  </div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">{movieDetails.title}</div>
                  <Badge className="mt-2 bg-blue-600 text-white text-xs">
                    {selectedMode === "watch" ? "Stream Online" : downloadType === "bulk" ? "Bulk Download" : "High Quality"}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {(() => {
                const { episodeDownloads, batchDownloads } = separateDownloads()
                
                // Filter based on mode and download type
                let qualityEpisodeDownloads = []
                let qualityBatchDownloads = []

                if (selectedMode === "watch") {
                  // For watch mode, only show episode downloads (filter out bulk/zip)
                  qualityEpisodeDownloads = episodeDownloads.filter(
                    (item) => item.download.quality === selectedQuality
                  )
                } else if (selectedMode === "download") {
                  if (downloadType === "bulk") {
                    // Show only bulk downloads
                    qualityBatchDownloads = batchDownloads.filter(
                      (item) => item.download.quality === selectedQuality
                    )
                  } else {
                    // Show only episode downloads
                    qualityEpisodeDownloads = episodeDownloads.filter(
                      (item) => item.download.quality === selectedQuality
                    )
                  }
                } else {
                  // Fallback to showing all (for backward compatibility)
                  qualityEpisodeDownloads = episodeDownloads.filter(
                    (item) => item.download.quality === selectedQuality
                  )
                  qualityBatchDownloads = batchDownloads.filter(
                    (item) => item.download.quality === selectedQuality
                  )
                }

                // Smart N-Cloud filtering logic
                // Separate N-Cloud and non-N-Cloud links
                const ncloudEpisodeDownloads = qualityEpisodeDownloads.filter((item) => isNCloudLink(item.link.label))
                const otherEpisodeDownloads = qualityEpisodeDownloads.filter((item) => !isNCloudLink(item.link.label))
                
                const ncloudBatchDownloads = qualityBatchDownloads.filter((item) => isNCloudLink(item.link.label))
                const otherBatchDownloads = qualityBatchDownloads.filter((item) => !isNCloudLink(item.link.label))

                // Determine what to show
                const hasNCloudOptions = ncloudEpisodeDownloads.length > 0 || ncloudBatchDownloads.length > 0
                const hasOtherOptions = otherEpisodeDownloads.length > 0 || otherBatchDownloads.length > 0
                const hasMixedOptions = hasNCloudOptions && hasOtherOptions

                // Determine what to display
                // For mixed options: always show N-Cloud first, then other options if toggled
                let displayNCloudEpisodeDownloads = []
                let displayOtherEpisodeDownloads = []
                let displayNCloudBatchDownloads = []
                let displayOtherBatchDownloads = []

                if (hasMixedOptions) {
                  // Always show N-Cloud
                  displayNCloudEpisodeDownloads = ncloudEpisodeDownloads
                  displayNCloudBatchDownloads = ncloudBatchDownloads
                  // Show other options only if toggled
                  if (showOtherOptions) {
                    displayOtherEpisodeDownloads = otherEpisodeDownloads
                    displayOtherBatchDownloads = otherBatchDownloads
                  }
                } else {
                  // Not mixed, show everything as before
                  displayNCloudEpisodeDownloads = qualityEpisodeDownloads
                  displayNCloudBatchDownloads = qualityBatchDownloads
                }

                return (
                  <>
                    {/* N-Cloud Episode-wise Downloads */}
                    {displayNCloudEpisodeDownloads.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-green-400 mb-4 text-center flex items-center justify-center gap-2">
                          <PlayCircle className="h-5 w-5" />
                          {tmdbDetails?.contentType === "movie" ? "Download Movie" : "Episode-wise Downloads"}
                        </h4>
                        <div className="space-y-3">
                          {displayNCloudEpisodeDownloads.map((item, index) => (
                            <div
                              key={index}
                              className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                      {cleanServerName(item.link.label)}
                                    </h4>
                                    <p className="text-sm sm:text-base text-gray-400 break-words">
                                      {item.download.quality} • {item.download.size} •{" "}
                                      {tmdbDetails?.contentType === "movie" ? "Movie Download" : "Episode Download"}
                                      {item.season && (
                                        <span className="text-blue-400 ml-2">• Season {item.season}</span>
                                      )}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge className="bg-green-600 text-white text-xs">
                                        {tmdbDetails?.contentType === "movie" ? "Movie File" : "Individual Episode"}
                                      </Badge>
                                      {item.season && (
                                        <Badge className="bg-blue-600 text-white text-xs">Season {item.season}</Badge>
                                      )}
                                      {isNCloudLink(item.link.label) && (
                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold shadow-lg">
                                          ⚡ Preferred
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base ${
                                    isNCloudLink(item.link.label)
                                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 border-2 border-yellow-400"
                                      : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                                  }`}
                                  onClick={() => {
                                    // Use enhanced nextdrive URL generation
                                    const nextdriveUrl = generateVlyxDriveUrl(
                                      item.link.url,
                                      item.link.label,
                                      item.season,
                                    )
                                    window.open(nextdriveUrl, "_blank")
                                  }}
                                  disabled={!item.link.url || item.link.url === "#"}
                                >
                                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  {isNCloudLink(item.link.label) && <span className="mr-1">⚡</span>}
                                  {selectedMode === "watch" 
                                    ? (tmdbDetails?.contentType === "movie" ? "Watch Movie" : "Watch Episode")
                                    : (tmdbDetails?.contentType === "movie" ? "Download Movie" : "Download Episode")
                                  }
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* N-Cloud Batch/Complete Downloads */}
                    {displayNCloudBatchDownloads.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-purple-400 mb-4 text-center flex items-center justify-center gap-2">
                          <Download className="h-5 w-5" />
                          Batch/Complete Downloads
                        </h4>
                        <div className="space-y-3">
                          {displayNCloudBatchDownloads.map((item, index) => (
                            <div
                              key={index}
                              className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                      {cleanServerName(item.link.label)}
                                    </h4>
                                    <p className="text-sm sm:text-base text-gray-400 break-words">
                                      {item.download.quality} • {item.download.size} • Complete Package
                                      {item.season && (
                                        <span className="text-blue-400 ml-2">• Season {item.season}</span>
                                      )}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge className="bg-purple-600 text-white text-xs">Bulk Download</Badge>
                                      {item.season && (
                                        <Badge className="bg-blue-600 text-white text-xs">Season {item.season}</Badge>
                                      )}
                                      {isNCloudLink(item.link.label) && (
                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold shadow-lg">
                                          ⚡ Preferred
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base ${
                                    isNCloudLink(item.link.label)
                                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 border-2 border-yellow-400"
                                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                  }`}
                                  onClick={() => {
                                    // Use enhanced nextdrive URL generation
                                    const nextdriveUrl = generateVlyxDriveUrl(
                                      item.link.url,
                                      item.link.label,
                                      item.season,
                                    )
                                    window.open(nextdriveUrl, "_blank")
                                  }}
                                  disabled={!item.link.url || item.link.url === "#"}
                                >
                                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  {isNCloudLink(item.link.label) && <span className="mr-1">⚡</span>}
                                  Download Complete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other (non-N-Cloud) Episode-wise Downloads */}
                    {displayOtherEpisodeDownloads.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <h4 className="text-xl font-semibold text-blue-400 mb-4 text-center flex items-center justify-center gap-2">
                          <PlayCircle className="h-5 w-5" />
                          Other Options
                        </h4>
                        <div className="space-y-3">
                          {displayOtherEpisodeDownloads.map((item, index) => (
                            <div
                              key={index}
                              className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                      {cleanServerName(item.link.label)}
                                    </h4>
                                    <p className="text-sm sm:text-base text-gray-400 break-words">
                                      {item.download.quality} • {item.download.size} •{" "}
                                      {tmdbDetails?.contentType === "movie" ? "Movie Download" : "Episode Download"}
                                      {item.season && (
                                        <span className="text-blue-400 ml-2">• Season {item.season}</span>
                                      )}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge className="bg-blue-600 text-white text-xs">
                                        {tmdbDetails?.contentType === "movie" ? "Movie File" : "Individual Episode"}
                                      </Badge>
                                      {item.season && (
                                        <Badge className="bg-blue-600 text-white text-xs">Season {item.season}</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                                  onClick={() => {
                                    const nextdriveUrl = generateVlyxDriveUrl(
                                      item.link.url,
                                      item.link.label,
                                      item.season,
                                    )
                                    window.open(nextdriveUrl, "_blank")
                                  }}
                                  disabled={!item.link.url || item.link.url === "#"}
                                >
                                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  {selectedMode === "watch" 
                                    ? (tmdbDetails?.contentType === "movie" ? "Watch Movie" : "Watch Episode")
                                    : (tmdbDetails?.contentType === "movie" ? "Download Movie" : "Download Episode")
                                  }
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other (non-N-Cloud) Batch Downloads */}
                    {displayOtherBatchDownloads.length > 0 && (
                      <div className={displayOtherEpisodeDownloads.length > 0 ? "mt-6" : "mt-6 pt-6 border-t border-gray-700"}>
                        <h4 className="text-xl font-semibold text-blue-400 mb-4 text-center flex items-center justify-center gap-2">
                          <Download className="h-5 w-5" />
                          {displayOtherEpisodeDownloads.length > 0 ? "Other Bulk Downloads" : "Other Options - Bulk"}
                        </h4>
                        <div className="space-y-3">
                          {displayOtherBatchDownloads.map((item, index) => (
                            <div
                              key={index}
                              className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                      {cleanServerName(item.link.label)}
                                    </h4>
                                    <p className="text-sm sm:text-base text-gray-400 break-words">
                                      {item.download.quality} • {item.download.size} • Complete Package
                                      {item.season && (
                                        <span className="text-blue-400 ml-2">• Season {item.season}</span>
                                      )}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge className="bg-blue-600 text-white text-xs">Bulk Download</Badge>
                                      {item.season && (
                                        <Badge className="bg-blue-600 text-white text-xs">Season {item.season}</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                                  onClick={() => {
                                    const nextdriveUrl = generateVlyxDriveUrl(
                                      item.link.url,
                                      item.link.label,
                                      item.season,
                                    )
                                    window.open(nextdriveUrl, "_blank")
                                  }}
                                  disabled={!item.link.url || item.link.url === "#"}
                                >
                                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  Download Complete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show other options button when N-Cloud and other options are mixed */}
                    {hasMixedOptions && !showOtherOptions && (otherEpisodeDownloads.length + otherBatchDownloads.length > 0) && (
                      <div className="text-center pt-4 md:pt-6">
                        <button
                          onClick={() => setShowOtherOptions(true)}
                          className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors py-2 px-3 md:px-4 rounded-lg hover:bg-gray-800"
                        >
                          See other options ({otherEpisodeDownloads.length + otherBatchDownloads.length} more)
                        </button>
                      </div>
                    )}

                    {/* If no downloads found, show all downloads */}
                    {displayNCloudEpisodeDownloads.length === 0 && displayNCloudBatchDownloads.length === 0 && displayOtherEpisodeDownloads.length === 0 && displayOtherBatchDownloads.length === 0 && (
                      <div>
                        {movieDetails.downloadSections
                          .filter((section) =>
                            section.downloads.some((download) => download.quality === selectedQuality),
                          )
                          .map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              <h4 className="text-lg font-semibold text-blue-400 mb-3 text-center">{section.title}</h4>
                              {section.downloads
                                .filter((download) => download.quality === selectedQuality)
                                .map((download, downloadIndex) => {
                                  const validLinks = download.links.filter((l) => isValidDownloadLink(l?.url))
                                  if (validLinks.length === 0) return null
                                  return (
                                    <div key={downloadIndex} className="space-y-3">
                                      {validLinks.map((link, linkIndex) => (
                                        <div
                                          key={linkIndex}
                                          className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                                  {link.label}
                                                </h4>
                                                <p className="text-sm sm:text-base text-gray-400 break-words">
                                                  {download.quality} • {download.size} • High Quality
                                                </p>
                                                <Badge className="mt-2 bg-blue-600 text-white text-xs">
                                                  Ready to Download
                                                </Badge>
                                              </div>
                                            </div>
                                            <Button
                                              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                                              onClick={() => {
                                                const nextdriveUrl = generateVlyxDriveUrl(
                                                  link.url,
                                                  link.label,
                                                  link.season,
                                                )
                                                window.open(nextdriveUrl, "_blank")
                                              }}
                                              disabled={!isValidDownloadLink(link?.url)}
                                            >
                                              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                              Download Now
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })}
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* N-Cloud Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700 p-4 md:p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 md:mb-4 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Download className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-white mb-2">
                Ready to {selectedMode === "watch" ? "Watch" : "Download"}!
              </DialogTitle>
            </DialogHeader>
            
            {selectedDownload && (
              <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 text-left">
                <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs md:text-sm">Server:</span>
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                      ⚡ N-Cloud (Preferred)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs md:text-sm">Quality:</span>
                    <span className="text-white text-sm md:text-base font-semibold">{selectedDownload.download.quality}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs md:text-sm">Size:</span>
                    <span className="text-white text-sm md:text-base">{selectedDownload.download.size}</span>
                  </div>
                  {selectedDownload.season && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs md:text-sm">Season:</span>
                      <span className="text-white text-sm md:text-base">{selectedDownload.season}</span>
                    </div>
                  )}
                  {downloadType === "bulk" && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs md:text-sm">Type:</span>
                      <Badge className="bg-purple-600 text-white text-xs">Bulk Download</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 md:mt-6 space-y-2 md:space-y-3">
              <Button
                onClick={() => {
                  if (selectedDownload) {
                    const nextdriveUrl = generateVlyxDriveUrl(
                      selectedDownload.link.url,
                      selectedDownload.link.label,
                      selectedDownload.season
                    )
                    window.open(nextdriveUrl, "_blank")
                    setShowConfirmModal(false)
                    // Reset state
                    setSelectedMode(null)
                    setDownloadType(null)
                    setSelectedQuality("")
                  }
                }}
                className="w-full px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm md:text-base font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <ExternalLink className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Continue
              </Button>
              
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setShowDownloadModal(true)
                }}
                className="w-full text-xs md:text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                Show more options
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {debugMode && (
        <div className="my-6 rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-sm text-gray-300">
          <h3 className="mb-2 text-lg font-semibold text-gray-100">Vega Debug</h3>
          <div className="grid gap-2">
            <div>
              <span className="text-gray-400">Requested URL:</span> <code className="break-all">{vegaUrl}</code>
            </div>
            {error && (
              <div className="text-red-400">
                <strong>Error:</strong> {(error as any)?.message || "Unknown error"}
              </div>
            )}
            {!error && movieDetails && (
              <>
                <div>
                  <span className="text-gray-400">Parsed Sections:</span>{" "}
                  {(movieDetails as any)?.downloadSections?.length ?? 0}
                </div>
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  <div>
                    <span className="text-gray-400">Selector counts:</span>
                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-2">
                      {JSON.stringify((movieDetails as any)?.debug?.selectorCounts || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-gray-400">Sample links:</span>
                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-2">
                      {JSON.stringify((movieDetails as any)?.debug?.sampleLinks || [], null, 2)}
                    </pre>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-200">HTML preview</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-xs">
                    {(movieDetails as any)?.debug?.htmlPreview || "(no preview)"}
                  </pre>
                </details>
                <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                  <div>
                    <span className="text-gray-400">Requested:</span> {(movieDetails as any)?.debug?.requestedUrl}
                  </div>
                  <div>
                    <span className="text-gray-400">Final URL:</span>{" "}
                    {(movieDetails as any)?.debug?.finalUrl || "(n/a)"}
                  </div>
                  <div>
                    <span className="text-gray-400">HTML length:</span> {(movieDetails as any)?.debug?.htmlLength ?? 0}
                  </div>
                  <div>
                    <span className="text-gray-400">Notes:</span> {(movieDetails as any)?.debug?.note || ""}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* render the debug popup at the end of the page so it floats over content
      // Use defaultOpen when ?debug=1 and pass the debug object returned by the API. */}
      {(() => {
        try {
          const anyDetails = movieDetails as any
          const debugObj = anyDetails?.debug || null
          return <VegaDebugPopup defaultOpen={debugMode} debug={debugObj} />
        } catch (e) {
          console.log("Debug popup render error:", (e as any)?.message || e)
          return null
        }
      })()}
    </div>
  )
}

// Loading skeleton component
function MovieDetailSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gray-900" />
        <div className="relative z-10 flex items-center min-h-[85vh] pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 xl:col-span-8">
                <Skeleton className="h-8 w-48 mb-6 bg-gray-800" />
                <Skeleton className="h-16 w-full max-w-2xl mb-6 bg-gray-800" />
                <Skeleton className="h-24 w-full max-w-3xl mb-8 bg-gray-800" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-32 bg-gray-800" />
                  <Skeleton className="h-12 w-32 bg-gray-800" />
                </div>
              </div>
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end">
                <Skeleton className="w-64 h-96 bg-gray-800 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Inline styles for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
