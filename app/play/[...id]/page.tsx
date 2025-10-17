"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Film, ExternalLink, Info, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import PremiumVideoPlayer from "@/components/premium-video-player"
import Image from "next/image"

interface PlayPageProps {
  params: { id: string | string[] }
}

export default function PlayPage({ params }: PlayPageProps) {
  const router = useRouter()
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [showExternalOptions, setShowExternalOptions] = useState(false)
  const [showInitialPopup, setShowInitialPopup] = useState(true)
  const [playerStarted, setPlayerStarted] = useState(false)

  useEffect(() => {
    // Reconstruct the video URL from the file ID
    // This assumes the original URL pattern from pixeldrain or similar services
    const raw = Array.isArray(params.id) ? params.id.join("/") : params.id
    const fileId = decodeURIComponent(raw).split("/").pop() ?? raw
    const reconstructedUrl = `https://pixeldrain.dev/api/file/${fileId}?download`
    setVideoUrl(reconstructedUrl)
  }, [params.id])

  const playInMX = () => {
    if (videoUrl) {
      const urlWithoutScheme = videoUrl.replace(/^https?:\/\//i, '')
      window.location.href = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad')};end`
    }
  }

  const playInMXPro = () => {
    if (videoUrl) {
      const urlWithoutScheme = videoUrl.replace(/^https?:\/\//i, '')
      window.location.href = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.pro;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.pro')};end`
    }
  }

  const playInVLC = () => {
    if (videoUrl) {
      const urlWithoutScheme = videoUrl.replace(/^https?:\/\//i, '')
      window.location.href = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`
    }
  }

  const handlePlayHere = () => {
    setShowInitialPopup(false)
    setPlayerStarted(true)
  }

  const handleExternalPlayer = () => {
    setShowInitialPopup(false)
    setShowExternalOptions(true)
  }

  const closeInitialPopup = () => {
    setShowInitialPopup(false)
    setPlayerStarted(true)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Film className="h-24 w-24 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Playback Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button 
            onClick={() => router.back()}
            className="netflix-gradient"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading player...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header for mobile/desktop navigation */}
      <div className="absolute top-4 left-4 z-40 md:hidden">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-black/70"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* External Player Option Button */}
      <div className="absolute top-4 right-4 z-40">
        <Button
          onClick={() => setShowExternalOptions(!showExternalOptions)}
          variant="outline"
          size="sm"
          className="bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-black/70"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          External Player
        </Button>
      </div>

      {/* Initial Popup - Auto shows on page load */}
      {showInitialPopup && videoUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900 border-gray-700 relative">
            <CardContent className="p-6">
              {/* Close button */}
              <Button
                onClick={closeInitialPopup}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Choose Player</h3>
                <p className="text-gray-300 text-sm">
                  Play in external player for better audio tracks, subtitles & controls
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleExternalPlayer}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 h-auto"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">External Player</div>
                      <div className="text-sm opacity-90">MX Player, VLC & more</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handlePlayHere}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 p-4 h-auto bg-transparent"
                >
                  <div className="flex items-center gap-3">
                    <Play className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Play Here</div>
                      <div className="text-sm opacity-70">Built-in player</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* External Player Options Modal */}
      {showExternalOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">External Players</h3>
                <Button
                  onClick={() => setShowExternalOptions(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Info Note */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-200">
                    External players offer better experience with audio track selection, subtitle options, and advanced
                    playback controls.
                  </p>
                </div>
              </div>

              {/* Player Options */}
              <div className="space-y-3">
                <Button
                  onClick={playInMX}
                  className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/images/mx-player.png"
                      alt="MX Player"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">MX Player</div>
                    <div className="text-sm opacity-80">Free version</div>
                  </div>
                </Button>

                <Button
                  onClick={playInMXPro}
                  className="w-full flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white p-4 h-auto"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/images/mx-player-pro.png"
                      alt="MX Player Pro"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">MX Player Pro</div>
                    <div className="text-sm opacity-80">Premium version</div>
                  </div>
                </Button>

                <Button
                  onClick={playInVLC}
                  className="w-full flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white p-4 h-auto"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Image src="/images/vlc.png" alt="VLC Player" width={32} height={32} className="rounded-full" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">VLC Player</div>
                    <div className="text-sm opacity-80">Open source</div>
                  </div>
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 text-center">Note: External players work on Android devices only</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Video Player Component - Only show when player is started */}
      {(playerStarted || !showInitialPopup) && (
        <PremiumVideoPlayer videoUrl={videoUrl} title="NetVlyx Player" onError={setError} />
      )}
    </div>
  )
}
