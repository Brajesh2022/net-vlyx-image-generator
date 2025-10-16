"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
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

interface NextDriveData {
  type: "episode" | "movie"
  title: string
  episodes?: EpisodeDownload[]
  movie?: MovieDownload
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
  const key = searchParams.get("key")
  
  // Decode parameters from key (backward compatible)
  const params = key ? decodeVlyxDriveParams(key) : {
    driveid: searchParams.get("driveid") || undefined,
    link: searchParams.get("link") || undefined,
    tmdbid: searchParams.get("tmdbid") || undefined,
    season: searchParams.get("season") || undefined,
    server: searchParams.get("server") || undefined,
  }
  
  const { driveid, link, tmdbid, season, server } = params

  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeDownload | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showNCloudConfirm, setShowNCloudConfirm] = useState(false)
  const [selectedNCloudServer, setSelectedNCloudServer] = useState<{name: string, url: string} | null>(null)

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

  // Fetch NextDrive content
  const {
    data: nextDriveData,
    isLoading: nextDriveLoading,
    error: nextDriveError,
  } = useQuery<NextDriveData>({
    queryKey: ["nextdrive", driveid ?? null, link ?? null],
    queryFn: async () => {
      if (!driveid && !link) throw new Error("Drive ID or link is required")
      const qs = driveid ? `driveid=${encodeURIComponent(driveid)}` : `link=${encodeURIComponent(link as string)}`
      const response = await fetch(`/api/nextdrive-scraper?${qs}`)
      if (!response.ok) {
        throw new Error("Failed to fetch NextDrive data")
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
    enabled: !!tmdbId && contentType === "tv" && nextDriveData?.type === "episode",
  })

  // Check if a server is N-Cloud (formerly N-Cloud)
  const isNCloudServer = (serverName: string): boolean => {
    const normalizedServerName = serverName.toLowerCase().replace(/[-\s[\]]/g, "")
    return normalizedServerName.includes("vcloud") || normalizedServerName.includes("v-cloud") || normalizedServerName.includes("ncloud") || normalizedServerName.includes("n-cloud")
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
    if (!nextDriveData?.movie) return
    
    const ncloudServers = nextDriveData.movie.servers.filter(s => isNCloudServer(s.name))
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

    // Always prioritize V-Cloud first, then G-Direct
    if (!server) {
      return (
        normalizedServerName.includes("vcloud") ||
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
      ncloud: ["vcloud", "ncloud", "cloud"],
      vcloud: ["vcloud", "ncloud", "cloud"],
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

  // Function to check if a URL is an N-Cloud link (any vcloud domain)
  const isNCloudLink = (url: string): boolean => {
    // Check for vcloud in the URL hostname (matches vcloud.lol, vcloud.zip, vcloud.*, etc.)
    return /vcloud\./i.test(url)
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

  // Function to handle N-Cloud link click
  const handleNCloudClick = (url: string) => {
    const ncloudId = extractNCloudId(url)
    if (!ncloudId) {
      window.open(url, "_blank")
      return
    }

    const displayPoster = hasTmdbData ? tmdbDetails?.poster || tmdbDetails?.poster_path : null
    const posterUrl = displayPoster 
      ? displayPoster.startsWith('http') 
        ? displayPoster 
        : `https://image.tmdb.org/t/p/w500${displayPoster}`
      : ""

    const encodedKey = encodeNCloudParams({
      id: ncloudId,
      title: displayTitle,
      ...(posterUrl && { poster: posterUrl })
    })

    window.location.href = `/ncloud?key=${encodedKey}`
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

  if (nextDriveLoading) {
    return <NextDrivePageSkeleton />
  }

  if (nextDriveError || !nextDriveData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-24 w-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Failed to Load Content</h1>
          <p className="text-gray-400 mb-6">Unable to fetch download information</p>
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

  const displayTitle = replaceBrandingText(tmdbDetails?.title || tmdbDetails?.name || nextDriveData.title || "Unknown Title")
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
            <Link href="/">
              <Button
                variant="outline"
                className="mb-6 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-white">{displayTitle}</h1>
              <Badge className="bg-blue-600/90 backdrop-blur-sm text-white">
                {nextDriveData.type === "episode" ? "TV Series" : "Movie"} • NextDrive
                {season && ` • Season ${season}`}
              </Badge>
            </div>
          </div>
        </section>

        {/* Minimal Content Section */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {nextDriveData.type === "episode" ? (
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
                  {nextDriveData.episodes?.map((episode, index) => (
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
                      {index < (nextDriveData.episodes?.length || 0) - 1 && <hr className="border-gray-700 my-6" />}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Minimal Movie Design
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Download Options</h2>
                  <p className="text-gray-400">Choose your preferred download server</p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                    <div className="flex flex-wrap justify-center gap-3">
                      {nextDriveData.movie?.servers.map((server, index) => (
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

                    {nextDriveData.movie?.alternatives && nextDriveData.movie.alternatives.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <h4 className="text-lg font-semibold mb-4 text-center text-gray-300">Alternative Sources</h4>
                        <div className="space-y-2">
                          {nextDriveData.movie.alternatives.map((alt, index) => (
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
            <Link href="/">
              <Button
                variant="outline"
                className="mb-8 bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex items-center min-h-[50vh] pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <Badge className="bg-blue-600/90 backdrop-blur-sm text-white mb-4">
                  {nextDriveData.type === "episode" ? "TV Series" : "Movie"} • NextDrive
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
          {nextDriveData.type === "episode" ? (
            // Episode View
            <div>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Episodes</h2>
                <p className="text-gray-400 text-lg">
                  {nextDriveData.episodes?.length} episodes available
                  {season && ` • Season ${season}`}
                </p>
              </div>

              <div className="space-y-6">
                {nextDriveData.episodes?.map((episode, index) => {
                  const tmdbEpisode = episodeData?.episodes?.find((ep) => ep.episode_number === episode.episodeNumber)

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
                              {episode.servers.length} servers
                            </Badge>
                          </div>
                        </div>

                        {/* Access Button */}
                        <div className="lg:col-span-4">
                          <Button
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                            onClick={() => handleEpisodeClick(episode)}
                          >
                            <Eye className="h-5 w-5 mr-2" />
                            Get Episode
                          </Button>
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
                <p className="text-gray-400 text-lg">Watch or Download</p>
              </div>

              <div className="max-w-2xl mx-auto">
                {(() => {
                  const hasNCloud = nextDriveData.movie?.servers.some(s => isNCloudServer(s.name))
                  
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
                        {nextDriveData.movie?.servers.map((server, index) => (
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
              {(selectedEpisode ? selectedEpisode.servers : nextDriveData?.movie?.servers || []).map((server, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${isNCloudServer(server.name) ? "bg-yellow-500" : "bg-green-500"}`}
                    />
                    <span className="text-white font-medium">{cleanServerName(server.name)}</span>
                    {isNCloudServer(server.name) && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg">
                        ⚡ Preferred
                      </Badge>
                    )}
                    {isServerHighlighted(server.name) && !isNCloudServer(server.name) && (
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
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VlyxDriveDebugPopup debugFetcher={() => runVlyxDriveDiagnostics(driveid, link)} />
    </div>
  )
}

function NextDrivePageSkeleton() {
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
