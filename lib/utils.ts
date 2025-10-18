import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Encodes movie slug and source URL into a single URL-safe string
 * Uses base64url encoding for fast performance
 */
export function encodeMovieUrl(slug: string, sourceUrl: string): string {
  try {
    // Combine slug and source URL with a separator
    const combined = `${slug}|||${sourceUrl}`
    // Convert to base64url (URL-safe base64)
    const base64 = btoa(combined)
    // Make it URL-safe by replacing characters
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding movie URL:', error)
    // Fallback to unencoded format
    return `${slug}?src=${encodeURIComponent(sourceUrl)}`
  }
}

/**
 * Decodes an encoded movie URL back to slug and source URL
 */
export function decodeMovieUrl(encoded: string): { slug: string; sourceUrl: string } | null {
  try {
    // Restore base64 padding and convert back from URL-safe format
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding
    while (base64.length % 4) {
      base64 += '='
    }
    // Decode base64
    const decoded = atob(base64)
    // Split by separator
    const parts = decoded.split('|||')
    if (parts.length === 2) {
      return {
        slug: parts[0],
        sourceUrl: parts[1]
      }
    }
    return null
  } catch (error) {
    console.error('Error decoding movie URL:', error)
    return null
  }
}

/**
 * Encodes VlyxDrive URL parameters into a secure key
 * Supports both driveid and link parameters
 */
export function encodeVlyxDriveParams(params: {
  link?: string
  driveid?: string
  tmdbid?: string
  season?: string
  server?: string
}): string {
  try {
    // Create a JSON string of non-null parameters
    const cleanParams: Record<string, string> = {}
    if (params.link) cleanParams.link = params.link
    if (params.driveid) cleanParams.driveid = params.driveid
    if (params.tmdbid) cleanParams.tmdbid = params.tmdbid
    if (params.season) cleanParams.season = params.season
    if (params.server) cleanParams.server = params.server

    const json = JSON.stringify(cleanParams)
    // Convert to base64url (URL-safe base64)
    const base64 = btoa(json)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding VlyxDrive params:', error)
    return ''
  }
}

/**
 * Decodes VlyxDrive key back to original parameters
 */
export function decodeVlyxDriveParams(key: string): {
  link?: string
  driveid?: string
  tmdbid?: string
  season?: string
  server?: string
} | null {
  try {
    // Restore base64 padding and convert back from URL-safe format
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    // Decode base64
    const decoded = atob(base64)
    // Parse JSON
    const params = JSON.parse(decoded)
    return params
  } catch (error) {
    console.error('Error decoding VlyxDrive params:', error)
    return null
  }
}

/**
 * Encodes N-Cloud URL parameters into a secure key
 */
export function encodeNCloudParams(params: {
  id: string
  title?: string
  poster?: string
}): string {
  try {
    const cleanParams: Record<string, string> = {}
    cleanParams.id = params.id
    if (params.title) cleanParams.title = params.title
    if (params.poster) cleanParams.poster = params.poster

    const json = JSON.stringify(cleanParams)
    const base64 = btoa(json)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding N-Cloud params:', error)
    return ''
  }
}

/**
 * Decodes N-Cloud key back to original parameters
 */
export function decodeNCloudParams(key: string): {
  id: string
  title?: string
  poster?: string
} | null {
  try {
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const decoded = atob(base64)
    const params = JSON.parse(decoded)
    return params
  } catch (error) {
    console.error('Error decoding N-Cloud params:', error)
    return null
  }
}

/**
 * Replaces VCloud variations with N-Cloud in any text
 */
export function replaceVCloudText(text: string): string {
  if (!text) return text
  
  return text
    .replace(/\bV-Cloud\b/g, 'N-Cloud')
    .replace(/\bVCloud\b/g, 'N-Cloud')
    .replace(/\bvCloud\b/g, 'N-Cloud')
    .replace(/\bv-cloud\b/gi, 'N-Cloud')
    .replace(/\bV cloud\b/g, 'N cloud')
    .replace(/\bv cloud\b/g, 'n cloud')
}

/**
 * Replaces NextDrive variations with Vlyx-Drive in any text
 */
export function replaceNextDriveText(text: string): string {
  if (!text) return text
  
  return text
    .replace(/\bNext-Drive\b/g, 'Vlyx-Drive')
    .replace(/\bNextDrive\b/g, 'Vlyx-Drive')
    .replace(/\bNext-drive\b/g, 'Vlyx-Drive')
    .replace(/\bnext-drive\b/gi, 'vlyx-drive')
    .replace(/\bNext drive\b/g, 'Vlyx drive')
    .replace(/\bnext drive\b/g, 'vlyx drive')
    .replace(/\bNextdrive\b/g, 'Vlyxdrive')
}

/**
 * Replaces all branding text (VCloud and NextDrive)
 */
export function replaceBrandingText(text: string): string {
  if (!text) return text
  
  let result = replaceVCloudText(text)
  result = replaceNextDriveText(result)
  
  return result
}

/**
 * Cleans movie title by showing only up to year bracket
 * Example: "Following (2024) AMZN-WEB-DL Dual Audio {Hindi-Korean} 480p [370MB]"
 * Returns: "Following (2024)"
 */
export function cleanMovieTitle(title: string): string {
  if (!title) return ""
  
  // Match everything up to and including year bracket like (2024)
  const match = title.match(/^(.+?\(\d{4}\))/)
  
  if (match) {
    return match[1].trim()
  }
  
  // If no year found, try to get just the title before any technical info
  const techInfoMatch = title.match(/^([^[\]{|]+?)(?:\s*[\[\]{|]|$)/)
  if (techInfoMatch) {
    return techInfoMatch[1].trim()
  }
  
  // Fallback: return original title
  return title.trim()
}
