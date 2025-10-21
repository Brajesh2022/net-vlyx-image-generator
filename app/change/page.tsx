"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Github, Lock, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react"

export default function ChangeDomainPage() {
  const [githubToken, setGithubToken] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [vegaBizDomain, setVegaBizDomain] = useState("https://vegamovise.biz")
  const [vegaNlDomain, setVegaNlDomain] = useState("https://www.vegamovies-nl.autos")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prUrl, setPrUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem("github_token")
    if (savedToken) {
      setGithubToken(savedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuthenticate = () => {
    if (!githubToken.trim()) {
      setError("Please enter a valid GitHub token")
      return
    }

    // Store token in localStorage
    localStorage.setItem("github_token", githubToken)
    setIsAuthenticated(true)
    setError("")
    setSuccess("Successfully authenticated!")
  }

  const handleLogout = () => {
    localStorage.removeItem("github_token")
    setGithubToken("")
    setIsAuthenticated(false)
    setPrUrl("")
    setSuccess("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")
    setPrUrl("")

    try {
      const response = await fetch("/api/create-domain-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubToken,
          vegaBizDomain: vegaBizDomain.trim(),
          vegaNlDomain: vegaNlDomain.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create PR")
      }

      setPrUrl(data.prUrl)
      setSuccess(`Pull Request created successfully! Branch: ${data.branchName}`)
    } catch (err: any) {
      setError(err.message || "Failed to create pull request")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-2xl text-center text-white">Authentication Required</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Enter your GitHub Personal Access Token to access the domain management page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-white">
                GitHub Token
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAuthenticate()
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                This token will be stored locally in your browser
              </p>
            </div>

            {error && (
              <Alert className="bg-red-900/20 border-red-900 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-900/20 border-green-900 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAuthenticate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Github className="mr-2 h-4 w-4" />
              Authenticate
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Need a token? Create one at:</p>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline flex items-center justify-center gap-1"
              >
                GitHub Settings → Tokens
                <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-gray-600">Required scope: repo (Full control of private repositories)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Domain Management</h1>
            <p className="text-gray-400">Update VegaMovies domains across the entire codebase</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            Logout
          </Button>
        </div>

        {/* Domain Configuration */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Update Domains</CardTitle>
            <CardDescription className="text-gray-400">
              Changes will be applied to all API routes and pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* VegaBiz Domain */}
              <div className="space-y-2">
                <Label htmlFor="vegabiz" className="text-white">
                  VegaMovise.biz Domain
                </Label>
                <Input
                  id="vegabiz"
                  type="url"
                  placeholder="https://vegamovise.biz"
                  value={vegaBizDomain}
                  onChange={(e) => setVegaBizDomain(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
                <p className="text-xs text-gray-500">
                  Used in: /v page, scrape-vega API
                </p>
              </div>

              {/* VegaNL Domain */}
              <div className="space-y-2">
                <Label htmlFor="veganl" className="text-white">
                  VegaMovies-NL Domain
                </Label>
                <Input
                  id="veganl"
                  type="url"
                  placeholder="https://www.vegamovies-nl.autos"
                  value={vegaNlDomain}
                  onChange={(e) => setVegaNlDomain(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
                <p className="text-xs text-gray-500">
                  Used in: Home page, categories, scraper, vega-nl pages
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Pull Request...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Create Pull Request
                  </>
                )}
              </Button>
            </form>

            {/* Error Alert */}
            {error && (
              <Alert className="mt-4 bg-red-900/20 border-red-900 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="mt-4 bg-green-900/20 border-green-900 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* PR Link */}
            {prUrl && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Pull Request Created!
                </h3>
                <p className="text-gray-400 mb-4">
                  Your pull request has been created successfully. Click the button below to view and merge it.
                </p>
                <Button
                  onClick={() => window.open(prUrl, "_blank")}
                  className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Pull Request on GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-400 text-sm">
            <p>1. ✅ Creates a new branch with timestamp</p>
            <p>2. ✅ Updates all domain references in the codebase</p>
            <p>3. ✅ Commits changes with proper author attribution</p>
            <p>4. ✅ Creates a pull request for review</p>
            <p>5. ✅ Provides a link to view and merge the PR</p>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-300 font-medium">
                📝 Note: Changes are NOT applied directly to main. Review the PR before merging!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
