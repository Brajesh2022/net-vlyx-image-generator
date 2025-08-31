"use client"

import type React from "react"

import { useState } from "react"
import { X, MessageSquare, Upload, Check, AlertCircle, Trash2, Heart, Star } from "lucide-react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface UploadedFile {
  file: File
  url: string | null
  progress: number
  status: "uploading" | "completed" | "failed"
  error?: string
}

interface FeedbackReviewProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FeedbackReview({ isOpen: externalIsOpen, onOpenChange }: FeedbackReviewProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = onOpenChange || setInternalIsOpen
  const [email, setEmail] = useState("")
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [showThankYou, setShowThankYou] = useState(false)

  const uploadToImgBB = async (file: File, index: number) => {
    const formData = new FormData()

    // Convert file to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1]) // Remove data:image/...;base64, prefix
      }
      reader.readAsDataURL(file)
    })

    // Update progress to 50% after base64 conversion
    setUploadedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress: 50 } : f)))

    formData.append("image", base64)
    formData.append("key", "74663718f5e7571870d35bc3478af987")

    try {
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      if (data.success) {
        // Update to completed
        setUploadedFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  url: data.data.url,
                  progress: 100,
                  status: "completed",
                }
              : f,
          ),
        )
      } else {
        throw new Error("ImgBB upload failed")
      }
    } catch (error) {
      // Update to failed
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "failed",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        ),
      )
    }
  }

  const handleFileSelect = async (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      file,
      url: null,
      progress: 0,
      status: "uploading" as const,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Start uploading each file
    const startIndex = uploadedFiles.length
    newFiles.forEach((_, index) => {
      uploadToImgBB(newFiles[index].file, startIndex + index)
    })
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if any uploads are still in progress
    const hasUploading = uploadedFiles.some((f) => f.status === "uploading")
    if (hasUploading) {
      alert("Please wait for all uploads to complete")
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const screenshotUrls = uploadedFiles.filter((f) => f.status === "completed" && f.url).map((f) => f.url!)

      await addDoc(collection(db, "feedback-reviews"), {
        email,
        rating,
        feedback,
        screenshots: screenshotUrls,
        status: "active",
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      })

      setSubmitStatus("success")
      setShowThankYou(true)

      // Reset form after showing thank you
      setTimeout(() => {
        setEmail("")
        setRating(0)
        setFeedback("")
        setUploadedFiles([])
        setIsOpen(false)
        setSubmitStatus("idle")
        setShowThankYou(false)
      }, 4000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = email && rating > 0 && feedback && !uploadedFiles.some((f) => f.status === "uploading")

  // Thank You Modal
  if (showThankYou) {
    return (
      <>
        {/* Thank You Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-gradient-to-br from-green-900/90 to-emerald-900/90 backdrop-blur-xl border border-green-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            {/* Animated Icons */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <div className="absolute -top-2 -right-2 animate-bounce">
                <Star className="w-6 h-6 text-yellow-400 fill-current" />
              </div>
              <div className="absolute -bottom-2 -left-2 animate-bounce delay-300">
                <Heart className="w-5 h-5 text-red-400 fill-current" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">Thank You! 🎉</h2>
            <p className="text-green-100 text-lg mb-4">Your feedback has been submitted successfully!</p>

            <div className="bg-white/10 rounded-2xl p-4 mb-6">
              <p className="text-green-200 text-sm leading-relaxed">
                We truly appreciate you taking the time to share your thoughts with us. Your feedback helps us improve NetVlyx for everyone!
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-green-300 text-sm">
              <Heart className="w-4 h-4 fill-current" />
              <span>Your review matters to us</span>
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
      </>
    )
  }

  return (
    <>
      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="relative bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Review & Feedback</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Messages */}
            {submitStatus === "error" && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ❌ Failed to submit feedback. Please try again.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rating *</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 rounded transition-colors ${
                        star <= rating
                          ? "text-yellow-400 hover:text-yellow-300"
                          : "text-gray-500 hover:text-gray-400"
                      }`}
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-gray-400 text-sm">
                    {rating > 0 ? `${rating}/5` : "Select rating"}
                  </span>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Feedback *</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Share your thoughts about NetVlyx..."
                />
              </div>

              {/* Screenshots */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Screenshots (Optional)</label>

                {/* File Input */}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-blue-400/50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 32MB</p>
                  </div>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white truncate flex-1">{file.file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        {file.status === "uploading" && (
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}

                        {/* Status */}
                        <div className="flex items-center gap-2 text-xs">
                          {file.status === "uploading" && (
                            <>
                              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full" />
                              <span className="text-gray-400">Uploading... {file.progress}%</span>
                            </>
                          )}
                          {file.status === "completed" && (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Uploaded successfully</span>
                            </>
                          )}
                          {file.status === "failed" && (
                            <>
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span className="text-red-400">Upload failed: {file.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full" />
                    Submitting...
                  </div>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
