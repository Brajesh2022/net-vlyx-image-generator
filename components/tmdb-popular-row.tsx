"use client"

import { useRouter } from "next/navigation"
import { Play } from "lucide-react"
import { HorizontalScroll } from "@/components/horizontal-scroll"
import { SecureImage } from "@/components/secure-image"

interface TMDBItem {
  id: number
  rank: number
  title: string
  overview: string
  poster: string | null
  backdrop: string | null
  rating: string | null
  releaseDate: string
  mediaType: string
  originalLanguage: string
  isIndian: boolean
}

interface TMDBPopularRowProps {
  title: string
  items: TMDBItem[]
}

export function TMDBPopularRow({ title, items }: TMDBPopularRowProps) {
  const router = useRouter()

  const handleClick = (item: TMDBItem) => {
    // Trigger search for the trending title
    const searchUrl = `/?search=${encodeURIComponent(item.title)}`
    router.push(searchUrl)
  }

  if (items.length === 0) return null

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>

      <HorizontalScroll>
        <div className="flex gap-4 pb-4">
          {items.map((item) => {
            const imgSrc = item.poster || item.backdrop || "/placeholder.svg"

            return (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className="relative flex-shrink-0 w-40 md:w-48 cursor-pointer group transition-transform duration-300 hover:scale-105"
              >
                {/* Netflix-style Ranking Number - Positioned slightly above poster */}
                <div className="absolute -left-3 md:-left-4 bottom-4 md:bottom-8 z-20 pointer-events-none">
                  <div
                    className="text-[120px] md:text-[160px] font-black leading-none"
                    style={{
                      WebkitTextStroke: "3px #1a1a1a",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 0 20px rgba(0,0,0,0.8)",
                    }}
                  >
                    {item.rank}
                  </div>
                </div>

                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ml-10 md:ml-14">
                  <SecureImage
                    src={imgSrc}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 128px, 160px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="h-6 w-6 text-white ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </HorizontalScroll>
    </div>
  )
}
