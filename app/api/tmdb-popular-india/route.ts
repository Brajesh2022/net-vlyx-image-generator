import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching popular content from India...")

    // Fetch both trending and popular Indian content
    const [trendingResponse, bollywoodResponse, southResponse] = await Promise.all([
      // Global trending
      fetch(
        `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=en-US`
      ),
      // Bollywood (Hindi) movies
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&with_original_language=hi&vote_count.gte=20`
      ),
      // South Indian movies (Tamil, Telugu, Malayalam, Kannada)
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&with_original_language=ta|te|ml|kn&vote_count.gte=20`
      ),
    ])

    const trendingData = trendingResponse.ok ? await trendingResponse.json() : { results: [] }
    const bollywoodData = bollywoodResponse.ok ? await bollywoodResponse.json() : { results: [] }
    const southData = southResponse.ok ? await southResponse.json() : { results: [] }

    // Combine results - prioritize Indian content
    const trending = trendingData.results?.slice(0, 4) || []
    const bollywood = bollywoodData.results?.slice(0, 3) || []
    const south = southData.results?.slice(0, 3) || []

    // Merge and take top 10
    const combined = [...bollywood, ...south, ...trending]
    const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values())
    const top10 = unique.slice(0, 10)

    // Transform results
    const results = top10.map((item: any, index: number) => ({
      id: item.id,
      rank: index + 1,
      title: item.title || item.name,
      overview: item.overview,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      backdrop: item.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
        : null,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
      releaseDate: item.release_date || item.first_air_date || "",
      mediaType: item.media_type || "movie",
      originalLanguage: item.original_language,
      isIndian: ["hi", "ta", "te", "ml", "kn"].includes(item.original_language),
    }))

    console.log(`Successfully fetched ${results.length} popular items`)
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
