"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Film, Shield, Smartphone, Monitor, Copy, Check, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function PlayHerePage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const extraWatchUrl = searchParams.get('extra') // NEW: Watch Online URL from movies4u
  
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Device detection
  useEffect(() => {
    const userAgent = navigator.userAgent
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(userAgent))
    setIsLoading(false)
  }, [])

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // If no ID provided, show error
  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Film className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Invalid Video ID</h1>
          <p className="text-gray-400 mb-6">Please provide a valid video ID in the URL.</p>
          <Button 
            onClick={() => window.history.back()}
            className="bg-red-600 hover:bg-red-700"
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 liquid-glass transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Website Name */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 netflix-gradient rounded-lg flex items-center justify-center shadow-lg">
                <Film className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                NetVlyx
              </h1>
            </div>

            {/* Back and Refresh Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.history.back()}
                className="bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 rounded-full transition-all duration-300 hover:scale-105 p-2"
                title="Go Back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 rounded-full transition-all duration-300 hover:scale-105 p-2"
                title="Refresh Page"
              >
                <RefreshCw className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Video Player Container */}
          <div className="mb-8">
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading video player...</p>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`https://hikke383ehr.com/play/${id}`}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                  title="Video Player"
                />
              )}
            </div>
            
            {/* Alternative Watch Online Button - NEW */}
            {extraWatchUrl && (
              <div className="mt-4">
                <a 
                  href={extraWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block"
                >
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 rounded-xl">
                    <Film className="h-5 w-5 mr-2" />
                    If above player not work then click me
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Playback Tips Section */}
          <div className="mb-8">
            <div className="liquid-glass rounded-xl p-6 border border-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Playback Tips 💡</h2>
              </div>
              <p className="text-gray-300 leading-relaxed">
                For the best experience, <span className="text-red-400 font-semibold">use an AdBlocker</span> to prevent interruptions.
                <br />
                If the video doesn't load, try refreshing the page or check your internet connection.
              </p>
            </div>
          </div>

          {/* AdBlocker Guide Section */}
          <div className="mb-8">
            <div className="liquid-glass rounded-xl p-6 border border-gray-800/50">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Get an AdBlocker 🛡️</h2>
              </div>
              <p className="text-gray-300 mb-6">
                Select your device type for a simple, system-wide ad-blocking guide.
              </p>

              {/* Mobile Guide */}
              {isMobile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-blue-500" />
                    <span>For Android & iOS</span>
                  </h3>
                  <p className="text-gray-300">
                    Use a Private DNS to block ads across your entire device (in apps and browsers) without installing anything.
                  </p>
                  <ol className="space-y-2 text-gray-300 pl-4">
                    <li className="flex items-start space-x-2">
                      <span className="text-red-400 font-bold">1.</span>
                      <span>Go to your phone's <strong className="text-white">Settings</strong>.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-red-400 font-bold">2.</span>
                      <span>Search for "<strong className="text-white">Private DNS</strong>" (often in Network or Connection settings).</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-red-400 font-bold">3.</span>
                      <span>Select the "Private DNS provider hostname" option.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-red-400 font-bold">4.</span>
                      <span>Enter the following address and save:</span>
                    </li>
                  </ol>
                  
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center space-x-3">
                    <code className="flex-1 text-green-400 font-mono text-sm">dns.adguard.com</code>
                    <Button
                      onClick={() => copyToClipboard('dns.adguard.com')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-gray-300 text-sm">
                    That's it! Enjoy a cleaner, ad-free experience across your entire device.
                  </p>
                </div>
              )}

              {/* PC Guide */}
              {!isMobile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Monitor className="h-5 w-5 text-blue-500" />
                    <span>For PC (Chrome, Edge, Brave, etc.)</span>
                  </h3>
                  
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-800 rounded-xl flex items-center justify-center mx-auto">
                      <img 
                        src="https://avatars3.githubusercontent.com/u/8361145?s=200&v=4" 
                        alt="AdGuard Logo" 
                        className="w-16 h-16 rounded-lg"
                      />
                    </div>
                    <p className="text-gray-300">
                      The best way to block ads on a computer is with a browser extension. We recommend AdGuard.
                    </p>
                    <a 
                      href="https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikgbkllg?hl=en&pli=1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105">
                        Install AdGuard Extension
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Troubleshooting Section */}
          <div className="mb-8">
            <div className="liquid-glass rounded-xl p-6 border border-gray-800/50">
              <h2 className="text-xl font-bold text-white mb-4">Troubleshooting 🔧</h2>
              <div className="space-y-3">
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <h3 className="font-semibold text-yellow-400 mb-2">Video not loading?</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Refresh the page (F5 or Ctrl+R)</li>
                    <li>• Clear your browser cache and cookies</li>
                    <li>• Try a different browser</li>
                    <li>• Check your internet connection</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">Poor video quality?</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Check your internet speed</li>
                    <li>• Close other bandwidth-heavy applications</li>
                    <li>• Try switching to a different server if available</li>
                    <li>• Update your browser to the latest version</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="liquid-glass border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 netflix-gradient rounded flex items-center justify-center">
                <Film className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                NetVlyx
              </h3>
            </div>
            <p className="text-gray-400 text-sm">
              &copy; 2024 NetVlyx. All rights reserved. Designed with liquid glass aesthetics for the ultimate viewing experience.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}