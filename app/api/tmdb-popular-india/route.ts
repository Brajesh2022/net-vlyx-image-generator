export const runtime = 'edge'
import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"
const REGION = "IN"
const INDIAN_LANGUAGES = "hi|ta|te|ml|kn"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching popular content from India with hybrid scoring...")

    // Fetch three different sources for comprehensive coverage
    const [nowPlayingResponse, popularIndianResponse, topRatedIndianResponse] = await Promise.all([
      // Current hits in theaters (including Hollywood)
      fetch(
        `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1&region=${REGION}`
      ),
      // Popular Indian language films
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&region=${REGION}&sort_by=popularity.desc&with_original_language=${INDIAN_LANGUAGES}`
      ),
      // Top-rated Indian language films (quality cinema)
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&region=${REGION}&sort_by=vote_average.desc&vote_count.gte=100&with_original_language=${INDIAN_LANGUAGES}`
      ),
    ])

    const nowPlayingData = nowPlayingResponse.ok ? await nowPlayingResponse.json() : { results: [] }
    const popularIndianData = popularIndianResponse.ok ? await popularIndianResponse.json() : { results: [] }
    const topRatedIndianData = topRatedIndianResponse.ok ? await topRatedIndianResponse.json() : { results: [] }

    // Combine all movie lists
    const allMovies = [
      ...(nowPlayingData.results || []),
      ...(popularIndianData.results || []),
      ...(topRatedIndianData.results || []),
    ]

    // De-duplicate movies using a Map (based on movie ID)
    const uniqueMoviesMap = new Map()
    allMovies.forEach((movie: any) => {
      if (!uniqueMoviesMap.has(movie.id)) {
        uniqueMoviesMap.set(movie.id, movie)
      }
    })

    // Convert map back to array
    const uniqueMovies = Array.from(uniqueMoviesMap.values())

    // Create hybrid score: (popularity * 0.7) + (vote_average * 3)
    // This balances current popularity with quality ratings
    const scoredMovies = uniqueMovies.map((movie: any) => ({
      ...movie,
      hybrid_score: (movie.popularity * 0.7) + (movie.vote_average * 3),
    }))

    // Sort by hybrid score, descending
    scoredMovies.sort((a: any, b: any) => b.hybrid_score - a.hybrid_score)

    // Get top 20 movies
    const top20Movies = scoredMovies.slice(0, 20)

    // Format results with rank
    const results = top20Movies.map((movie: any, index: number) => ({
      id: movie.id,
      rank: index + 1,
      title: movie.title || movie.name,
      overview: movie.overview || "",
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
      rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
      releaseDate: movie.release_date || movie.first_air_date || "",
      mediaType: movie.media_type || "movie",
      originalLanguage: movie.original_language || "",
      isIndian: ["hi", "ta", "te", "ml", "kn"].includes(movie.original_language),
      popularity: movie.popularity,
      hybridScore: movie.hybrid_score.toFixed(2),
    }))

    console.log(`Successfully fetched ${results.length} popular items with hybrid scoring`)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error fetching popular content:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch popular content",
        results: [],
      },
      { status: 500 }
    )
  }
}
