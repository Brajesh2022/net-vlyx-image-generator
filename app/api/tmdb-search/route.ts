import { type NextRequest, NextResponse } from "next/server"

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
}

interface SearchRequest {
  movieTitle: string
  contentType?: 'movie' | 'tv' | 'auto'
}

// Smart title cleaning function
function cleanMovieTitle(title: string): string {
  console.log("Original title:", title)
  
  let cleaned = title.trim()
  
  // Remove leading/trailing spaces and special characters
  cleaned = cleaned.replace(/^[^\w]*/, '').replace(/[^\w]*$/, '')
  
  // Remove quality indicators and technical terms
  const qualityPatterns = [
    /\b(WEB-DL|PRE-HD|DS4K|BluRay|HDRip|BRRip|DVDRip|HDTV|PDTV|CAM|TS|TC|SCR|R5|R6)\b/gi,
    /\b(1080p|720p|480p|4K|2160p|1440p|360p|240p)\b/gi,
    /\b(x264|x265|HEVC|10Bit-HEVC|AVC|MPEG-4)\b/gi,
    /\b(Dual Audio|DD2\.0|DD5\.1|LiNE|AAC|AC3|DTS)\b/gi,
    /\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali|Marathi|Gujarati|Punjabi)\b/gi,
    /\b(Full Movie|ALL Episodes|Complete Season|Season \d+)\b/gi,
    /\b(AMZN|PrimeVideo|SonyLiv|Netflix|Disney|Hotstar|Zee5|Voot)\b/gi,
    /\b(Series|Movie|Film|Show)\b/gi,
    /\b(EP-\d+|Episode \d+)\b/gi,
    /\b(Added|Updated|New|Latest)\b/gi
  ]
  
  qualityPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Remove everything in brackets and parentheses
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '')
  cleaned = cleaned.replace(/\([^)]*\)/g, '')
  
  // Remove special characters and extra spaces
  cleaned = cleaned.replace(/[|&]/g, '')
  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.trim()
  
  // Remove year patterns like (2024), (2025) but keep the year if it's part of the title
  cleaned = cleaned.replace(/\s*\(\d{4}\)\s*/g, ' ')
  
  // Remove leading/trailing special characters again
  cleaned = cleaned.replace(/^[^\w]*/, '').replace(/[^\w]*$/, '')
  cleaned = cleaned.trim()
  
  console.log("Cleaned title:", cleaned)
  return cleaned
}

// Enhanced search strategy with content type awareness
async function searchTMDBWithFallback(cleanedTitle: string, contentType: 'movie' | 'tv' | 'auto' = 'auto') {
  const searchStrategies = [
    // Strategy 1: Full cleaned title
    cleanedTitle,
    // Strategy 2: First 5 words
    cleanedTitle.split(' ').slice(0, 5).join(' '),
    // Strategy 3: First 4 words
    cleanedTitle.split(' ').slice(0, 4).join(' '),
    // Strategy 4: First 3 words
    cleanedTitle.split(' ').slice(0, 3).join(' '),
    // Strategy 5: First 2 words
    cleanedTitle.split(' ').slice(0, 2).join(' '),
    // Strategy 6: Just first word (for single word titles)
    cleanedTitle.split(' ')[0]
  ]
  
  console.log("Search strategies:", searchStrategies)
  console.log("Content type:", contentType)
  
  // If content type is specified, search only that type
  if (contentType === 'movie') {
    return await searchMovies(searchStrategies)
  } else if (contentType === 'tv') {
    return await searchTVShows(searchStrategies)
  }
  
  // For 'auto' or unspecified, try both with smart fallback
  console.log("Auto-detecting content type, trying movies first...")
  const movieResult = await searchMovies(searchStrategies)
  if (movieResult) {
    console.log("Found movie result, returning")
    return movieResult
  }
  
  console.log("No movie found, trying TV shows...")
  const tvResult = await searchTVShows(searchStrategies)
  if (tvResult) {
    console.log("Found TV show result, returning")
    return tvResult
  }
  
  return null
}

async function searchMovies(searchStrategies: string[]) {
  for (const searchTerm of searchStrategies) {
    if (!searchTerm || searchTerm.length < 2) continue
    
    console.log(`Trying movie search strategy: "${searchTerm}"`)
    
    try {
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=en-US&page=1&include_adult=false`
      )
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          console.log(`Found ${searchData.results.length} movie results for "${searchTerm}"`)
          
          // Get the first (most relevant) result
          const movie = searchData.results[0]
          
          // Fetch detailed information including credits, videos, and images
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,images&language=en-US`
          )
          
          if (detailsResponse.ok) {
            const details = await detailsResponse.json()
            console.log(`Successfully fetched movie details for "${searchTerm}"`)
            return details
          }
        }
      }
    } catch (error) {
      console.error(`Error with movie search term "${searchTerm}":`, error)
    }
  }
  return null
}

async function searchTVShows(searchStrategies: string[]) {
  for (const searchTerm of searchStrategies) {
    if (!searchTerm || searchTerm.length < 2) continue
    
    console.log(`Trying TV search strategy: "${searchTerm}"`)
    
    try {
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=en-US&page=1&include_adult=false`
      )
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          console.log(`Found ${searchData.results.length} TV results for "${searchTerm}"`)
          
          // Get the first (most relevant) result
          const show = searchData.results[0]
          
          // Fetch detailed information including credits, videos, and images
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${show.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,images&language=en-US`
          )
          
          if (detailsResponse.ok) {
            const details = await detailsResponse.json()
            console.log(`Successfully fetched TV details for "${searchTerm}"`)
            return details
          }
        }
      }
    } catch (error) {
      console.error(`Error with TV search term "${searchTerm}":`, error)
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json()
    const { movieTitle, contentType = 'auto' } = body
    
    if (!movieTitle) {
      return NextResponse.json({ error: "Movie title is required" }, { status: 400 })
    }

    console.log(`Processing movie title: ${movieTitle}, contentType: ${contentType}`)
    
    // Clean the title
    const cleanedTitle = cleanMovieTitle(movieTitle)
    
    if (!cleanedTitle || cleanedTitle.length < 2) {
      return NextResponse.json({ error: "Invalid movie title after cleaning" }, { status: 400 })
    }

    // Search with fallback strategies and content type awareness
    const details = await searchTMDBWithFallback(cleanedTitle, contentType)

    if (details) {
      console.log("TMDB search successful")
      return NextResponse.json({ data: details })
    } else {
      console.log("No TMDB results found")
      return NextResponse.json({ error: "No movies found" }, { status: 404 })
    }

  } catch (error) {
    console.error("Error searching TMDb:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to search TMDb",
        details: "Check the movie title and try again"
      }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const type = searchParams.get("type") || "movie"
  
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    console.log(`Fetching TMDb details for ${type} ID:`, query)

    // Fetch details directly by ID
    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${query}?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.status}`)
    }

    const details: TMDbResponse = await response.json()

    // Transform the response to match our interface
    const result = {
      title: details.title || details.name || "Unknown Title",
      name: details.name || details.title || "Unknown Title",
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      overview: details.overview || "",
      release_date: details.release_date || details.first_air_date || "",
      first_air_date: details.first_air_date || details.release_date || "",
      vote_average: details.vote_average || 0,
      contentType: type
    }

    console.log("TMDb details processed successfully")
    return NextResponse.json(result)

  } catch (error) {
    console.error("Error fetching TMDb details:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch TMDb details",
        details: "Check the TMDb ID and try again"
      }, 
      { status: 500 }
    )
  }
}
