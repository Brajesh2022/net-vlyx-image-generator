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
