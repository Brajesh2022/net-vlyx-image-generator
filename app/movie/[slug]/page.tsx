"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Star,
  Play,
  Download,
  Plus,
  Share,
  Eye,
  ThumbsUp,
  Film,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Monitor,
  Smartphone,
  AlertCircle,
  X,
  PlayCircle,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AboutMovie from "@/components/about-movie"
import { useWishlist } from "@/hooks/useWishlist"
import { ShareModal } from "@/components/share-modal"
import { IMDbRating } from "@/components/ui/imdb-rating"

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

export default function MovieDetail({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [selectedQuality, setSelectedQuality] = useState<string>("")
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showEpisodeModal, setShowEpisodeModal] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<number>(0)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [showStreamModal, setShowStreamModal] = useState(false)
  const [selectedStreamQuality, setSelectedStreamQuality] = useState<string>("")
  const [showEpisodeStreamModal, setShowEpisodeStreamModal] = useState(false)
  const [selectedEpisodeForStream, setSelectedEpisodeForStream] = useState<Episode | null>(null)
  const [decodingStatus, setDecodingStatus] = useState<{ [key: string]: boolean }>({})
  const [showShareModal, setShowShareModal] = useState(false)
  const [imdbRating, setImdbRating] = useState<string | null>(null)
  const [imdbRatingLoading, setImdbRatingLoading] = useState(false)

  // Touch handling for mobile swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Wishlist functionality
  const { toggleWishlist, isInWishlist, isClient } = useWishlist()

  const { data, isLoading, error } = useQuery<ParsedMovieDetail>({
    queryKey: ["/api/movie", params.slug],
    queryFn: async () => {
      const response = await fetch(`/api/movie/${params.slug}`)
      if (!response.ok) {
        throw new Error("Failed to fetch movie details")
      }
      return response.json()
    },
    enabled: !!params.slug,
  })

  const handleQualitySelect = (quality: string) => {
    setSelectedQuality(quality)
    setShowDownloadModal(true)
  }

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode)
    setShowEpisodeModal(true)
  }

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

  // Smart scroll function - stream section first, then episode section, then download section
  const scrollToStreamSection = () => {
    const streamSection = document.getElementById("stream-section")
    const episodeSection = document.querySelector('[data-episode-section]')
    const downloadSection = document.getElementById("download-section")
    
    if (streamSection) {
      streamSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    } else if (episodeSection) {
      episodeSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    } else if (downloadSection) {
      downloadSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Helper function to extract HDStream4u file ID
  const extractHDStreamId = (url: string): string | null => {
    // Extract ID from various HDStream4u URL patterns
    const patterns = [/hdstream4u\.com\/file\/([^/?]+)/i, /hubstream\.art\/#([^/?]+)/i, /hubstream\.art\/([^/?]+)/i]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!data?.movie?.screenshots) return

    const swipeThreshold = 50
    const swipeDistance = touchStartX.current - touchEndX.current

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe left - next image
        setSelectedScreenshot((prev) => (prev === data.movie.screenshots!.length - 1 ? 0 : prev + 1))
      } else {
        // Swipe right - previous image
        setSelectedScreenshot((prev) => (prev === 0 ? data.movie.screenshots!.length - 1 : prev - 1))
      }
    }
  }

  // Fetch IMDb rating when movie data is loaded
  useEffect(() => {
    const fetchImdbRating = async () => {
      if (!data?.movie?.title) return
      
      setImdbRatingLoading(true)
      try {
        const response = await fetch("/api/imdb-rating", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieTitle: data.movie.title }),
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.rating) {
            setImdbRating(result.rating)
          }
        }
      } catch (error) {
        console.error("Error fetching IMDb rating:", error)
      } finally {
        setImdbRatingLoading(false)
      }
    }
    
    fetchImdbRating()
  }, [data?.movie?.title])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showScreenshotModal || !data?.movie?.screenshots) return

      if (e.key === "ArrowLeft") {
        setSelectedScreenshot((prev) => (prev === 0 ? data.movie.screenshots!.length - 1 : prev - 1))
      } else if (e.key === "ArrowRight") {
        setSelectedScreenshot((prev) => (prev === data.movie.screenshots!.length - 1 ? 0 : prev + 1))
      } else if (e.key === "Escape") {
        setShowScreenshotModal(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showScreenshotModal, data?.movie?.screenshots])

  // Helper function to check if a link is for streaming
  const isStreamingLink = (link: DownloadLink): boolean => {
    return (
      link.status === "Stream" ||
      link.title.toLowerCase().includes("watch") ||
      link.title.toLowerCase().includes("stream")
    )
  }

  // Helper function to get streaming links only
  const getStreamingLinks = (links: DownloadLink[]): DownloadLink[] => {
    return links.filter(isStreamingLink)
  }

  // Helper function to get download links only
  const getDownloadLinks = (links: DownloadLink[]): DownloadLink[] => {
    return links.filter((link) => !isStreamingLink(link))
  }

  // Helper function to get download qualities with calculated size ranges
  const getDownloadQualities = (links: DownloadLink[]): Quality[] => {
    const downloadLinks = getDownloadLinks(links)
    const qualitySet = new Set<string>()

    downloadLinks.forEach((link) => {
      if (link.url && !link.url.includes("#")) {
        qualitySet.add(link.quality)
      }
    })

    return Array.from(qualitySet).map((quality) => ({
      name: quality,
      size: getSizeRangeForQuality(quality, downloadLinks),
    }))
  }

  // Helper function to get streaming qualities with calculated size ranges
  const getStreamingQualities = (links: DownloadLink[]): Quality[] => {
    const streamingLinks = getStreamingLinks(links)
    const qualitySet = new Set<string>()

    streamingLinks.forEach((link) => {
      if (link.url && !link.url.includes("#")) {
        qualitySet.add(link.quality)
      }
    })

    // Add Netvlyx and Vlyx streaming options for all content (movies and episodes)
    const downloadLinks = getDownloadLinks(links)
    downloadLinks.forEach((link) => {
      if ((link.server === "NetVlyx Server" || link.server === "Vlyx Server") && link.url) {
        qualitySet.add(link.quality)
      }
    })

    // Add HDStream4u streaming option for all qualities if we have any HDStream4u links
    const hasHDStream = links.some((link) => link.server === "HDStream4u")
    if (hasHDStream) {
      // Add all common qualities for HDStream4u
      const commonQualities = ["2160p", "1080p", "720p", "480p"]
      commonQualities.forEach((quality) => {
        qualitySet.add(quality)
      })
    }

    // Combine all links (streaming + download) for size calculation
    const allLinks = [...streamingLinks, ...downloadLinks]
    
    return Array.from(qualitySet).map((quality) => ({
      name: quality,
      size: getSizeRangeForQuality(quality, allLinks),
    }))
  }

  // Helper function to parse file size to MB for comparison
  const parseSizeToMB = (sizeStr: string): number => {
    if (!sizeStr || sizeStr === "Unknown" || sizeStr === "unknown") return 0
    
    const size = parseFloat(sizeStr.replace(/[^\d.]/g, ''))
    if (isNaN(size)) return 0
    
    const unit = sizeStr.toLowerCase()
    if (unit.includes('gb')) return size * 1024
    if (unit.includes('mb')) return size
    if (unit.includes('kb')) return size / 1024
    return size // assume MB if no unit
  }

  // Helper function to format size back to readable format
  const formatSize = (sizeMB: number): string => {
    if (sizeMB >= 1024) {
      return `${(sizeMB / 1024).toFixed(1)}GB`
    }
    return `${Math.round(sizeMB)}MB`
  }

  // Function to calculate size range for a quality from actual download links
  const getSizeRangeForQuality = (quality: string, links: DownloadLink[]): string => {
    const qualityLinks = links.filter(link => link.quality === quality && link.size && link.size !== "Unknown" && link.size !== "unknown")
    
    if (qualityLinks.length === 0) {
      // Fallback to default ranges if no actual sizes found
      switch (quality) {
        case "2160p":
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

    const sizes = qualityLinks.map(link => parseSizeToMB(link.size)).filter(size => size > 0)
    
    if (sizes.length === 0) {
      // Fallback to default ranges
      switch (quality) {
        case "2160p":
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

    const minSize = Math.min(...sizes)
    const maxSize = Math.max(...sizes)
    
    if (minSize === maxSize) {
      return formatSize(minSize)
    }
    
    return `${formatSize(minSize)}–${formatSize(maxSize)}`
  }

  const getSizeForQuality = (quality: string): string => {
    switch (quality) {
      case "2160p":
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

  // Enhanced helper function to handle streaming link click
  const handleStreamLinkClick = async (link: DownloadLink) => {
    if (link.server === "NetVlyx Server" && link.url.startsWith("/download/")) {
      // For Netvlyx server, redirect to fetch-link for streaming
      const fileId = link.url.replace("/download/", "")
      window.location.href = `/fetch-link/${fileId}`
    } else if (link.server === "HDStream4u") {
      // For HDStream4u, redirect to our internal ad-free player
      const streamId = extractHDStreamId(link.url)
      if (streamId) {
        window.location.href = `/hdstream/${streamId}`
      } else {
        // Fallback to external link if ID extraction fails
        window.open(link.url, "_blank")
      }
    } else if (link.server === "Vlyx Server" && (link.url.includes("techyboy4u.com/?id=") || link.url.includes("taazabull24.com/?id="))) {
      // For Vlyx server, first decode to get the intermediate URL, then process it
      const linkKey = `stream_${link.url}`
      setDecodingStatus((prev) => ({ ...prev, [linkKey]: true }))

      try {
        console.log("Decoding link for streaming...")

        const response = await fetch("/api/decode-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link.url }),
        })

        const data = await response.json()
        console.log("Successfully decoded link")

        if (response.ok && data.success && data.final_url) {
          // For streaming, extract file ID and go to fetch-link
          const fileIdMatch = data.final_url.match(/hubdrive\.wales\/file\/(\d+)/)
          if (fileIdMatch) {
            const fileId = fileIdMatch[1]
            window.location.href = `/fetch-link/${fileId}`
          } else {
            // Fallback to vlyx-quality page
            window.location.href = `/vlyx-quality?url=${encodeURIComponent(data.final_url)}&action=stream`
          }
        } else {
          console.error("Decode failed:", data)
          alert(
            "Failed to decode Vlyx link: " +
              (data.error || "Unknown error") +
              (data.debug_info ? "\n\nDebug info available in console." : ""),
          )
          if (data.debug_info) {
            console.log("Debug info:", data.debug_info)
          }
        }
      } catch (error) {
        console.error("Error decoding Vlyx link:", error)
        alert("Error decoding Vlyx link: " + error)
      } finally {
        setDecodingStatus((prev) => ({ ...prev, [linkKey]: false }))
      }
    } else {
      // For other streaming servers, open directly
      window.open(link.url, "_blank")
    }
  }

  // Helper function to handle download link click
  const handleDownloadLinkClick = async (link: DownloadLink) => {
    if (link.server === "VlyJes Server" && link.url.includes("hubcdn.fans/file/")) {
      // For VlyJes server, decode the link first
      const linkKey = `download_${link.url}`
      setDecodingStatus((prev) => ({ ...prev, [linkKey]: true }))

      try {
        console.log("Decoding download link...")

        const response = await fetch("/api/decode-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link.url }),
        })

        const data = await response.json()
        console.log("Successfully decoded link")

        if (response.ok && data.success && data.final_url) {
          // Open the decoded direct download link
          window.open(data.final_url, "_blank")
          
          // Show donation popup after successful download
          setTimeout(() => {
            if ((window as any).showDonationPopup) {
              (window as any).showDonationPopup()
            }
          }, 2000)
        } else {
          console.error("Decode failed:", data)
          alert(
            "Failed to decode VlyJes link: " +
              (data.error || "Unknown error") +
              (data.debug_info ? "\n\nDebug info available in console." : ""),
          )
          if (data.debug_info) {
            console.log("Debug info:", data.debug_info)
          }
        }
      } catch (error) {
        console.error("Error decoding VlyJes link:", error)
        alert("Error decoding VlyJes link: " + error)
      } finally {
        setDecodingStatus((prev) => ({ ...prev, [linkKey]: false }))
      }
    } else if (link.server === "Vlyx Server" && (link.url.includes("techyboy4u.com/?id=") || link.url.includes("taazabull24.com/?id="))) {
      // For Vlyx server, first decode to get the intermediate URL, then process it
      const linkKey = `download_${link.url}`
      setDecodingStatus((prev) => ({ ...prev, [linkKey]: true }))

      try {
        console.log("Decoding download link...")

        const response = await fetch("/api/decode-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link.url }),
        })

        const data = await response.json()
        console.log("Successfully decoded link")

        if (response.ok && data.success && data.final_url) {
          // Now process the decoded URL through our Vlyx processor
          window.location.href = `/vlyx-quality?url=${encodeURIComponent(data.final_url)}&action=download`
        } else {
          console.error("Decode failed:", data)
          alert(
            "Failed to decode Vlyx link: " +
              (data.error || "Unknown error") +
              (data.debug_info ? "\n\nDebug info available in console." : ""),
          )
          if (data.debug_info) {
            console.log("Debug info:", data.debug_info)
          }
        }
      } catch (error) {
        console.error("Error decoding Vlyx link:", error)
        alert("Error decoding Vlyx link: " + error)
      } finally {
        setDecodingStatus((prev) => ({ ...prev, [linkKey]: false }))
      }
    } else if (link.url.startsWith("/download/")) {
      // Navigate to internal download page
      window.location.href = link.url
      
      // Show donation popup after navigation (for NetVlyx server downloads)
      setTimeout(() => {
        if ((window as any).showDonationPopup) {
          (window as any).showDonationPopup()
        }
      }, 3000)
    } else {
      window.open(link.url, "_blank")
      
      // Show donation popup after successful download
      setTimeout(() => {
        if ((window as any).showDonationPopup) {
          (window as any).showDonationPopup()
        }
      }, 2000)
    }
  }

  if (isLoading) {
    return <MovieDetailSkeleton />
  }

  if (error || !data?.movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Film className="h-24 w-24 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-gray-400 mb-6">The movie you're looking for doesn't exist or failed to load.</p>
          <Button 
            onClick={() => router.back()}
            className="netflix-gradient"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  const movie = data.movie

  // Create wishlist item
  const createWishlistItem = () => ({
    id: movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: movie.title,
    image: movie.image,
    year: movie.year,
    rating: movie.rating,
    category: movie.category,
    slug: params.slug
  })

  // Handle wishlist toggle
  const handleWishlistToggle = () => {
    if (isClient) {
      toggleWishlist(createWishlistItem())
    }
  }

  // Check if movie is in wishlist
  const isMovieInWishlist = isClient ? isInWishlist(movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) : false

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Enhanced Movie Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background with better gradient overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-sm"
            style={{
              backgroundImage: `url('${movie.image || "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"}')`,
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
                {/* Category and Rating */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <Badge className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 text-sm font-medium">
                    {movie.category || "Movie"}
                  </Badge>
                  <div className="flex items-center gap-3 text-gray-300">
                    <IMDbRating 
                      rating={imdbRating}
                      isLoading={imdbRatingLoading}
                      fallbackRating={movie.rating}
                      size="md"
                      variant="hero"
                    />
                    <span className="text-gray-500">•</span>
                    <span>{movie.year || "2024"}</span>
                    <span className="text-gray-500">•</span>
                    <span>{movie.duration || "120 min"}</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                  {movie.title}
                </h1>

                {/* Description */}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                  {/* Updated Watch Button - Now scrolls to stream section */}
                  <Button
                    className="px-8 py-4 netflix-gradient rounded-full text-white font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    onClick={scrollToStreamSection}
                  >
                    <Play className="h-5 w-5 mr-3" />
                    Watch
                  </Button>
                  {/* Updated Download Button - Now scrolls to download section */}
                  <Button
                    variant="outline"
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full text-white font-semibold text-lg hover:bg-white/20 transition-all duration-300 border-white/30"
                    onClick={scrollToDownloadSection}
                  >
                    <Download className="h-5 w-5 mr-3" />
                    Download
                  </Button>
                  {/* Updated Add to Wishlist Button */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className={`px-6 py-4 bg-white/5 backdrop-blur-sm rounded-full text-white hover:bg-white/15 transition-all duration-300 ${
                      isMovieInWishlist ? 'text-red-400' : ''
                    }`}
                    onClick={handleWishlistToggle}
                    title={isMovieInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    {isMovieInWishlist ? <Check className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                  </Button>
                  {/* Updated Share Button */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="px-6 py-4 bg-white/5 backdrop-blur-sm rounded-full text-white hover:bg-white/15 transition-all duration-300"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share className="h-6 w-6" />
                  </Button>
                </div>

                {/* Movie Stats */}
                <div className="grid grid-cols-3 gap-6 max-w-md">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{movie.episodes || "1"}</div>
                    <div className="text-sm text-gray-400">{movie.episodes ? "Episodes" : "Movie"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{movie.views || "1.2M"}</div>
                    <div className="text-sm text-gray-400">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{movie.downloads || "850K"}</div>
                    <div className="text-sm text-gray-400">Downloads</div>
                  </div>
                </div>
              </div>

              {/* Movie Poster - Better responsive design */}
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end animate-slide-up">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-gradient-to-r from-red-500/30 via-purple-500/30 to-blue-500/30 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src={
                      movie.image ||
                      "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=900" ||
                      "/placeholder.svg?height=900&width=600" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg"
                    }
                    alt={movie.title}
                    className="relative w-64 sm:w-72 lg:w-80 h-auto rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Quality badges on poster */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <Badge className="bg-yellow-600/90 backdrop-blur-sm text-white text-xs px-2 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      HD
                    </Badge>
                    {movie.qualities && movie.qualities.length > 0 && (
                      <Badge className="bg-blue-600/90 backdrop-blur-sm text-white text-xs px-2 py-1">
                        {movie.qualities[0].name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Trailer Section */}
      {movie.trailer?.url && (
        <section className="py-20 bg-gradient-to-b from-black to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-12 text-center">Official Trailer</h2>

            <div className="relative aspect-video rounded-2xl overflow-hidden liquid-glass max-w-5xl mx-auto group">
              {(() => {
                const videoId = extractYouTubeId(movie.trailer.url || "")
                if (videoId) {
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                      title={`${movie.title} Trailer`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )
                } else {
                  return (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Trailer not available</p>
                      </div>
                    </div>
                  )
                }
              })()}

              <div className="absolute bottom-4 right-4">
                <Badge className="bg-black/50 backdrop-blur-sm text-white">HD Trailer</Badge>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-400 mb-4">Official Trailer • Duration: {movie.trailer.duration || "2:39"}</p>
              <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{movie.trailer.views || "1.2M"} views</span>
                </span>
                <span className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{movie.trailer.likes || "45K"} likes</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screenshots Gallery Section */}
      {movie.screenshots && movie.screenshots.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Screenshots</h2>
              <p className="text-gray-400 text-lg">Get a preview of the visual quality and scenes</p>
            </div>

            {/* Screenshot Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {movie.screenshots.map((screenshot, index) => (
                <div
                  key={index}
                  className="group relative aspect-video overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10"
                  onClick={() => {
                    setSelectedScreenshot(index)
                    setShowScreenshotModal(true)
                  }}
                >
                  <img
                    src={screenshot || "/placeholder.svg?height=400&width=600"}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = movie.image || "/placeholder.svg?height=400&width=600"
                    }}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Play/View Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Screenshot Number */}
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
                className="px-8 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-red-600 hover:to-red-500 text-white border border-gray-600 hover:border-red-400 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              >
                <Eye className="h-5 w-5 mr-2" />
                View All Screenshots
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
            <p className="text-gray-400 text-lg">Choose your preferred quality and start downloading</p>
          </div>

          {/* Download Quality Selection */}
          {(() => {
            const downloadQualities = getDownloadQualities(movie.downloadLinks)

            return (
              downloadQualities.length > 0 && (
                <div className="mb-16">
                  <h3 className="text-2xl font-semibold mb-8 text-center">Select Quality</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {downloadQualities.map((quality, index) => (
                      <Button
                        key={index}
                        onClick={() => handleQualitySelect(quality.name)}
                        className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-red-600 hover:to-red-500 text-white border-2 border-gray-600 hover:border-red-400 hover:scale-105 hover:shadow-xl"
                      >
                        <Download className="h-5 w-5 mr-3" />
                        {quality.name}
                        <span className="ml-3 text-sm opacity-80 bg-black/30 px-2 py-1 rounded-full">
                          {quality.size}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )
            )
          })()}

          {/* Episodes Section for Download */}
          {movie.episodeList && movie.episodeList.length > 0 && (
            <div className="mb-16" data-episode-section>
              <h3 className="text-2xl font-semibold mb-8 text-center">Episodes</h3>
              <div className="space-y-3 max-w-5xl mx-auto">
                {movie.episodeList.map((episode, index) => {
                  const downloadLinks = getDownloadLinks(episode.downloadLinks)
                  const streamingLinks = getStreamingLinks(episode.downloadLinks)

                  // Check if streaming options are available for episodes
                  const hasNetvlyxStreaming = downloadLinks.some((link) => link.server === "NetVlyx Server")
                  const hasVlyxStreaming = downloadLinks.some((link) => link.server === "Vlyx Server")
                  const hasStreamingOptions = streamingLinks.length > 0 || hasNetvlyxStreaming || hasVlyxStreaming

                  return (
                    <div
                      key={index}
                      className="group bg-gradient-to-r from-gray-900/50 to-gray-800/50 hover:from-gray-800/70 hover:to-gray-700/70 rounded-lg p-4 transition-all duration-300 border border-gray-800 hover:border-gray-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 sm:w-32 aspect-video overflow-hidden rounded-md flex-shrink-0">
                          <img
                            src={movie.image || "/placeholder.svg?height=200&width=300"}
                            alt={`Episode ${episode.number}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-1 left-1">
                            <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                              <span className="text-white font-bold text-xs">{episode.number}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors truncate">
                                {episode.number}. {episode.title}
                              </h4>
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {episode.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{episode.duration}</span>
                                <span>•</span>
                                <span>{downloadLinks.length} download options</span>
                                {hasStreamingOptions && (
                                  <>
                                    <span>•</span>
                                    <span>Stream available</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex-shrink-0 ml-4 flex gap-3">
                              {/* Stream Icon - Show if streaming options available */}
                              {hasStreamingOptions && (
                                <Button
                                  onClick={() => {
                                    setSelectedEpisodeForStream(episode)
                                    setShowEpisodeStreamModal(true)
                                  }}
                                  size="sm"
                                  className="w-10 h-10 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full text-white hover:shadow-lg transition-all duration-300"
                                  title="Stream Episode"
                                >
                                  <PlayCircle className="h-5 w-5" />
                                </Button>
                              )}

                              {/* Download Icon */}
                              {downloadLinks.length > 0 && (
                                <Button
                                  onClick={() => handleEpisodeSelect(episode)}
                                  size="sm"
                                  className="w-10 h-10 p-0 netflix-gradient rounded-full text-white hover:shadow-lg transition-all duration-300"
                                  title="Download Episode"
                                >
                                  <Download className="h-5 w-5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Downloads Message */}
          {(() => {
            const hasDownloadQualities = getDownloadQualities(movie.downloadLinks).length > 0
            const hasDownloadEpisodes = movie.episodeList?.some(
              (episode) => getDownloadLinks(episode.downloadLinks).length > 0,
            )

            return (
              !hasDownloadQualities &&
              !hasDownloadEpisodes && (
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
            )
          })()}
        </div>
      </section>

      {/* Stream Online Section - Only for movies, not episodes */}
      {(() => {
        const streamingQualities = getStreamingQualities(movie.downloadLinks)
        const hasStreamingContent = streamingQualities.length > 0

        return (
          hasStreamingContent &&
          !movie.episodeList?.length && (
            <section id="stream-section" className="py-20 bg-gradient-to-b from-gray-900 to-black">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">Stream Online</h2>
                  <p className="text-gray-400 text-lg">Watch instantly in your browser</p>
                </div>

                <div className="mb-16">
                  <h3 className="text-2xl font-semibold mb-8 text-center">Select Quality</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {streamingQualities.map((quality, index) => (
                      <Button
                        key={index}
                        onClick={() => {
                          setSelectedStreamQuality(quality.name)
                          setShowStreamModal(true)
                        }}
                        className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 bg-gradient-to-r from-blue-800 to-purple-700 hover:from-blue-600 hover:to-purple-500 text-white border-2 border-blue-600 hover:border-purple-400 hover:scale-105 hover:shadow-xl liquid-glass"
                      >
                        <PlayCircle className="h-5 w-5 mr-3" />
                        {quality.name}
                        <span className="ml-3 text-sm opacity-80 bg-black/30 px-2 py-1 rounded-full">
                          {quality.size}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )
        )
      })()}

      {/* Download Modal - Only show if we have real download links */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                <Download className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="break-words">
                    Download <span className="text-red-400">{selectedQuality}</span>
                  </div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">{movie.title}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              {movie.downloadLinks
                .filter((link) => link.quality === selectedQuality && link.server !== "HDStream4u")
                .map((link, index) => {
                  const linkKey = `download_${link.url}`
                  const isDecoding = decodingStatus[linkKey]

                  return (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div
                            className={`w-12 h-12 sm:w-14 sm:h-14 ${link.server === "NetVlyx Server" ? "bg-gradient-to-r from-green-500 to-blue-500" : link.server === "VlyJes Server" ? "bg-gradient-to-r from-purple-500 to-pink-500" : link.server === "Vlyx Server" ? "bg-gradient-to-r from-orange-500 to-red-500" : "netflix-gradient"} rounded-xl flex items-center justify-center flex-shrink-0`}
                          >
                            {link.server === "Google Drive" && <Monitor className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
                            {link.server === "MediaFire" && <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
                            {link.server === "NetVlyx Server" && (
                              <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            )}
                            {!["Google Drive", "MediaFire", "NetVlyx Server"].includes(link.server) && (
                              <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg sm:text-xl text-white break-words">{link.server}</h4>
                              {link.server === "NetVlyx Server" && (
                                <div className="flex gap-1">
                                  <Badge className="bg-green-600 text-white text-xs">Preferred</Badge>
                                  <Badge className="bg-blue-600 text-white text-xs">Ad Free</Badge>
                                </div>
                              )}
                              {link.server === "VlyJes Server" && (
                                <div className="flex gap-1">
                                  <Badge className="bg-purple-600 text-white text-xs">Premium</Badge>
                                  <Badge className="bg-pink-600 text-white text-xs">Ad Free</Badge>
                                </div>
                              )}
                              {link.server === "Vlyx Server" && (
                                <div className="flex gap-1">
                                  <Badge className="bg-orange-600 text-white text-xs">Free</Badge>
                                </div>
                              )}
                            </div>
                            <p className="text-sm sm:text-base text-gray-400 break-words">
                              {link.quality} • {link.format || "MKV"} • {link.size}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge
                                className={`${link.status === "Active" ? "bg-green-600" : "bg-red-600"} text-white text-xs`}
                              >
                                {link.status}
                              </Badge>
                              <span className="text-xs text-gray-500">Speed: {link.speed || "Medium"}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          className={`w-full sm:w-auto px-6 py-3 ${link.server === "NetVlyx Server" ? "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600" : link.server === "VlyJes Server" ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : link.server === "Vlyx Server" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "netflix-gradient"} rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base`}
                          onClick={() => handleDownloadLinkClick(link)}
                          disabled={!link.url || link.url === "#" || isDecoding}
                        >
                          {isDecoding ? (
                            <>
                              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                              Decoding...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              {link.server === "NetVlyx Server"
                                ? "Download Now"
                                : link.server === "VlyJes Server"
                                  ? "Download (Ad-Free)"
                                  : link.server === "Vlyx Server"
                                    ? "Download (Free)"
                                    : "Download"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Episode Download Modal */}
      <Dialog open={showEpisodeModal} onOpenChange={setShowEpisodeModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                <Play className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="break-words">Episode {selectedEpisode?.number}</div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">{selectedEpisode?.title}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedEpisode && (
              <div className="space-y-4 mt-6">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                    {selectedEpisode.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-400">
                    <span>Duration: {selectedEpisode.duration}</span>
                    <span>•</span>
                    <span>{selectedEpisode.downloadLinks.length} download options</span>
                  </div>
                </div>

                {selectedEpisode.downloadLinks.length > 0 ? (
                  selectedEpisode.downloadLinks.map((link, index) => {
                    const linkKey = `download_${link.url}`
                    const isDecoding = decodingStatus[linkKey]

                    return (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 netflix-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                              <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg sm:text-xl text-white break-words">{link.server}</h4>
                                {link.server === "VlyJes Server" && (
                                  <div className="flex gap-1">
                                    <Badge className="bg-purple-600 text-white text-xs">Premium</Badge>
                                    <Badge className="bg-pink-600 text-white text-xs">Ad Free</Badge>
                                  </div>
                                )}
                                {link.server === "Vlyx Server" && (
                                  <div className="flex gap-1">
                                    <Badge className="bg-orange-600 text-white text-xs">Free</Badge>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                {link.quality} • {link.size}
                              </p>
                              <Badge
                                className={`mt-2 ${
                                  link.status === "Active" || link.status === "Stream" ? "bg-green-600" : "bg-red-600"
                                } text-white text-xs`}
                              >
                                {link.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            className={`w-full sm:w-auto px-6 py-3 ${link.server === "NetVlyx Server" ? "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600" : link.server === "VlyJes Server" ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : link.server === "Vlyx Server" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "netflix-gradient"} rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base`}
                            onClick={() => handleDownloadLinkClick(link)}
                            disabled={!link.url || link.url === "#" || isDecoding}
                          >
                            {isDecoding ? (
                              <>
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                Decoding...
                              </>
                            ) : link.status === "Stream" ? (
                              <>
                                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Stream
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                {link.server === "NetVlyx Server"
                                  ? "Download Now"
                                  : link.server === "VlyJes Server"
                                    ? "Download (Ad-Free)"
                                    : link.server === "Vlyx Server"
                                      ? "Download (Free)"
                                      : "Download"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No download links available for this episode.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stream Modal for Movies */}
      <Dialog open={showStreamModal} onOpenChange={setShowStreamModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="break-words">
                    Stream <span className="text-blue-400">{selectedStreamQuality}</span>
                  </div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">{movie.title}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              {/* HDStream4u streaming option for all qualities */}
              {(() => {
                const hasHDStream = movie.downloadLinks.some((link) => link.server === "HDStream4u")
                const hdStreamLink = movie.downloadLinks.find((link) => link.server === "HDStream4u")

                return (
                  hasHDStream &&
                  hdStreamLink && (
                    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg sm:text-xl text-white break-words">HDStream4u Server</h4>
                              <div className="flex gap-1">
                                <Badge className="bg-purple-600 text-white text-xs">HD Quality</Badge>
                                <Badge className="bg-pink-600 text-white text-xs">Ad-Free</Badge>
                              </div>
                            </div>
                            <p className="text-sm sm:text-base text-gray-400 break-words">
                              {selectedStreamQuality} • Multiple Options
                            </p>
                            <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                          </div>
                        </div>
                        <Button
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                          onClick={() => {
                            const streamId = extractHDStreamId(hdStreamLink.url)
                            if (streamId) {
                              window.location.href = `/hdstream/${streamId}`
                            } else {
                              window.open(hdStreamLink.url, "_blank")
                            }
                          }}
                        >
                          <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Watch Now (Ad-Free)
                        </Button>
                      </div>
                    </div>
                  )
                )
              })()}

              {/* Regular streaming links */}
              {getStreamingLinks(movie.downloadLinks)
                .filter((link) => link.quality === selectedStreamQuality && link.server !== "HDStream4u")
                .map((link, index) => {
                  const linkKey = `stream_${link.url}`
                  const isDecoding = decodingStatus[linkKey]

                  return (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg sm:text-xl text-white break-words">{link.server}</h4>
                            <p className="text-sm sm:text-base text-gray-400 break-words">
                              {link.quality} • {link.size}
                            </p>
                            <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                          </div>
                        </div>
                        <Button
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                          onClick={() => handleStreamLinkClick(link)}
                          disabled={isDecoding}
                        >
                          {isDecoding ? (
                            <>
                              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                              Decoding...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              Watch Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}

              {/* Netvlyx streaming option for hubdrive links */}
              {getDownloadLinks(movie.downloadLinks)
                .filter((link) => link.quality === selectedStreamQuality && link.server === "NetVlyx Server")
                .map((link, index) => (
                  <div
                    key={`netvlyx-stream-${index}`}
                    className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                              NetVlyx Stream Server
                            </h4>
                            <div className="flex gap-1">
                              <Badge className="bg-green-600 text-white text-xs">Preferred</Badge>
                              <Badge className="bg-blue-600 text-white text-xs">Ad Free</Badge>
                            </div>
                          </div>
                          <p className="text-sm sm:text-base text-gray-400 break-words">
                            {link.quality} • {link.size}
                          </p>
                          <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                        </div>
                      </div>
                      <Button
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                        onClick={() => handleStreamLinkClick(link)}
                      >
                        <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Stream Now
                      </Button>
                    </div>
                  </div>
                ))}

              {/* Vlyx streaming option for movies only */}
              {!movie.episodeList?.length &&
                getDownloadLinks(movie.downloadLinks)
                  .filter((link) => link.quality === selectedStreamQuality && link.server === "Vlyx Server")
                  .map((link, index) => {
                    const linkKey = `stream_${link.url}`
                    const isDecoding = decodingStatus[linkKey]

                    return (
                      <div
                        key={`vlyx-stream-${index}`}
                        className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                  Vlyx Stream Server
                                </h4>
                                <div className="flex gap-1">
                                  <Badge className="bg-orange-600 text-white text-xs">Free</Badge>
                                </div>
                              </div>
                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                {link.quality} • {link.size}
                              </p>
                              <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                            </div>
                          </div>
                          <Button
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                            onClick={() => handleStreamLinkClick(link)}
                            disabled={isDecoding}
                          >
                            {isDecoding ? (
                              <>
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Stream Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Episode Stream Modal */}
      <Dialog open={showEpisodeStreamModal} onOpenChange={setShowEpisodeStreamModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-start gap-3">
                <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="break-words">Stream Episode {selectedEpisodeForStream?.number}</div>
                  <div className="text-sm font-normal text-gray-400 mt-1 break-words">
                    {selectedEpisodeForStream?.title}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedEpisodeForStream && (
              <div className="space-y-4 mt-6">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                    {selectedEpisodeForStream.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-400">
                    <span>Duration: {selectedEpisodeForStream.duration}</span>
                    <span>•</span>
                    <span>{getStreamingLinks(selectedEpisodeForStream.downloadLinks).length} stream options</span>
                  </div>
                </div>

                {/* HDStream4u streaming option for episodes */}
                {(() => {
                  const hasHDStream = selectedEpisodeForStream?.downloadLinks.some(
                    (link) => link.server === "HDStream4u",
                  )
                  const hdStreamLink = selectedEpisodeForStream?.downloadLinks.find(
                    (link) => link.server === "HDStream4u",
                  )

                  return (
                    hasHDStream &&
                    hdStreamLink && (
                      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                  HDStream4u Server
                                </h4>
                                <div className="flex gap-1">
                                  <Badge className="bg-purple-600 text-white text-xs">HD Quality</Badge>
                                  <Badge className="bg-pink-600 text-white text-xs">Ad-Free</Badge>
                                </div>
                              </div>
                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                Multiple Quality Options Available
                              </p>
                              <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                            </div>
                          </div>
                          <Button
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                            onClick={() => {
                              const streamId = extractHDStreamId(hdStreamLink.url)
                              if (streamId) {
                                window.location.href = `/hdstream/${streamId}`
                              } else {
                                window.open(hdStreamLink.url, "_blank")
                              }
                            }}
                          >
                            <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Watch Now (Ad-Free)
                          </Button>
                        </div>
                      </div>
                    )
                  )
                })()}

                {/* Regular streaming links for episode */}
                {getStreamingLinks(selectedEpisodeForStream.downloadLinks)
                  .filter((link) => link.server !== "HDStream4u")
                  .map((link, index) => {
                    const linkKey = `stream_${link.url}`
                    const isDecoding = decodingStatus[linkKey]

                    return (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-lg sm:text-xl text-white break-words">{link.server}</h4>
                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                {link.quality} • {link.size}
                              </p>
                              <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                            </div>
                          </div>
                          <Button
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                            onClick={() => handleStreamLinkClick(link)}
                            disabled={isDecoding}
                          >
                            {isDecoding ? (
                              <>
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                Decoding...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Watch Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                {/* NetVlyx streaming option for episode hubdrive links */}
                {getDownloadLinks(selectedEpisodeForStream.downloadLinks)
                  .filter((link) => link.server === "NetVlyx Server")
                  .map((link, index) => (
                    <div
                      key={`episode-netvlyx-stream-${index}`}
                      className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                NetVlyx Stream Server
                              </h4>
                              <div className="flex gap-1">
                                <Badge className="bg-green-600 text-white text-xs">Preferred</Badge>
                                <Badge className="bg-blue-600 text-white text-xs">Ad Free</Badge>
                              </div>
                            </div>
                            <p className="text-sm sm:text-base text-gray-400 break-words">
                              {link.quality} • {link.size}
                            </p>
                            <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                          </div>
                        </div>
                        <Button
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                          onClick={() => handleStreamLinkClick(link)}
                        >
                          <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Stream Now
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* Vlyx streaming option for episode download links */}
                {getDownloadLinks(selectedEpisodeForStream.downloadLinks)
                  .filter((link) => link.server === "Vlyx Server")
                  .map((link, index) => {
                    const linkKey = `stream_${link.url}`
                    const isDecoding = decodingStatus[linkKey]

                    return (
                      <div
                        key={`episode-vlyx-stream-${index}`}
                        className="bg-gray-800 rounded-xl p-4 sm:p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg sm:text-xl text-white break-words">
                                  Vlyx Stream Server
                                </h4>
                                <div className="flex gap-1">
                                  <Badge className="bg-orange-600 text-white text-xs">Free</Badge>
                                </div>
                              </div>
                              <p className="text-sm sm:text-base text-gray-400 break-words">
                                {link.quality} • {link.size}
                              </p>
                              <Badge className="mt-2 bg-blue-600 text-white text-xs">Stream</Badge>
                            </div>
                          </div>
                          <Button
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl text-white font-semibold hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                            onClick={() => handleStreamLinkClick(link)}
                            disabled={isDecoding}
                          >
                            {isDecoding ? (
                              <>
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Stream Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Responsive Screenshot Modal */}
      <Dialog open={showScreenshotModal} onOpenChange={setShowScreenshotModal}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black border-none m-0 rounded-none sm:max-w-[95vw] sm:max-h-[95vh] sm:rounded-lg sm:border-gray-800 sm:m-auto">
          <div className="relative w-full h-full flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setShowScreenshotModal(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Main Screenshot Display */}
            {movie.screenshots && movie.screenshots.length > 0 && (
              <div className="relative flex-1 flex items-center justify-center">
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={movie.screenshots[selectedScreenshot] || "/placeholder.svg?height=800&width=1200"}
                    alt={`Screenshot ${selectedScreenshot + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = movie.image || "/placeholder.svg?height=800&width=1200"
                    }}
                  />

                  {/* Navigation Arrows - Hidden on mobile, visible on desktop */}
                  {movie.screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setSelectedScreenshot((prev) => (prev === 0 ? movie.screenshots!.length - 1 : prev - 1))
                        }
                        className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                      <button
                        onClick={() =>
                          setSelectedScreenshot((prev) => (prev === movie.screenshots!.length - 1 ? 0 : prev + 1))
                        }
                        className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </>
                  )}

                  {/* Screenshot Counter */}
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 sm:px-4 sm:py-2">
                    <span className="text-white text-xs sm:text-sm font-medium">
                      {selectedScreenshot + 1} of {movie.screenshots.length}
                    </span>
                  </div>

                  {/* Mobile Swipe Indicator */}
                  <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 sm:hidden">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-white text-xs">Swipe to navigate</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thumbnail Strip - Responsive */}
            {movie.screenshots && movie.screenshots.length > 1 && (
              <div className="p-2 sm:p-4 bg-gray-900 border-t border-gray-800">
                <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                  {movie.screenshots.map((screenshot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedScreenshot(index)}
                      className={`flex-shrink-0 w-12 h-8 sm:w-20 sm:h-12 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === selectedScreenshot
                          ? "border-red-500 scale-110"
                          : "border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={screenshot || "/placeholder.svg?height=100&width=150"}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = movie.image || "/placeholder.svg?height=100&width=150"
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* About Movie Section - TMDB Integration */}
      <AboutMovie 
        movieTitle={movie.title} 
        contentType={
          movie.episodeList && movie.episodeList.length > 0 
            ? 'tv' 
            : movie.episodes && movie.episodes > 0 
            ? 'tv' 
            : 'movie'
        }
      />

      {/* Footer */}
      <footer className="liquid-glass mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 netflix-gradient rounded flex items-center justify-center">
                  <Film className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  NetVlyx
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Welcome to Official NetVlyx WebSite – Free Download HD Movies & TV Shows on NetVlyx. Enjoy Latest Movies
                from Bollywood, Hollywood, & South Indian.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button className="hover:text-white transition-colors">Bollywood Movies</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Hollywood Movies</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">South Indian Movies</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Web Series</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">TV Shows</button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quality</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button className="hover:text-white transition-colors">4K Ultra HD</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">1080p HD</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">720p HD</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">480p</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Mobile Quality</button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button className="hover:text-white transition-colors">Help Center</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Contact Us</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Privacy Policy</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Terms of Service</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">DMCA</button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2024 NetVlyx. All rights reserved. Designed with liquid glass aesthetics for the ultimate viewing
              experience.
            </p>
          </div>
        </div>
      </footer>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        movieTitle={movie.title}
        movieImage={movie.image}
      />
    </div>
  )
}

function MovieDetailSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative min-h-screen">
        <Skeleton className="absolute inset-0 bg-gray-900" />
        <div className="relative z-10 flex items-center min-h-[80vh]">
          <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Skeleton className="h-8 w-32 bg-gray-800" />
              <Skeleton className="h-16 w-full bg-gray-800" />
              <Skeleton className="h-24 w-full bg-gray-800" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 bg-gray-800" />
                <Skeleton className="h-12 w-32 bg-gray-800" />
              </div>
            </div>
            <div className="lg:flex justify-center hidden">
              <Skeleton className="w-80 h-96 bg-gray-800 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
