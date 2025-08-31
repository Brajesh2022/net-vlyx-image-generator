"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Heart, Download, Star, Sparkles, Gift, ArrowRight } from "lucide-react"
import Link from "next/link"

export function DonationPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  // Function to show the popup
  const showPopup = () => {
    setIsVisible(true)
  }

  // Function to hide the popup
  const hidePopup = () => {
    setIsVisible(false)
  }

  // Expose functions globally for use in download handlers
  useEffect(() => {
    // @ts-ignore
    window.showDonationPopup = showPopup
    // @ts-ignore
    window.hideDonationPopup = hidePopup
    
    return () => {
      // @ts-ignore
      delete window.showDonationPopup
      // @ts-ignore
      delete window.hideDonationPopup
    }
  }, [])

  // Thank You Modal (if user visited contribution page)
  if (showThankYou) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-gradient-to-br from-green-900/90 to-emerald-900/90 backdrop-blur-xl border border-green-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          {/* Animated Icons */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Heart className="w-10 h-10 text-green-400 fill-current" />
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <Star className="w-6 h-6 text-yellow-400 fill-current" />
            </div>
            <div className="absolute -bottom-2 -left-2 animate-bounce delay-300">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">Thank You! 💝</h2>
          <p className="text-green-100 text-lg mb-4">We appreciate your support!</p>

          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <p className="text-green-200 text-sm leading-relaxed">
              Your generosity helps us keep NetVlyx running and improving. Every contribution matters and makes a difference!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-green-300 text-sm">
            <Heart className="w-4 h-4 fill-current" />
            <span>Your support means the world to us</span>
            <Heart className="w-4 h-4 fill-current" />
          </div>

          {/* Auto-close indicator */}
          <div className="mt-6">
            <div className="w-full bg-green-800/30 rounded-full h-1">
              <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
            <p className="text-green-300 text-xs mt-2">Closing automatically...</p>
          </div>
        </div>
      </div>
    )
  }

  // Main Donation Popup
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={hidePopup} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 p-3 rounded-xl">
              <Heart className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Thank You!</h2>
              <p className="text-sm text-gray-400">Download started successfully</p>
            </div>
          </div>
          <button onClick={hidePopup} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Icon with Animation */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Download className="w-8 h-8 text-green-400" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Enjoying NetVlyx?</h3>
          <p className="text-gray-300 text-sm">
            Support us to keep NetVlyx free and ad-free!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href="/contribution" onClick={hidePopup}>
            <button className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3">
              <Gift className="w-5 h-5" />
              Support NetVlyx
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          
          <button 
            onClick={hidePopup}
            className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 py-3 px-6 rounded-2xl font-medium transition-all duration-300"
          >
            Maybe Later
          </button>
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Your support keeps NetVlyx running
          </p>
        </div>
      </div>
    </div>
  )
}
