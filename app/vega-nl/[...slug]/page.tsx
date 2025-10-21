"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
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

export default function LuxMoviePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const srcHost = searchParams.get("src") || "https://www.vegamovies-nl.autos/"
  const slug = Array.isArray(params?.slug) ? params.slug.join("/") : (params?.slug as string) || ""

  const luxUrl = slug.endsWith(".html") ? `${srcHost}/${slug}` : `${srcHost}/${slug}/`

  const [selectedScreenshot, setSelectedScreenshot] = useState<number>(0)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState<string>("")
  const [showShareModal, setShowShareModal] = useState(false)

  // Touch handling for mobile swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  const {
    data: movieDetails,
    isLoading,
    error,
  } = useQuery<MovieDetails>({
    queryKey: ["lux-movie", luxUrl],
    queryFn: async () => {
      const response = await fetch(`/api/lux-movie?url=${encodeURIComponent(luxUrl)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch movie details")
      }
      return await response.json()
    },
    enabled: !!luxUrl,
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

  // Use TMDb poster if available, otherwise fall back to scraped poster
  const displayPoster =
    tmdbDetails?.poster ||
    movieDetails?.poster ||
    "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=900"
  const displayBackdrop = tmdbDetails?.backdrop || displayPoster
  const displayOverview = tmdbDetails?.overview || movieDetails?.plot || ""
  const displayImages =
    tmdbDetails?.images && tmdbDetails.images.length > 0 ? tmdbDetails.images : movieDetails?.screenshots || []

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

  // Handle quality selection
  const handleQualitySelect = (quality: string) => {
    setSelectedQuality(quality)
    setShowDownloadModal(true)
  }

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!displayImages || displayImages.length === 0) return

    const swipeThreshold = 50
    const swipeDistance = touchStartX.current - touchEndX.current

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe left - next image
        setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
      } else {
        // Swipe right - previous image
        setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
      }
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

  // Function to check if a link is v-cloud
  const isNCloudLink = (label: string): boolean => {
    const lowerLabel = label.toLowerCase()
    return lowerLabel.includes("v-cloud") || lowerLabel.includes("vcloud")
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
    return url
  }

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showScreenshotModal || !displayImages || displayImages.length === 0) return

      if (e.key === "ArrowLeft") {
        setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
      } else if (e.key === "ArrowRight") {
        setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
      } else if (e.key === "Escape") {
        setShowScreenshotModal(false)
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

  // Separate episode downloads from batch downloads with season support
  const separateDownloads = () => {
    if (!movieDetails?.downloadSections) return { episodeDownloads: [], batchDownloads: [] }

    const episodeDownloads: any[] = []
    const batchDownloads: any[] = []

    movieDetails.downloadSections.forEach((section) => {
      section.downloads.forEach((download) => {
        download.links.forEach((link) => {
          const linkText = link.label.toLowerCase()
          const sectionTitle = section.title.toLowerCase()

          // Check if it's a batch/zip download
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
              season: section.season || link.season, // Use section season or link season
            })
          } else {
            episodeDownloads.push({
              section: section.title,
              download,
              link,
              season: section.season || link.season, // Use section season or link season
            })
          }
        })
      })
    })

    // Sort both arrays with v-cloud priority
    const sortedEpisodeDownloads = sortDownloadsWithNCloudPriority(episodeDownloads)
    const sortedBatchDownloads = sortDownloadsWithNCloudPriority(batchDownloads)

    return { episodeDownloads: sortedEpisodeDownloads, batchDownloads: sortedBatchDownloads }
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
          <p className="text-gray-400 mb-6">The movie you're looking for doesn't exist or failed to load.</p>
          <Button 
            onClick={() => router.back()}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
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
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mb-8 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50 transition-all duration-300"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
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
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-green-100 to-teal-200 bg-clip-text text-transparent leading-tight">
                  {movieDetails.title}
                </h1>

                {/* Description */}
                {displayOverview && (
                  <p className="text-xl text-gray-200 mb-8 max-w-3xl leading-relaxed">{displayOverview}</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <Button
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-full text-white font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    onClick={scrollToDownloadSection}
                  >
                    <Download className="h-5 w-5 mr-3" />
                    Download
                  </Button>
                  {movieDetails.imdbLink && (
                    <Button
                      variant="outline"
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full text-white font-semibold text-lg hover:bg-white/20 transition-all duration-300 border-white/30"
                      onClick={() => window.open(movieDetails.imdbLink, "_blank")}
                    >
                      <ExternalLink className="h-5 w-5 mr-3" />
                      IMDb
                    </Button>
                  )}
                  {tmdbDetails?.trailer && (
                    <Button
                      variant="outline"
                      className="px-8 py-4 bg-red-600/20 backdrop-blur-sm rounded-full text-white font-semibold text-lg hover:bg-red-600/30 transition-all duration-300 border-red-600/50"
                      onClick={() => window.open(tmdbDetails.trailer, "_blank")}
                    >
                      <PlayCircle className="h-5 w-5 mr-3" />
                      Trailer
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="px-6 py-4 bg-white/5 backdrop-blur-sm rounded-full text-white hover:bg-white/15 transition-all duration-300"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Movie Poster - Better responsive design */}
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end animate-slide-up">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-gradient-to-r from-green-500/30 via-teal-500/30 to-cyan-500/30 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
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
              <p className="text-gray-400 text-lg">High quality images and scenes from the movie</p>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {displayImages.map((image, index) => (
                <div
                  key={index}
                  className="group relative aspect-video overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10"
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

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Play/View Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-green-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Image Number */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="text-white text-xs font-medium">{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <Button
                onClick={() => {
                  setSelectedScreenshot(0)
                  setShowScreenshotModal(true)
                }}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white border border-green-500 hover:border-teal-400 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              >
                <Eye className="h-5 w-5 mr-2" />
                View All Images
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Download Section */}
      <section id="download-section" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Download Options</h2>
            <p className="text-gray-400 text-lg">Choose your preferred quality and format</p>
          </div>

          {/* Download Quality Selection */}
          {(() => {
            const availableQualities = getAvailableQualities()

            return availableQualities.length > 0 ? (
              <div className="mb-16">
                <h3 className="text-2xl font-semibold mb-8 text-center">Select Quality</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {availableQualities.map((quality, index) => (
                    <Button
                      key={index}
                      onClick={() => handleQualitySelect(quality)}
                      className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white border-2 border-green-500 hover:border-teal-400 hover:scale-105 hover:shadow-xl"
                    >
                      <Download className="h-5 w-5 mr-3" />
                      {quality}
                      <span className="ml-3 text-sm opacity-80 bg-black/30 px-2 py-1 rounded-full">
                        {getSizeForQuality(quality)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 max-w-2xl mx-auto">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Downloads Available</h3>
                  <p className="text-gray-400">
                    Download links are not currently available for this content. Please check back later.
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
                        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400"
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
        <Dialog open={showScreenshotModal} onOpenChange={setShowScreenshotModal}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] bg-black/95 border-gray-700 p-2">
            <div className="relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                onClick={() => setShowScreenshotModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Image Display */}
              <div
                className="relative aspect-video w-full max-h-[80vh] overflow-hidden rounded-lg"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={displayImages[selectedScreenshot] || "/placeholder.svg"}
                  alt={`Movie Image ${selectedScreenshot + 1}`}
                  className="w-full h-full object-contain"
                />

                {/* Navigation Arrows */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                  onClick={() => setSelectedScreenshot((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                  onClick={() => setSelectedScreenshot((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Image Counter */}
              <div className="text-center mt-4">
                <span className="text-gray-400">
                  {selectedScreenshot + 1} of {displayImages.length}
                </span>
              </div>

              {/* Thumbnail Navigation */}
              <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedScreenshot(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                      index === selectedScreenshot ? "border-green-500" : "border-transparent hover:border-gray-500"
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
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                <Download className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="break-words">
                    Download <span className="text-green-400">{selectedQuality}</span>
                  </div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">{movieDetails.title}</div>
                  <Badge className="mt-2 bg-green-600 text-white text-xs">High Quality</Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {(() => {
                const { episodeDownloads, batchDownloads } = separateDownloads()
                const qualityEpisodeDownloads = episodeDownloads.filter(
                  (item) => item.download.quality === selectedQuality,
                )
                const qualityBatchDownloads = batchDownloads.filter((item) => item.download.quality === selectedQuality)

                return (
                  <>
                    {/* Episode-wise Downloads / Movie Downloads */}
                    {qualityEpisodeDownloads.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-green-400 mb-4 text-center flex items-center justify-center gap-2">
                          <PlayCircle className="h-5 w-5" />
                          {tmdbDetails?.contentType === "movie" ? "Download Movie" : "Episode-wise Downloads"}
                        </h4>
                        <div className="space-y-3">
                          {qualityEpisodeDownloads.map((item, index) => (
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
                                      {item.link.label}
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
                                  {tmdbDetails?.contentType === "movie" ? "Download Movie" : "Download Episode"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch/Complete Downloads */}
                    {qualityBatchDownloads.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-purple-400 mb-4 text-center flex items-center justify-center gap-2">
                          <Download className="h-5 w-5" />
                          Batch/Complete Downloads
                        </h4>
                        <div className="space-y-3">
                          {qualityBatchDownloads.map((item, index) => (
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
                                      {item.link.label}
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

                    {/* If no downloads found, show all downloads */}
                    {qualityEpisodeDownloads.length === 0 && qualityBatchDownloads.length === 0 && (
                      <div>
                        {movieDetails.downloadSections
                          .filter((section) =>
                            section.downloads.some((download) => download.quality === selectedQuality),
                          )
                          .map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              <h4 className="text-lg font-semibold text-green-400 mb-3 text-center">{section.title}</h4>
                              {section.downloads
                                .filter((download) => download.quality === selectedQuality)
                                .map((download, downloadIndex) => (
                                  <div key={downloadIndex} className="space-y-3">
                                    {download.links.map((link, linkIndex) => (
                                      <div
                                        key={linkIndex}
                                        className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                              <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                                {link.label}
                                              </h4>
                                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                                {download.quality} • {download.size} • High Quality
                                              </p>
                                              <Badge className="mt-2 bg-green-600 text-white text-xs">
                                                Ready to Download
                                              </Badge>
                                            </div>
                                          </div>
                                          <Button
                                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                                            onClick={() => {
                                              // Use enhanced nextdrive URL generation
                                              const nextdriveUrl = generateVlyxDriveUrl(link.url, link.label, null) // No specific season for this
                                              window.open(nextdriveUrl, "_blank")
                                            }}
                                            disabled={!link.url || link.url === "#"}
                                          >
                                            <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                            Download Now
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
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
    </div>
  )
}
