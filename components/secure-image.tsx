"use client"

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface SecureImageProps {
  src: string // Original image URL
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  sizes?: string
  onError?: () => void
}

// Token cache with expiry
let cachedToken: { token: string; expiresAt: number } | null = null

async function getImageToken(): Promise<string> {
  // Return cached token if still valid (with 5 second buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token
  }
  
  try {
    const response = await fetch('/api/img-token', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch token')
    }
    
    const data = await response.json()
    
    // Cache the token
    cachedToken = {
      token: data.token,
      expiresAt: Date.now() + (data.expiresIn || 60000) - 5000, // 5 second buffer
    }
    
    return data.token
  } catch (error) {
    console.error('Error fetching image token:', error)
    throw error
  }
}

function encodeImageUrl(url: string): string {
  // Simple base64url encoding for Edge runtime compatibility
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function SecureImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
  priority,
  sizes,
  onError,
}: SecureImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [useFallback, setUseFallback] = useState(false)
  const [error, setError] = useState(false)
  const mountedRef = useRef(true)
  
  useEffect(() => {
    mountedRef.current = true
    
    async function loadImage() {
      try {
        // Reset states
        setError(false)
        setUseFallback(false)
        
        // If not an external URL, use directly
        if (!src.startsWith('http://') && !src.startsWith('https://')) {
          setImageSrc(src)
          return
        }
        
        // Get token and encode image URL
        const token = await getImageToken()
        const encodedId = encodeImageUrl(src)
        
        // Create proxied URL with token
        const proxyUrl = `/api/img/${encodedId}?t=${token}`
        
        if (mountedRef.current) {
          setImageSrc(proxyUrl)
        }
      } catch (err) {
        console.error('Error setting up secure image:', err)
        // Fall back to original URL on any error
        if (mountedRef.current) {
          setUseFallback(true)
          setImageSrc(src)
        }
      }
    }
    
    loadImage()
    
    return () => {
      mountedRef.current = false
    }
  }, [src])
  
  const handleImageError = () => {
    if (!useFallback && src) {
      // Try fallback to original URL
      console.log('Proxy failed, falling back to original URL')
      setUseFallback(true)
      setImageSrc(src)
    } else {
      // Even fallback failed
      setError(true)
      onError?.()
    }
  }
  
  if (!imageSrc) {
    // Loading placeholder
    return (
      <div
        className={`bg-gray-800 animate-pulse ${className || ''}`}
        style={fill ? undefined : { width, height }}
      />
    )
  }
  
  if (error) {
    // Error placeholder
    return (
      <div
        className={`bg-gray-900 flex items-center justify-center ${className || ''}`}
        style={fill ? undefined : { width, height }}
      >
        <svg
          className="w-1/3 h-1/3 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      fill={fill}
      priority={priority}
      sizes={sizes}
      onError={handleImageError}
      unoptimized={useFallback} // Don't optimize fallback images
    />
  )
}
