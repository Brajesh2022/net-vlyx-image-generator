"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Download, Star, ChevronLeft, ExternalLink, AlertCircle, Eye, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VlyxDriveDebugPopup } from "@/components/vlyxdrive-debug-popup"
import { decodeVlyxDriveParams, encodeNCloudParams, replaceBrandingText } from "@/lib/utils"

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

interface QualityGroup {
  quality: string
  size: string
  servers: Array<{
    name: string
    url: string
    style?: string
  }>
}

interface VlyxDriveData {
  type: "episode" | "movie"
  title: string
  episodes?: EpisodeDownload[]
  movie?: MovieDownload
  qualityGroups?: QualityGroup[] // NEW: For m4ulinks multi-quality structure
  selectedQuality?: string | null // NEW: From URL parameter
  hasQualityMatch?: boolean // Track if quality parameter matched
}

interface TMDbEpisode {
  episode_number: number
  name: string
  overview: string
  still_path?: string
  air_date: string
  runtime?: number
}

interface TMDbSeason {
  episodes: TMDbEpisode[]
  season_number: number
}

interface TMDbDetails {
  id?: string
  title?: string
  name?: string
  poster?: string
  poster_path?: string
  backdrop?: string
  backdrop_path?: string
  overview?: string
  release_date?: string
  first_air_date?: string
  vote_average?: number
  rating?: string
  contentType?: "movie" | "tv"
}

