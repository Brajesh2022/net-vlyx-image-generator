"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { PremiumVideoPlayer } from "@/components/premium-video-player"
import { Button } from "@/components/ui/button"
import { ChevronLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function PlayVlyJes() {
  const searchParams = useSearchParams()
  const playParam = searchParams.get("play")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (playParam) {
      // Construct the full CDN URL from the filename
      const fullUrl = `https://cdn.cdn4bot.xyz/${playParam}`
      setVideoUrl(fullUrl)
    } else {
      setError("No video file specified")
    }
  }, [playParam])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-24 w-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Error Loading Video</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/">
            <Button className="netflix-gradient">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading Video...</h1>
          <p className="text-gray-400">Please wait while we prepare your video</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <PremiumVideoPlayer
        src={videoUrl}
        title={playParam ? decodeURIComponent(playParam) : "VlyJes Video"}
        poster="/placeholder.svg?height=720&width=1280"
      />
    </div>
  )
}
