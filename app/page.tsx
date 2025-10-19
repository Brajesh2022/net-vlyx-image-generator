"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Search, Film, Star, Play, ChevronLeft, ChevronRight, Info, Heart, MessageSquare, X, Mail, Instagram, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useWishlist } from "@/hooks/useWishlist"
import { WishlistModal } from "@/components/wishlist-modal"
import { FeedbackReview } from "@/components/feedback-review"
import { encodeMovieUrl, cleanMovieTitleForHome, splitMovieTitle, truncateSubtitle } from "@/lib/utils"
import { SecureImage } from "@/components/secure-image"
import { MovieInfoModal } from "@/components/movie-info-modal"
import { CategoryRow } from "@/components/category-row"
import { TMDBPopularRow } from "@/components/tmdb-popular-row"
import { useVisitorTracking } from "@/hooks/useVisitorTracking"

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

// Categories for vegamovies-nl
const VEGA_CATEGORIES = [
  { label: "Home", value: "home" },
  { label: "Bollywood", value: "bollywood" },
  { label: "South Movies", value: "south-movies" },
  { label: "Dual Audio Movies", value: "dual-audio-movies" },
  { label: "Dual Audio Series", value: "dual-audio-series" },
  { label: "Hindi Dubbed", value: "hindi-dubbed" },
  { label: "Animation", value: "animation" },
  { label: "Horror", value: "horror" },
  { label: "Sci-Fi", value: "sci-fi" },
]

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize state from URL params for back navigation support
  const urlSearch = searchParams.get('search') || ''
  const urlCategory = searchParams.get('category') || 'home'
  
  const [searchTerm, setSearchTerm] = useState(urlSearch)
  const [selectedCategory, setSelectedCategory] = useState(urlCategory)
  const [currentPage, setCurrentPage] = useState(1)
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showSearchBar, setShowSearchBar] = useState(!!urlSearch)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadingMovieId, setLoadingMovieId] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [trendingContent, setTrendingContent] = useState<any[]>([])
  const [isTrendingLoading, setIsTrendingLoading] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [modalMovieTitle, setModalMovieTitle] = useState("")
  const [latestMovies, setLatestMovies] = useState<Movie[]>([])
  const [popularItems, setPopularItems] = useState<any[]>([])
  const [categoryMovies, setCategoryMovies] = useState<Record<string, Movie[]>>({})
  const [expandedSubtitles, setExpandedSubtitles] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<NodeJS.Timeout>()
  const slideInterval = useRef<NodeJS.Timeout>()
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  // TMDb API Key (used directly for testing as requested)
  const API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

  // Wishlist functionality
  const { wishlist, isClient } = useWishlist()

  // Visitor tracking - only track on home page
  useVisitorTracking()

  // Fetch trending content from TMDB for hero section
  useEffect(() => {
    const fetchTrending = async () => {
      setIsTrendingLoading(true)
      try {
        const response = await fetch('/api/tmdb-trending?media_type=all&time_window=week')
        if (response.ok) {
          const data = await response.json()
          setTrendingContent(data.results || [])
        }
      } catch (error) {
        console.error('Error fetching trending content:', error)
      } finally {
        setIsTrendingLoading(false)
      }
    }
    fetchTrending()
  }, [])

  // Fetch latest movies, popular items, and category content
  useEffect(() => {
    const fetchHomepageContent = async () => {
      try {
        // Fetch in parallel for better performance (limit=10 for home page sections)
        const [latestRes, popularRes, bollywoodRes, southRes, animationRes, koreanRes, actionRes, horrorRes, sciFiRes, dramaRes] = await Promise.all([
          fetch('/api/category/latest'),
          fetch('/api/tmdb-popular-india'),
          fetch('/api/category/bollywood?limit=10'),
          fetch('/api/category/south-movies?limit=10'),
          fetch('/api/category/animation?limit=10'),
          fetch('/api/category/korean?limit=10'),
          fetch('/api/category/action?limit=10'),
          fetch('/api/category/horror?limit=10'),
          fetch('/api/category/sci-fi?limit=10'),
          fetch('/api/category/drama?limit=10'),
        ])

        if (latestRes.ok) {
          const latestData = await latestRes.json()
          setLatestMovies(latestData.movies || [])
        }

        if (popularRes.ok) {
          const popularData = await popularRes.json()
          setPopularItems(popularData.results || [])
        }

        const categories: Record<string, Movie[]> = {}
        if (bollywoodRes.ok) {
          const bollywoodData = await bollywoodRes.json()
          categories['bollywood'] = bollywoodData.movies || []
        }
        if (southRes.ok) {
          const southData = await southRes.json()
          categories['south-movies'] = southData.movies || []
        }
        if (animationRes.ok) {
          const animationData = await animationRes.json()
          categories['animation'] = animationData.movies || []
        }
        if (koreanRes.ok) {
          const koreanData = await koreanRes.json()
          categories['korean'] = koreanData.movies || []
        }
        if (actionRes.ok) {
          const actionData = await actionRes.json()
          categories['action'] = actionData.movies || []
        }
        if (horrorRes.ok) {
          const horrorData = await horrorRes.json()
          categories['horror'] = horrorData.movies || []
        }
        if (sciFiRes.ok) {
          const sciFiData = await sciFiRes.json()
          categories['sci-fi'] = sciFiData.movies || []
        }
        if (dramaRes.ok) {
          const dramaData = await dramaRes.json()
          categories['drama'] = dramaData.movies || []
        }

        setCategoryMovies(categories)
      } catch (error) {
        console.error('Error fetching homepage content:', error)
      }
    }

    // Only fetch if we're on homepage (not searching)
    if (!searchTerm && selectedCategory === 'home') {
      fetchHomepageContent()
    }
  }, [searchTerm, selectedCategory])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [searchTerm ? "/api/scrape-vega" : "/api/scrape", searchTerm, selectedCategory],
    queryFn: async () => {
      // Use search2 (aggregated) for search, search1 (vegamovies-nl) for browsing
      const apiEndpoint = searchTerm ? "/api/scrape-vega" : "/api/scrape"
      let url = apiEndpoint
      const params = new URLSearchParams()
      
      if (searchTerm) {
        params.append("s", searchTerm)
      } else {
        // Browsing mode - use vegamovies-nl with categories
        params.append("category", selectedCategory)
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch movies")
      }
      const result = await response.json()
      
      return result
    },
    // Only refetch if we don't have data or if it's a new search/category
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    
    // Update URL with search term
    const params = new URLSearchParams(window.location.search)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.replace(`/?${params.toString()}`, { scroll: false })
    
    // Clear movies when starting a new search
    if (value && value !== searchTerm) {
      setAllMovies([])
      setHasInitialized(false)
    }
    
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      refetch()
    }, 300) // Reduced from 500ms to 300ms for faster search

    // TMDb suggestions
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 200) // Reduced from 300ms to 200ms for faster suggestions
  }

  const handleSearchSubmit = () => {
    setShowSuggestions(false)
    // Hide mobile keyboard by blurring the input
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
    refetch()
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
    // Hide mobile keyboard
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
    // Trigger the internal search immediately
    refetch()
  }

  // Handle closing search bar - clears everything
  const handleCloseSearch = () => {
    setSearchTerm("")
    setSuggestions([])
    setShowSuggestions(false)
    setShowSearchBar(false)
    
    // Clear search from URL
    const params = new URLSearchParams(window.location.search)
    params.delete('search')
    router.replace(`/?${params.toString()}`, { scroll: false })
    
    // If we have cached data for the current category, restore it
    if (allMovies.length === 0 && !isLoading) {
      refetch()
    }
  }

  // Load more movies function (only for browsing, not search)
  const handleLoadMore = async () => {
    if (isLoadingMore || searchTerm) return // Don't load more when searching

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams()
      params.append("category", selectedCategory)
      params.append("page", nextPage.toString())
      
      const url = `/api/scrape?${params.toString()}`
      const response = await fetch(url)
      
      if (response.ok) {
        const result = await response.json()
        if (result.movies && result.movies.length > 0) {
          setAllMovies((prev) => [...prev, ...result.movies])
          setCurrentPage(nextPage)
        }
      }
    } catch (error) {
      console.error("Error loading more movies:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // State restoration and persistence logic
  useEffect(() => {
    if (data && !hasInitialized) {
      // Only set initial data if we haven't initialized yet
      setAllMovies(data.movies || [])
      setCurrentPage(1)
      setHasInitialized(true)
    } else if (data && hasInitialized && searchTerm) {
      // For search results, always update the movies
      setAllMovies(data.movies || [])
      setCurrentPage(1)
    } else if (data && hasInitialized && !searchTerm && selectedCategory !== 'home') {
      // For category browsing, only update if we don't have movies or if it's a new category
      if (allMovies.length === 0) {
        setAllMovies(data.movies || [])
        setCurrentPage(1)
      }
    }
  }, [data, hasInitialized, searchTerm, selectedCategory, allMovies.length])

  // Restore state from URL parameters on back navigation
  useEffect(() => {
    if (!hasInitialized && (urlSearch || urlCategory !== 'home')) {
      // If we have URL params but no data, trigger a refetch
      if (!data && !isLoading) {
        refetch()
      }
    }
  }, [urlSearch, urlCategory, hasInitialized, data, isLoading, refetch])

  const filteredMovies = searchTerm ? (data?.movies || []) : allMovies

  const categories = !searchTerm ? VEGA_CATEGORIES : ["all", ...(data?.categories || [])]

  const createMovieSlug = (movie: { link: string; title: string }) => {
    // Try to extract slug from URL
    try {
      if (!movie.link) throw new Error("No link")
      
      // Handle relative URLs by adding a dummy base
      const url = movie.link.startsWith("http") ? movie.link : `https://dummy.com${movie.link}`
      const u = new URL(url)
      const parts = u.pathname.split("/").filter(Boolean)
      
      let slug = parts[parts.length - 1] || ""
      
      // Skip search or empty slugs
      if (!slug || slug === "search" || slug.length < 3) {
        slug = parts[parts.length - 2] || ""
      }
      
      // If we have a valid slug, return it
      if (slug && slug.length >= 3) {
        return slug
      }
    } catch (error) {
      // URL parsing failed, fall through to title-based slug
    }
    
    // Fallback: Create slug from title
    if (movie.title) {
      const titleSlug = movie.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
        .substring(0, 200) // Limit length
      
      if (titleSlug && titleSlug.length >= 2) {
        return titleSlug
      }
    }
    
    // Last resort: use timestamp-based slug
    return `movie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const heroSlides = useMemo(() => {
    // Only show slideshow on homepage (not on category pages or search)
    const isHomePage = selectedCategory === "home" && !searchTerm
    
    if (!isHomePage) {
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

    // Use TMDB trending content for hero slideshow
    if (trendingContent.length === 0) {
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

    // Use first 5 trending items for slideshow
    const trendingItems = trendingContent.slice(0, 5)

    return trendingItems.map((item) => {
      return {
        title: item.title,
        description: item.overview || "Experience premium entertainment with crystal clear quality and immersive viewing.",
        background: item.backdrop || item.poster || "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        poster: item.poster || item.backdrop || "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        gradient: "from-black via-black/70 to-transparent",
        trendingTitle: item.title, // Store for search
        mediaType: item.mediaType,
        rating: item.rating,
        originalLanguage: item.originalLanguage,
      }
    })
  }, [trendingContent, selectedCategory, searchTerm])

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

  // Reset loading state on route change (backup, in case navigation fails)
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigating(false)
      setLoadingMovieId(null)
    }
    
    // Fallback timeout to reset loading state if navigation takes too long
    if (isNavigating) {
      const timeout = setTimeout(() => {
        setIsNavigating(false)
        setLoadingMovieId(null)
      }, 5000) // 5 seconds timeout (reduced from 10s for faster recovery)
      
      return () => clearTimeout(timeout)
    }
  }, [isNavigating])

  // Fallback mechanism to restore content if it gets cleared
  useEffect(() => {
    // If we don't have movies and we're not loading, and we should have content, refetch
    if (!searchTerm && allMovies.length === 0 && !isLoading && !error && hasInitialized) {
      console.log('Content was cleared, attempting to restore...')
      refetch()
    }
  }, [allMovies.length, isLoading, error, searchTerm, hasInitialized, refetch])

  // Handle back navigation - restore content if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !searchTerm && allMovies.length === 0 && !isLoading) {
        console.log('Page became visible with no content, attempting to restore...')
        refetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [searchTerm, allMovies.length, isLoading, refetch])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Enhanced Responsive Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-xl border-b border-white/5"></div>
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 relative z-10">
          {/* Full Width Search Overlay - Covers entire header */}
          {showSearchBar && (
            <div className="absolute inset-0 z-50 flex items-center px-4 animate-in slide-in-from-right duration-700 ease-out">
              <div ref={containerRef} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search movies, shows..."
                  value={searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchSubmit()
                    }
                    if (e.key === "Escape") {
                      // Close search completely on Escape
                      handleCloseSearch()
                    }
                  }}
                  className="pl-12 pr-12 w-full glass-effect border-gray-700 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-14 rounded-full bg-black/90 backdrop-blur-xl border-2 shadow-2xl"
                  autoFocus
                />
                <button
                  onClick={handleCloseSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 z-10"
                  title="Clear search"
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
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        {!searchTerm && (
          <section className="relative h-[75vh] sm:h-[85vh] md:h-[90vh] lg:h-[95vh] overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
                {/* Animated background effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-900/5 via-transparent to-purple-900/5 animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent animate-shimmer"></div>
                </div>

                <div className="relative z-20 h-full flex items-end md:items-center pb-12 sm:pb-16 md:pb-0">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-2xl lg:max-w-4xl">
                      {/* Badge Skeleton */}
                      <div className="mb-3 sm:mb-4 flex gap-2">
                        <div className="h-7 w-28 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full animate-shimmer-slow bg-[length:200%_100%]"></div>
                        <div className="h-7 w-16 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full animate-shimmer-slow bg-[length:200%_100%]" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-7 w-20 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full animate-shimmer-slow bg-[length:200%_100%]" style={{ animationDelay: '0.2s' }}></div>
                      </div>

                      {/* Title Skeleton */}
                      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                        <div className="h-10 sm:h-14 md:h-16 lg:h-20 w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg animate-shimmer-slow bg-[length:200%_100%]"></div>
                        <div className="h-10 sm:h-14 md:h-16 lg:h-20 w-4/5 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg animate-shimmer-slow bg-[length:200%_100%]" style={{ animationDelay: '0.15s' }}></div>
                      </div>

                      {/* Description Skeleton */}
                      <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                        <div className="h-4 w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-shimmer-slow bg-[length:200%_100%]"></div>
                        <div className="h-4 w-11/12 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-shimmer-slow bg-[length:200%_100%]" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-4 w-3/4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-shimmer-slow bg-[length:200%_100%]" style={{ animationDelay: '0.2s' }}></div>
                      </div>

                      {/* Buttons Skeleton */}
                      <div className="flex flex-row gap-3 md:gap-4">
                        <div className="flex-1 sm:flex-none h-11 sm:h-12 md:h-14 w-full sm:w-36 md:w-40 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg animate-shimmer-slow bg-[length:200%_100%] shadow-lg"></div>
                        <div className="flex-1 sm:flex-none h-11 sm:h-12 md:h-14 w-full sm:w-36 md:w-40 bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 rounded-lg animate-shimmer-slow bg-[length:200%_100%] backdrop-blur-xl" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows Skeleton */}
                <div className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-gray-800/30 rounded-full items-center justify-center animate-pulse">
                  <ChevronLeft className="h-6 w-6 text-gray-600" />
                </div>
                <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-gray-800/30 rounded-full items-center justify-center animate-pulse" style={{ animationDelay: '0.15s' }}>
                  <ChevronRight className="h-6 w-6 text-gray-600" />
                </div>

                {/* Dots Skeleton */}
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-700 animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
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
                      {/* Mobile: Portrait poster image */}
                      <div
                        className="block md:hidden w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.poster || slide.background})` }}
                      />
                      {/* Desktop: Landscape backdrop image */}
                      <div
                        className="hidden md:block w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.background})` }}
                      />
                      {/* Gradient overlay - balanced for mobile readability */}
                      <div className={`absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/60 md:via-black/70 to-black/40 md:to-transparent`} />
                    </div>
                  ))}
                </div>

                <div className="relative z-20 h-full flex items-end md:items-center pb-12 sm:pb-16 md:pb-0">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-2xl lg:max-w-4xl">
                      <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
                        <Badge className="bg-red-600/90 text-white border-none text-xs sm:text-sm px-3 py-1">
                          Trending Now
                        </Badge>
                        {heroSlides[currentSlide].rating && (
                          <Badge className="bg-yellow-600/90 text-white border-none text-xs sm:text-sm px-3 py-1 flex items-center gap-1">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                            {heroSlides[currentSlide].rating}
                          </Badge>
                        )}
                        {heroSlides[currentSlide].mediaType && (
                          <Badge className="bg-blue-600/90 text-white border-none text-xs sm:text-sm px-3 py-1 uppercase">
                            {heroSlides[currentSlide].mediaType === 'tv' ? 'TV Series' : 'Movie'}
                          </Badge>
                        )}
                        {heroSlides[currentSlide].originalLanguage && ['hi', 'ta', 'te', 'ml', 'kn'].includes(heroSlides[currentSlide].originalLanguage) && (
                          <Badge className="bg-orange-600/90 text-white border-none text-xs sm:text-sm px-3 py-1">
                            {heroSlides[currentSlide].originalLanguage === 'hi' ? 'Bollywood' : 
                             heroSlides[currentSlide].originalLanguage === 'ta' ? 'Tamil' :
                             heroSlides[currentSlide].originalLanguage === 'te' ? 'Telugu' :
                             heroSlides[currentSlide].originalLanguage === 'ml' ? 'Malayalam' :
                             heroSlides[currentSlide].originalLanguage === 'kn' ? 'Kannada' : 'Indian'}
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 text-white leading-tight">
                        {heroSlides[currentSlide].title}
                      </h1>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-200 mb-4 sm:mb-6 md:mb-8 leading-relaxed max-w-xl lg:max-w-2xl line-clamp-2 md:line-clamp-3">
                        {heroSlides[currentSlide].description}
                      </p>
                      <div className="flex flex-row gap-3 md:gap-4">
                        {heroSlides[currentSlide].trendingTitle ? (
                          <Button 
                            onClick={() => {
                              // Trigger search for the trending title
                              const title = heroSlides[currentSlide].trendingTitle
                              setSearchTerm(title)
                              setShowSearchBar(true)
                              setShowSuggestions(false)
                              
                              // Update URL with search term
                              const params = new URLSearchParams(window.location.search)
                              params.set('search', title)
                              router.replace(`/?${params.toString()}`, { scroll: false })
                              
                              // Clear movies and trigger search
                              setAllMovies([])
                              setHasInitialized(false)
                              refetch()
                            }}
                            className="flex-1 sm:flex-none px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-white text-black font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base rounded-lg shadow-lg"
                          >
                            <Play className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2" />
                            Watch
                          </Button>
                        ) : (
                          <Button className="flex-1 sm:flex-none px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-white text-black font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base rounded-lg shadow-lg">
                            <Play className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2" />
                            Explore
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setModalMovieTitle(heroSlides[currentSlide].title)
                            setShowInfoModal(true)
                          }}
                          className="flex-1 sm:flex-none px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 text-white border-none font-semibold transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base rounded-lg shadow-lg bg-gray-600/50 hover:bg-gray-500/50 backdrop-blur-xl"
                          style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            background: 'rgba(107, 114, 128, 0.5)',
                          }}
                        >
                          <Info className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2" />
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

        {/* Netflix-style Content Sections - Only show on homepage when not searching */}
        {!searchTerm && selectedCategory === "home" && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Latest Uploads */}
            {latestMovies.length > 0 && (
              <CategoryRow
                title="Latest Uploads"
                movies={latestMovies}
                viewAllLink="/view-all?category=home"
              />
            )}

            {/* What's Popular in India */}
            {popularItems.length > 0 && (
              <TMDBPopularRow
                title="What's Popular in India"
                items={popularItems}
              />
            )}

            {/* Bollywood - Latest */}
            {categoryMovies['bollywood'] && categoryMovies['bollywood'].length > 0 && (
              <CategoryRow
                title="Latest Bollywood Movies"
                movies={categoryMovies['bollywood']}
                viewAllLink="/category?type=bollywood"
              />
            )}

            {/* South Movies - Latest */}
            {categoryMovies['south-movies'] && categoryMovies['south-movies'].length > 0 && (
              <CategoryRow
                title="Latest South Movies"
                movies={categoryMovies['south-movies']}
                viewAllLink="/category?type=south-movies"
              />
            )}

            {/* Korean - Latest */}
            {categoryMovies['korean'] && categoryMovies['korean'].length > 0 && (
              <CategoryRow
                title="Latest Korean Content"
                movies={categoryMovies['korean']}
                viewAllLink="/category?type=korean"
              />
            )}

            {/* Animation - Latest */}
            {categoryMovies['animation'] && categoryMovies['animation'].length > 0 && (
              <CategoryRow
                title="Latest Animation"
                movies={categoryMovies['animation']}
                viewAllLink="/category?type=animation"
              />
            )}

            {/* Action - Popular */}
            {categoryMovies['action'] && categoryMovies['action'].length > 0 && (
              <CategoryRow
                title="Popular in Action"
                movies={categoryMovies['action']}
                viewAllLink="/category?type=action"
              />
            )}

            {/* Horror - Popular */}
            {categoryMovies['horror'] && categoryMovies['horror'].length > 0 && (
              <CategoryRow
                title="Popular in Horror"
                movies={categoryMovies['horror']}
                viewAllLink="/category?type=horror"
              />
            )}

            {/* Sci-Fi - Popular */}
            {categoryMovies['sci-fi'] && categoryMovies['sci-fi'].length > 0 && (
              <CategoryRow
                title="Popular in Sci-Fi"
                movies={categoryMovies['sci-fi']}
                viewAllLink="/category?type=sci-fi"
              />
            )}

            {/* Drama - Popular */}
            {categoryMovies['drama'] && categoryMovies['drama'].length > 0 && (
              <CategoryRow
                title="Popular in Drama"
                movies={categoryMovies['drama']}
                viewAllLink="/category?type=drama"
              />
            )}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Content Header - Only show when not searching or not on homepage */}
          {(!searchTerm && selectedCategory !== "home") || searchTerm ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-semibold">
                    {!searchTerm && selectedCategory !== "home" 
                      ? VEGA_CATEGORIES.find(c => c.value === selectedCategory)?.label || "Popular Content"
                      : searchTerm ? "Search Results" : "Popular Content"}
                  </h3>
                  {data && (
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {filteredMovies.length} items
                    </Badge>
                  )}
                </div>

                {!searchTerm && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value
                      setSelectedCategory(newCategory)
                      setCurrentPage(1)
                      // Only clear movies if it's a different category
                      if (newCategory !== selectedCategory) {
                        setAllMovies([])
                        setHasInitialized(false)
                      }
                      
                      // Update URL with category
                      const params = new URLSearchParams(window.location.search)
                      if (newCategory !== 'home') {
                        params.set('category', newCategory)
                      } else {
                        params.delete('category')
                      }
                      router.replace(`/?${params.toString()}`, { scroll: false })
                    }}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-red-500/20"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : null}

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
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400">
                  {allMovies.length === 0 ? 'Loading content...' : 'Loading more content...'}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-gray-900 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Movies Grid - Only show when searching or browsing categories (not on homepage) */}
          {!isLoading && data && filteredMovies.length > 0 && (searchTerm || selectedCategory !== "home") && (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredMovies.map((movie: any, index: number) => {
                // Create slug from movie (with robust fallback)
                const slug = createMovieSlug(movie)
                if (!slug || slug.length < 2) return null // Skip invalid movies
                
                // Determine source URL for the movie
                let sourceUrl = "https://www.vegamovies-nl.run/" // Default fallback
                if (movie.link) {
                  try {
                    const u = new URL(movie.link)
                    sourceUrl = u.origin
                  } catch {
                    // If parsing fails, use the link itself
                    sourceUrl = movie.link
                  }
                }
                
                // ALWAYS construct /v/ URL - NEVER /movie/
                // Encode slug and src for privacy
                const encodedUrl = encodeMovieUrl(slug, sourceUrl)
                const movieUrl = `/v/${encodedUrl}`

                // Always use secure image proxy for all images
                const imgSrc =
                  movie.image ||
                  "https://images.unsplash.com/photo-1489599517276-1fcb4a8b6e47?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"

                const movieId = `m-${index}-${slug.substring(0, 50)}`
                const isLoadingMovie = loadingMovieId === movieId
                
                // Split title and subtitle for search results
                const { title: mainTitle, subtitle } = searchTerm 
                  ? splitMovieTitle(movie.title) 
                  : { title: cleanMovieTitleForHome(movie.title), subtitle: "" }
                
                const isExpanded = expandedSubtitles.has(movieId)
                const truncatedSubtitle = truncateSubtitle(subtitle, 80)
                const hasLongSubtitle = subtitle.length > 80

                return (
                  <div 
                    key={movieId}
                    className="group transition-all duration-300 hover:scale-105 hover:z-10"
                  >
                    <div 
                      onClick={() => {
                        setLoadingMovieId(movieId)
                        setIsNavigating(true)
                        router.push(movieUrl)
                      }}
                      className="cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900">
                        <SecureImage
                          src={imgSrc || "/placeholder.svg"}
                          alt={mainTitle}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Loading overlay */}
                        {isLoadingMovie && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-200">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-white text-xs font-medium">Loading...</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 px-1">
                      <h4 className="font-semibold text-sm text-white group-hover:text-red-400 transition-colors line-clamp-2">
                        {mainTitle}
                      </h4>
                      {subtitle && (
                        <div className="mt-1 relative group/subtitle">
                          <p 
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasLongSubtitle) {
                                setExpandedSubtitles(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(movieId)) {
                                    newSet.delete(movieId)
                                  } else {
                                    newSet.add(movieId)
                                  }
                                  return newSet
                                })
                              }
                            }}
                            className={`text-gray-400 text-xs leading-relaxed ${
                              hasLongSubtitle ? 'cursor-pointer hover:text-gray-300' : ''
                            } ${isExpanded ? '' : 'line-clamp-2'}`}
                            title={subtitle}
                          >
                            {isExpanded ? subtitle : truncatedSubtitle}
                          </p>
                          {/* Tooltip on hover */}
                          {!isExpanded && hasLongSubtitle && (
                            <div className="hidden group-hover/subtitle:block absolute bottom-full left-0 right-0 mb-2 p-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded text-xs text-gray-300 z-50 shadow-xl">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Load More Button - Only show when browsing (not searching) */}
            {!searchTerm && (
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
            )}
            </>
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
                  : "Content may have been cleared. Try refreshing or use the restore button below."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {searchTerm ? (
                  <Button
                    onClick={handleCloseSearch}
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    Clear Search
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => refetch()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Restore Content
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="border-gray-600 text-white hover:bg-gray-800"
                    >
                      Refresh Page
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="liquid-glass mt-16 border-t border-gray-800 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About NetVlyx */}
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
                Your premium entertainment destination. We help you discover content from across the internet. 
                No content is hosted on our platform - we simply index publicly available content.
              </p>
              <Link href="/about">
                <button className="text-red-500 hover:text-red-400 transition-colors text-sm font-semibold">
                  Learn More About Us →
                </button>
              </Link>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/category?type=bollywood">
                    <button className="hover:text-white transition-colors">Bollywood Movies</button>
                  </Link>
                </li>
                <li>
                  <Link href="/category?type=south-movies">
                    <button className="hover:text-white transition-colors">South Movies</button>
                  </Link>
                </li>
                <li>
                  <Link href="/category?type=korean">
                    <button className="hover:text-white transition-colors">Korean Content</button>
                  </Link>
                </li>
                <li>
                  <Link href="/category?type=animation">
                    <button className="hover:text-white transition-colors">Animation</button>
                  </Link>
                </li>
                <li>
                  <Link href="/category?type=action">
                    <button className="hover:text-white transition-colors">Action Movies</button>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Support */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Legal & Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/about">
                    <button className="hover:text-white transition-colors">About Us</button>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <button className="hover:text-white transition-colors">Contact Us</button>
                  </Link>
                </li>
                <li>
                  <Link href="/dmca">
                    <button className="hover:text-white transition-colors">DMCA Policy</button>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy">
                    <button className="hover:text-white transition-colors">Privacy Policy</button>
                  </Link>
                </li>
                <li>
                  <Link href="/terms">
                    <button className="hover:text-white transition-colors">Terms of Service</button>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact & Credits */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Get in Touch</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a 
                    href="https://vlyx.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <Globe className="h-4 w-4 text-blue-500 group-hover:text-blue-400 transition-colors" />
                    <span>vlyx.vercel.app</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:vlyxcodes@gmail.com"
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <Mail className="h-4 w-4 text-red-500 group-hover:text-red-400 transition-colors" />
                    <span>vlyxcodes@gmail.com</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://instagram.com/vlyxcodes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <Instagram className="h-4 w-4 text-purple-500 group-hover:text-purple-400 transition-colors" />
                    <span>@vlyxcodes</span>
                  </a>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Developed & Managed By</p>
                <a 
                  href="https://vlyx.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <p className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hover:from-purple-300 hover:to-blue-300 transition-all">
                    Vlyx Codes
                  </p>
                </a>
                <p className="text-xs text-gray-500 mt-1">Professional Web Development Company</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400 text-center md:text-left">
                &copy; {new Date().getFullYear()} NetVlyx. All rights reserved. 
              </p>
              <p className="text-xs text-gray-500 text-center md:text-right max-w-2xl">
                <strong className="text-gray-400">Disclaimer:</strong> NetVlyx does not host any content. 
                We only index and provide links to content that is publicly available on the internet.
              </p>
            </div>
            <p className="text-center text-xs text-gray-600 mt-4">
              Made with ❤️ by <span className="text-purple-500 font-semibold">Vlyx Codes</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Wishlist Modal */}
      <WishlistModal isOpen={showWishlistModal} onClose={() => setShowWishlistModal(false)} />

      {/* Feedback Review Component */}
      <FeedbackReview isOpen={showFeedbackModal} onOpenChange={setShowFeedbackModal} />

      {/* Movie Info Modal */}
      <MovieInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={modalMovieTitle}
        onWatchClick={() => {
          // When Watch is clicked in modal, search for the movie
          setSearchTerm(modalMovieTitle)
          setShowSearchBar(true)
          setShowSuggestions(false)
          
          const params = new URLSearchParams(window.location.search)
          params.set('search', modalMovieTitle)
          router.replace(`/?${params.toString()}`, { scroll: false })
          
          setAllMovies([])
          setHasInitialized(false)
          refetch()
        }}
      />

      {/* Global Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-red-600/30 rounded-full" />
              <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-semibold text-lg mb-1">Loading Movie...</h3>
              <p className="text-gray-400 text-sm">Please wait while we prepare your content</p>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