export default function VlyxDrivePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const key = searchParams.get("key")
  const action = searchParams.get("action") as "stream" | "download" | null
  
  // ✅ NEW: Get quality from URL parameter (not from encoded key)
  const quality = searchParams.get("quality") || undefined
  
  // Decode parameters from key (backward compatible)
  const params = key ? decodeVlyxDriveParams(key) : {
    driveid: searchParams.get("driveid") || undefined,
    link: searchParams.get("link") || undefined,
    tmdbid: searchParams.get("tmdbid") || undefined,
    season: searchParams.get("season") || undefined,
    server: searchParams.get("server") || undefined,
  }
  
  const { driveid, link, tmdbid, season, server } = params
  
  // Detect if this is an m4ulinks URL
  const isM4ULinks = link && /m4ulinks\.com/i.test(link)

  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeDownload | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showNCloudConfirm, setShowNCloudConfirm] = useState(false)
  const [selectedNCloudServer, setSelectedNCloudServer] = useState<{name: string, url: string} | null>(null)
  const [showAllOptions, setShowAllOptions] = useState(false) // NEW: Toggle to show all quality options
  const [showOtherQualities, setShowOtherQualities] = useState(!quality) // ✅ Auto-expand if quality missing
  const [showMoreServers, setShowMoreServers] = useState(false) // NEW: Toggle to show more servers for selected quality
  const [expandedQuality, setExpandedQuality] = useState<string | null>(null) // NEW: Track which quality section is expanded
  const [expandedQualityServers, setExpandedQualityServers] = useState<{[key: string]: boolean}>({}) // NEW: Track which quality has "show more servers" expanded

  // Smart back navigation handler
  const handleBackNavigation = () => {
    // Check if page was opened in new tab/window (has window.opener or no history)
    const isNewTab = window.opener !== null || window.history.length <= 1
    
    if (isNewTab) {
      // If opened in new tab, try to close it, or fallback to going back to movie page
      if (window.opener) {
        window.close()
      } else {
        // Check if we have a referrer from our own domain
        const referrer = document.referrer
        if (referrer && referrer.includes(window.location.hostname)) {
          window.location.href = referrer
        } else {
          router.push('/')
        }
      }
    } else {
      // Normal navigation - just go back
      window.history.back()
    }
  }

  // Extract IMDb ID and type from the URL parameter
  const extractImdbInfo = (tmdbid: string | null) => {
    if (!tmdbid) return { imdbId: null, type: null }

    if (tmdbid.startsWith("tv")) {
      return { imdbId: `tt${tmdbid.replace("tv", "")}`, type: "tv" }
    } else if (tmdbid.startsWith("movie")) {
      return { imdbId: `tt${tmdbid.replace("movie", "")}`, type: "movie" }
    }

    return { imdbId: `tt${tmdbid}`, type: "movie" }
  }

  const { imdbId, type: contentType } = extractImdbInfo(tmdbid)

  // Clean server/link names with branding replacement
  const cleanServerName = (name: string): string => {
    return replaceBrandingText(name)
  }

  // Fetch VlyxDrive or M4ULinks content
  const {
    data: vlyxDriveData,
    isLoading: vlyxDriveLoading,
    error: vlyxDriveError,
  } = useQuery<VlyxDriveData>({
    queryKey: ["vlyxdrive", driveid ?? null, link ?? null, isM4ULinks],
    queryFn: async () => {
      if (!driveid && !link) throw new Error("Drive ID or link is required")
      
      // NEW: Use m4ulinks-scraper for m4ulinks URLs
      if (isM4ULinks && link) {
        const response = await fetch(`/api/m4ulinks-scraper?url=${encodeURIComponent(link)}`)
        if (!response.ok) {
          throw new Error("Failed to fetch M4ULinks data")
        }
        const data = await response.json()
        
        // Helper function to match quality strings (EXACT match only)
        const matchesQuality = (itemQuality: string | undefined, targetQuality: string | undefined): boolean => {
          if (!targetQuality || !itemQuality) return true
          
          // Normalize both strings for comparison (remove spaces, dashes, underscores, case-insensitive)
          const normalize = (q: string) => q.toLowerCase().replace(/[\s\-_]/g, '')
          const normalizedItem = normalize(itemQuality)
          const normalizedTarget = normalize(targetQuality)
          
          // ✅ EXACT match only - "720p" will NOT match "720p HEVC"
          return normalizedItem === normalizedTarget
        }
        
        // Convert m4ulinks data to VlyxDrive format
        if (data.type === "episode") {
          // Episode-wise structure
          const episodes: EpisodeDownload[] = data.linkData
            .filter((item: any) => item.episodeNumber)
            .map((item: any) => ({
              episodeNumber: item.episodeNumber,
              servers: item.links.map((link: any) => ({
                name: link.name,
                url: link.url,
                style: "",
              })),
            }))
          
          return {
            type: "episode" as const,
            title: "Episode Downloads",
            episodes,
          }
        } else {
          // Quality-wise structure - Preserve quality grouping for m4ulinks
          const qualityGroups: QualityGroup[] = data.linkData.map((item: any) => ({
            quality: item.quality || "Unknown Quality",
            size: item.size || "",
            servers: item.links.map((link: any) => ({
              name: link.name,
              url: link.url,
              style: link.style || "",
            })),
          }))
          
          // Check if selected quality exists
          let hasQualityMatch = false
          if (quality) {
            hasQualityMatch = qualityGroups.some(group => 
              matchesQuality(group.quality, quality)
            )
          }
          
          return {
            type: "movie" as const,
            title: "Download Options",
            qualityGroups, // NEW: Preserve quality grouping
            selectedQuality: quality || null,
            hasQualityMatch,
          }
        }
      }
      
      // Original nextdrive logic
      const qs = driveid ? `driveid=${encodeURIComponent(driveid)}` : `link=${encodeURIComponent(link as string)}`
      const response = await fetch(`/api/nextdrive-scraper?${qs}`)
      if (!response.ok) {
        throw new Error("Failed to fetch VlyxDrive data")
      }
      return await response.json()
    },
    enabled: !!driveid || !!link,
  })

  // Fetch TMDb details using our existing tmdb-details API
  const {
    data: tmdbDetails,
    isLoading: tmdbLoading,
    error: tmdbError,
  } = useQuery<TMDbDetails>({
    queryKey: ["tmdb-content", imdbId, contentType],
    queryFn: async () => {
      if (!imdbId) return null

      // Use our existing tmdb-details API endpoint
      const response = await fetch(`/api/tmdb-details?imdb_id=${imdbId}`)
      if (!response.ok) return null

      const data = await response.json()
      return {
        ...data,
        contentType,
      }
    },
    enabled: !!imdbId,
  })

  // Extract TMDb ID from the details for episode fetching
  const tmdbId = tmdbDetails?.contentType === "tv" ? tmdbDetails?.id : null

  // Fetch episodes if it's a TV series using our API - Use season from URL parameter
  const { data: episodeData } = useQuery<TMDbSeason>({
    queryKey: ["tmdb-episodes", tmdbId, season],
    queryFn: async () => {
      if (!tmdbId || contentType !== "tv") return null

      // Use season from URL parameter, or default to 1 if not provided
      const seasonNumber = season || "1"

      // Use our API to fetch episodes
      const response = await fetch(`/api/tmdb-episodes?id=${tmdbId}&season=${seasonNumber}`)
      if (!response.ok) return null

      return await response.json()
    },
    enabled: !!tmdbId && contentType === "tv" && vlyxDriveData?.type === "episode",
  })

  // ✅ Auto-expand if quality doesn't match after data loads
  useEffect(() => {
    if (vlyxDriveData && quality && !vlyxDriveData.hasQualityMatch) {
      setShowOtherQualities(true) // Auto-expand when quality mismatch detected
    }
  }, [vlyxDriveData, quality])

  // Check if a server is N-Cloud (includes V-Cloud, N-Cloud, and Hub-Cloud)
  const isNCloudServer = (serverName: string, url?: string): boolean => {
    const normalizedServerName = serverName.toLowerCase().replace(/[-\s[\]]/g, "")
    const normalizedUrl = url?.toLowerCase() || ""
    return (
      normalizedServerName.includes("vcloud") || 
      normalizedServerName.includes("ncloud") || 
      normalizedServerName.includes("hubcloud") ||
      normalizedServerName.includes("hubcloud") ||
      normalizedUrl.includes("vcloud.") ||
      normalizedUrl.includes("hubcloud.")
    )
  }
  
  // NEW: Filter and sort servers to prioritize vcloud/hubcloud
  const prioritizeCloudServers = (servers: Array<{name: string, url: string, style?: string}>) => {
    // Separate cloud servers from others
    const cloudServers = servers.filter(s => isNCloudServer(s.name, s.url))
    const otherServers = servers.filter(s => !isNCloudServer(s.name, s.url))
    
    // If quality parameter is set and we have cloud servers, only show cloud servers by default
    if (quality && cloudServers.length > 0) {
      return { 
        priority: cloudServers,
        others: otherServers,
        hasHidden: otherServers.length > 0
      }
    }
    
    // Otherwise show cloud first, then others
    return {
      priority: cloudServers,
      others: otherServers,
      hasHidden: false
    }
  }

  const handleEpisodeClick = (episode: EpisodeDownload) => {
    setSelectedEpisode(episode)
    
    // Check for N-Cloud servers
    const ncloudServers = episode.servers.filter(s => isNCloudServer(s.name))
    
    if (ncloudServers.length > 0) {
      // If there's N-Cloud, show confirmation modal
      setSelectedNCloudServer(ncloudServers[0]) // Use first N-Cloud server
      setShowNCloudConfirm(true)
    } else {
      // No N-Cloud, show server selection modal
      setShowDownloadModal(true)
    }
  }

  const handleMovieNCloudClick = () => {
    if (!vlyxDriveData?.movie) return
    
    const ncloudServers = vlyxDriveData.movie.servers.filter(s => isNCloudServer(s.name))
    if (ncloudServers.length > 0) {
      // Directly go to N-Cloud page for movies (no confirmation popup)
      handleServerClick(ncloudServers[0].url)
    }
  }

  const getServerStyle = (serverName: string, isHighlighted: boolean) => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"

    if (isHighlighted) {
      return `${baseStyle} bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105`
    }

    // Default styles for different server types
    if (serverName.toLowerCase().includes("gdirect") || serverName.toLowerCase().includes("instant")) {
      return `${baseStyle} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700`
    }
    if (serverName.toLowerCase().includes("filepress") || serverName.toLowerCase().includes("gdrive")) {
      return `${baseStyle} bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700`
    }
    if (serverName.toLowerCase().includes("dropgalaxy")) {
      return `${baseStyle} bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700`
    }

    return `${baseStyle} bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600`
  }

  const isServerHighlighted = (serverName: string) => {
    const normalizedServerName = serverName.toLowerCase().replace(/[-\s[\]]/g, "")

    // Always prioritize Hub-Cloud, V-Cloud, N-Cloud first, then G-Direct
    if (!server) {
      return (
        normalizedServerName.includes("hubcloud") ||
        normalizedServerName.includes("vcloud") ||
        normalizedServerName.includes("ncloud") ||
        normalizedServerName.includes("gdirect") ||
        normalizedServerName.includes("instant")
      )
    }

    const normalizedServer = server.toLowerCase().replace(/[-\s[\]]/g, "")

    // More flexible matching
    if (normalizedServerName.includes(normalizedServer) || normalizedServer.includes(normalizedServerName)) {
      return true
    }

    // Special cases for common server name variations
    const serverMappings = {
      gdirect: ["gdirect", "instant", "direct"],
      hubcloud: ["hubcloud", "vcloud", "ncloud", "cloud"],
      ncloud: ["hubcloud", "vcloud", "ncloud", "cloud"],
      vcloud: ["hubcloud", "vcloud", "ncloud", "cloud"],
      gdrive: ["gdrive", "gdtot", "drive"],
      gdtot: ["gdtot", "gdrive", "drive"],
    }

    for (const [key, variants] of Object.entries(serverMappings)) {
      if (variants.includes(normalizedServer) && variants.some((variant) => normalizedServerName.includes(variant))) {
        return true
      }
    }

    return false
  }

  // Function to check if a URL is an N-Cloud link (any vcloud or hubcloud domain)
  const isNCloudLink = (url: string): boolean => {
    // Check for vcloud or hubcloud in the URL hostname (matches vcloud.lol, hubcloud.one, etc.)
    return /vcloud\./i.test(url) || /hubcloud\./i.test(url)
  }

  // Function to extract N-Cloud ID from URL
  const extractNCloudId = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      return pathParts[pathParts.length - 1] || null
    } catch {
      return null
    }
  }

  // Function to handle N-Cloud/Hub-Cloud link click
  const handleNCloudClick = (url: string) => {
    const displayPoster = hasTmdbData ? tmdbDetails?.poster || tmdbDetails?.poster_path : null
    const posterUrl = displayPoster 
      ? displayPoster.startsWith('http') 
        ? displayPoster 
        : `https://image.tmdb.org/t/p/w500${displayPoster}`
      : ""

    try {
      // NEW: Always pass the full URL (critical for hubcloud with /video/, /drive/, etc.)
      const encodedKey = encodeNCloudParams({
        id: "", // ID not needed when we have full URL
        title: displayTitle,
        ...(posterUrl && { poster: posterUrl }),
        url: url // CRITICAL: Pass the FULL URL as-is
      })

      // Add action parameter if present
      const actionParam = action ? `&action=${action}` : ''
      
      // Check if encoding succeeded
      if (encodedKey && encodedKey.trim() !== '') {
        window.location.href = `/ncloud?key=${encodedKey}${actionParam}`
      } else {
        // Fallback to direct URL method if encoding fails
        window.location.href = `/ncloud?url=${encodeURIComponent(url)}${actionParam}`
      }
    } catch (error) {
      // If encoding throws an error, use fallback method
      console.error('Error encoding NCloud params, using fallback:', error)
      const actionParam = action ? `&action=${action}` : ''
      window.location.href = `/ncloud?url=${encodeURIComponent(url)}${actionParam}`
    }
  }

  // Function to handle server click (checks for N-Cloud links)
  const handleServerClick = (url: string) => {
    if (isNCloudLink(url)) {
      handleNCloudClick(url)
    } else {
      window.open(url, "_blank")
    }
  }

  // Enhanced server style with v-cloud preference
  const getEnhancedServerStyle = (serverName: string, isHighlighted: boolean) => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"

    // N-Cloud gets special treatment with yellow/orange gradient and lightning icon
    if (isNCloudServer(serverName)) {
      return `${baseStyle} bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-yellow-400`
    }

    if (isHighlighted) {
      return `${baseStyle} bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105`
    }

    // Default styles for different server types
    if (serverName.toLowerCase().includes("gdirect") || serverName.toLowerCase().includes("instant")) {
      return `${baseStyle} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700`
    }
    if (serverName.toLowerCase().includes("filepress") || serverName.toLowerCase().includes("gdrive")) {
      return `${baseStyle} bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700`
    }
    if (serverName.toLowerCase().includes("dropgalaxy")) {
      return `${baseStyle} bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700`
    }

    return `${baseStyle} bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600`
  }

  if ((!driveid && !link) || !tmdbid) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-24 w-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Invalid URL</h1>
          <p className="text-gray-400 mb-6">Missing required parameters (link or driveid) and tmdbid. Please access through a movie page.</p>
          <Button 
            onClick={handleBackNavigation}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  if (vlyxDriveLoading) {
    return <VlyxDrivePageSkeleton />
  }

  if (vlyxDriveError || !vlyxDriveData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-24 w-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Failed to Load Content</h1>
          <p className="text-gray-400 mb-6">Unable to fetch download information</p>
          <Button 
            onClick={handleBackNavigation}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  const displayTitle = replaceBrandingText(tmdbDetails?.title || tmdbDetails?.name || vlyxDriveData.title || "Unknown Title")
  const hasTmdbData = tmdbDetails && !tmdbError && !tmdbLoading
  const displayPoster = hasTmdbData ? tmdbDetails.poster : null
  const displayBackdrop = hasTmdbData ? tmdbDetails.backdrop : null

  // If no TMDB data available, show minimal design
  if (!hasTmdbData) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Simple Header */}
        <section className="py-8 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              onClick={handleBackNavigation}
              variant="outline"
              className="mb-6 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-white">{displayTitle}</h1>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge className="bg-blue-600/90 backdrop-blur-sm text-white">
                  {vlyxDriveData.type === "episode" ? "TV Series" : "Movie"} • VlyxDrive
                  {season && ` • Season ${season}`}
                </Badge>
                {quality && vlyxDriveData.hasQualityMatch && (
                  <Badge className="bg-green-600/90 backdrop-blur-sm text-white">
                    ✓ Filtered by {quality}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Content Section */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {vlyxDriveData.type === "episode" ? (
              // Minimal Episode Design (Similar to user's HTML example)
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Episodes</h2>
                  <p className="text-gray-400">
                    Select an episode to watch or download
                    {season && ` • Season ${season}`}
                  </p>
                </div>

                <div className="space-y-8">
                  {vlyxDriveData.episodes?.map((episode, index) => (
                    <div key={index} className="text-center">
                      {/* Episode Header */}
                      <h4 className="text-lg font-bold mb-4 text-purple-400">
                        <span className="underline">-:Episode: {episode.episodeNumber}:-</span>
                      </h4>

                      {/* Download Buttons */}
                      <div className="flex flex-wrap justify-center gap-3 mb-6">
                        {episode.servers.map((server, serverIndex) => (
                          <Button
                            key={serverIndex}
                            className={getEnhancedServerStyle(server.name, isServerHighlighted(server.name))}
                            onClick={() => handleServerClick(server.url)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {isNCloudServer(server.name) && <span className="mr-1">⚡</span>}
                            {cleanServerName(server.name)}
                            {isNCloudServer(server.name) && (
                              <Badge className="ml-2 bg-yellow-600 text-white text-xs">Preferred</Badge>
                            )}
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        ))}
                      </div>

                      {/* Separator */}
                      {index < (vlyxDriveData.episodes?.length || 0) - 1 && <hr className="border-gray-700 my-6" />}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Minimal Movie Design
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Download Options</h2>
                  <p className="text-gray-400">
                    Choose your preferred download server
                    {vlyxDriveData.selectedQuality && vlyxDriveData.hasQualityMatch && (
                      <span className="text-green-400"> • {vlyxDriveData.selectedQuality}</span>
                    )}
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">
                  {/* NEW: Handle quality groups if available */}
                  {vlyxDriveData.qualityGroups && vlyxDriveData.qualityGroups.length > 0 ? (
                    <div className="space-y-4">
                      {vlyxDriveData.qualityGroups.map((group, index) => {
                        const ncloudServers = group.servers.filter(s => isNCloudServer(s.name, s.url))
                        const otherServers = group.servers.filter(s => !isNCloudServer(s.name, s.url))
                        const showMoreForThisQuality = expandedQualityServers[group.quality] || false
                        
                        return (
                          <div key={index} className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                            <h3 className="text-xl font-bold mb-4 text-center text-white">
                              {group.quality} {group.size && `[${group.size}]`}
                            </h3>
                            
                            {/* Show N-Cloud button prominently */}
                            {ncloudServers.length > 0 ? (
                              <div className="space-y-3">
                                <Button
                                  className="w-full px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                  onClick={() => handleServerClick(ncloudServers[0].url)}
                                >
                                  <Download className="h-5 w-5 mr-2" />
                                  ⚡ Continue with N-Cloud
                                </Button>
                                
                                {/* Show more servers button */}
                                {(ncloudServers.length > 1 || otherServers.length > 0) && (
                                  <div className="space-y-3">
                                    <button
                                      onClick={() => setExpandedQualityServers(prev => ({...prev, [group.quality]: !showMoreForThisQuality}))}
                                      className="w-full text-center py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                    >
                                      {showMoreForThisQuality ? '▲ Hide other servers' : `▼ Show ${ncloudServers.length - 1 + otherServers.length} more server${(ncloudServers.length - 1 + otherServers.length) > 1 ? 's' : ''}`}
                                    </button>
                                    
                                    {showMoreForThisQuality && (
                                      <div className="flex flex-wrap justify-center gap-3">
                                        {/* Additional N-Cloud servers */}
                                        {ncloudServers.slice(1).map((server, serverIndex) => (
                                          <Button
                                            key={`ncloud-${serverIndex}`}
                                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 text-white hover:from-yellow-600 hover:to-orange-600"
                                            onClick={() => handleServerClick(server.url)}
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            ⚡ {cleanServerName(server.name)}
                                            <ExternalLink className="h-4 w-4 ml-2" />
                                          </Button>
                                        ))}
                                        {/* Other servers */}
                                        {otherServers.map((server, serverIndex) => (
                                          <Button
                                            key={`other-${serverIndex}`}
                                            className={getEnhancedServerStyle(server.name, isServerHighlighted(server.name))}
                                            onClick={() => handleServerClick(server.url)}
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            {cleanServerName(server.name)}
                                            <ExternalLink className="h-4 w-4 ml-2" />
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // No N-Cloud, show all servers
                              <div className="flex flex-wrap justify-center gap-3">
                                {group.servers.map((server, serverIndex) => (
                                  <Button
                                    key={serverIndex}
                                    className={getEnhancedServerStyle(server.name, isServerHighlighted(server.name))}
                                    onClick={() => handleServerClick(server.url)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    {cleanServerName(server.name)}
                                    <ExternalLink className="h-4 w-4 ml-2" />
                                  </Button>
                                ))}
                              </div>
                            )}
                            
                            {index < vlyxDriveData.qualityGroups.length - 1 && <hr className="border-gray-700 my-6" />}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // FALLBACK: Old format
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                      <div className="flex flex-wrap justify-center gap-3">
                        {vlyxDriveData.movie?.servers.map((server, index) => (
                          <Button
                            key={index}
                            className={getEnhancedServerStyle(server.name, isServerHighlighted(server.name))}
                            onClick={() => handleServerClick(server.url)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {isNCloudServer(server.name) && <span className="mr-1">⚡</span>}
                            {cleanServerName(server.name)}
                            {isNCloudServer(server.name) && (
                              <Badge className="ml-2 bg-yellow-600 text-white text-xs">Preferred</Badge>
                            )}
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        ))}
                      </div>

                      {vlyxDriveData.movie?.alternatives && vlyxDriveData.movie.alternatives.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-700">
                          <h4 className="text-lg font-semibold mb-4 text-center text-gray-300">Alternative Sources</h4>
                          <div className="space-y-2">
                            {vlyxDriveData.movie.alternatives.map((alt, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                              >
                                <span className="text-gray-300">{alt.name}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(alt.url, "_blank")}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Open
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <VlyxDriveDebugPopup debugFetcher={() => runVlyxDriveDiagnostics(driveid, link)} />
      </div>
    )
  }

  // Full design with TMDB data
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-sm"
            style={{ backgroundImage: `url('${displayBackdrop}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        </div>

        <div className="relative z-10 pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              onClick={handleBackNavigation}
              variant="outline"
              className="mb-8 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <div className="relative z-10 flex items-center min-h-[50vh] pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <Badge className="bg-blue-600/90 backdrop-blur-sm text-white mb-4">
                  {vlyxDriveData.type === "episode" ? "TV Series" : "Movie"} • VlyxDrive
                  {season && ` • Season ${season}`}
                </Badge>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                  {displayTitle}
                </h1>

                {tmdbDetails?.overview && (
                  <p className="text-xl text-gray-200 mb-8 max-w-3xl leading-relaxed">{tmdbDetails.overview}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  {tmdbDetails?.rating && (
                    <div className="flex items-center gap-2 bg-yellow-600/20 backdrop-blur-sm rounded-full px-4 py-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-yellow-500 font-bold text-lg">{tmdbDetails.rating}</span>
                    </div>
                  )}

                  {server && (
                    <Badge className="bg-green-600/90 backdrop-blur-sm text-white px-4 py-2">Preferred: {server}</Badge>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src={displayPoster || "/placeholder.svg"}
                    alt={displayTitle}
                    className="relative w-64 sm:w-72 lg:w-80 h-auto rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {vlyxDriveData.type === "episode" ? (
            // Episode View
            <div>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Episodes</h2>
                <p className="text-gray-400 text-lg">
                  {vlyxDriveData.episodes?.length} episodes available
                  {season && ` • Season ${season}`}
                  {quality && vlyxDriveData.hasQualityMatch && (
                    <span className="ml-2 text-green-400">• Filtered by {quality}</span>
                  )}
                </p>
              </div>

              <div className="space-y-6">
                {vlyxDriveData.episodes?.map((episode, index) => {
                  const tmdbEpisode = episodeData?.episodes?.find((ep) => ep.episode_number === episode.episodeNumber)
                  
                  // NEW: Prioritize cloud servers
                  const { priority: cloudServers, others: otherServers, hasHidden } = prioritizeCloudServers(episode.servers)
                  const displayServers = showAllOptions ? [...cloudServers, ...otherServers] : cloudServers
                  const hasOtherOptions = otherServers.length > 0

                  return (
                    <div
                      key={index}
                      className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-blue-500/50 transition-all duration-300"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Episode Thumbnail */}
                        <div className="lg:col-span-3">
                          <div className="relative aspect-video rounded-xl overflow-hidden group">
                            <img
                              src={
                                tmdbEpisode?.still_path
                                  ? `https://image.tmdb.org/t/p/w500${tmdbEpisode.still_path}`
                                  : displayPoster
                              }
                              alt={`Episode ${episode.episodeNumber}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <Badge className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm">
                              Episode {episode.episodeNumber}
                            </Badge>
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="lg:col-span-5">
                          <h3 className="text-xl font-bold mb-2 text-white">
                            {tmdbEpisode?.name || `Episode ${episode.episodeNumber}`}
                          </h3>

                          {tmdbEpisode?.overview && (
                            <p className="text-gray-400 text-sm mb-4 line-clamp-3">{tmdbEpisode.overview}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            {tmdbEpisode?.air_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(tmdbEpisode.air_date).toLocaleDateString()}
                              </div>
                            )}
                            {tmdbEpisode?.runtime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {tmdbEpisode.runtime}m
                              </div>
                            )}
                            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                              {cloudServers.length} cloud server{cloudServers.length !== 1 ? 's' : ''}
                              {hasOtherOptions && ` +${otherServers.length} more`}
                            </Badge>
                          </div>
                        </div>

                        {/* Access Button */}
                        <div className="lg:col-span-4 space-y-2">
                          <Button
                            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                            onClick={() => handleEpisodeClick(episode)}
                          >
                            <Eye className="h-5 w-5 mr-2" />
                            ⚡ Get Episode (Cloud)
                          </Button>
                          {hasOtherOptions && !showAllOptions && (
                            <button
                              onClick={() => setShowAllOptions(true)}
                              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              Show {otherServers.length} more option{otherServers.length !== 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Movie View
            <div>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Access Options</h2>
                <p className="text-gray-400 text-lg">
                  Watch or Download
                  {vlyxDriveData.selectedQuality && vlyxDriveData.hasQualityMatch && (
                    <span className="ml-2 text-green-400">• {vlyxDriveData.selectedQuality}</span>
                  )}
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {(() => {
                  // NEW: Handle quality groups (m4ulinks format)
                  if (vlyxDriveData.qualityGroups && vlyxDriveData.qualityGroups.length > 0) {
                    const selectedQualityParam = vlyxDriveData.selectedQuality
                    const hasMatch = vlyxDriveData.hasQualityMatch
                    
                    // Helper to match quality (EXACT match only)
                    const matchesQuality = (itemQuality: string, targetQuality: string | null | undefined): boolean => {
                      if (!targetQuality || !itemQuality) return false
                      const normalize = (q: string) => q.toLowerCase().replace(/[\s\-_]/g, '')
                      const normalizedItem = normalize(itemQuality)
                      const normalizedTarget = normalize(targetQuality)
                      // ✅ EXACT match only - "720p" will NOT match "720phevc"
                      return normalizedItem === normalizedTarget
                    }
                    
                    // Find the matching quality group
                    const matchingGroup = selectedQualityParam && hasMatch
                      ? vlyxDriveData.qualityGroups.find(g => matchesQuality(g.quality, selectedQualityParam))
                      : null
                    
                    const otherGroups = matchingGroup
                      ? vlyxDriveData.qualityGroups.filter(g => g.quality !== matchingGroup.quality)
                      : vlyxDriveData.qualityGroups
                    
                    return (
                      <div className="space-y-4">
                        {/* Show matching quality group first (if exists) */}
                        {matchingGroup && (
                          <div className="bg-gray-900/50 rounded-2xl p-6 border-2 border-green-600/50">
                            <div className="mb-4">
                              <h3 className="text-2xl font-bold text-white mb-2">
                                {matchingGroup.quality} {matchingGroup.size && `[${matchingGroup.size}]`}
                              </h3>
                              <Badge className="bg-green-600 text-white">Selected Quality</Badge>
                            </div>
                            
                            {(() => {
                              const ncloudServers = matchingGroup.servers.filter(s => isNCloudServer(s.name, s.url))
                              const otherServers = matchingGroup.servers.filter(s => !isNCloudServer(s.name, s.url))
                              
                              return (
                                <div className="space-y-4">
                                  {/* Show N-Cloud button prominently */}
                                  {ncloudServers.length > 0 && (
                                    <div className="space-y-3">
                                      <Button
                                        className="w-full px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                        onClick={() => handleServerClick(ncloudServers[0].url)}
                                      >
                                        <Eye className="h-5 w-5 mr-2" />
                                        ⚡ Continue with N-Cloud
                                      </Button>
                                      
                                      {/* ✅ Show more servers button (includes both additional N-Cloud AND other servers) */}
                                      {(ncloudServers.length > 1 || otherServers.length > 0) && (
                                        <div className="space-y-3">
                                          <button
                                            onClick={() => setShowMoreServers(!showMoreServers)}
                                            className="w-full text-center py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                          >
                                            {showMoreServers ? '▲ Hide other servers' : `▼ Show ${ncloudServers.length - 1 + otherServers.length} more server${(ncloudServers.length - 1 + otherServers.length) > 1 ? 's' : ''}`}
                                          </button>
                                          
                                          {showMoreServers && (
                                            <div className="space-y-2">
                                              {/* Additional N-Cloud servers */}
                                              {ncloudServers.slice(1).map((server, idx) => (
                                                <Button
                                                  key={`ncloud-${idx}`}
                                                  className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl"
                                                  onClick={() => handleServerClick(server.url)}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-2" />
                                                  ⚡ {cleanServerName(server.name)}
                                                </Button>
                                              ))}
                                              {/* Other servers */}
                                              {otherServers.map((server, idx) => (
                                                <Button
                                                  key={`other-${idx}`}
                                                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                                                  onClick={() => handleServerClick(server.url)}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-2" />
                                                  {cleanServerName(server.name)}
                                                </Button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* If no N-Cloud, show all servers directly */}
                                  {ncloudServers.length === 0 && (
                                    <div className="space-y-2">
                                      {matchingGroup.servers.map((server, idx) => (
                                        <Button
                                          key={idx}
                                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                                          onClick={() => handleServerClick(server.url)}
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          {cleanServerName(server.name)}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                        
                        {/* Show other qualities button */}
                        {otherGroups.length > 0 && (
                          <div className="space-y-4">
                            <button
                              onClick={() => setShowOtherQualities(!showOtherQualities)}
                              className="w-full text-center py-3 px-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-all duration-300"
                            >
                              {showOtherQualities ? '▲ Hide other qualities' : `▼ Show ${otherGroups.length} other ${otherGroups.length > 1 ? 'qualities' : 'quality'}`}
                            </button>
                            
                            {/* Show other quality groups as collapsible */}
                            {showOtherQualities && (
                              <div className="space-y-3">
                                {otherGroups.map((group, index) => (
                                  <div key={index} className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                                    <button
                                      onClick={() => setExpandedQuality(expandedQuality === group.quality ? null : group.quality)}
                                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                                    >
                                      <div>
                                        <h4 className="text-lg font-bold text-white">
                                          {group.quality} {group.size && `[${group.size}]`}
                                        </h4>
                                        <p className="text-sm text-gray-400">{group.servers.length} server{group.servers.length > 1 ? 's' : ''} available</p>
                                      </div>
                                      <span className="text-gray-400">{expandedQuality === group.quality ? '▲' : '▼'}</span>
                                    </button>
                                    
                                    {expandedQuality === group.quality && (
                                      <div className="px-6 pb-4 space-y-2">
                                        {(() => {
                                          const ncloudServers = group.servers.filter(s => isNCloudServer(s.name, s.url))
                                          const otherServers = group.servers.filter(s => !isNCloudServer(s.name, s.url))
                                          const showMoreForThisQuality = expandedQualityServers[group.quality] || false
                                          
                                          return (
                                            <div className="space-y-2">
                                              {/* Show N-Cloud button prominently */}
                                              {ncloudServers.length > 0 && (
                                                <div className="space-y-2">
                                                  <Button
                                                    className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-semibold"
                                                    onClick={() => handleServerClick(ncloudServers[0].url)}
                                                  >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    ⚡ Continue with N-Cloud
                                                  </Button>
                                                  
                                                  {/* Show more servers button (includes both additional N-Cloud AND other servers) */}
                                                  {(ncloudServers.length > 1 || otherServers.length > 0) && (
                                                    <div className="space-y-2">
                                                      <button
                                                        onClick={() => setExpandedQualityServers(prev => ({...prev, [group.quality]: !showMoreForThisQuality}))}
                                                        className="w-full text-center py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                                      >
                                                        {showMoreForThisQuality ? '▲ Hide other servers' : `▼ Show ${ncloudServers.length - 1 + otherServers.length} more server${(ncloudServers.length - 1 + otherServers.length) > 1 ? 's' : ''}`}
                                                      </button>
                                                      
                                                      {showMoreForThisQuality && (
                                                        <div className="space-y-2">
                                                          {/* Additional N-Cloud servers */}
                                                          {ncloudServers.slice(1).map((server, idx) => (
                                                            <Button
                                                              key={`ncloud-${idx}`}
                                                              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl"
                                                              onClick={() => handleServerClick(server.url)}
                                                            >
                                                              <ExternalLink className="h-4 w-4 mr-2" />
                                                              ⚡ {cleanServerName(server.name)}
                                                            </Button>
                                                          ))}
                                                          {/* Other servers */}
                                                          {otherServers.map((server, idx) => (
                                                            <Button
                                                              key={`other-${idx}`}
                                                              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                                                              onClick={() => handleServerClick(server.url)}
                                                            >
                                                              <ExternalLink className="h-4 w-4 mr-2" />
                                                              {cleanServerName(server.name)}
                                                            </Button>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              
                                              {/* If no N-Cloud, show all servers directly */}
                                              {ncloudServers.length === 0 && (
                                                <div className="space-y-2">
                                                  {group.servers.map((server, idx) => (
                                                    <Button
                                                      key={idx}
                                                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                                                      onClick={() => handleServerClick(server.url)}
                                                    >
                                                      <ExternalLink className="h-4 w-4 mr-2" />
                                                      {cleanServerName(server.name)}
                                                    </Button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  // FALLBACK: Old format (for backward compatibility)
                  const hasNCloud = vlyxDriveData.movie?.servers.some(s => isNCloudServer(s.name))
                  
                  return hasNCloud ? (
                    <div className="text-center space-y-4">
                      <Button
                        className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                        onClick={handleMovieNCloudClick}
                      >
                        <Eye className="h-5 w-5 mr-2" />
                        ⚡ Continue with N-Cloud
                      </Button>
                      <button
                        onClick={() => setShowDownloadModal(true)}
                        className="block mx-auto text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Show more options
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                      <h3 className="text-2xl font-bold mb-6 text-center">Select Server</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vlyxDriveData.movie?.servers.map((server, index) => (
                          <Button
                            key={index}
                            className={getEnhancedServerStyle(server.name, isServerHighlighted(server.name))}
                            onClick={() => handleServerClick(server.url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {cleanServerName(server.name)}
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* N-Cloud Confirmation Modal */}
      <Dialog open={showNCloudConfirm} onOpenChange={setShowNCloudConfirm}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700 p-4 md:p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 md:mb-4 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Eye className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-white mb-2">
                Ready to Access!
              </DialogTitle>
            </DialogHeader>
            
            {selectedNCloudServer && (
              <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 text-left">
                <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs md:text-sm">Server:</span>
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                      ⚡ N-Cloud (Preferred)
                    </Badge>
                  </div>
                  {selectedEpisode && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs md:text-sm">Episode:</span>
                      <span className="text-white text-sm md:text-base font-semibold">Episode {selectedEpisode.episodeNumber}</span>
                    </div>
                  )}
                  {season && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs md:text-sm">Season:</span>
                      <span className="text-white text-sm md:text-base">{season}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 md:mt-6 space-y-2 md:space-y-3">
              <Button
                onClick={() => {
                  if (selectedNCloudServer) {
                    handleServerClick(selectedNCloudServer.url)
                    setShowNCloudConfirm(false)
                  }
                }}
                className="w-full px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm md:text-base font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <ExternalLink className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Continue with N-Cloud
              </Button>
              
              <button
                onClick={() => {
                  setShowNCloudConfirm(false)
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

      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <Eye className="h-6 w-6 text-blue-500" />
                <div>
                  <div>
                    {selectedEpisode ? `Episode ${selectedEpisode.episodeNumber} - Select Server` : 'Select Server'}
                  </div>
                  {server && <div className="text-sm text-gray-400 font-normal">Preferred: {server}</div>}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              {(() => {
                // Get servers and prioritize cloud servers
                const allServers = selectedEpisode ? selectedEpisode.servers : vlyxDriveData?.movie?.servers || []
                const { priority: cloudServers, others: otherServers } = prioritizeCloudServers(allServers)
                const serversToShow = [...cloudServers, ...(showAllOptions ? otherServers : [])]
                
                return (
                  <>
                    {serversToShow.map((server, index) => {
                      const isCloud = isNCloudServer(server.name, server.url)
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${isCloud ? "bg-yellow-500" : "bg-green-500"}`}
                            />
                            <span className="text-white font-medium">{cleanServerName(server.name)}</span>
                            {isCloud && (
                              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg">
                                ⚡ Preferred
                              </Badge>
                            )}
                            {isServerHighlighted(server.name) && !isCloud && (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/50">Recommended</Badge>
                            )}
                          </div>
                          <Button
                            onClick={() => handleServerClick(server.url)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Continue
                          </Button>
                        </div>
                      )
                    })}
                    
                    {/* Show More Options Button */}
                    {!showAllOptions && otherServers.length > 0 && (
                      <button
                        onClick={() => setShowAllOptions(true)}
                        className="w-full text-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all duration-300 text-sm font-medium"
                      >
                        Show {otherServers.length} More Option{otherServers.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VlyxDriveDebugPopup debugFetcher={() => runVlyxDriveDiagnostics(driveid, link)} />
    </div>
  )
}

function VlyxDrivePageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-gray-900" />
        <div className="relative z-10 flex items-center min-h-[60vh] pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <Skeleton className="h-8 w-32 mb-4 bg-gray-800" />
                <Skeleton className="h-16 w-full max-w-2xl mb-6 bg-gray-800" />
                <Skeleton className="h-24 w-full max-w-3xl mb-8 bg-gray-800" />
              </div>
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <Skeleton className="w-64 h-96 bg-gray-800 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-64 mx-auto mb-4 bg-gray-800" />
            <Skeleton className="h-6 w-96 mx-auto bg-gray-800" />
          </div>

          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-3">
                    <Skeleton className="aspect-video bg-gray-800 rounded-xl" />
                  </div>
                  <div className="lg:col-span-5">
                    <Skeleton className="h-6 w-48 mb-2 bg-gray-800" />
                    <Skeleton className="h-16 w-full mb-4 bg-gray-800" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-24 bg-gray-800 rounded" />
                      <Skeleton className="h-4 w-16 bg-gray-800 rounded" />
                    </div>
                  </div>
                  <div className="lg:col-span-4">
                    <div className="flex gap-2 mb-2">
                      <Skeleton className="h-8 w-20 bg-gray-800 rounded" />
                      <Skeleton className="h-8 w-24 bg-gray-800 rounded" />
                      <Skeleton className="h-8 w-18 bg-gray-800 rounded" />
                    </div>
                    <Skeleton className="h-8 w-full bg-gray-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// Debug fetcher that calls API with debug=1 and returns only the debug payload
async function runVlyxDriveDiagnostics(driveid: string | null, link: string | null) {
  if (!driveid && !link) throw new Error("Drive ID or link is required for debug")
  const qs = driveid ? `driveid=${encodeURIComponent(driveid)}` : `link=${encodeURIComponent(link as string)}`
  const res = await fetch(`/api/nextdrive-scraper?${qs}&debug=1`, { cache: "no-store" })
  if (!res.ok) {
    // try to parse any message
    let message = "Failed to run diagnostics"
    try {
      const j = await res.json()
      message = j?.error || message
    } catch {}
    throw new Error(message)
  }
  const json = await res.json()
  // API returns { data, debug } when debug=1; fallback if older API shape
  return (
    json?.debug ?? {
      note: "Endpoint did not return debug payload; update API to support debug=1.",
    }
  )
}
