"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, Download, Loader2, CheckCircle, X, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface DownloadPageProps {
  params: { id: string }
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [showMethod2, setShowMethod2] = useState(false)
  const [progress, setProgress] = useState(0)

  const steps = ["Fetching", "Processing", "Generating", "Ready"]

  // Auto-start extraction when component mounts
  useEffect(() => {
    extractDownloadLink()
  }, [])

  // Auto-download when URL is ready
  useEffect(() => {
    if (downloadUrl) {
      setTimeout(() => {
        window.open(downloadUrl, "_blank")
        
        // Show donation popup after successful download
        setTimeout(() => {
          if ((window as any).showDonationPopup) {
            (window as any).showDonationPopup()
          }
        }, 2000)
      }, 1500)
    }
  }, [downloadUrl])

  const extractDownloadLink = async () => {
    setIsExtracting(true)
    setError(null)
    setDownloadUrl(null)
    setShowMethod2(false)
    setCurrentStep(0)
    setProgress(0)

    try {
      const hubdriveUrl = `https://hubdrive.wales/file/${params.id}`

      // Step progression
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i)
        setProgress(((i + 1) / steps.length) * 100)

        if (i === steps.length - 1) {
          const response = await fetch("/api/extract-download-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: hubdriveUrl }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to extract link")
          }

          const data = await response.json()
          setDownloadUrl(data.downloadUrl)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 800))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Extraction failed"
      setError(errorMessage)
      if (errorMessage.includes("Link extraction failed") || errorMessage.includes("not found")) {
        setShowMethod2(true)
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const tryMethod2 = async () => {
    setIsExtracting(true)
    setError(null)
    setShowMethod2(false)
    setCurrentStep(0)
    setProgress(0)

    try {
      const hubdriveUrl = `https://hubdrive.wales/file/${params.id}`

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i)
        setProgress(((i + 1) / steps.length) * 100)

        if (i === steps.length - 1) {
          const response = await fetch("/api/extract-download-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: hubdriveUrl }),
          })

          if (!response.ok) {
            throw new Error("Method 2 failed")
          }

          const data = await response.json()
          setDownloadUrl(data.downloadUrl)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 600))
        }
      }
    } catch (err) {
      setError("Link extraction failed")
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">NetVlyx Download</h1>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 space-y-6">
          {/* File Info */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">File ID</p>
            <p className="text-white font-mono text-sm">{params.id}</p>
          </div>

          {/* Progress Section */}
          {(isExtracting || downloadUrl || error) && (
            <div className="space-y-4">
              {/* Current Step */}
              <div className="text-center">
                {isExtracting && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-blue-400">{steps[currentStep]}</span>
                  </div>
                )}
                {downloadUrl && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">Complete</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">Failed</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <Progress value={progress} className="h-2" />

              {/* Step Dots */}
              <div className="flex justify-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index <= currentStep
                        ? downloadUrl
                          ? "bg-green-400"
                          : error
                            ? "bg-red-400"
                            : "bg-blue-400"
                        : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {downloadUrl && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <p className="text-green-400 font-medium">Download Ready</p>
              <p className="text-xs text-gray-400">Starting download automatically...</p>
              <Button
                onClick={() => {
                  window.open(downloadUrl, "_blank")
                  
                  // Show donation popup after successful download
                  setTimeout(() => {
                    if ((window as any).showDonationPopup) {
                      (window as any).showDonationPopup()
                    }
                  }, 2000)
                }}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium rounded-xl py-3"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Now
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center space-y-3">
              <X className="h-12 w-12 text-red-400 mx-auto" />
              <p className="text-red-400 font-medium">{showMethod2 ? "Link Not Found" : "Extraction Failed"}</p>
              <div className="flex gap-2">
                {showMethod2 && (
                  <Button
                    onClick={tryMethod2}
                    disabled={isExtracting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2 text-sm"
                  >
                    Method 2
                  </Button>
                )}
                <Button
                  onClick={extractDownloadLink}
                  disabled={isExtracting}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg py-2 text-sm bg-transparent"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Initial Loading */}
          {!isExtracting && !downloadUrl && !error && (
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 text-blue-400 mx-auto animate-spin" />
              <p className="text-blue-400 font-medium">Initializing</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">&copy; 2024 NetVlyx</p>
        </div>
      </div>
    </div>
  )
}
