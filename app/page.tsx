"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Search, Film, Star, Play, ChevronLeft, ChevronRight, Info, Heart, MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useWishlist } from "@/hooks/useWishlist"
import { WishlistModal } from "@/components/wishlist-modal"
import { FeedbackReview } from "@/components/feedback-review"

interface Movie {
  title: string
  image: string
  link: string
  description: string
  category: string
}

interface ParsedMovieData {
  movies: Movie[]
  categories: string[]
  totalMovies: number
}

type SearchType = "search1" | "search2"

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchType, setSearchType] = useState<SearchType>("search1")
  const searchTimeout = useRef<NodeJS.Timeout>()
  const slideInterval = useRef<NodeJS.Timeout>()
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  // TMDb API Key (used directly for testing as requested)
  const API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

  // Wishlist functionality
  const { wishlist, isClient } = useWishlist()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [searchType === "search1" ? "/api/scrape" : "/api/scrape-vega", searchTerm, searchType],
    queryFn: async () => {
      const apiEndpoint = searchType === "search1" ? "/api/scrape" : "/api/scrape-vega"
      const response = await fetch(`${apiEndpoint}${searchTerm ? `?s=${encodeURIComponent(searchTerm)}` : ""}`)
      if (!response.ok) {
        throw new Error("Failed to fetch movies")
      }
      return await response.json()
    },
  })

  // Fetch TMDb suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions")
      }

      const data = await response.json()
      const results = data.results || []

      // Remove duplicates and get clean titles
      const titlesSet = new Set<string>()
      const uniqueTitles: string[] = []

      for (const item of results) {
        const title = item.title || item.name
        if (title && !titlesSet.has(title.toLowerCase())) {
          titlesSet.add(title.toLowerCase())
          uniqueTitles.push(title)
        }
        if (uniqueTitles.length >= 8) break
      }

      setSuggestions(uniqueTitles)
      setShowSuggestions(uniqueTitles.length > 0)
    } catch (error) {
      console.error("Error fetching TMDb suggestions:", error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      refetch()
    }, 500)

    // TMDb suggestions
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const handleSearchSubmit = () => {
    setShowSuggestions(false)
    refetch()
  }

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type)
    setTimeout(() => {
      refetch()
    }, 100)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
    // Trigger the internal search
    setTimeout(() => {
      refetch()
    }, 100)
  }

  const filteredMovies =
    data?.movies.filter((movie) => {
      const matchesCategory = selectedCategory === "all" || movie.category === selectedCategory
      return matchesCategory
    }) || []

  const categories = ["all", ...(data?.categories || [])]

  const createMovieSlug = (movie: { link: string; title: string }) => {
    try {
      const u = new URL(movie.link)
      const parts = u.pathname.split("/").filter(Boolean)
      let slug = parts[parts.length - 1] || ""
      if (!slug || slug === "search") {
        slug = parts[parts.length - 2] || ""
      }
      if (!slug) {
        slug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      }
      return slug
    } catch {
      return movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }
  }

  const heroSlides = useMemo(() => {
    if (!data?.movies || data.movies.length === 0) {
      return [
        {
          title: "Unlimited Entertainment on NetVlyx",
          description:
            "Stream and download thousands of movies and TV shows in stunning quality. Experience the future of entertainment with NetVlyx - your premium destination for the latest content.",
          background:
            "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
          gradient: "from-black via-black/70 to-transparent",
        },
      ]
    }

    const trendingMovies = data.movies.slice(0, 3)

    return trendingMovies.map((movie, index) => ({
      title: movie.title,
      description:
        movie.description || "Experience premium entertainment with crystal clear quality and immersive viewing.",
      background:
        movie.image ||
        `https://images.unsplash.com/photo-${1489599517276 + index}?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80`,
      gradient: "from-black via-black/70 to-transparent",
      movieSlug: createMovieSlug(movie),
    }))
  }, [data?.movies])

  useEffect(() => {
    if (!searchTerm) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
      }, 5000)

      return () => {
        if (slideInterval.current) {
          clearInterval(slideInterval.current)
        }
      }
    }
  }, [searchTerm, heroSlides.length])

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current)
      clearTimeout(searchTimeout.current)
    }
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Enhanced Responsive Header */}
      <header className="fixed top-0 left-0 right-0 z-50 liquid-glass transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 relative">
          {/* Full Width Search Overlay - Covers entire header */}
          {showSearchBar && (
            <div className="absolute inset-0 z-50 flex items-center px-4 animate-in slide-in-from-right duration-700 ease-out">
              <div ref={containerRef} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  placeholder="Search movies, shows..."
                  value={searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchSubmit()
                    }
                    if (e.key === "Escape") {
                      setShowSuggestions(false)
                    }
                  }}
                  className="pl-12 pr-12 w-full glass-effect border-gray-700 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-14 rounded-full bg-black/90 backdrop-blur-xl border-2 shadow-2xl"
                  autoFocus
                />
                <button
                  onClick={() => setShowSearchBar(false)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* TMDb Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-800/70 cursor-pointer transition-colors duration-200 text-white border-b border-gray-800/50 last:border-b-0"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className={`flex items-center justify-between gap-4 transition-all duration-700 ${
              showSearchBar ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
            }`}
          >
            {/* Logo and Website Name */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 netflix-gradient rounded-lg flex items-center justify-center shadow-lg">
                <Film className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                NetVlyx
              </h1>
            </div>

            {/* Desktop Search and Actions */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-end relative">
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Feedback Button */}
                <Button
                  onClick={() => setShowFeedbackModal(true)}
                  className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-full transition-all duration-300 hover:scale-105 p-0 flex items-center justify-center group"
                  title="Review & Feedback"
                >
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 group-hover:animate-pulse" />
                </Button>

                {/* Wishlist Button - Only show if there are items in wishlist */}
                {isClient && wishlist.length > 0 && (
                  <Button
                    onClick={() => setShowWishlistModal(true)}
                    className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-full transition-all duration-300 hover:scale-105 p-0 flex items-center justify-center"
                    title="My Wishlist"
                  >
                    <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 fill-current" />
                    {wishlist.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold min-w-[20px]">
                        {wishlist.length > 9 ? "9+" : wishlist.length}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Search Toggle Button */}
              <Button
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={`relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 rounded-full transition-all duration-500 hover:scale-105 p-0 flex items-center justify-center group ${
                  showSearchBar ? "bg-red-600/20 border-red-600/50 scale-110" : ""
                }`}
                title="Search"
              >
                <Search
                  className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-500 ${
                    showSearchBar
                      ? "text-red-500 rotate-180 scale-125"
                      : "text-gray-400 group-hover:text-white group-hover:scale-110"
                  }`}
                />
              </Button>
            </div>
            {/* Mobile Search and Actions */}
            <div className="flex md:hidden items-center gap-2 flex-1 justify-end">
              {/* Feedback Button */}
              <Button
                onClick={() => setShowFeedbackModal(true)}
                className="relative flex-shrink-0 w-10 h-10 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-full transition-all duration-300 hover:scale-105 p-0 flex items-center justify-center"
                title="Feedback"
              >
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </Button>

              {/* Wishlist Button - Only show if there are items in wishlist */}
              {isClient && wishlist.length > 0 && (
                <Button
                  onClick={() => setShowWishlistModal(true)}
                  className="relative flex-shrink-0 w-10 h-10 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-full transition-all duration-300 hover:scale-105 p-0 flex items-center justify-center"
                  title="Wishlist"
                >
                  <Heart className="h-5 w-5 text-red-500 fill-current" />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold min-w-[20px]">
                      {wishlist.length > 9 ? "9+" : wishlist.length}
                    </span>
                  )}
                </Button>
              )}

              {/* Search Toggle Button */}
              <Button
                onClick={() => setShowSearchBar(!showSearchBar)}
                className="relative flex-shrink-0 w-10 h-10 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 rounded-full transition-all duration-300 hover:scale-105 p-0 flex items-center justify-center group"
                title="Search"
              >
                <Search className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16 sm:pt-20">
        {/* Hero Section */}
        {!searchTerm && (
          <section className="relative h-[70vh] sm:h-[80vh] lg:h-[85vh] overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 bg-gray-900">
                <div className="relative z-20 h-full flex items-center">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-4xl">
                      <div className="mb-4">
                        <div className="h-6 w-24 bg-gray-800 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-4 mb-6">
                        <div className="h-8 sm:h-12 lg:h-16 w-full bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-8 sm:h-12 lg:h-16 w-3/4 bg-gray-800 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-3 mb-8">
                        <div className="h-4 w-full bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-4 w-5/6 bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-4 w-2/3 bg-gray-800 rounded animate-pulse"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-12 w-32 bg-gray-800/30 hover:bg-gray-800/50 rounded-full items-center justify-center transition-colors group">
                          <ChevronLeft className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="h-12 w-32 bg-gray-800/30 hover:bg-gray-800/50 rounded-full items-center justify-center transition-colors group">
                          <ChevronRight className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="absolute inset-0">
                  {heroSlides.map((slide, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                        index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
                      }`}
                    >
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.background})` }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
                    </div>
                  ))}
                </div>

                <div className="relative z-20 h-full flex items-center">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-2xl lg:max-w-4xl">
                      <div className="mb-3 sm:mb-4">
                        <Badge className="bg-red-600/90 text-white border-none text-xs sm:text-sm px-3 py-1">
                          Trending Now
                        </Badge>
                      </div>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight">
                        {heroSlides[currentSlide].title}
                      </h1>
                      <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 sm:mb-8 leading-relaxed max-w-xl lg:max-w-2xl">
                        {heroSlides[currentSlide].description}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {heroSlides[currentSlide].movieSlug ? (
                          <Link href={`/movie/${heroSlides[currentSlide].movieSlug}`}>
                            <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-white text-black font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base">
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              Watch Now
                            </Button>
                          </Link>
                        ) : (
                          <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-white text-black font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base">
                            <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Explore Now
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gray-600/50 text-white border-gray-400 hover:bg-gray-500/50 transition-colors text-sm sm:text-base"
                        >
                          <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          More Info
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={prevSlide}
                  className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full items-center justify-center transition-colors group"
                >
                  <ChevronLeft className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={nextSlide}
                  className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full items-center justify-center transition-colors group"
                >
                  <ChevronRight className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                </button>

                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {heroSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                        index === currentSlide ? "bg-white scale-110" : "bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Tabs - Only show when there's a search term */}
          {searchTerm && (
            <div className="mb-8">
              <div className="flex items-center justify-center">
                <div className="flex bg-gray-900/80 backdrop-blur-sm rounded-full p-1 border border-gray-700">
                  <button
                    onClick={() => handleSearchTypeChange("search1")}
                    className={`px-4 py-3 rounded-full font-semibold transition-all duration-300 ${
                      searchType === "search1"
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    Search 1
                  </button>
                  <button
                    onClick={() => handleSearchTypeChange("search2")}
                    className={`px-4 py-3 rounded-full font-semibold transition-all duration-300 ${
                      searchType === "search2"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    Search 2
                  </button>
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-400">
                  {searchType === "search1" ? (
                    <>
                      <span className="text-red-400 font-semibold">Search 1:</span>{" "}
                      <span className="text-green-400">✨ Independent</span> •{" "}
                      <span className="text-blue-400">Ad-free</span>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-400 font-semibold">Search 2:</span>{" "}
                      <span className="text-yellow-400">🎬 Aggregated (Vega + Lux-like)</span> •{" "}
                      <span className="text-orange-400">⚠️ Contains Ads</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Content Header - Only show when not searching */}
          {!searchTerm && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-semibold">Popular Content</h3>
                  {data && (
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {filteredMovies.length} items
                    </Badge>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-red-500/20"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-8 p-6 bg-red-900/20 border border-red-500/30 rounded-xl">
              <div className="flex items-center space-x-3 text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="font-semibold">Error:</span>
                <span>{error.message}</span>
              </div>
              <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-900 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Movies Grid */}
          {!isLoading && data && filteredMovies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredMovies.map((movie: any, index: number) => {
                const slug = createMovieSlug(movie)
                let movieUrl = `/movie/${slug}`

                try {
                  const u = new URL(movie.link)
                  const host = u.origin
                  if (searchType === "search2") {
                    if (host.includes("vegamovise.biz") || host.includes("bollyhub.one")) {
                      movieUrl = `/vega/${slug}?src=${encodeURIComponent(host)}`
                    } else if (host.includes("vegamovies-nl.bond")) {
                      movieUrl = `/vega-nl/${slug}?src=${encodeURIComponent(host)}`
                    } else {
                      // fallback: send to vega by default
                      movieUrl = `/vega/${slug}?src=${encodeURIComponent(host)}`
                    }
                  }
                } catch {
                  // keep default
                }

                const imgSrc =
                  movie.image && searchType === "search2"
                    ? `/api/image-proxy?url=${encodeURIComponent(movie.image)}`
                    : movie.image ||
                      "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"

                return (
                  <Link key={index} href={movieUrl}>
                    <div className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10">
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900">
                        <img
                          src={imgSrc || "/placeholder.svg"}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement
                            target.src =
                              "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
                          }}
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
                          {movie.title}
                        </h4>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{movie.description}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* No Results */}
          {!isLoading && data && filteredMovies.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Film className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">No content found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm
                  ? `No results found for "${searchTerm}". Try a different search term.`
                  : "Try adjusting your filters or search for something specific."}
              </p>
              {searchTerm && (
                <Button
                  onClick={() => {
                    setSearchTerm("")
                  }}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

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

      {/* Wishlist Modal */}
      <WishlistModal isOpen={showWishlistModal} onClose={() => setShowWishlistModal(false)} />

      {/* Feedback Review Component */}
      <FeedbackReview isOpen={showFeedbackModal} onOpenChange={setShowFeedbackModal} />
    </div>
  )
}
