import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get("media_type") || "all" // 'all', 'movie', or 'tv'
  const timeWindow = searchParams.get("time_window") || "day" // 'day' or 'week'
  
  try {
    console.log(`Fetching trending ${mediaType} for ${timeWindow}...`)

    // Fetch both global and India-specific trending content
    const [globalResponse, indiaResponse] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US`
      ),
      // Discover Indian movies (Bollywood, Tamil, Telugu, etc.)
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&with_original_language=hi|ta|te|ml|kn&vote_count.gte=50`
      )
    ])

    if (!globalResponse.ok && !indiaResponse.ok) {
      throw new Error(`TMDb API error`)
    }

    const globalData = globalResponse.ok ? await globalResponse.json() : { results: [] }
    const indiaData = indiaResponse.ok ? await indiaResponse.json() : { results: [] }

    // Combine and shuffle results - mix global trending with Indian content
    const globalResults = globalData.results?.slice(0, 6) || []
    const indiaResults = indiaData.results?.slice(0, 4) || []
    
    // Merge arrays and shuffle
    const combined = [...globalResults, ...indiaResults]
    const shuffled = combined.sort(() => Math.random() - 0.5)

    // Transform results to include high-quality images (both poster and backdrop)
    const results = shuffled.slice(0, 10).map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      overview: item.overview,
      // Poster for mobile (portrait)
      poster: item.poster_path 
        ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
        : null,
      // Backdrop for desktop (landscape)
      backdrop: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : null,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
      releaseDate: item.release_date || item.first_air_date || "",
      mediaType: item.media_type || 'movie',
      // Language info for Indian content
      originalLanguage: item.original_language,
    }))

    console.log(`Successfully fetched ${results.length} trending items (${indiaResults.length} Indian content)`)
    return NextResponse.json({ results })

  } catch (error) {
    console.error("Error fetching trending content:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch trending content",
        results: []
      }, 
      { status: 500 }
    )
  }
}
