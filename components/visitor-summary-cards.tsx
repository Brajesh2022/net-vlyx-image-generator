"use client"

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, Eye, TrendingUp, Activity, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VisitorSummary {
  totalUniqueVisitors: number
  totalImpressions: number
  totalVisits: number
  topDevice: string
}

interface VisitorSummaryCardsProps {
  onViewAnalytics: () => void
}

export function VisitorSummaryCards({ onViewAnalytics }: VisitorSummaryCardsProps) {
  const [summary, setSummary] = useState<VisitorSummary>({
    totalUniqueVisitors: 0,
    totalImpressions: 0,
    totalVisits: 0,
    topDevice: 'Loading...',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Fetch unique visitors count
        const visitorsSnapshot = await getDocs(collection(db, 'visitor-tracking'))
        const uniqueCount = visitorsSnapshot.size

        // Fetch impressions count
        const impressionsSnapshot = await getDocs(collection(db, 'visitor-impressions'))
        const impressionsCount = impressionsSnapshot.size

        // Calculate top device
        const deviceTypes: Record<string, number> = {}
        visitorsSnapshot.forEach((doc) => {
          const data = doc.data()
          const deviceType = data.deviceType || 'Unknown'
          deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1
        })
        impressionsSnapshot.forEach((doc) => {
          const data = doc.data()
          const deviceType = data.deviceType || 'Unknown'
          deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1
        })

        const topDevice = Object.entries(deviceTypes).length > 0 
          ? Object.entries(deviceTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data'
          : 'No data'

        setSummary({
          totalUniqueVisitors: uniqueCount,
          totalImpressions: impressionsCount,
          totalVisits: uniqueCount + impressionsCount,
          topDevice,
        })
      } catch (error) {
        console.error('Error fetching visitor summary:', error)
        // Set default values on error
        setSummary({
          totalUniqueVisitors: 0,
          totalImpressions: 0,
          totalVisits: 0,
          topDevice: 'Error loading',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-6 animate-pulse">
            <div className="h-8 sm:h-10 bg-white/10 rounded mb-2"></div>
            <div className="h-4 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Visits */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-xl p-3 sm:p-6 hover:scale-105 transition-transform">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{summary.totalVisits}</div>
              <div className="text-purple-300 text-xs sm:text-sm whitespace-nowrap">Total Visits</div>
            </div>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-xl p-3 sm:p-6 hover:scale-105 transition-transform">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{summary.totalUniqueVisitors}</div>
              <div className="text-blue-300 text-xs sm:text-sm whitespace-nowrap">Unique Visitors</div>
            </div>
          </div>
        </div>

        {/* Impressions */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl border border-green-500/30 rounded-xl p-3 sm:p-6 hover:scale-105 transition-transform">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{summary.totalImpressions}</div>
              <div className="text-green-300 text-xs sm:text-sm whitespace-nowrap">Impressions</div>
            </div>
          </div>
        </div>

        {/* Top Device */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-xl border border-orange-500/30 rounded-xl p-3 sm:p-6 hover:scale-105 transition-transform">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{summary.topDevice}</div>
              <div className="text-orange-300 text-xs sm:text-sm whitespace-nowrap">Top Device</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Complete Analytics Button - Responsive */}
      <div className="flex justify-center">
        <Button
          onClick={onViewAnalytics}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all w-full sm:w-auto"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          View Complete Analytics
        </Button>
      </div>
    </div>
  )
}
