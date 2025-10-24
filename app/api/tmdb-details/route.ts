export const runtime = 'edge'
import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"

interface TMDbResponse {
  poster_path?: string
  backdrop_path?: string
  title?: string
  name?: string
  overview?: string
  release_date?: string
  first_air_date?: string
  vote_average?: number
  credits?: {
    cast: Array<{
      name: string
      character: string
      profile_path?: string
    }>
  }
  images?: {
    backdrops: Array<{
      file_path: string
    }>
  }
  videos?: {
    results: Array<{
      key: string
      name: string
      type: string
      site: string
    }>
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imdbId = searchParams.get("imdb_id")
  
  if (!imdbId) {
    return NextResponse.json({ error: "IMDb ID is required" }, { status: 400 })
  }

  try {
    console.log("Fetching movie details...")

    // Step 1: Convert IMDb ID to TMDb ID
    const findResponse = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    )

    if (!findResponse.ok) {
      throw new Error(`TMDb find API error: ${findResponse.status}`)
    }

    const findData = await findResponse.json()
    const movieResults = findData.movie_results || []
    const tvResults = findData.tv_results || []
    
    let tmdbId: string | null = null
    let mediaType: 'movie' | 'tv' = 'movie'

    if (movieResults.length > 0) {
      tmdbId = movieResults[0].id.toString()
      mediaType = 'movie'
    } else if (tvResults.length > 0) {
      tmdbId = tvResults[0].id.toString()
      mediaType = 'tv'
    }

    if (!tmdbId) {
      return NextResponse.json({ error: "No TMDb match found for this IMDb ID" }, { status: 404 })
    }

    console.log(`Found TMDb ID: ${tmdbId} (${mediaType})`)

    // Step 2: Fetch full details with additional data
    const detailsResponse = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=images,credits,videos`
    )

    if (!detailsResponse.ok) {
      throw new Error(`TMDb details API error: ${detailsResponse.status}`)
    }

    const details: TMDbResponse = await detailsResponse.json()

    // Extract the data we need
    const result = {
      id: tmdbId, // Include TMDb ID for episode fetching
      title: details.title || details.name || "Unknown Title",
      poster: details.poster_path 
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : null,
      backdrop: details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : null,
      overview: details.overview || "",
      release_date: details.release_date || details.first_air_date || "",
      rating: details.vote_average ? details.vote_average.toFixed(1) : null,
      cast: details.credits?.cast?.slice(0, 10).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile_image: actor.profile_path 
          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
          : null
      })) || [],
      images: details.images?.backdrops?.slice(0, 6).map(img => 
        `https://image.tmdb.org/t/p/w780${img.file_path}`
      ) || [],
      trailer: (() => {
        const videos = details.videos?.results || []
        const trailer = videos.find(video => 
          video.type === "Trailer" && video.site === "YouTube"
        )
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
      })(),
      trailerKey: (() => {
        const videos = details.videos?.results || []
        const trailer = videos.find(video => 
          video.type === "Trailer" && video.site === "YouTube"
        )
        return trailer?.key || null
      })(),
      contentType: mediaType
    }

    console.log("TMDb details processed successfully")
    return NextResponse.json(result)

  } catch (error) {
    console.error("Error fetching TMDb details:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch TMDb details",
        details: "Check the IMDb ID format and try again"
      }, 
      { status: 500 }
    )
  }
}
