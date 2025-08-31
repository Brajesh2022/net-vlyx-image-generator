"use client"

import React, { useState, useEffect } from "react"
import { Star, ChevronDown, ChevronUp, Calendar, Clock, Play, Users, ImageIcon, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { IMDbRating } from "@/components/ui/imdb-rating"

interface TMDBMovieData {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  release_date?: string
  first_air_date?: string
  runtime?: number
  episode_run_time?: number[]
  vote_average: number
  genres: { id: number; name: string }[]
  credits: {
    cast: {
      id: number
      name: string
      character: string
      profile_path?: string
    }[]
  }
  videos: {
    results: {
      key: string
      type: string
      site: string
      name: string
    }[]
  }
  images: {
    backdrops: { file_path: string }[]
    posters: { file_path: string }[]
  }
  media_type?: 'movie' | 'tv'
}

interface AboutMovieProps {
  movieTitle: string
  contentType?: 'movie' | 'tv' | 'auto'
}

const getImageUrl = (path: string | undefined, size: string = "w500"): string => {
  if (!path) return ""
  return `https://image.tmdb.org/t/p/${size}${path}`
}

const formatRuntime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export default function AboutMovie({ movieTitle, contentType = 'auto' }: AboutMovieProps) {
  const [movieData, setMovieData] = useState<TMDBMovieData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMoreImages, setShowMoreImages] = useState(false)
  const [showMoreCast, setShowMoreCast] = useState(false)
  const [imdbRating, setImdbRating] = useState<string | null>(null)
  const [imdbRatingLoading, setImdbRatingLoading] = useState(false)

  // Debug logging
  console.log("AboutMovie component rendered with title:", movieTitle, "contentType:", contentType)

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movieTitle) {
        console.log("No movie title provided, hiding component")
        setLoading(false)
        return
      }

      try {
        console.log("Fetching TMDB data for:", movieTitle, "contentType:", contentType)
        setLoading(true)
        setError(null)

        const response = await fetch("/api/tmdb-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieTitle, contentType }),
        })

        console.log("TMDB API response status:", response.status)

        if (response.ok) {
          const result = await response.json()
          console.log("TMDB API result:", result)
          setMovieData(result.data)
        } else {
          console.log("TMDB API error, hiding component")
          // If no data found, don't show error - just hide the section
          setMovieData(null)
        }
      } catch (err) {
        console.error("Error fetching TMDB data:", err)
        setMovieData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMovieData()
  }, [movieTitle, contentType])

  // Fetch IMDb rating
  useEffect(() => {
    const fetchImdbRating = async () => {
      if (!movieTitle) return
      
      setImdbRatingLoading(true)
      try {
        const response = await fetch("/api/imdb-rating", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieTitle }),
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
  }, [movieTitle])

  // Don't render anything if loading failed or no data found
  if (loading) {
    return <AboutMovieSkeleton />
  }

  if (error || !movieData) {
    return null // Hide section completely if no data
  }

  const displayTitle = movieData.title || movieData.name || "Unknown Title"
  const releaseDate = movieData.release_date || movieData.first_air_date
  const isTVShow = movieData.media_type === 'tv' || movieData.first_air_date
  const runtime = movieData.runtime || (movieData.episode_run_time && movieData.episode_run_time[0])
  const mainCast = movieData.credits.cast.slice(0, 8)
  const additionalCast = movieData.credits.cast.slice(8, 20)
  const trailers = movieData.videos.results.filter(
    (video) => video.site === "YouTube" && video.type === "Trailer"
  )
  const allImages = [
    ...movieData.images.backdrops.slice(0, 6),
    ...movieData.images.posters.slice(0, 3),
  ]

  return (
    <section className="liquid-glass border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <Award className="h-8 w-8 text-yellow-500" />
            About This {isTVShow ? 'Series' : 'Movie'}
          </h2>
          <p className="text-gray-400">
            Additional information from The Movie Database (TMDB)
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Poster and Rating Section */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
                  {movieData.poster_path && (
                    <img
                      src={getImageUrl(movieData.poster_path, "w500")}
                      alt={displayTitle}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  )}
                  
                  {/* Rating Overlay */}
                  <div className="absolute top-4 right-4">
                    <IMDbRating 
                      rating={imdbRating}
                      isLoading={imdbRatingLoading}
                      fallbackRating={movieData.vote_average.toFixed(1)}
                      size="lg"
                      variant="overlay"
                    />
                  </div>

                  {/* Movie Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {displayTitle}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-300">
                      {releaseDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(releaseDate).getFullYear()}</span>
                        </div>
                      )}
                      
                      {runtime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{isTVShow ? `${formatRuntime(runtime)} per episode` : formatRuntime(runtime)}</span>
                        </div>
                      )}
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {movieData.genres.slice(0, 3).map((genre) => (
                        <Badge
                          key={genre.id}
                          className="bg-gray-800/80 text-gray-300 text-xs"
                        >
                          {genre.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            {movieData.overview && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                  Overview
                </h4>
                <p className="text-gray-300 leading-relaxed text-base">
                  {movieData.overview}
                </p>
              </div>
            )}

            {/* Cast Section */}
            {mainCast.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Cast
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {mainCast.map((actor) => (
                    <div
                      key={actor.id}
                      className="bg-gray-800/50 rounded-xl p-3 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="aspect-square w-16 mx-auto mb-3 rounded-full overflow-hidden bg-gray-700">
                        {actor.profile_path ? (
                          <img
                            src={getImageUrl(actor.profile_path, "w185")}
                            alt={actor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium text-sm mb-1 line-clamp-1">
                          {actor.name}
                        </p>
                        <p className="text-gray-400 text-xs line-clamp-1">
                          {actor.character}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show More Cast */}
                {additionalCast.length > 0 && (
                  <Collapsible open={showMoreCast} onOpenChange={setShowMoreCast}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                      >
                        {showMoreCast ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less Cast
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show More Cast ({additionalCast.length} more)
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {additionalCast.map((actor) => (
                          <div
                            key={actor.id}
                            className="bg-gray-800/50 rounded-xl p-3 hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="aspect-square w-16 mx-auto mb-3 rounded-full overflow-hidden bg-gray-700">
                              {actor.profile_path ? (
                                <img
                                  src={getImageUrl(actor.profile_path, "w185")}
                                  alt={actor.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-white font-medium text-sm mb-1 line-clamp-1">
                                {actor.name}
                              </p>
                              <p className="text-gray-400 text-xs line-clamp-1">
                                {actor.character}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Trailers */}
            {trailers.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Play className="h-5 w-5 text-red-500" />
                  Official Trailers
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {trailers.slice(0, 2).map((trailer) => (
                    <div
                      key={trailer.key}
                      className="relative aspect-video rounded-xl overflow-hidden group cursor-pointer"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank')}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`}
                        alt={trailer.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-8 w-8 text-white fill-current ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-medium text-sm line-clamp-1">
                          {trailer.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images Gallery */}
            {allImages.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  Images & Gallery
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {allImages.slice(0, 6).map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={getImageUrl(image.file_path, "w500")}
                        alt={`${displayTitle} - Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>

                {allImages.length > 6 && (
                  <Collapsible open={showMoreImages} onOpenChange={setShowMoreImages}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                      >
                        {showMoreImages ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less Images
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show More Images ({allImages.length - 6} more)
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {allImages.slice(6).map((image, index) => (
                          <div
                            key={index + 6}
                            className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer"
                          >
                            <img
                              src={getImageUrl(image.file_path, "w500")}
                              alt={`${displayTitle} - Image ${index + 7}`}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutMovieSkeleton() {
  return (
    <section className="liquid-glass border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-12">
          <Skeleton className="h-10 w-80 bg-gray-800 mb-4" />
          <Skeleton className="h-5 w-96 bg-gray-800" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Poster Skeleton */}
          <div className="lg:col-span-4">
            <Skeleton className="w-full aspect-[2/3] bg-gray-800 rounded-2xl" />
          </div>

          {/* Content Skeleton */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <Skeleton className="h-6 w-32 bg-gray-800 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-gray-800" />
                <Skeleton className="h-4 w-full bg-gray-800" />
                <Skeleton className="h-4 w-3/4 bg-gray-800" />
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <Skeleton className="h-6 w-24 bg-gray-800 mb-6" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                    <Skeleton className="aspect-square w-16 mx-auto mb-3 rounded-full bg-gray-700" />
                    <Skeleton className="h-4 w-full bg-gray-700 mb-1" />
                    <Skeleton className="h-3 w-3/4 bg-gray-700 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
