import { type NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

interface TMDbEpisode {
  episode_number: number
  name: string
  overview: string
  still_path?: string
  air_date: string
  runtime?: number
}

interface TMDbSeason {
  episodes: TMDbEpisode[]
  season_number: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const season = searchParams.get("season") || "1"
  
  if (!id) {
    return NextResponse.json({ error: "TV series ID is required" }, { status: 400 })
  }

  try {
    console.log("Fetching episodes...")

    // Fetch season details with episodes
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.status}`)
    }

    const seasonData: TMDbSeason = await response.json()

    console.log(`Found ${seasonData.episodes?.length || 0} episodes`)
    return NextResponse.json(seasonData)

  } catch (error) {
    console.error("Error fetching TMDb episodes:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch episodes",
        details: "Check the TV series ID and season number"
      }, 
      { status: 500 }
    )
  }
}
