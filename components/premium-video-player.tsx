"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Check,
  Monitor,
  Loader2,
} from "lucide-react"

interface PremiumVideoPlayerProps {
  videoUrl?: string
  src?: string
  title?: string
  poster?: string
  autoPlay?: boolean
  onError?: (error: string) => void
}

export default function PremiumVideoPlayer({
  videoUrl,
  src,
  title = "Video Player",
  poster,
  autoPlay = false,
  onError,
}: PremiumVideoPlayerProps) {
  const videoSrc = videoUrl || src || ""

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [brightness, setBrightness] = useState(1)
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false)
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [seekIndicator, setSeekIndicator] = useState<{ show: boolean; position: number; time: number }>({
    show: false,
    position: 0,
    time: 0,
  })
  const [videoScale, setVideoScale] = useState<"fit" | "crop" | "fill">("fit")
  const [showSkipIndicator, setShowSkipIndicator] = useState<{
    show: boolean
    direction: "forward" | "backward"
    side: "left" | "right"
  }>({
    show: false,
    direction: "forward",
    side: "right",
  })

  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const touchStartRef = useRef<{ x: number; y: number; time: number; brightness: number; volume: number } | null>(null)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()
  const brightnessTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTapTime = useRef(0)
  const isGestureActive = useRef(false)

  // Auto-hide controls logic
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    if (showSettings || isDragging) {
      return
    }

    setShowControls(true)

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettings && !isDragging) {
          setShowControls(false)
        }
      }, 4000)
    }
  }, [isPlaying, showSettings, isDragging])

  // Handle screen tap for control toggle
  const handleScreenTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isGestureActive.current) {
        return
      }

      const target = e.target as HTMLElement
      if (target.closest(".controls-overlay") || target.closest(".settings-menu")) {
        return
      }

      const currentTime = Date.now()
      const timeDiff = currentTime - lastTapTime.current

      if (showSettings) {
        setShowSettings(false)
        return
      }

      // Handle double tap for seeking
      if (timeDiff < 300 && timeDiff > 50) {
        handleDoubleTap(e)
        return
      }

      lastTapTime.current = currentTime

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      if (showControls) {
        setShowControls(false)
      } else {
        setShowControls(true)
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => {
            if (!showSettings && !isDragging) {
              setShowControls(false)
            }
          }, 4000)
        }
      }
    },
    [showControls, showSettings, isPlaying, isDragging],
  )

  // Handle double tap for seeking
  const handleDoubleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      let clickX: number

      if ("touches" in e) {
        clickX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0
      } else {
        clickX = e.clientX
      }

      const relativeX = clickX - rect.left
      const isRightSide = relativeX > rect.width / 2

      setShowSkipIndicator({
        show: true,
        direction: isRightSide ? "forward" : "backward",
        side: isRightSide ? "right" : "left",
      })

      setTimeout(() => {
        setShowSkipIndicator((prev) => ({ ...prev, show: false }))
      }, 1000)

      const seekTime = isRightSide ? currentTime + 10 : currentTime - 10
      seekVideo(seekTime)

      setShowControls(true)
      resetControlsTimeout()
    },
    [currentTime, resetControlsTimeout],
  )

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)

      if (isCurrentlyFullscreen) {
        if (containerRef.current) {
          containerRef.current.classList.add("immersive-fullscreen")
        }

        if (
          screen.orientation &&
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        ) {
          try {
            ;(screen.orientation as any).lock("landscape").catch(() => {})
          } catch (e) {}
        }
      } else {
        if (containerRef.current) {
          containerRef.current.classList.remove("immersive-fullscreen")
        }

        if (screen.orientation) {
          try {
            ;(screen.orientation as any).unlock()
          } catch (e) {}
        }
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("msfullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("msfullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Video event handlers with proper streaming support
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Configure video for streaming
    video.preload = "metadata" // Only load metadata, not the entire video

    const handleLoadStart = () => {
      setIsLoading(true)
      setError("")
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
      console.log("Video metadata loaded, duration:", video.duration)
    }

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime)
      }
    }

    const handleDurationChange = () => setDuration(video.duration)

    const handlePlay = () => {
      setIsPlaying(true)
      setIsBuffering(false)
      resetControlsTimeout()
    }

    const handlePause = () => {
      setIsPlaying(false)
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }

    const handleWaiting = () => {
      console.log("Video waiting/buffering...")
      setIsBuffering(true)
    }

    const handleCanPlay = () => {
      console.log("Video can play")
      setIsBuffering(false)
      setIsLoading(false)
    }

    const handleCanPlayThrough = () => {
      console.log("Video can play through")
      setIsBuffering(false)
      setIsLoading(false)
    }

    const handleSeeking = () => {
      console.log("Video seeking...")
      setIsBuffering(true)
      setIsSeeking(true)
    }

    const handleSeeked = () => {
      console.log("Video seeked")
      setIsBuffering(false)
      setIsSeeking(false)
      setSeekIndicator((prev) => ({ ...prev, show: false }))
    }

    const handleProgress = () => {
      // This helps with buffering progress
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const duration = video.duration
        if (duration > 0) {
          const bufferedPercent = (bufferedEnd / duration) * 100
          console.log(`Buffered: ${bufferedPercent.toFixed(1)}%`)
        }
      }
    }

    const handleError = (e: Event) => {
      console.error("Video error:", e)
      const videoError = video.error
      let errorMessage = "Failed to load video. Please try again."

      if (videoError) {
        switch (videoError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Video loading was aborted."
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error occurred while loading video."
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Video format is not supported."
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Video source is not supported."
            break
        }
      }

      setError(errorMessage)
      setIsLoading(false)
      setIsBuffering(false)
      onError?.(errorMessage)
    }

    const handleStalled = () => {
      console.log("Video stalled")
      setIsBuffering(true)
    }

    const handleSuspend = () => {
      console.log("Video suspended")
      // Don't set buffering here as suspend is normal for streaming
    }

    // Add all event listeners
    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("canplaythrough", handleCanPlayThrough)
    video.addEventListener("seeking", handleSeeking)
    video.addEventListener("seeked", handleSeeked)
    video.addEventListener("progress", handleProgress)
    video.addEventListener("error", handleError)
    video.addEventListener("stalled", handleStalled)
    video.addEventListener("suspend", handleSuspend)

    return () => {
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("canplaythrough", handleCanPlayThrough)
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("progress", handleProgress)
      video.removeEventListener("error", handleError)
      video.removeEventListener("stalled", handleStalled)
      video.removeEventListener("suspend", handleSuspend)
    }
  }, [isDragging, resetControlsTimeout, onError])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return

      setShowControls(true)
      resetControlsTimeout()

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault()
          togglePlayPause()
          break
        case "arrowleft":
          e.preventDefault()
          seekVideo(currentTime - 10)
          break
        case "arrowright":
          e.preventDefault()
          seekVideo(currentTime + 10)
          break
        case "arrowup":
          e.preventDefault()
          adjustVolume(Math.min(1, volume + 0.1))
          break
        case "arrowdown":
          e.preventDefault()
          adjustVolume(Math.max(0, volume - 0.1))
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentTime, volume, resetControlsTimeout])

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      brightness: brightness,
      volume: volume,
    }
    isGestureActive.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return

    const touch = e.touches[0]
    const container = containerRef.current.getBoundingClientRect()
    const deltaY = touchStartRef.current.y - touch.clientY
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const isRightSide = touch.clientX > container.width / 2

    if (Math.abs(deltaY) > 20 && Math.abs(deltaY) > deltaX) {
      e.preventDefault()
      isGestureActive.current = true

      if (isRightSide) {
        const volumeChange = deltaY / 400
        const newVolume = Math.max(0, Math.min(1, touchStartRef.current.volume + volumeChange))
        adjustVolume(newVolume)
        setShowVolumeIndicator(true)

        if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current)
        volumeTimeoutRef.current = setTimeout(() => {
          setShowVolumeIndicator(false)
        }, 2000)
      } else {
        const brightnessChange = deltaY / 500
        const newBrightness = Math.max(0.2, Math.min(1, touchStartRef.current.brightness + brightnessChange))
        setBrightness(newBrightness)
        setShowBrightnessIndicator(true)

        if (brightnessTimeoutRef.current) clearTimeout(brightnessTimeoutRef.current)
        brightnessTimeoutRef.current = setTimeout(() => {
          setShowBrightnessIndicator(false)
        }, 2000)
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    setTimeout(() => {
      isGestureActive.current = false
    }, 100)
  }

  // Improved seekbar functionality with proper streaming
  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !videoRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * duration

    setSeekIndicator({
      show: true,
      position: percentage * 100,
      time: newTime,
    })

    seekVideo(newTime)
    resetControlsTimeout()
  }

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressRef.current || !videoRef.current) return

      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      const newTime = percentage * duration

      // Update current time for UI feedback but don't seek yet
      setCurrentTime(newTime)

      setSeekIndicator({
        show: true,
        position: percentage * 100,
        time: newTime,
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!progressRef.current || !videoRef.current) return

      // Only seek when mouse is released to avoid excessive seeking
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      const newTime = percentage * duration

      seekVideo(newTime)
      setIsDragging(false)

      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      resetControlsTimeout()
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  // Control functions
  const togglePlayPause = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((error) => {
        console.error("Play failed:", error)
        setError("Failed to play video")
      })
    }
  }

  const seekVideo = (time: number) => {
    if (!videoRef.current) return
    const seekTime = Math.max(0, Math.min(duration, time))
    console.log(`Seeking to: ${seekTime}s`)
    videoRef.current.currentTime = seekTime
  }

  const adjustVolume = (newVolume: number) => {
    if (!videoRef.current) return
    setVolume(newVolume)
    videoRef.current.volume = newVolume
    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    videoRef.current.muted = newMuted
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        ;(containerRef.current as any).webkitRequestFullscreen()
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        ;(containerRef.current as any).mozRequestFullScreen()
      } else if ((containerRef.current as any).msRequestFullscreen) {
        ;(containerRef.current as any).msRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        ;(document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        ;(document as any).msExitFullscreen()
      }
    }
  }

  const changePlaybackSpeed = (speed: number) => {
    if (!videoRef.current) return
    setPlaybackSpeed(speed)
    videoRef.current.playbackRate = speed
    setShowSettings(false)
    resetControlsTimeout()
  }

  const toggleVideoScale = () => {
    const scales: ("fit" | "crop" | "fill")[] = ["fit", "crop", "fill"]
    const currentIndex = scales.indexOf(videoScale)
    const nextIndex = (currentIndex + 1) % scales.length
    setVideoScale(scales[nextIndex])
  }

  const getVideoObjectFit = () => {
    switch (videoScale) {
      case "fit":
        return "contain"
      case "crop":
        return "cover"
      case "fill":
        return "fill"
      default:
        return "contain"
    }
  }

  // Enhanced time formatting with hours support
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }
  }

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-red-500 mb-4 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Video Error</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-0 md:p-4">
      <div
        ref={containerRef}
        className="video-container relative w-full h-full md:w-full md:max-w-6xl md:aspect-video bg-black md:rounded-lg overflow-hidden shadow-2xl"
        onMouseMove={resetControlsTimeout}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Video Element with streaming optimizations */}
        <video
          ref={videoRef}
          className="w-full h-full video-element"
          style={{
            filter: `brightness(${brightness})`,
            objectFit: getVideoObjectFit() as any,
          }}
          src={videoSrc}
          poster={poster}
          autoPlay={autoPlay}
          preload="metadata"
          crossOrigin="anonymous"
          onClick={handleScreenTap}
          playsInline
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg font-medium">Loading video...</p>
            </div>
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && !isLoading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Skip Indicators */}
        {showSkipIndicator.show && (
          <div
            className={`absolute top-1/2 transform -translate-y-1/2 text-white pointer-events-none z-20 ${
              showSkipIndicator.side === "left" ? "left-[25%]" : "right-[25%]"
            }`}
          >
            <div className="flex flex-col items-center animate-pulse">
              <div className="w-16 h-16 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center mb-2 border-2 border-white/30">
                {showSkipIndicator.direction === "backward" ? (
                  <RotateCcw className="w-8 h-8" />
                ) : (
                  <RotateCw className="w-8 h-8" />
                )}
              </div>
              <span className="text-sm font-medium bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                {showSkipIndicator.direction === "backward" ? "-10s" : "+10s"}
              </span>
            </div>
          </div>
        )}

        {/* Gesture Indicators */}
        {showBrightnessIndicator && (
          <div className="brightness-indicator absolute top-1/2 left-4 md:left-12 transform -translate-y-1/2 bg-black/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 text-white font-medium text-center min-w-[120px] md:min-w-[140px] transition-all duration-300 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-center mb-2 md:mb-3">
              <div className="text-2xl md:text-3xl">☀️</div>
            </div>
            <div className="text-xs md:text-sm text-gray-300 mb-1">Brightness</div>
            <div className="text-lg md:text-xl font-bold text-white">{Math.round(brightness * 100)}%</div>
            <div className="w-full bg-white/20 rounded-full h-1 mt-2 md:mt-3">
              <div
                className="bg-yellow-400 h-1 rounded-full transition-all duration-200"
                style={{ width: `${brightness * 100}%` }}
              />
            </div>
          </div>
        )}

        {showVolumeIndicator && (
          <div className="volume-indicator absolute top-1/2 right-4 md:right-12 transform -translate-y-1/2 bg-black/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 text-white font-medium text-center min-w-[120px] md:min-w-[140px] transition-all duration-300 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-center mb-2 md:mb-3">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </div>
            <div className="text-xs md:text-sm text-gray-300 mb-1">Volume</div>
            <div className="text-lg md:text-xl font-bold text-white">{Math.round(volume * 100)}%</div>
            <div className="w-full bg-white/20 rounded-full h-1 mt-2 md:mt-3">
              <div
                className="bg-blue-400 h-1 rounded-full transition-all duration-200"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`controls-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 md:p-6 lg:p-8 transition-all duration-500 ease-in-out ${
            showControls ? "transform-none opacity-100" : "transform translate-y-full opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="progress-container relative h-1 md:h-2 bg-white/20 rounded-full cursor-pointer mb-4 md:mb-6 group hover:h-2 md:hover:h-3 transition-all duration-200"
            onMouseDown={handleProgressMouseDown}
            onClick={handleProgressClick}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full" />

            <div
              className="progress-bar h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full relative transition-all duration-200"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="progress-handle absolute -right-1 md:-right-2 top-1/2 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border-2 border-white"></div>
            </div>

            {isSeeking && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 text-white animate-spin" />
              </div>
            )}

            {seekIndicator.show && (
              <div
                className="absolute -top-8 md:-top-12 transform -translate-x-1/2 bg-black/95 backdrop-blur-sm text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium border border-white/20 shadow-xl"
                style={{ left: `${seekIndicator.position}%` }}
              >
                <div className="flex items-center gap-1 md:gap-2">
                  {isSeeking && <Loader2 className="w-2 h-2 md:w-3 md:h-3 animate-spin" />}
                  {formatTime(seekIndicator.time)}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 md:border-l-4 md:border-r-4 md:border-t-4 border-transparent border-t-black/95"></div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="control-button bg-white/15 backdrop-blur-sm border border-white/30 text-white cursor-pointer p-2 md:p-3 rounded-full transition-all duration-300 hover:bg-white/25 hover:scale-110 hover:shadow-lg flex items-center justify-center group"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-4 h-4 md:w-6 md:h-6 ml-0.5 group-hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Volume Control */}
              <div className="volume-container flex items-center group">
                <button
                  onClick={toggleMute}
                  className="control-button bg-white/15 backdrop-blur-sm border border-white/30 text-white cursor-pointer p-1.5 md:p-2 rounded-full transition-all duration-300 hover:bg-white/25 flex items-center justify-center"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
                <div className="volume-slider w-0 overflow-hidden transition-all duration-300 mx-2 md:mx-3 group-hover:w-16 md:group-hover:w-24">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => adjustVolume(Number(e.target.value) / 100)}
                    className="w-full h-1 md:h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider accent-red-500"
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-white text-xs md:text-sm font-medium bg-black/40 backdrop-blur-sm px-2 md:px-4 py-1 md:py-2 rounded-full border border-white/20">
                <span className="tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              {/* Playback Speed Display */}
              <div className="text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/20 font-medium">
                {playbackSpeed === 1 ? "1×" : `${playbackSpeed}×`}
              </div>

              {/* Video Scale Toggle */}
              <button
                onClick={toggleVideoScale}
                className="control-button bg-white/15 backdrop-blur-sm border border-white/30 text-white cursor-pointer p-1.5 md:p-2 rounded-full transition-all duration-300 hover:bg-white/25 flex items-center justify-center"
                title={`Scale: ${videoScale}`}
              >
                <Monitor className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* Settings */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings(!showSettings)
                }}
                className="control-button bg-white/15 backdrop-blur-sm border border-white/30 text-white cursor-pointer p-1.5 md:p-2 rounded-full transition-all duration-300 hover:bg-white/25 flex items-center justify-center"
                title="Settings"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="control-button bg-white/15 backdrop-blur-sm border border-white/30 text-white cursor-pointer p-1.5 md:p-2 rounded-full transition-all duration-300 hover:bg-white/25 flex items-center justify-center"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Menu */}
        {showSettings && (
          <div
            className="settings-menu absolute bottom-20 md:bottom-28 right-4 md:right-8 bg-black/95 backdrop-blur-sm rounded-2xl p-4 md:p-5 text-white font-medium min-w-[180px] md:min-w-[220px] transition-all duration-300 z-50 border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 md:mb-4 text-xs md:text-sm text-gray-300 font-semibold border-b border-gray-600 pb-2 md:pb-3">
              Playback Speed
            </div>
            {speedOptions.map((speed) => (
              <div
                key={speed}
                onClick={(e) => {
                  e.stopPropagation()
                  changePlaybackSpeed(speed)
                }}
                className="settings-item p-2 md:p-3 px-3 md:px-4 cursor-pointer rounded-xl transition-all duration-200 hover:bg-white/10 flex justify-between items-center group"
              >
                <span className="group-hover:text-red-400 transition-colors text-sm md:text-base">
                  {speed === 1 ? "Normal" : `${speed}× Speed`}
                </span>
                {playbackSpeed === speed && <Check className="w-3 h-3 md:w-4 md:h-4 text-red-500" />}
              </div>
            ))}

            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-600">
              <div className="mb-2 md:mb-3 text-xs md:text-sm text-gray-300 font-semibold">Video Scale</div>
              <div className="text-xs md:text-sm text-gray-400 flex items-center justify-between">
                <span>Current: {videoScale.charAt(0).toUpperCase() + videoScale.slice(1)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVideoScale()
                  }}
                  className="text-red-500 hover:text-red-400 text-xs px-2 md:px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .immersive-fullscreen {
          background: black !important;
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        @media (min-width: 768px) {
          .slider::-webkit-slider-thumb {
            width: 16px;
            height: 16px;
          }
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        @media (min-width: 768px) {
          .slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </div>
  )
}

// Named export for compatibility
export { PremiumVideoPlayer }
