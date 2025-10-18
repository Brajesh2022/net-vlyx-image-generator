"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Film, Play, Star, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SecureImage } from "@/components/secure-image"
import { cleanMovieTitle, encodeMovieUrl } from "@/lib/utils"

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

function CategoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "sci-fi"

  const [currentPage, setCurrentPage] = useState(1)
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/category", type, currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/category/${type}`)
      if (!response.ok) {
        throw new Error("Failed to fetch movies")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (data && data.movies) {
      setAllMovies(data.movies)
    }
  }, [data])

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    // For now, just simulate loading more
    // In production, you'd fetch the next page
    setTimeout(() => setIsLoadingMore(false), 1000)
  }

  const createMovieSlug = (movie: Movie) => {
    try {
      if (!movie.link) throw new Error("No link")

      const url = movie.link.startsWith("http") ? movie.link : `https://dummy.com${movie.link}`
      const u = new URL(url)
      const parts = u.pathname.split("/").filter(Boolean)

      let slug = parts[parts.length - 1] || ""

      if (!slug || slug === "search" || slug.length < 3) {
        slug = parts[parts.length - 2] || ""
      }

      if (slug && slug.length >= 3) {
        return slug
      }
    } catch (error) {
      // URL parsing failed
    }

    if (movie.title) {
      const titleSlug = movie.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 200)

      if (titleSlug && titleSlug.length >= 2) {
        return titleSlug
      }
    }

    return `movie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      "sci-fi": "Sci-Fi",
      action: "Action",
      drama: "Drama",
      comedy: "Comedy",
      thriller: "Thriller",
      romance: "Romance",
      horror: "Horror",
      animation: "Animation",
      bollywood: "Bollywood",
      "south-movies": "South Movies",
      "dual-audio-movies": "Dual Audio Movies",
      "dual-audio-series": "Dual Audio Series",
      "hindi-dubbed": "Hindi Dubbed",
    }
    return labels[cat] || cat
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-white hover:bg-gray-800/50"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-lg">
                <Film className="h-5 w-5 text-white" />
              </div>
              <Link href="/">
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent cursor-pointer">
                  NetVlyx
                </h1>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{getCategoryLabel(type)}</h1>
            <p className="text-gray-400">Browse all {getCategoryLabel(type).toLowerCase()} content</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400">Loading content...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-8 p-6 bg-red-900/20 border border-red-500/30 rounded-xl">
              <div className="flex items-center space-x-3 text-red-400">
                <span className="font-semibold">Error:</span>
                <span>{error.message}</span>
              </div>
              <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Movies Grid */}
          {allMovies.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {allMovies.map((movie: Movie, index: number) => {
                  const slug = createMovieSlug(movie)
                  if (!slug || slug.length < 2) return null

                  let sourceUrl = "https://www.vegamovies-nl.bike"
                  if (movie.link) {
                    try {
                      const u = new URL(movie.link)
                      sourceUrl = u.origin
                    } catch {
                      sourceUrl = movie.link
                    }
                  }

                  const encodedUrl = encodeMovieUrl(slug, sourceUrl)
                  const movieUrl = `/v/${encodedUrl}`

                  const imgSrc =
                    movie.image ||
                    "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"

                  const cleanTitle = cleanMovieTitle(movie.title)

                  return (
                    <div
                      key={`${slug}-${index}`}
                      onClick={() => router.push(movieUrl)}
                      className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900">
                        <SecureImage
                          src={imgSrc}
                          alt={cleanTitle}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-white ml-1" />
                          </div>
                        </div>

                        {movie.category && (
                          <Badge className="absolute top-2 right-2 bg-red-600/90 text-white text-xs">
                            {movie.category}
                          </Badge>
                        )}
                        <div className="absolute top-2 left-2 flex items-center space-x-1">
                          <Badge className="bg-yellow-600/90 text-white text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            HD
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 px-1">
                        <h4 className="font-semibold text-sm line-clamp-2 text-white group-hover:text-red-400 transition-colors">
                          {cleanTitle}
                        </h4>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Load More Button */}
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:scale-105"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* No Results */}
          {!isLoading && allMovies.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Film className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">No content found</h3>
              <p className="text-gray-400 mb-6">Try refreshing the page or come back later.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CategoryContent />
    </Suspense>
  )
}
