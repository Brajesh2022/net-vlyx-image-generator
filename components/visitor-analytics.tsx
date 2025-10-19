"use client"

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Users, 
  Eye, 
  TrendingUp, 
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  X,
  Trash2,
  ChevronRight,
  Activity,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface VisitorData {
  id: string
  visitorId: string
  timestamp: number
  date: string
  deviceType: string
  browser: string
  os: string
  ipAddress: string
  type: 'unique' | 'impression'
}

interface AnalyticsStats {
  totalUniqueVisitors: number
  totalImpressions: number
  avgDailyVisits: number
  monthlyVisits: number
  deviceBreakdown: Record<string, number>
  topBrowsers: Record<string, number>
  recentVisits: VisitorData[]
}

export function VisitorAnalytics() {
  const [showDetails, setShowDetails] = useState(false)
  const [stats, setStats] = useState<AnalyticsStats>({
    totalUniqueVisitors: 0,
    totalImpressions: 0,
    avgDailyVisits: 0,
    monthlyVisits: 0,
    deviceBreakdown: {},
    topBrowsers: {},
    recentVisits: [],
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all')
  const [chartData, setChartData] = useState<any[]>([])
  const [allVisitors, setAllVisitors] = useState<VisitorData[]>([])
  const [allImpressions, setAllImpressions] = useState<VisitorData[]>([])
  
  // Clear data states
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearStep, setClearStep] = useState(1)
  const [clearConfirmText, setClearConfirmText] = useState('')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch unique visitors
      const visitorsQuery = query(collection(db, 'visitor-tracking'), orderBy('timestamp', 'desc'))
      const visitorsSnapshot = await getDocs(visitorsQuery)
      const visitors: VisitorData[] = []
      visitorsSnapshot.forEach((doc) => {
        visitors.push({ id: doc.id, ...doc.data() } as VisitorData)
      })

      // Fetch impressions
      const impressionsQuery = query(collection(db, 'visitor-impressions'), orderBy('timestamp', 'desc'))
      const impressionsSnapshot = await getDocs(impressionsQuery)
      const impressions: VisitorData[] = []
      impressionsSnapshot.forEach((doc) => {
        impressions.push({ id: doc.id, ...doc.data() } as VisitorData)
      })

      setAllVisitors(visitors)
      setAllImpressions(impressions)

      // Calculate stats
      const allVisits = [...visitors, ...impressions]
      
      // Device breakdown
      const deviceBreakdown: Record<string, number> = {}
      allVisits.forEach(visit => {
        deviceBreakdown[visit.deviceType] = (deviceBreakdown[visit.deviceType] || 0) + 1
      })

      // Browser breakdown
      const browserBreakdown: Record<string, number> = {}
      allVisits.forEach(visit => {
        browserBreakdown[visit.browser] = (browserBreakdown[visit.browser] || 0) + 1
      })

      // Calculate monthly visits (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      const monthlyVisits = allVisits.filter(visit => visit.timestamp >= thirtyDaysAgo).length

      // Calculate average daily visits
      const oldestVisit = allVisits[allVisits.length - 1]
      const daysSinceStart = oldestVisit 
        ? Math.max(1, Math.ceil((Date.now() - oldestVisit.timestamp) / (24 * 60 * 60 * 1000)))
        : 1
      const avgDailyVisits = allVisits.length / daysSinceStart

      setStats({
        totalUniqueVisitors: visitors.length,
        totalImpressions: impressions.length,
        avgDailyVisits: Math.round(avgDailyVisits * 10) / 10,
        monthlyVisits,
        deviceBreakdown,
        topBrowsers: browserBreakdown,
        recentVisits: allVisits.slice(0, 20),
      })

      // Generate chart data based on date range
      generateChartData(visitors, impressions, dateRange)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = (visitors: VisitorData[], impressions: VisitorData[], range: string) => {
    const now = Date.now()
    let data: any[] = []

    if (range === 'today') {
      // Hourly data for today
      const hourlyData: Record<string, { hour: string; unique: number; impressions: number }> = {}
      
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00'
        hourlyData[hour] = { hour, unique: 0, impressions: 0 }
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTimestamp = todayStart.getTime()

      visitors.forEach(v => {
        if (v.timestamp >= todayTimestamp) {
          const hour = new Date(v.timestamp).getHours().toString().padStart(2, '0') + ':00'
          if (hourlyData[hour]) hourlyData[hour].unique++
        }
      })

      impressions.forEach(i => {
        if (i.timestamp >= todayTimestamp) {
          const hour = new Date(i.timestamp).getHours().toString().padStart(2, '0') + ':00'
          if (hourlyData[hour]) hourlyData[hour].impressions++
        }
      })

      data = Object.values(hourlyData)
    } else if (range === 'week') {
      // Daily data for last 7 days
      const dailyData: Record<string, { date: string; unique: number; impressions: number }> = {}
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailyData[dateStr] = { date: dateStr, unique: 0, impressions: 0 }
      }

      const weekAgo = now - 7 * 24 * 60 * 60 * 1000

      visitors.forEach(v => {
        if (v.timestamp >= weekAgo) {
          const dateStr = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (dailyData[dateStr]) dailyData[dateStr].unique++
        }
      })

      impressions.forEach(i => {
        if (i.timestamp >= weekAgo) {
          const dateStr = new Date(i.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (dailyData[dateStr]) dailyData[dateStr].impressions++
        }
      })

      data = Object.values(dailyData)
    } else if (range === 'month') {
      // Daily data for last 30 days
      const dailyData: Record<string, { date: string; unique: number; impressions: number }> = {}
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailyData[dateStr] = { date: dateStr, unique: 0, impressions: 0 }
      }

      const monthAgo = now - 30 * 24 * 60 * 60 * 1000

      visitors.forEach(v => {
        if (v.timestamp >= monthAgo) {
          const dateStr = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (dailyData[dateStr]) dailyData[dateStr].unique++
        }
      })

      impressions.forEach(i => {
        if (i.timestamp >= monthAgo) {
          const dateStr = new Date(i.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (dailyData[dateStr]) dailyData[dateStr].impressions++
        }
      })

      data = Object.values(dailyData)
    } else {
      // All time - group by week
      const weeklyData: Record<string, { date: string; unique: number; impressions: number }> = {}
      
      const allTimestamps = [...visitors.map(v => v.timestamp), ...impressions.map(i => i.timestamp)]
      const oldestTimestamp = Math.min(...allTimestamps)
      const weeksSinceStart = Math.ceil((now - oldestTimestamp) / (7 * 24 * 60 * 60 * 1000))
      
      for (let i = Math.min(weeksSinceStart, 12) - 1; i >= 0; i--) {
        const date = new Date(now - i * 7 * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        weeklyData[dateStr] = { date: dateStr, unique: 0, impressions: 0 }
      }

      visitors.forEach(v => {
        const weekDate = new Date(v.timestamp)
        weekDate.setDate(weekDate.getDate() - weekDate.getDay()) // Start of week
        const dateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (weeklyData[dateStr]) weeklyData[dateStr].unique++
      })

      impressions.forEach(i => {
        const weekDate = new Date(i.timestamp)
        weekDate.setDate(weekDate.getDate() - weekDate.getDay()) // Start of week
        const dateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (weeklyData[dateStr]) weeklyData[dateStr].impressions++
      })

      data = Object.values(weeklyData)
    }

    setChartData(data)
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (allVisitors.length > 0 || allImpressions.length > 0) {
      generateChartData(allVisitors, allImpressions, dateRange)
    }
  }, [dateRange, allVisitors, allImpressions])

  const handleClearData = async () => {
    if (clearStep === 1) {
      setClearStep(2)
      return
    }
    
    if (clearStep === 2) {
      setClearStep(3)
      return
    }
    
    if (clearStep === 3 && clearConfirmText === 'clear views') {
      try {
        // Delete all visitors
        for (const visitor of allVisitors) {
          await deleteDoc(doc(db, 'visitor-tracking', visitor.id))
        }
        
        // Delete all impressions
        for (const impression of allImpressions) {
          await deleteDoc(doc(db, 'visitor-impressions', impression.id))
        }
        
        // Reset state
        setShowClearDialog(false)
        setClearStep(1)
        setClearConfirmText('')
        
        // Refresh data
        fetchAnalytics()
        
        alert('All visitor data has been cleared successfully!')
      } catch (error) {
        console.error('Error clearing data:', error)
        alert('Error clearing data. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading visitor analytics...</p>
      </div>
    )
  }

  if (!showDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-purple-500" />
            Visitor Analytics
          </h2>
          <Button
            onClick={() => fetchAnalytics()}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.totalUniqueVisitors}</div>
                <div className="text-blue-300 text-sm">Unique Visitors</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.totalImpressions}</div>
                <div className="text-purple-300 text-sm">Total Impressions</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.avgDailyVisits}</div>
                <div className="text-green-300 text-sm">Avg Daily Visits</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-xl border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.monthlyVisits}</div>
                <div className="text-orange-300 text-sm">Last 30 Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Details Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => setShowDetails(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            View Detailed Analytics
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Activity className="w-7 h-7 text-purple-500" />
          Detailed Visitor Analytics
        </h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchAnalytics()}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowDetails(false)}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Back to Summary
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Unique Visitors</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalUniqueVisitors}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 text-sm">Impressions</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalImpressions}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-sm">Avg Daily</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.avgDailyVisits}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400 text-sm">Last 30 Days</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.monthlyVisits}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h3 className="text-xl font-semibold text-white">Visitor Trends</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'today'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'week'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'month'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'all'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey={dateRange === 'today' ? 'hour' : 'date'} 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="unique" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name="Unique Visitors"
              dot={{ fill: '#3B82F6', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="impressions" 
              stroke="#A855F7" 
              strokeWidth={3}
              name="Impressions"
              dot={{ fill: '#A855F7', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Device & Browser Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            Device Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.deviceBreakdown).map(([device, count]) => {
              const total = Object.values(stats.deviceBreakdown).reduce((a, b) => a + b, 0)
              const percentage = Math.round((count / total) * 100)
              
              const icon = device === 'Mobile' ? <Smartphone className="w-4 h-4" /> : 
                           device === 'Tablet' ? <Tablet className="w-4 h-4" /> : 
                           <Monitor className="w-4 h-4" />
              
              return (
                <div key={device}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      {icon}
                      <span>{device}</span>
                    </div>
                    <span className="text-white font-semibold">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Browser Breakdown */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Top Browsers
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.topBrowsers)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([browser, count]) => {
                const total = Object.values(stats.topBrowsers).reduce((a, b) => a + b, 0)
                const percentage = Math.round((count / total) * 100)
                
                return (
                  <div key={browser}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">{browser}</span>
                      <span className="text-white font-semibold">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Visits</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Type</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Date & Time</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Device</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Browser</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">OS</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentVisits.map((visit, index) => (
                <tr key={visit.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      visit.type === 'unique' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {visit.type === 'unique' ? 'Unique' : 'Impression'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">
                    {new Date(visit.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{visit.deviceType}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{visit.browser}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{visit.os}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm font-mono">{visit.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret Clear Button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={() => setShowClearDialog(true)}
          className="opacity-10 hover:opacity-100 transition-opacity duration-500 text-gray-600 hover:text-red-500 text-xs"
        >
          •••
        </button>
      </div>

      {/* Clear Data Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowClearDialog(false)
            setClearStep(1)
            setClearConfirmText('')
          }} />
          <div className="relative bg-gradient-to-br from-red-900/90 to-red-950/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 max-w-md w-full">
            <button
              onClick={() => {
                setShowClearDialog(false)
                setClearStep(1)
                setClearConfirmText('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {clearStep === 1 && 'Clear All Visitor Data?'}
                {clearStep === 2 && 'Are You Sure?'}
                {clearStep === 3 && 'Final Confirmation'}
              </h3>
              <p className="text-gray-300">
                {clearStep === 1 && 'This will permanently delete all visitor analytics data.'}
                {clearStep === 2 && 'This action cannot be undone. All visitor tracking history will be lost forever.'}
                {clearStep === 3 && 'Type "clear views" to confirm deletion.'}
              </p>
            </div>

            {clearStep === 3 && (
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder='Type "clear views"'
                className="mb-6 bg-white/10 border-white/20 text-white"
              />
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowClearDialog(false)
                  setClearStep(1)
                  setClearConfirmText('')
                }}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearData}
                disabled={clearStep === 3 && clearConfirmText !== 'clear views'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearStep === 1 && 'Continue'}
                {clearStep === 2 && 'Yes, Delete All'}
                {clearStep === 3 && 'Confirm Deletion'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
