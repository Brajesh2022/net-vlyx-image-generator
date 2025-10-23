"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Film, Shield, Smartphone, Monitor, Copy, Check, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface WatchOption {
  url: string
  label: string
}

export default function PlayHerePage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  
  // ✅ NEW: Extract ALL watch links and their labels
  const watchOptions: WatchOption[] = []
  
  // Check for extra, extra2, extra3, etc. and button1, button2, button3, etc.
  let index = 1
  while (true) {
    const paramName = index === 1 ? 'extra' : `extra${index}`
    const buttonName = `button${index}`
    
    const url = searchParams.get(paramName)
    if (!url) break // No more watch links
    
    const label = searchParams.get(buttonName) || `Watch Option ${index}`
    watchOptions.push({ url, label })
    index++
  }
  
  // Backward compatibility: single extra parameter
  const extraWatchUrl = searchParams.get('extra')
  
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showWatchOptionsModal, setShowWatchOptionsModal] = useState(false) // ✅ NEW: Modal for multiple watch links

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
            
            {/* Alternative Watch Online Button - ✅ UPDATED for multiple links */}
            {watchOptions.length > 0 && (
              <div className="mt-4">
                {watchOptions.length === 1 ? (
                  // Single watch link - direct button
                  <a 
                    href={watchOptions[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block"
                  >
                    <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 rounded-xl">
                      <Film className="h-5 w-5 mr-2" />
                      If above player not work then click me
                    </Button>
                  </a>
                ) : (
                  // Multiple watch links - show popup
                  <Button 
                    onClick={() => setShowWatchOptionsModal(true)}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 rounded-xl"
                  >
                    <Film className="h-5 w-5 mr-2" />
                    If above player not work then click me ({watchOptions.length} options)
                  </Button>
                )}
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
      
      {/* ✅ NEW: Watch Options Modal for Multiple Links */}
      <Dialog open={showWatchOptionsModal} onOpenChange={setShowWatchOptionsModal}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Film className="h-6 w-6 text-orange-500" />
              Select Watch Option
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-6 space-y-3">
            {watchOptions.map((option, index) => {
              // ✅ Color coding based on language/version
              const getColorClass = (label: string) => {
                const lowerLabel = label.toLowerCase()
                if (lowerLabel.includes('hindi') && lowerLabel.includes('tamil')) {
                  return 'from-orange-600 to-red-600 border-orange-500/50'
                } else if (lowerLabel.includes('telugu')) {
                  return 'from-blue-600 to-purple-600 border-blue-500/50'
                } else if (lowerLabel.includes('hindi')) {
                  return 'from-yellow-600 to-orange-600 border-yellow-500/50'
                } else if (lowerLabel.includes('tamil')) {
                  return 'from-green-600 to-teal-600 border-green-500/50'
                } else if (lowerLabel.includes('english')) {
                  return 'from-cyan-600 to-blue-600 border-cyan-500/50'
                } else {
                  return 'from-gray-600 to-gray-700 border-gray-500/50'
                }
              }
              
              return (
                <a
                  key={index}
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className={`p-4 rounded-xl border-2 bg-gradient-to-r ${getColorClass(option.label)} hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Film className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            Watch Online {option.label}
                          </h3>
                          <p className="text-sm text-white/80">
                            Button {index + 1}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-5 w-5 text-white/80" />
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
          
          <p className="mt-4 text-sm text-gray-400 text-center">
            Each option may have different language/version. Choose the one you prefer.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}