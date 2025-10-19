"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  RefreshCw,
  X,
  Bug,
  Mail,
  Calendar,
  ImageIcon,
  Eye,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  MessageSquare,
  Star,
  Heart,
  Code,
  Download,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VisitorSummaryCards } from "@/components/visitor-summary-cards"
import { VisitorAnalyticsEnhanced } from "@/components/visitor-analytics-enhanced"

interface BugReport {
  id: string
  email: string
  problem: string
  screenshots: string[]
  status: "open" | "in-progress" | "resolved"
  createdAt: string
  timestamp: number
}

interface FeedbackReview {
  id: string
  email: string
  rating: number
  feedback: string
  screenshots: string[]
  status: "active" | "archived"
  createdAt: string
  timestamp: number
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [reports, setReports] = useState<BugReport[]>([])
  const [feedbackReviews, setFeedbackReviews] = useState<FeedbackReview[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackReview | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [updatedReportEmail, setUpdatedReportEmail] = useState("")
  const [activeTab, setActiveTab] = useState<"bug-reports" | "feedback" | "analytics">("bug-reports")
  const [bugReportSubTab, setBugReportSubTab] = useState<"active" | "resolved">("active")
  const [feedbackSubTab, setFeedbackSubTab] = useState<"active" | "archived">("active")
  const [showFullAnalytics, setShowFullAnalytics] = useState(false)

  // Check for existing authentication on component mount
  useEffect(() => {
    const adminAuth = localStorage.getItem('netVlyxAdminAuth')
    if (adminAuth === 'authenticated') {
      setIsAuthenticated(true)
      fetchReports()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "Brajesh@Netvlyx") {
      setIsAuthenticated(true)
      localStorage.setItem('netVlyxAdminAuth', 'authenticated')
      fetchReports()
    } else {
      alert("Incorrect password!")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('netVlyxAdminAuth')
    setPassword("")
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      // Fetch bug reports
      const bugReportsQuery = query(collection(db, "bug-reports"), orderBy("timestamp", "desc"))
      const bugReportsSnapshot = await getDocs(bugReportsQuery)
      const reportsData: BugReport[] = []

      bugReportsSnapshot.forEach((doc) => {
        reportsData.push({
          id: doc.id,
          ...doc.data(),
        } as BugReport)
      })

      // Fetch feedback reviews
      const feedbackQuery = query(collection(db, "feedback-reviews"), orderBy("timestamp", "desc"))
      const feedbackSnapshot = await getDocs(feedbackQuery)
      const feedbackData: FeedbackReview[] = []

      feedbackSnapshot.forEach((doc) => {
        feedbackData.push({
          id: doc.id,
          ...doc.data(),
        } as FeedbackReview)
      })

      setReports(reportsData)
      setFeedbackReviews(feedbackData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (reportId: string, newStatus: BugReport["status"], reportEmail: string) => {
    try {
      await updateDoc(doc(db, "bug-reports", reportId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })

      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, status: newStatus } : report)))

      // Show success message if status is resolved
      if (newStatus === "resolved") {
        setUpdatedReportEmail(reportEmail)
        setShowSuccessMessage(true)
        setTimeout(() => {
          setShowSuccessMessage(false)
        }, 5000)
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const updateFeedbackStatus = async (feedbackId: string, newStatus: FeedbackReview["status"]) => {
    try {
      await updateDoc(doc(db, "feedback-reviews", feedbackId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })

      setFeedbackReviews((prev) => prev.map((feedback) => (feedback.id === feedbackId ? { ...feedback, status: newStatus } : feedback)))
    } catch (error) {
      console.error("Error updating feedback status:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "in-progress":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4" />
      case "in-progress":
        return <Clock className="w-4 h-4" />
      case "resolved":
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Bug className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  // Filter reports and feedback based on active tabs
  const activeReports = reports.filter((report) => report.status === "open" || report.status === "in-progress")
  const resolvedReports = reports.filter((report) => report.status === "resolved")
  const activeFeedback = feedbackReviews.filter((feedback) => feedback.status === "active")
  const archivedFeedback = feedbackReviews.filter((feedback) => feedback.status === "archived")

  const currentReports = bugReportSubTab === "active" ? activeReports : resolvedReports
  const currentFeedback = feedbackSubTab === "active" ? activeFeedback : archivedFeedback

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-gray-400">Enter password to view bug reports</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-red-500 pr-12"
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
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3"
            >
              Access Admin Panel
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-600 to-green-700 border border-green-500/30 rounded-xl p-6 max-w-md shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Bug Successfully Resolved! 🎉</h3>
                <p className="text-green-100 text-sm mb-3">
                  Thank you for helping us improve NetVlyx! The bug reported by{" "}
                  <span className="font-semibold">{updatedReportEmail}</span> has been marked as resolved.
                </p>
                <p className="text-green-200 text-xs">
                  Your dedication to quality makes our platform better for everyone. Keep up the excellent work! 💪
                </p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Header - Fully Responsive */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          {/* Top Row - Logo and Title */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center flex-shrink-0">
                <Bug className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-gray-400 text-xs sm:text-sm lg:text-base">Manage reports & analytics</p>
              </div>
            </div>
            {/* Logout Button - Always visible on mobile */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm lg:text-base whitespace-nowrap"
            >
              Logout
            </Button>
          </div>
          
          {/* Bottom Row - Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
            <Link href="/admin/source-extractor" className="flex-shrink-0">
              <Button
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent text-xs sm:text-sm lg:text-base hover:border-purple-400/50 transition-all duration-300"
              >
                <Code className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Source Extractor</span>
                <span className="sm:hidden">Sources</span>
              </Button>
            </Link>
            <Button
              onClick={fetchReports}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 bg-transparent text-xs sm:text-sm lg:text-base flex-shrink-0"
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Bug Report Stats */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bug className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{reports.length}</div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Bug Reports</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400">
                  {reports.filter((r) => r.status === "open").length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Open Issues</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                  {reports.filter((r) => r.status === "resolved").length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Resolved</div>
              </div>
            </div>
          </div>
          
          {/* Feedback Stats */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{feedbackReviews.length}</div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Reviews</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400">
                  {feedbackReviews.length > 0 
                    ? (feedbackReviews.reduce((sum, f) => sum + f.rating, 0) / feedbackReviews.length).toFixed(1)
                    : "0.0"
                  }
                </div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Avg Rating</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">
                  {feedbackReviews.filter((f) => f.rating >= 4).length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">Happy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tab Navigation - Fully Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab("bug-reports")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === "bug-reports"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Bug className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Bug Reports ({reports.length})</span>
              <span className="sm:hidden">Bugs ({reports.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === "feedback"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Reviews ({feedbackReviews.length})</span>
              <span className="sm:hidden">Reviews ({feedbackReviews.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("analytics")
                setShowFullAnalytics(false)
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === "analytics"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </button>
          </div>
        </div>

        {/* Sub Tab Navigation - Responsive */}
        {activeTab === "bug-reports" && (
          <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setBugReportSubTab("active")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                bugReportSubTab === "active"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              Active ({activeReports.length})
            </button>
            <button
              onClick={() => setBugReportSubTab("resolved")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                bugReportSubTab === "resolved"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
              Resolved ({resolvedReports.length})
            </button>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setFeedbackSubTab("active")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                feedbackSubTab === "active"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              Active ({activeFeedback.length})
            </button>
            <button
              onClick={() => setFeedbackSubTab("archived")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                feedbackSubTab === "archived"
                  ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
              Archived ({archivedFeedback.length})
            </button>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === "analytics" ? (
          showFullAnalytics ? (
            <div className="space-y-4">
              <Button
                onClick={() => setShowFullAnalytics(false)}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                ← Back to Summary
              </Button>
              <VisitorAnalyticsEnhanced />
            </div>
          ) : (
            <VisitorSummaryCards onViewAnalytics={() => setShowFullAnalytics(true)} />
          )
        ) : activeTab === "bug-reports" ? (
          <>
            {/* Bug Reports Cards */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading bug reports...</p>
              </div>
            ) : currentReports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {bugReportSubTab === "active" ? (
                    <AlertCircle className="w-8 h-8 text-gray-600" />
                  ) : (
                    <Archive className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <p className="text-gray-400">
                  {bugReportSubTab === "active" ? "No active bug reports found" : "No resolved bug reports found"}
                </p>
              </div>
            ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentReports.map((report) => (
              <div
                key={report.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedReport(report)}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{report.email}</h3>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}
                  >
                    {getStatusIcon(report.status)}
                    <span className="capitalize">{report.status.replace("-", " ")}</span>
                  </div>
                </div>

                {/* Problem Preview */}
                <div className="mb-4">
                  <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">{report.problem}</p>
                </div>

                {/* Screenshots Preview */}
                {report.screenshots && report.screenshots.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        {report.screenshots.length} screenshot{report.screenshots.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {report.screenshots.slice(0, 3).map((url, index) => (
                        <div
                          key={index}
                          className="w-12 h-12 rounded-lg border border-white/20 overflow-hidden group-hover:border-white/40 transition-colors"
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {report.screenshots.length > 3 && (
                        <div className="w-12 h-12 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center">
                          <span className="text-xs text-gray-400">+{report.screenshots.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  {bugReportSubTab === "active" && (
                    <select
                      value={report.status}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateStatus(report.id, e.target.value as BugReport["status"], report.email)
                      }}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedReport(report)
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        ) : (
          <>
            {/* Feedback Reviews Cards */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading feedback reviews...</p>
              </div>
            ) : currentFeedback.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {feedbackSubTab === "active" ? (
                    <Star className="w-8 h-8 text-gray-600" />
                  ) : (
                    <Archive className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <p className="text-gray-400">
                  {feedbackSubTab === "active" ? "No active feedback found" : "No archived feedback found"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedFeedback(feedback)}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{feedback.email}</h3>
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Calendar className="w-3 h-3" />
                            {formatDate(feedback.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= feedback.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-yellow-400 font-medium text-sm">{feedback.rating}/5</span>
                      </div>
                    </div>

                    {/* Feedback Preview */}
                    <div className="mb-4">
                      <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">{feedback.feedback}</p>
                    </div>

                    {/* Screenshots Preview */}
                    {feedback.screenshots && feedback.screenshots.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400 text-sm">
                            {feedback.screenshots.length} screenshot{feedback.screenshots.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {feedback.screenshots.slice(0, 3).map((url, index) => (
                            <div
                              key={index}
                              className="w-12 h-12 rounded-lg border border-white/20 overflow-hidden group-hover:border-white/40 transition-colors"
                            >
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {feedback.screenshots.length > 3 && (
                            <div className="w-12 h-12 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center">
                              <span className="text-xs text-gray-400">+{feedback.screenshots.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={feedback.status}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateFeedbackStatus(feedback.id, e.target.value as FeedbackReview["status"])
                        }}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFeedback(feedback)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Detailed Report Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
            <div className="relative bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Bug className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Bug Report Details</h2>
                    <p className="text-gray-400">Report ID: {selectedReport.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Report Content */}
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <h3 className="text-white font-medium">Reporter Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Email</label>
                      <p className="text-white">{selectedReport.email}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Reported On</label>
                      <p className="text-white">{formatDate(selectedReport.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Problem Description</h3>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedReport.problem}</p>
                </div>

                {/* Screenshots */}
                {selectedReport.screenshots && selectedReport.screenshots.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                      <h3 className="text-white font-medium">Screenshots ({selectedReport.screenshots.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {selectedReport.screenshots.map((url, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/20 group-hover:border-white/40 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Management */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Status Management</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-gray-400 text-sm mb-2 block">Current Status</label>
                      <select
                        value={selectedReport.status}
                        onChange={(e) =>
                          updateStatus(selectedReport.id, e.target.value as BugReport["status"], selectedReport.email)
                        }
                        className="w-full bg-white/10 border border-white/20 rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="open">🔴 Open</option>
                        <option value="in-progress">🟡 In Progress</option>
                        <option value="resolved">🟢 Resolved</option>
                      </select>
                    </div>
                    <div
                      className={`px-4 py-3 rounded-lg border ${getStatusColor(selectedReport.status)} flex items-center gap-2`}
                    >
                      {getStatusIcon(selectedReport.status)}
                      <span className="capitalize font-medium">{selectedReport.status.replace("-", " ")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedFeedback(null)} />
            <div className="relative bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Feedback Details</h2>
                    <p className="text-gray-400">Review ID: {selectedFeedback.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Feedback Content */}
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <h3 className="text-white font-medium">User Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Email</label>
                      <p className="text-white">{selectedFeedback.email}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Submitted On</label>
                      <p className="text-white">{formatDate(selectedFeedback.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Rating</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= selectedFeedback.rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-yellow-400 font-bold text-2xl">{selectedFeedback.rating}/5</span>
                    <span className="text-gray-400">
                      ({selectedFeedback.rating >= 4 ? "Happy User" : selectedFeedback.rating >= 3 ? "Satisfied" : "Needs Improvement"})
                    </span>
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Feedback</h3>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedFeedback.feedback}</p>
                </div>

                {/* Screenshots */}
                {selectedFeedback.screenshots && selectedFeedback.screenshots.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                      <h3 className="text-white font-medium">Screenshots ({selectedFeedback.screenshots.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {selectedFeedback.screenshots.map((url, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/20 group-hover:border-white/40 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Management */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Status Management</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-gray-400 text-sm mb-2 block">Current Status</label>
                      <select
                        value={selectedFeedback.status}
                        onChange={(e) =>
                          updateFeedbackStatus(selectedFeedback.id, e.target.value as FeedbackReview["status"])
                        }
                        className="w-full bg-white/10 border border-white/20 rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">✅ Active</option>
                        <option value="archived">📦 Archived</option>
                      </select>
                    </div>
                    <div
                      className={`px-4 py-3 rounded-lg border flex items-center gap-2 ${
                        selectedFeedback.status === "active"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      <span className="capitalize font-medium">{selectedFeedback.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Screenshot"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
