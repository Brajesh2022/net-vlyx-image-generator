"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Download, PlayCircle, Loader2, CheckCircle, X, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface VlyxQuality {
  quality: string
  hubdriveLink?: string
  hubcdnLink?: string
  hubcloudLink?: string
  gofileLink?: string
  preferredLink: string
  linkType: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other"
  size?: string
}

interface VlyxProcessResult {
  success: boolean
  type: "single" | "quality_selection"
  qualities?: VlyxQuality[]
  directLink?: string
  linkType?: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other"
  error?: string
  originalUrl?: string
}

interface ProcessingState {
  quality: string
  action: "download" | "stream"
  step: string
  progress: number
  isProcessing: boolean
}

export default function VlyxQualityPage() {
  const router = useRouter()
  const [qualities, setQualities] = useState<VlyxQuality[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [processing, setProcessing] = useState<ProcessingState>({
    quality: "",
    action: "download",
    step: "",
    progress: 0,
    isProcessing: false,
  })

  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string>("")
  const [downloadQuality, setDownloadQuality] = useState<string>("")

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const url = urlParams.get("url")

    if (url) {
      processVlyxUrl(decodeURIComponent(url))
    } else {
      setError("No URL provided")
      setLoading(false)
    }
  }, [])

  const processVlyxUrl = async (url: string) => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/process-vlyx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data: VlyxProcessResult = await response.json()

      if (data.success) {
        setOriginalUrl(data.originalUrl || url)

        if (data.type === "quality_selection" && data.qualities) {
          setQualities(data.qualities)
        } else if (data.type === "single" && data.qualities) {
          // Use the qualities array which includes all fallback links
          setQualities(data.qualities)
        }
      } else {
        setError(data.error || "Failed to process Vlyx URL")
        setOriginalUrl(data.originalUrl || url)
      }
    } catch (error) {
      console.error("Error processing Vlyx URL:", error)
      setError("Failed to process Vlyx URL")
    } finally {
      setLoading(false)
    }
  }

  const extractDownloadLink = async (url: string): Promise<string> => {
    const response = await fetch("/api/extract-download-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to extract link")
    }

    const data = await response.json()
    return data.downloadUrl
  }

  const extractHubCloudLink = async (hubCloudUrl: string): Promise<string> => {
    const response = await fetch("/api/extract-download-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hubCloudUrl, extractHubCloud: true }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to extract HubCloud link")
    }

    const data = await response.json()
    return data.downloadUrl
  }

  const showManualDialog = (quality: VlyxQuality, action: "download" | "stream") => {
    const message = `Sorry, our system is not able to proceed automatically. Would you like to continue manually?\n\n⚠️ Warning: Manual ${action} may contain ads.`

    const shouldContinue = confirm(message)

    if (shouldContinue) {
      // Determine which URL to open for manual process
      let manualUrl = originalUrl

      // If we have a specific link that failed, use that
      if (quality.hubcloudLink) {
        manualUrl = quality.hubcloudLink
      } else if (quality.preferredLink && quality.preferredLink !== originalUrl) {
        manualUrl = quality.preferredLink
      }

      window.open(manualUrl, "_blank")
    }
  }

  const handleDownload = async (quality: VlyxQuality) => {
    setProcessing({
      quality: quality.quality,
      action: "download",
      step: "Initializing",
      progress: 0,
      isProcessing: true,
    })

    try {
      if (quality.linkType === "hubdrive" && quality.hubdriveLink) {
        const fileIdMatch = quality.hubdriveLink.match(/hubdrive\.wales\/file\/(\d+)/)
        if (fileIdMatch) {
          const fileId = fileIdMatch[1]
          const hubdriveUrl = `https://hubdrive.wales/file/${fileId}`

          // Step 1: Try Hubdrive first
          setProcessing((prev) => ({ ...prev, step: "Fetching from Hubdrive", progress: 25 }))
          await new Promise((resolve) => setTimeout(resolve, 800))

          try {
            const downloadUrl = await extractDownloadLink(hubdriveUrl)

            setProcessing((prev) => ({ ...prev, step: "Download Ready", progress: 100 }))
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Replace this line: window.open(downloadUrl, "_blank")
            // With these lines:
            setDownloadUrl(downloadUrl)
            setDownloadQuality(quality.quality)
            setShowDownloadDialog(true)
            setProcessing((prev) => ({ ...prev, isProcessing: false }))
            
            // Show donation popup after successful download
            setTimeout(() => {
              if ((window as any).showDonationPopup) {
                (window as any).showDonationPopup()
              }
            }, 2000)
            return
          } catch (hubdriveError) {
            console.log("Hubdrive failed, trying HubCloud fallback...")

            // Step 2: Try HubCloud if available
            if (quality.hubcloudLink) {
              setProcessing((prev) => ({ ...prev, step: "Trying HubCloud fallback", progress: 50 }))
              await new Promise((resolve) => setTimeout(resolve, 800))

              try {
                const downloadUrl = await extractHubCloudLink(quality.hubcloudLink)

                setProcessing((prev) => ({ ...prev, step: "Download Ready", progress: 100 }))
                await new Promise((resolve) => setTimeout(resolve, 500))

                // Replace this line: window.open(downloadUrl, "_blank")
                // With these lines:
                setDownloadUrl(downloadUrl)
                setDownloadQuality(quality.quality)
                setShowDownloadDialog(true)
                setProcessing((prev) => ({ ...prev, isProcessing: false }))
                
                // Show donation popup after successful download
                setTimeout(() => {
                  if ((window as any).showDonationPopup) {
                    (window as any).showDonationPopup()
                  }
                }, 2000)
                return
              } catch (hubcloudError) {
                console.log("HubCloud also failed, showing manual option...")
                setProcessing((prev) => ({ ...prev, step: "Manual Required", progress: 0 }))
                showManualDialog(quality, "download")
                setProcessing((prev) => ({ ...prev, isProcessing: false }))
                return
              }
            } else {
              // No HubCloud link available, show manual option for original link
              setProcessing((prev) => ({ ...prev, step: "Manual Required", progress: 0 }))
              showManualDialog(quality, "download")
              setProcessing((prev) => ({ ...prev, isProcessing: false }))
              return
            }
          }
        }
      } else if (quality.linkType === "hubcloud" && quality.hubcloudLink) {
        // Direct HubCloud link
        setProcessing((prev) => ({ ...prev, step: "Processing HubCloud", progress: 50 }))

        try {
          const downloadUrl = await extractHubCloudLink(quality.hubcloudLink)

          setProcessing((prev) => ({ ...prev, step: "Download Ready", progress: 100 }))
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Replace this line: window.open(downloadUrl, "_blank")
          // With these lines:
          setDownloadUrl(downloadUrl)
          setDownloadQuality(quality.quality)
          setShowDownloadDialog(true)
          
          // Show donation popup after successful download
          setTimeout(() => {
            if ((window as any).showDonationPopup) {
              (window as any).showDonationPopup()
            }
          }, 2000)
        } catch (hubcloudError) {
          console.log("HubCloud failed, showing manual option...")
          setProcessing((prev) => ({ ...prev, step: "Manual Required", progress: 0 }))
          showManualDialog(quality, "download")
        }
      } else if (quality.linkType === "hubcdn") {
        // Handle VlyJes server
        setProcessing((prev) => ({ ...prev, step: "Decoding VlyJes link", progress: 50 }))

        const response = await fetch("/api/decode-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: quality.preferredLink }),
        })

        const data = await response.json()

        if (response.ok && data.success && data.final_url) {
          setProcessing((prev) => ({ ...prev, step: "Download Ready", progress: 100 }))
          await new Promise((resolve) => setTimeout(resolve, 500))

          window.open(data.final_url, "_blank")
          
          // Show donation popup after successful download
          setTimeout(() => {
            if ((window as any).showDonationPopup) {
              (window as any).showDonationPopup()
            }
          }, 2000)
        } else {
          throw new Error(data.error || "Failed to decode VlyJes link")
        }
      } else {
        // Direct download for other types
        setProcessing((prev) => ({ ...prev, step: "Download Ready", progress: 100 }))
        await new Promise((resolve) => setTimeout(resolve, 500))

        window.open(quality.preferredLink, "_blank")
        
        // Show donation popup after successful download
        setTimeout(() => {
          if ((window as any).showDonationPopup) {
            (window as any).showDonationPopup()
          }
        }, 2000)
      }
    } catch (error) {
      console.error("Download error:", error)
      setProcessing((prev) => ({ ...prev, step: "Download Failed", progress: 0 }))
      setTimeout(() => {
        setProcessing((prev) => ({ ...prev, isProcessing: false }))
      }, 2000)
      return
    }

    setProcessing((prev) => ({ ...prev, isProcessing: false }))
  }

  const handleStream = async (quality: VlyxQuality) => {
    setProcessing({
      quality: quality.quality,
      action: "stream",
      step: "Initializing",
      progress: 0,
      isProcessing: true,
    })

    try {
      if (quality.linkType === "hubdrive" && quality.hubdriveLink) {
        const fileIdMatch = quality.hubdriveLink.match(/hubdrive\.wales\/file\/(\d+)/)
        if (fileIdMatch) {
          const fileId = fileIdMatch[1]
          const hubdriveUrl = `https://hubdrive.wales/file/${fileId}`

          // Step 1: Try Hubdrive first
          setProcessing((prev) => ({ ...prev, step: "Preparing stream from Hubdrive", progress: 25 }))
          await new Promise((resolve) => setTimeout(resolve, 800))

          try {
            const streamUrl = await extractDownloadLink(hubdriveUrl)

            setProcessing((prev) => ({ ...prev, step: "Stream Ready", progress: 100 }))
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Extract file ID from stream URL and redirect to play page
            const streamFileIdMatch = streamUrl.match(/\/([^/?]+)(?:\?|$)/)
            if (streamFileIdMatch) {
              const streamFileId = streamFileIdMatch[1]
              window.location.href = `/play/${streamFileId}`
            } else {
              throw new Error("Invalid stream URL format")
            }
            return
          } catch (hubdriveError) {
            console.log("Hubdrive failed, trying HubCloud fallback for streaming...")

            // Step 2: Try HubCloud if available
            if (quality.hubcloudLink) {
              setProcessing((prev) => ({ ...prev, step: "Trying HubCloud fallback", progress: 50 }))
              await new Promise((resolve) => setTimeout(resolve, 800))

              try {
                const streamUrl = await extractHubCloudLink(quality.hubcloudLink)

                setProcessing((prev) => ({ ...prev, step: "Stream Ready", progress: 100 }))
                await new Promise((resolve) => setTimeout(resolve, 500))

                // Extract file ID from stream URL and redirect to play page
                const streamFileIdMatch = streamUrl.match(/\/([^/?]+)(?:\?|$)/)
                if (streamFileIdMatch) {
                  const streamFileId = streamFileIdMatch[1]
                  window.location.href = `/play/${streamFileId}`
                } else {
                  throw new Error("Invalid stream URL format")
                }
                return
              } catch (hubcloudError) {
                console.log("HubCloud streaming also failed, showing manual option...")
                setProcessing((prev) => ({ ...prev, step: "Manual Required", progress: 0 }))
                showManualDialog(quality, "stream")
                setProcessing((prev) => ({ ...prev, isProcessing: false }))
                return
              }
            } else {
              throw new Error("No HubCloud fallback available for streaming")
            }
          }
        }
      } else if (quality.linkType === "hubcloud" && quality.hubcloudLink) {
        // Direct HubCloud streaming
        setProcessing((prev) => ({ ...prev, step: "Processing HubCloud for streaming", progress: 50 }))

        try {
          const streamUrl = await extractHubCloudLink(quality.hubcloudLink)

          setProcessing((prev) => ({ ...prev, step: "Stream Ready", progress: 100 }))
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Extract file ID from stream URL and redirect to play page
          const streamFileIdMatch = streamUrl.match(/\/([^/?]+)(?:\?|$)/)
          if (streamFileIdMatch) {
            const streamFileId = streamFileIdMatch[1]
            window.location.href = `/play/${streamFileId}`
          } else {
            throw new Error("Invalid stream URL format")
          }
        } catch (hubcloudError) {
          console.log("HubCloud streaming failed, showing manual option...")
          setProcessing((prev) => ({ ...prev, step: "Manual Required", progress: 0 }))
          showManualDialog(quality, "stream")
        }
      } else {
        // For other types, we can't stream directly
        throw new Error("Streaming not supported for this server type")
      }
    } catch (error) {
      console.error("Stream error:", error)
      setProcessing((prev) => ({ ...prev, step: "Stream Failed", progress: 0 }))
      setTimeout(() => {
        setProcessing((prev) => ({ ...prev, isProcessing: false }))
      }, 2000)
      return
    }

    setProcessing((prev) => ({ ...prev, isProcessing: false }))
  }

  const getServerName = (linkType: "hubdrive" | "hubcdn" | "hubcloud" | "gofile" | "other"): string => {
    switch (linkType) {
      case "hubdrive":
        return "NetVlyx Server"
      case "hubcdn":
        return "VlyJes Server"
      case "hubcloud":
        return "HubCloud Server"
      case "gofile":
        return "GoFile Server"
      default:
        return "Direct Server"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-2">Processing Vlyx Server</h1>
          <p className="text-gray-400">Fetching available qualities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          {originalUrl && (
            <div className="mb-4">
              <Button
                onClick={() => window.open(originalUrl, "_blank")}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 mr-4"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Original Page
              </Button>
            </div>
          )}
          <Button 
            onClick={() => router.back()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">Select Quality</h1>
          <p className="text-gray-400">Choose your preferred quality</p>
        </div>

        {/* Processing Status */}
        {processing.isProcessing && (
          <div className="mb-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {processing.step.includes("Failed") || processing.step.includes("Manual Required") ? (
                <X className="h-5 w-5 text-red-400" />
              ) : processing.progress === 100 ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              )}
              <span className="text-sm font-medium">
                {processing.action === "download" ? "Downloading" : "Streaming"} {processing.quality}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{processing.step}</span>
                {processing.step !== "Manual Required" &&
                  processing.step !== "Download Failed" &&
                  processing.step !== "Stream Failed" && <span>{processing.progress}%</span>}
              </div>
              {processing.step !== "Manual Required" &&
                processing.step !== "Download Failed" &&
                processing.step !== "Stream Failed" && <Progress value={processing.progress} className="h-2" />}
              {processing.step === "Manual Required" && (
                <div className="text-xs text-yellow-400 mt-2">
                  ⚠️ Automatic processing failed. Manual intervention required.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quality List */}
        <div className="space-y-3">
          {qualities.map((quality, index) => (
            <div
              key={index}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-gray-800/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{quality.quality}</h3>
                    {quality.size && <span className="text-sm text-gray-400">({quality.size})</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-400">{getServerName(quality.linkType)}</p>
                    {quality.hubcloudLink && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full">
                        HubCloud Fallback
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download Button */}
                  <Button
                    onClick={() => handleDownload(quality)}
                    disabled={processing.isProcessing}
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all duration-300"
                    title="Download"
                  >
                    <Download className="h-5 w-5 text-white" />
                  </Button>

                  {/* Stream Button - Show for hubdrive and hubcloud */}
                  {(quality.linkType === "hubdrive" || quality.linkType === "hubcloud") && (
                    <Button
                      onClick={() => handleStream(quality)}
                      disabled={processing.isProcessing}
                      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all duration-300"
                      title="Stream"
                    >
                      <PlayCircle className="h-5 w-5 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Download Dialog */}
        {showDownloadDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Download Ready</h3>
                <p className="text-gray-400 mb-6">
                  Your {downloadQuality} download link is ready. Click the button below to start downloading.
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      window.open(downloadUrl, "_blank")
                      setShowDownloadDialog(false)
                      setDownloadUrl("")
                      setDownloadQuality("")
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Start Download
                  </Button>

                  <Button
                    onClick={() => {
                      setShowDownloadDialog(false)
                      setDownloadUrl("")
                      setDownloadQuality("")
                    }}
                    variant="outline"
                    className="px-6 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">&copy; 2024 NetVlyx</p>
        </div>
      </div>
    </div>
  )
}
