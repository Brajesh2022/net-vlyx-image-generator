"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Code,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Shield,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ExtractionResult {
  url: string
  success: boolean
  sourceCode?: string
  error?: string
  timestamp: string
  size?: string
  title?: string
}

export default function SourceExtractorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<ExtractionResult[]>([])

  // Check for existing authentication on component mount
  useEffect(() => {
    const adminAuth = localStorage.getItem('netVlyxAdminAuth')
    if (adminAuth === 'authenticated') {
      setIsAuthenticated(true)
      loadHistory()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "Brajesh@Netvlyx") {
      setIsAuthenticated(true)
      localStorage.setItem('netVlyxAdminAuth', 'authenticated')
      loadHistory()
    } else {
      alert("Incorrect password!")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('netVlyxAdminAuth')
    setPassword("")
    setUrl("")
    setResult(null)
    setHistory([])
  }

  const loadHistory = () => {
    const savedHistory = localStorage.getItem('sourceExtractorHistory')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error("Error loading history:", error)
      }
    }
  }

  const saveToHistory = (extractionResult: ExtractionResult) => {
    const newHistory = [extractionResult, ...history.slice(0, 9)] // Keep last 10 results
    setHistory(newHistory)
    localStorage.setItem('sourceExtractorHistory', JSON.stringify(newHistory))
  }

  const extractSourceCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/extract-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()
      
      const extractionResult: ExtractionResult = {
        url: url.trim(),
        success: response.ok && data.success,
        sourceCode: data.sourceCode,
        error: data.error,
        timestamp: new Date().toISOString(),
        size: data.size,
        title: data.title,
      }

      setResult(extractionResult)
      saveToHistory(extractionResult)
    } catch (error) {
      const extractionResult: ExtractionResult = {
        url: url.trim(),
        success: false,
        error: "Network error: Failed to connect to extraction service",
        timestamp: new Date().toISOString(),
      }
      setResult(extractionResult)
      saveToHistory(extractionResult)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!result?.sourceCode) return

    try {
      await navigator.clipboard.writeText(result.sourceCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      // Fallback method
      const textArea = document.createElement("textarea")
      textArea.value = result.sourceCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadSourceCode = () => {
    if (!result?.sourceCode) return

    const blob = new Blob([result.sourceCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `source-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const formatSize = (sizeStr?: string) => {
    if (!sizeStr) return "Unknown"
    const bytes = parseInt(sizeStr)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-gray-400">Enter password to access Source Extractor</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3"
            >
              Access Source Extractor
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Source Code Extractor</h1>
              <p className="text-gray-400 text-sm lg:text-base">Extract HTML source code from any URL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setResult(null)
                setUrl("")
              }}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 bg-transparent text-sm lg:text-base"
            >
              <FileText className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-sm lg:text-base"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* URL Input Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <form onSubmit={extractSourceCode} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
                Enter URL to extract source code
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 pl-12"
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 mr-2" />
                      Extract
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  result.success 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {result.success ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {result.success ? "Source Code Extracted" : "Extraction Failed"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {result.title || result.url}
                  </p>
                </div>
              </div>
              
              {result.success && result.sourceCode && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-400">
                    Size: {formatSize(result.size)}
                  </div>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadSourceCode}
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>

            {result.success && result.sourceCode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Source Code Preview</h3>
                  <div className="text-sm text-gray-400">
                    {result.sourceCode.length.toLocaleString()} characters
                  </div>
                </div>
                <Textarea
                  value={result.sourceCode}
                  readOnly
                  className="bg-black/50 border-white/20 text-gray-300 font-mono text-sm min-h-[400px] resize-none"
                  placeholder="Source code will appear here..."
                />
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Error Details</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">{result.error}</p>
                {result.error?.includes('403') && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-yellow-200 text-xs">
                        <p className="font-medium mb-1">403 Forbidden - Site Protection Detected</p>
                        <p>This website uses advanced protection (likely Cloudflare) that blocks automated requests. We tried {result.error?.match(/\d+/)?.[0] || '10'} different methods including:</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-yellow-300">
                          <li>Enhanced browser simulation with realistic headers</li>
                          <li>Social media crawler user agents (Facebook, Twitter)</li>
                          <li>Search engine bots (Google, Bing, DuckDuckGo)</li>
                          <li>Mobile Safari and Firefox with delays</li>
                          <li>Path variations and referrer spoofing</li>
                        </ul>
                        <p className="mt-2 text-yellow-100">Try accessing the URL manually in a browser to verify it's accessible.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Extracted: {formatDate(result.timestamp)}</span>
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Original
                </a>
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Extractions</h2>
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  onClick={() => setResult(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.success 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {item.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium truncate max-w-md">
                          {item.title || item.url}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(item.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {item.success && (
                        <span>{formatSize(item.size)}</span>
                      )}
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
