"use client"

import { useEffect, useState } from "react"
import { X, Star, Play, Calendar, Film as FilmIcon, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SecureImage } from "@/components/secure-image"

interface MovieInfoModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  onWatchClick: () => void
}

interface MovieDetails {
  id: string
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
  contentType: string
}

export function MovieInfoModal({ isOpen, onClose, title, onWatchClick }: MovieInfoModalProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && title) {
      fetchMovieDetails()
    }
  }, [isOpen, title])

  const fetchMovieDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      // First, search for the movie on TMDB
      const API_KEY = "848d4c9db9d3f19d0229dc95735190d3"
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(title)}`
      )

      if (!searchResponse.ok) {
        throw new Error("Failed to search movie")
      }

      const searchData = await searchResponse.json()
      const results = searchData.results || []

      if (results.length === 0) {
        throw new Error("Movie not found")
      }

      const firstResult = results[0]
      const mediaType = firstResult.media_type || "movie"
      const movieId = firstResult.id

      // Fetch detailed information
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${API_KEY}&append_to_response=credits`
      )

      if (!detailsResponse.ok) {
        throw new Error("Failed to fetch movie details")
      }

      const detailsData = await detailsResponse.json()

      setDetails({
        id: movieId.toString(),
        title: detailsData.title || detailsData.name || title,
        poster: detailsData.poster_path
          ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
          : null,
        backdrop: detailsData.backdrop_path
          ? `https://image.tmdb.org/t/p/original${detailsData.backdrop_path}`
          : null,
        overview: detailsData.overview || "No description available.",
        release_date: detailsData.release_date || detailsData.first_air_date || "N/A",
        rating: detailsData.vote_average ? detailsData.vote_average.toFixed(1) : null,
        cast:
          detailsData.credits?.cast?.slice(0, 8).map((actor: any) => ({
            name: actor.name,
            character: actor.character,
            profile_image: actor.profile_path
              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
              : null,
          })) || [],
        contentType: mediaType === "tv" ? "TV Series" : "Movie",
      })
    } catch (err) {
      console.error("Error fetching movie details:", err)
      setError(err instanceof Error ? err.message : "Failed to load movie details")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">Loading details...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <Button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700">
                Close
              </Button>
            </div>
          </div>
        )}

        {details && !loading && !error && (
          <div className="overflow-y-auto max-h-[90vh] scrollbar-hide">
            {/* Hero Section with Backdrop */}
            <div className="relative h-[50vh] min-h-[400px]">
              {details.backdrop ? (
                <SecureImage
                  src={details.backdrop}
                  alt={details.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Poster */}
                  {details.poster && (
                    <div className="hidden md:block w-32 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-xl">
                      <SecureImage
                        src={details.poster}
                        alt={details.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                      {details.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {details.rating && (
                        <Badge className="bg-yellow-600/90 text-white border-none flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" />
                          {details.rating}
                        </Badge>
                      )}
                      <Badge className="bg-blue-600/90 text-white border-none flex items-center gap-1">
                        <FilmIcon className="h-4 w-4" />
                        {details.contentType}
                      </Badge>
                      {details.release_date && (
                        <Badge className="bg-gray-700/90 text-white border-none flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(details.release_date).getFullYear()}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          onWatchClick()
                          onClose()
                        }}
                        className="bg-white text-black hover:bg-gray-200 font-semibold"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Watch Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-6 md:p-8">
              {/* Overview */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-3">Overview</h3>
                <p className="text-gray-300 leading-relaxed">{details.overview}</p>
              </div>

              {/* Cast */}
              {details.cast.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cast
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {details.cast.map((actor, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2">
                          {actor.profile_image ? (
                            <SecureImage
                              src={actor.profile_image}
                              alt={actor.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-12 w-12 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <p className="text-white font-medium text-sm line-clamp-1">
                          {actor.name}
                        </p>
                        <p className="text-gray-400 text-xs line-clamp-1">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
