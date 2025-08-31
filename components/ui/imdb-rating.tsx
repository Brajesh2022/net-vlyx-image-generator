"use client"

import React from "react"
import { Star, Loader2 } from "lucide-react"

interface IMDbRatingProps {
  rating: string | null
  isLoading: boolean
  fallbackRating?: string
  size?: "sm" | "md" | "lg"
  variant?: "hero" | "overlay" | "inline"
}

const IMDbLogo = ({ className }: { className?: string }) => (
  <div 
    className={`${className} bg-yellow-400 text-black font-black tracking-wider flex items-center justify-center rounded shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105`}
    style={{ 
      fontFamily: 'Arial, sans-serif',
      background: '#F5C518',
      color: '#000000',
      boxShadow: '0 0 10px rgba(245, 197, 24, 0.3)'
    }}
  >
    IMDb
  </div>
)

export function IMDbRating({ 
  rating, 
  isLoading, 
  fallbackRating, 
  size = "md", 
  variant = "inline" 
}: IMDbRatingProps) {
  const sizeClasses = {
    sm: {
      container: "px-2 py-1",
      star: "h-3 w-3",
      text: "text-sm",
      badge: "text-xs px-1.5 py-0.5",
      logo: "w-8 h-4 text-xs"
    },
    md: {
      container: "px-3 py-1.5",
      star: "h-4 w-4",
      text: "text-base",
      badge: "text-xs px-2 py-0.5",
      logo: "w-10 h-5 text-xs"
    },
    lg: {
      container: "px-4 py-3",
      star: "h-5 w-5",
      text: "text-lg",
      badge: "text-sm px-2 py-1",
      logo: "w-12 h-6 text-sm"
    }
  }

  const variantClasses = {
    hero: "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 backdrop-blur-sm rounded-full border border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-yellow-400/20 hover:shadow-lg",
    overlay: "bg-gradient-to-br from-yellow-400/20 to-yellow-600/30 backdrop-blur-sm rounded-xl border-2 border-yellow-400/40 shadow-lg hover:border-yellow-400/60 transition-all duration-300 hover:shadow-yellow-400/30 hover:shadow-xl",
    inline: "bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 rounded-lg border border-yellow-400/20 hover:border-yellow-400/30 transition-all duration-300"
  }

  const classes = sizeClasses[size]
  const containerClass = variantClasses[variant]

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${containerClass} ${classes.container}`}>
        <Star className={`${classes.star} text-yellow-400 fill-current`} />
        <Loader2 className={`${classes.star} animate-spin text-yellow-400`} />
        <span className={`${classes.text} text-gray-300 font-medium`}>Loading...</span>
      </div>
    )
  }

  if (rating) {
    return (
      <div className={`flex items-center gap-2 ${containerClass} ${classes.container}`}>
        <Star className={`${classes.star} text-yellow-400 fill-current`} />
        <span className={`${classes.text} font-bold text-white`}>{rating}</span>
        <IMDbLogo className={classes.logo} />
      </div>
    )
  }

  if (fallbackRating) {
    return (
      <div className={`flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg ${classes.container}`}>
        <Star className={`${classes.star} text-yellow-400 fill-current`} />
        <span className={`${classes.text} font-medium text-white`}>{fallbackRating}</span>
        <span className="text-xs text-gray-300 bg-gray-600 px-1.5 py-0.5 rounded">
          TMDb
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg ${classes.container}`}>
      <Star className={`${classes.star} text-yellow-400 fill-current`} />
      <span className={`${classes.text} font-medium text-gray-400`}>N/A</span>
    </div>
  )
}
