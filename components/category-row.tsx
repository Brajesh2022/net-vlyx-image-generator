"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Play, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HorizontalScroll } from "@/components/horizontal-scroll"
import { SecureImage } from "@/components/secure-image"
import { cleanMovieTitle, encodeMovieUrl } from "@/lib/utils"

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

interface CategoryRowProps {
  title: string
  movies: Movie[]
  viewAllLink?: string
  showRanking?: boolean
}

export function CategoryRow({ title, movies, viewAllLink, showRanking = false }: CategoryRowProps) {
  const router = useRouter()

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

  if (movies.length === 0) return null

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        {viewAllLink && (
          <Link href={viewAllLink}>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
            >
              View All
            </Button>
          </Link>
        )}
      </div>

      <HorizontalScroll>
        <div className="flex gap-4 pb-4">
          {movies.map((movie, index) => {
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
                className="relative flex-shrink-0 w-40 md:w-48 cursor-pointer group transition-transform duration-300 hover:scale-105"
              >
                {/* Ranking Number (Netflix-style) */}
                {showRanking && (
                  <div className="absolute -left-4 bottom-0 z-20 pointer-events-none">
                    <div
                      className="text-[120px] md:text-[140px] font-black leading-none"
                      style={{
                        WebkitTextStroke: "3px #1a1a1a",
                        WebkitTextFillColor: "transparent",
                        textShadow: "0 0 20px rgba(0,0,0,0.8)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                )}

                <div
                  className={`relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ${
                    showRanking ? "ml-12" : ""
                  }`}
                >
                  <SecureImage
                    src={imgSrc}
                    alt={cleanTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 160px, 192px"
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
                    <Badge className="bg-yellow-600/90 text-white text-xs flex items-center gap-1">
                      <Star className="h-3 w-3" />
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
      </HorizontalScroll>
    </div>
  )
}
