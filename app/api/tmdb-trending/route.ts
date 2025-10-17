import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get("media_type") || "all" // 'all', 'movie', or 'tv'
  const timeWindow = searchParams.get("time_window") || "day" // 'day' or 'week'
  
  try {
    console.log(`Fetching trending ${mediaType} for ${timeWindow}...`)

    const response = await fetch(
      `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform results to include high-quality images and relevant info
    const results = data.results?.slice(0, 10).map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      overview: item.overview,
      poster: item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      backdrop: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : null,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
      releaseDate: item.release_date || item.first_air_date || "",
      mediaType: item.media_type || mediaType,
    })) || []

    console.log(`Successfully fetched ${results.length} trending items`)
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
