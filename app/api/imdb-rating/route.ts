export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = "848d4c9db9d3f19d0229dc95735190d3"
const OMDB_API_KEY = "7c78f959"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const OMDB_BASE_URL = "https://www.omdbapi.com"

interface TMDBSearchResult {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  release_date?: string
  first_air_date?: string
  media_type: string
  vote_average: number
  genre_ids: number[]
}

interface TMDBExternalIds {
  imdb_id?: string
  freebase_mid?: string
  freebase_id?: string
  tvdb_id?: number
  tvrage_id?: number
  wikidata_id?: string
  facebook_id?: string
  instagram_id?: string
  twitter_id?: string
}

interface OMDBResponse {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: Array<{
    Source: string
    Value: string
  }>
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
  Response: string
}

async function searchTMDB(query: string): Promise<TMDBSearchResult[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    )
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("TMDB search error:", error)
    return []
  }
}

async function getTMDBExternalIds(id: number, mediaType: string): Promise<TMDBExternalIds | null> {
  try {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie'
    const response = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${id}/external_ids?api_key=${TMDB_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`TMDB external IDs API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("TMDB external IDs error:", error)
    return null
  }
}

async function getOMDBRating(imdbId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&i=${imdbId}`
    )
    
    if (!response.ok) {
      throw new Error(`OMDB API error: ${response.status}`)
    }
    
    const data: OMDBResponse = await response.json()
    
    if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
      return data.imdbRating
    }
    
    return null
  } catch (error) {
    console.error("OMDB API error:", error)
    return null
  }
}

function cleanMovieTitle(title: string): string {
  // Remove common suffixes and patterns from movie titles
  return title
    .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
    .replace(/\s*\[[^\]]*\]/g, '') // Remove anything in brackets
    .replace(/\s+Download.*$/i, '') // Remove "Download" and everything after
    .replace(/\s+Watch.*$/i, '') // Remove "Watch" and everything after
    .replace(/\s+Full.*$/i, '') // Remove "Full" and everything after
    .replace(/\s+HD.*$/i, '') // Remove "HD" and everything after
    .replace(/\s+WEB.*$/i, '') // Remove "WEB" and everything after
    .replace(/\s+(720p|1080p|480p|4K).*$/i, '') // Remove quality indicators
    .replace(/\s+(Hindi|English|Tamil|Telugu).*$/i, '') // Remove language indicators
    .replace(/\s+Movie.*$/i, '') // Remove "Movie" and everything after
    .replace(/\s+Series.*$/i, '') // Remove "Series" and everything after
    .replace(/\s+(Season|S\d+).*$/i, '') // Remove season indicators
    .replace(/\s+Complete.*$/i, '') // Remove "Complete" and everything after
    .replace(/\s*(Dual Audio|HEVC|x264|x265).*$/i, '') // Remove encoding info
    .trim()
}

async function getIMDBRating(movieTitle: string): Promise<string | null> {
  const cleanedTitle = cleanMovieTitle(movieTitle)
  const words = cleanedTitle.split(/\s+/).filter(word => word.length > 0)
  
  // Define search strategies in order of preference (more specific to less specific)
  const searchStrategies = [
    () => words.slice(0, 5).join(' '), // First 5 words (most specific)
    () => words.slice(0, 4).join(' '), // First 4 words
    () => words.slice(0, 3).join(' '), // First 3 words
    () => words.slice(0, 2).join(' '), // First 2 words
    () => words[0], // Just first word (least specific)
  ]
  
  for (const getSearchTerm of searchStrategies) {
    const searchTerm = getSearchTerm()
    
    if (!searchTerm || searchTerm.length < 2) continue
    
    console.log(`Searching TMDB for IMDb rating with: "${searchTerm}"`)
    
    const results = await searchTMDB(searchTerm)
    
    if (results.length > 0) {
      // Get the first result that's a movie or TV show
      const firstResult = results.find(result => 
        result.media_type === 'movie' || result.media_type === 'tv'
      )
      
      if (firstResult) {
        // Get external IDs to find IMDb ID
        const externalIds = await getTMDBExternalIds(firstResult.id, firstResult.media_type)
        
        if (externalIds?.imdb_id) {
          console.log(`Found IMDb ID: ${externalIds.imdb_id}`)
          
          // Get IMDb rating from OMDb
          const rating = await getOMDBRating(externalIds.imdb_id)
          
          if (rating) {
            console.log(`Found IMDb rating: ${rating}`)
            return rating
          }
        }
      }
    }
  }
  
  console.log(`No IMDb rating found for: "${movieTitle}"`)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { movieTitle } = await request.json()
    
    if (!movieTitle || typeof movieTitle !== 'string') {
      return NextResponse.json(
        { error: "Movie title is required" },
        { status: 400 }
      )
    }
    
    const imdbRating = await getIMDBRating(movieTitle)
    
    if (!imdbRating) {
      return NextResponse.json(
        { error: "No IMDb rating found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      rating: imdbRating,
      source: "IMDb"
    })
    
  } catch (error) {
    console.error("IMDb rating API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
