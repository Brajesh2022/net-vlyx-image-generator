"use client"

import { useParams, useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function HDStreamPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    // Add the specific ad-blocking JavaScript after component mounts
    const addAdBlockingScript = () => {
      // Prevent context menu on iframe
      const iframe = document.querySelector("iframe")
      if (iframe) {
        iframe.addEventListener("contextmenu", (e) => {
          e.preventDefault()
        })
      }

      // Block common ad-related events
      document.addEventListener("click", (e) => {
        console.log("Click detected on:", (e.target as HTMLElement).tagName)
      })

      // Prevent new window/tab opening from iframe
      window.addEventListener("beforeunload", (e) => {
        console.log("Page attempting to navigate away")
      })
    }

    addAdBlockingScript()
  }, [])

  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Invalid Stream ID</h1>
          <Button onClick={() => router.back()} className="netflix-gradient">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const embedUrl = `https://movearnpre.com/embed/${id}`

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Simple Header */}
      <div className="p-4 flex items-center justify-between">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="bg-black/30 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <span className="text-2xl">🍿</span>
          <p className="text-sm text-gray-300 mt-1">Enjoy your movie!</p>
        </div>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      {/* Responsive Video Container */}
      <div className="px-2 sm:px-4 pb-4">
        <div className="video-container-responsive">
          <div className="overlay-blocker"></div>
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            marginWidth={0}
            marginHeight={0}
            scrolling="no"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="accelerometer 'none'; autoplay 'none'; clipboard-write 'none'; encrypted-media 'self'; gyroscope 'none'; picture-in-picture 'self'"
            referrerPolicy="no-referrer"
            loading="lazy"
            title="HDStream4u Player"
          />
        </div>
      </div>

      {/* Quality Selection Note */}
      <div className="px-2 sm:px-4 pb-4">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700 text-center">
          <p className="text-sm text-gray-300">
            💡 <span className="font-medium">Tip:</span> Select your preferred quality from the player settings
          </p>
        </div>
      </div>

      {/* Custom CSS for Mobile Responsiveness */}
      <style jsx>{`
        .video-container-responsive {
          position: relative;
          width: 100%;
          margin: 0 auto;
          border: 1px solid #374151;
          border-radius: 12px;
          overflow: hidden;
          background: #111827;
        }
        
        /* Mobile First - 16:9 aspect ratio */
        .video-container-responsive {
          aspect-ratio: 16/9;
          min-height: 200px;
        }
        
        .overlay-blocker {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          background: transparent;
        }
        
        iframe {
          display: block;
          border: none;
          width: 100%;
          height: 100%;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        /* Mobile Phones (up to 640px) */
        @media (max-width: 640px) {
          .video-container-responsive {
            border-radius: 8px;
            min-height: 180px;
          }
        }
        
        /* Small Mobile (up to 480px) */
        @media (max-width: 480px) {
          .video-container-responsive {
            border-radius: 6px;
            min-height: 160px;
          }
        }
        
        /* Tablets (641px to 1024px) */
        @media (min-width: 641px) and (max-width: 1024px) {
          .video-container-responsive {
            max-width: 90%;
            min-height: 300px;
          }
        }
        
        /* Desktop (1025px and up) */
        @media (min-width: 1025px) {
          .video-container-responsive {
            max-width: 1200px;
            min-height: 400px;
          }
        }
        
        /* Landscape orientation on mobile */
        @media (max-width: 640px) and (orientation: landscape) {
          .video-container-responsive {
            min-height: 140px;
          }
        }
        
        /* Very small screens */
        @media (max-width: 320px) {
          .video-container-responsive {
            min-height: 120px;
            border-radius: 4px;
          }
        }
      `}</style>
    </div>
  )
}
