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
  Trophy,
  Crown,
  Medal,
  ArrowLeft,
  Clock,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'

// Dynamically import recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false })

interface VisitorData {
  id: string
  deviceId: string
  timestamp: number
  date: string
  deviceType: string
  browser: string
  os: string
  ipAddress: string
  screenResolution: string
  type: 'unique' | 'impression'
}

interface DeviceStats {
  deviceId: string
  visitCount: number
  firstVisit: number
  lastVisit: number
  deviceType: string
  browser: string
  os: string
  ipAddress: string
}

interface IPDetails {
  isp: string
  region: string
  city: string
  country: string
  timezone: string
  lat: number
  lon: number
  loading: boolean
  error: string | null
}

interface AnalyticsStats {
  totalUniqueVisitors: number
  totalImpressions: number
  totalVisits: number
  avgDailyVisits: number
  monthlyVisits: number
  deviceBreakdown: Record<string, number>
  topBrowsers: Record<string, number>
  topDevices: DeviceStats[]
}

export function VisitorAnalyticsEnhanced() {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalUniqueVisitors: 0,
    totalImpressions: 0,
    totalVisits: 0,
    avgDailyVisits: 0,
    monthlyVisits: 0,
    deviceBreakdown: {},
    topBrowsers: {},
    topDevices: [],
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all')
  const [chartData, setChartData] = useState<any[]>([])
  const [allVisitors, setAllVisitors] = useState<VisitorData[]>([])
  const [allImpressions, setAllImpressions] = useState<VisitorData[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [deviceHistory, setDeviceHistory] = useState<VisitorData[]>([])
  const [isClient, setIsClient] = useState(false)
  const [copiedIP, setCopiedIP] = useState<string | null>(null)
  
  // IP Details Popup states
  const [showIPDetailsPopup, setShowIPDetailsPopup] = useState(false)
  const [selectedVisitForIP, setSelectedVisitForIP] = useState<VisitorData | null>(null)
  const [ipDetails, setIPDetails] = useState<IPDetails>({
    isp: '',
    region: '',
    city: '',
    country: '',
    timezone: '',
    lat: 0,
    lon: 0,
    loading: false,
    error: null
  })
  
  // Clear data states
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearMode, setClearMode] = useState<'time' | 'count'>('time')
  const [clearTimeRange, setClearTimeRange] = useState('30min')
  const [customMinutes, setCustomMinutes] = useState('')
  const [clearCount, setClearCount] = useState('')
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // Multi-select states
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [showDeleteMultipleConfirm, setShowDeleteMultipleConfirm] = useState(false)
  const [deleteMultipleConfirmText, setDeleteMultipleConfirmText] = useState('')

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Copy IP to clipboard
  const copyIPToClipboard = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the row click
    navigator.clipboard.writeText(ip).then(() => {
      setCopiedIP(ip)
      setTimeout(() => setCopiedIP(null), 2000) // Clear after 2 seconds
    }).catch(err => {
      console.error('Failed to copy IP:', err)
    })
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch unique visitors
      const visitorsQuery = query(collection(db, 'visitor-tracking'), orderBy('timestamp', 'desc'))
      const visitorsSnapshot = await getDocs(visitorsQuery)
      const visitors: VisitorData[] = []
      visitorsSnapshot.forEach((doc) => {
        const data = doc.data()
        visitors.push({ 
          id: doc.id, 
          deviceId: data.deviceId || '',
          timestamp: data.timestamp || Date.now(),
          date: data.date || new Date().toISOString(),
          deviceType: data.deviceType || 'Unknown',
          browser: data.browser || 'Unknown',
          os: data.os || 'Unknown',
          ipAddress: data.ipAddress || 'Unknown',
          screenResolution: data.screenResolution || 'Unknown',
          type: 'unique'
        })
      })

      // Fetch impressions
      const impressionsQuery = query(collection(db, 'visitor-impressions'), orderBy('timestamp', 'desc'))
      const impressionsSnapshot = await getDocs(impressionsQuery)
      const impressions: VisitorData[] = []
      impressionsSnapshot.forEach((doc) => {
        const data = doc.data()
        impressions.push({ 
          id: doc.id, 
          deviceId: data.deviceId || '',
          timestamp: data.timestamp || Date.now(),
          date: data.date || new Date().toISOString(),
          deviceType: data.deviceType || 'Unknown',
          browser: data.browser || 'Unknown',
          os: data.os || 'Unknown',
          ipAddress: data.ipAddress || 'Unknown',
          screenResolution: data.screenResolution || 'Unknown',
          type: 'impression'
        })
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

      // Calculate device stats for leaderboard
      const deviceMap: Record<string, DeviceStats> = {}
      
      allVisits.forEach(visit => {
        if (!visit.deviceId) return // Skip if no device ID
        
        if (!deviceMap[visit.deviceId]) {
          deviceMap[visit.deviceId] = {
            deviceId: visit.deviceId,
            visitCount: 0,
            firstVisit: visit.timestamp,
            lastVisit: visit.timestamp,
            deviceType: visit.deviceType,
            browser: visit.browser,
            os: visit.os,
            ipAddress: visit.ipAddress,
          }
        }
        
        deviceMap[visit.deviceId].visitCount++
        if (visit.timestamp < deviceMap[visit.deviceId].firstVisit) {
          deviceMap[visit.deviceId].firstVisit = visit.timestamp
        }
        if (visit.timestamp > deviceMap[visit.deviceId].lastVisit) {
          deviceMap[visit.deviceId].lastVisit = visit.timestamp
        }
      })

      const topDevices = Object.values(deviceMap)
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 50) // Top 50 devices

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
        totalVisits: allVisits.length,
        avgDailyVisits: Math.round(avgDailyVisits * 10) / 10,
        monthlyVisits,
        deviceBreakdown,
        topBrowsers: browserBreakdown,
        topDevices,
      })

      // Generate chart data
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
      const weeklyData: Record<string, { date: string; unique: number; impressions: number }> = {}
      
      const allTimestamps = [...visitors.map(v => v.timestamp), ...impressions.map(i => i.timestamp)]
      if (allTimestamps.length === 0) {
        setChartData([])
        return
      }
      
      const oldestTimestamp = Math.min(...allTimestamps)
      const weeksSinceStart = Math.ceil((now - oldestTimestamp) / (7 * 24 * 60 * 60 * 1000))
      
      for (let i = Math.min(weeksSinceStart, 12) - 1; i >= 0; i--) {
        const date = new Date(now - i * 7 * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        weeklyData[dateStr] = { date: dateStr, unique: 0, impressions: 0 }
      }

      visitors.forEach(v => {
        const weekDate = new Date(v.timestamp)
        weekDate.setDate(weekDate.getDate() - weekDate.getDay())
        const dateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (weeklyData[dateStr]) weeklyData[dateStr].unique++
      })

      impressions.forEach(i => {
        const weekDate = new Date(i.timestamp)
        weekDate.setDate(weekDate.getDate() - weekDate.getDay())
        const dateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (weeklyData[dateStr]) weeklyData[dateStr].impressions++
      })

      data = Object.values(weeklyData)
    }

    setChartData(data)
  }

  const viewDeviceDetails = (deviceId: string) => {
    const history = [...allVisitors, ...allImpressions]
      .filter(v => v.deviceId === deviceId)
      .sort((a, b) => b.timestamp - a.timestamp)
    
    setDeviceHistory(history)
    setSelectedDevice(deviceId)
  }

  // Fetch IP details from ip-api.com
  const fetchIPDetails = async (ipAddress: string) => {
    setIPDetails(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await fetch(`https://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,isp,timezone,lat,lon`)
      const data = await response.json()

      if (data.status === 'fail') {
        setIPDetails(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.message || 'Failed to fetch IP details' 
        }))
        return
      }

      setIPDetails({
        isp: data.isp || 'N/A',
        region: data.regionName || 'N/A',
        city: data.city || 'N/A',
        country: data.country || 'N/A',
        timezone: data.timezone || 'N/A',
        lat: data.lat || 0,
        lon: data.lon || 0,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching IP details:', error)
      setIPDetails(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to fetch IP details. Please try again.' 
      }))
    }
  }

  // Handle visit click to show IP details and history
  const handleVisitClick = (visit: VisitorData) => {
    if (selectionMode) {
      toggleItemSelection(visit.id)
      return
    }
    
    setSelectedVisitForIP(visit)
    setShowIPDetailsPopup(true)
    fetchIPDetails(visit.ipAddress)
  }

  const handleClearData = async () => {
    if (clearConfirmText.toLowerCase() !== 'clear') {
      return
    }

    try {
      let itemsToDelete: VisitorData[] = []
      const allItems = [...allVisitors, ...allImpressions]

      if (clearMode === 'time') {
        // Calculate time threshold
        let minutes = 0
        if (clearTimeRange === 'custom') {
          minutes = parseInt(customMinutes) || 0
        } else {
          const timeMap: Record<string, number> = {
            '30min': 30,
            '1hour': 60,
            '3hours': 180,
            '6hours': 360,
            '12hours': 720,
            '24hours': 1440,
            '7days': 10080,
            '30days': 43200,
          }
          minutes = timeMap[clearTimeRange] || 30
        }
        
        const thresholdTime = Date.now() - (minutes * 60 * 1000)
        itemsToDelete = allItems.filter(item => item.timestamp >= thresholdTime)
      } else if (clearMode === 'count') {
        // Get last N items
        const count = parseInt(clearCount) || 0
        itemsToDelete = allItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, count)
      }

      // Delete the items
      for (const item of itemsToDelete) {
        const collectionName = item.type === 'unique' ? 'visitor-tracking' : 'visitor-impressions'
        await deleteDoc(doc(db, collectionName, item.id))
      }

      setShowClearDialog(false)
      setClearMode('time')
      setClearTimeRange('30min')
      setCustomMinutes('')
      setClearCount('')
      setClearConfirmText('')
      fetchAnalytics()

      alert(`Successfully cleared ${itemsToDelete.length} record(s)!`)
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('Error clearing data. Please try again.')
    }
  }

  const handleDeleteSingleItem = async (itemId: string, itemType: 'unique' | 'impression') => {
    if (deleteConfirmText.toLowerCase() !== 'clear') {
      return
    }

    try {
      const collectionName = itemType === 'unique' ? 'visitor-tracking' : 'visitor-impressions'
      await deleteDoc(doc(db, collectionName, itemId))
      
      setShowDeleteConfirm(null)
      setDeleteConfirmText('')
      fetchAnalytics()
      
      alert('Record deleted successfully!')
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Error deleting record. Please try again.')
    }
  }

  // Handle long press to start selection mode
  const handleLongPressStart = (itemId: string) => {
    const timer = setTimeout(() => {
      setSelectionMode(true)
      setSelectedItems(new Set([itemId]))
    }, 500) // 500ms long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
    
    // Exit selection mode if no items selected
    if (newSelected.size === 0) {
      setSelectionMode(false)
    }
  }

  // Cancel selection mode
  const cancelSelection = () => {
    setSelectionMode(false)
    setSelectedItems(new Set())
  }

  // Delete multiple selected items
  const handleDeleteMultiple = async () => {
    if (deleteMultipleConfirmText.toLowerCase() !== 'clear') {
      return
    }

    try {
      const allItems = [...allVisitors, ...allImpressions]
      const itemsToDelete = allItems.filter(item => selectedItems.has(item.id))
      
      // Delete each item
      for (const item of itemsToDelete) {
        const collectionName = item.type === 'unique' ? 'visitor-tracking' : 'visitor-impressions'
        await deleteDoc(doc(db, collectionName, item.id))
      }

      setShowDeleteMultipleConfirm(false)
      setDeleteMultipleConfirmText('')
      setSelectionMode(false)
      setSelectedItems(new Set())
      fetchAnalytics()

      alert(`Successfully deleted ${itemsToDelete.length} record(s)!`)
    } catch (error) {
      console.error('Error deleting records:', error)
      alert('Error deleting records. Please try again.')
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (allVisitors.length > 0 || allImpressions.length > 0) {
      generateChartData(allVisitors, allImpressions, dateRange)
    }
  }, [dateRange, allVisitors, allImpressions])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading visitor analytics...</p>
      </div>
    )
  }

  // If no data at all
  if (!allVisitors.length && !allImpressions.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Visitor Data Yet</h3>
        <p className="text-gray-400 mb-6">
          Visitor tracking is active. Data will appear here once users visit your home page.
        </p>
        <Button
          onClick={() => fetchAnalytics()}
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  // Device Detail View
  if (selectedDevice) {
    const deviceStats = stats.topDevices.find(d => d.deviceId === selectedDevice)
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button
            onClick={() => setSelectedDevice(null)}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </div>

        {/* Device Info Card */}
        {deviceStats && (
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 sm:p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Device Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Device ID:</span>
                    <p className="text-white font-mono text-xs sm:text-sm break-all">{deviceStats.deviceId}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Visits:</span>
                    <p className="text-white font-semibold text-lg">{deviceStats.visitCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Device Type:</span>
                    <p className="text-white flex items-center gap-2">
                      {deviceStats.deviceType === 'Mobile' ? <Smartphone className="w-4 h-4" /> : 
                       deviceStats.deviceType === 'Tablet' ? <Tablet className="w-4 h-4" /> : 
                       <Monitor className="w-4 h-4" />}
                      {deviceStats.deviceType}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Browser:</span>
                    <p className="text-white">{deviceStats.browser}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">OS:</span>
                    <p className="text-white">{deviceStats.os}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">IP Address:</span>
                    <p 
                      className="text-white font-mono text-xs sm:text-sm cursor-pointer hover:text-blue-400 transition-colors inline-flex items-center gap-2"
                      onClick={(e) => copyIPToClipboard(deviceStats.ipAddress, e)}
                      title="Click to copy IP"
                    >
                      {deviceStats.ipAddress}
                      {copiedIP === deviceStats.ipAddress ? (
                        <span className="text-green-400 text-xs animate-in fade-in">✓ Copied!</span>
                      ) : (
                        <span className="text-gray-500 text-xs opacity-0 hover:opacity-100 transition-opacity">
                          📋
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">First Visit:</span>
                    <p className="text-white text-xs sm:text-sm">{new Date(deviceStats.firstVisit).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Visit:</span>
                    <p className="text-white text-xs sm:text-sm">{new Date(deviceStats.lastVisit).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visit History */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Complete Visit History ({deviceHistory.length} visits)
          </h3>
          
          <div className="space-y-3">
            {deviceHistory.map((visit, index) => (
              <div 
                key={visit.id}
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-400 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                          visit.type === 'unique' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {visit.type === 'unique' ? 'First Visit' : 'Return Visit'}
                        </span>
                        <span className="text-gray-400 text-xs sm:text-sm">
                          {new Date(visit.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-400">Device: </span>
                          <span className="text-white">{visit.deviceType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Browser: </span>
                          <span className="text-white">{visit.browser}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">OS: </span>
                          <span className="text-white">{visit.os}</span>
                        </div>
                        <div 
                          className="cursor-pointer hover:bg-blue-500/10 p-1 rounded transition-colors inline-block"
                          onClick={(e) => copyIPToClipboard(visit.ipAddress, e)}
                        >
                          <span className="text-gray-400">IP: </span>
                          <span className="text-white font-mono text-xs">
                            {visit.ipAddress}
                            {copiedIP === visit.ipAddress && (
                              <span className="text-green-400 ml-1 animate-in fade-in">✓</span>
                            )}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-400">Resolution: </span>
                          <span className="text-white">{visit.screenResolution}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
          <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
          Detailed Analytics
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

      {/* Stats Overview - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-xs sm:text-sm">Unique</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalUniqueVisitors}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 text-xs sm:text-sm">Impressions</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalImpressions}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-xs sm:text-sm">Avg Daily</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.avgDailyVisits}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400 text-xs sm:text-sm">Last 30D</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.monthlyVisits}</div>
        </div>
      </div>

      {/* Chart Section - Responsive */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Visitor Trends</h3>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {['today', 'week', 'month', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  dateRange === range
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full" style={{ height: '300px' }}>
          {isClient && chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey={dateRange === 'today' ? 'hour' : 'date'} 
                  stroke="#9CA3AF"
                  style={{ fontSize: '10px' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="unique" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Unique"
                  dot={{ fill: '#3B82F6', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="impressions" 
                  stroke="#A855F7" 
                  strokeWidth={2}
                  name="Impressions"
                  dot={{ fill: '#A855F7', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : !isClient ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No data available for the selected period</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard - Fully Responsive */}
      {stats.topDevices && stats.topDevices.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            Top Visitors Leaderboard
          </h3>
          
          <div className="space-y-2 sm:space-y-3">
            {stats.topDevices.slice(0, 10).map((device, index) => {
            const medal = index === 0 ? <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" /> :
                         index === 1 ? <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" /> :
                         index === 2 ? <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" /> :
                         null
            
            return (
              <div
                key={device.deviceId}
                onClick={() => viewDeviceDetails(device.deviceId)}
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 hover:bg-white/10 hover:border-purple-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {medal || <span className="text-purple-400 font-bold text-sm sm:text-base">#{index + 1}</span>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {device.deviceType === 'Mobile' ? <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" /> : 
                       device.deviceType === 'Tablet' ? <Tablet className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" /> : 
                       <Monitor className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />}
                      <span className="text-white font-medium text-xs sm:text-sm truncate">
                        {device.browser} on {device.os}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      {device.deviceId.substring(0, 30)}...
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-bold text-base sm:text-lg">{device.visitCount}</div>
                    <div className="text-gray-400 text-xs">visits</div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                </div>
              </div>
            )
            })}
          </div>
        </div>
      )}

      {/* Recent Visits History - Complete Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-400" />
            All Visits History ({allVisitors.length + allImpressions.length} total)
          </h3>
          
          {/* Selection Mode Controls */}
          {selectionMode && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-400">
                {selectedItems.size} selected
              </span>
              <Button
                onClick={() => setShowDeleteMultipleConfirm(true)}
                disabled={selectedItems.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                onClick={cancelSelection}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-sm px-4 py-2"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {selectionMode && (
                  <th className="text-left text-gray-400 text-sm font-medium py-3 px-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === [...allVisitors, ...allImpressions].length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set([...allVisitors, ...allImpressions].map(v => v.id)))
                        } else {
                          setSelectedItems(new Set())
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                    />
                  </th>
                )}
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Type</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Date & Time</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Device Type</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Browser</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">OS</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">IP Address</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Device ID</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...allVisitors, ...allImpressions]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50)
                .map((visit, index) => (
                  <tr 
                    key={visit.id} 
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                      selectedItems.has(visit.id) ? 'bg-purple-500/10 border-purple-500/30' : ''
                    }`}
                    onClick={() => handleVisitClick(visit)}
                    onMouseDown={() => handleLongPressStart(visit.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(visit.id)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    {selectionMode && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(visit.id)}
                          onChange={() => toggleItemSelection(visit.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                        />
                      </td>
                    )}
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
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      <div className="flex items-center gap-2">
                        {visit.deviceType === 'Mobile' ? <Smartphone className="w-4 h-4 text-blue-400" /> : 
                         visit.deviceType === 'Tablet' ? <Tablet className="w-4 h-4 text-purple-400" /> : 
                         <Monitor className="w-4 h-4 text-green-400" />}
                        {visit.deviceType}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{visit.browser}</td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{visit.os}</td>
                    <td 
                      className="py-3 px-4 text-gray-300 text-sm font-mono cursor-pointer hover:text-blue-400 hover:bg-blue-500/10 transition-colors relative group"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyIPToClipboard(visit.ipAddress, e)
                      }}
                      title="Click to copy IP"
                    >
                      <span className="flex items-center gap-2">
                        {visit.ipAddress}
                        {copiedIP === visit.ipAddress ? (
                          <span className="text-xs text-green-400 animate-in fade-in">✓ Copied!</span>
                        ) : (
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            📋 Copy
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs font-mono">
                      {visit.deviceId.substring(0, 20)}...
                    </td>
                    {!selectionMode && (
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(visit.id)
                          }}
                          className="p-2 rounded-lg bg-transparent border border-transparent text-transparent hover:bg-transparent hover:border-transparent transition-all opacity-0 cursor-default"
                          title=""
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {[...allVisitors, ...allImpressions]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50)
            .map((visit, index) => (
              <div 
                key={visit.id}
                className={`bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all relative cursor-pointer ${
                  selectedItems.has(visit.id) ? 'bg-purple-500/10 border-purple-500/30 ring-2 ring-purple-500/50' : ''
                }`}
                onTouchStart={() => handleLongPressStart(visit.id)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(visit.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onClick={() => handleVisitClick(visit)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.has(visit.id)}
                        onChange={() => toggleItemSelection(visit.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                      />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      visit.type === 'unique' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {visit.type === 'unique' ? 'Unique' : 'Impression'}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {new Date(visit.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Device: </span>
                    <span className="text-white flex items-center gap-1">
                      {visit.deviceType === 'Mobile' ? <Smartphone className="w-3 h-3" /> : 
                       visit.deviceType === 'Tablet' ? <Tablet className="w-3 h-3" /> : 
                       <Monitor className="w-3 h-3" />}
                      {visit.deviceType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Browser: </span>
                    <span className="text-white">{visit.browser}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">OS: </span>
                    <span className="text-white">{visit.os}</span>
                  </div>
                  <div 
                    className="cursor-pointer hover:bg-blue-500/10 p-1 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyIPToClipboard(visit.ipAddress, e)
                    }}
                  >
                    <span className="text-gray-400">IP: </span>
                    <span className="text-white font-mono text-xs">
                      {visit.ipAddress}
                      {copiedIP === visit.ipAddress && (
                        <span className="text-green-400 ml-1 animate-in fade-in">✓</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-gray-400">Device ID: </span>
                    <span className="text-gray-500 font-mono">{visit.deviceId.substring(0, 30)}...</span>
                  </div>
                  {!selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(visit.id)
                      }}
                      className="p-2 rounded-lg bg-transparent border border-transparent text-transparent hover:bg-transparent hover:border-transparent transition-all opacity-0 cursor-default"
                      title=""
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Show More Button if there are more than 50 visits */}
        {(allVisitors.length + allImpressions.length) > 50 && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              Showing 50 most recent visits out of {allVisitors.length + allImpressions.length} total
            </p>
          </div>
        )}
      </div>

      {/* Device & Browser Breakdown - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {stats.deviceBreakdown && Object.keys(stats.deviceBreakdown).length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-400" />
              Device Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.deviceBreakdown).map(([device, count]) => {
              const total = Object.values(stats.deviceBreakdown).reduce((a, b) => a + b, 0)
              const percentage = Math.round((count / total) * 100)
              
              return (
                <div key={device}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm sm:text-base">{device}</span>
                    <span className="text-white font-semibold text-sm sm:text-base">{count} ({percentage}%)</span>
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
        )}

        {stats.topBrowsers && Object.keys(stats.topBrowsers).length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
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
                      <span className="text-gray-300 text-sm sm:text-base">{browser}</span>
                      <span className="text-white font-semibold text-sm sm:text-base">{count} ({percentage}%)</span>
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
        )}
      </div>

      {/* Clear Button - Invisible but Clickable */}
      <div className="flex justify-center pt-4 sm:pt-8">
        <Button
          onClick={() => setShowClearDialog(true)}
          variant="outline"
          className="border-transparent text-transparent hover:bg-transparent bg-transparent opacity-0 cursor-default"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Views / Impressions
        </Button>
      </div>

      {/* Advanced Clear Data Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowClearDialog(false)
            setClearConfirmText('')
          }} />
          <div className="relative bg-gradient-to-br from-red-900/90 to-red-950/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowClearDialog(false)
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
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Clear Visitor Data
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Choose how you want to clear visitor analytics data
              </p>
            </div>

            {/* Clear Mode Selection */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">Clear By:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setClearMode('time')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    clearMode === 'time'
                      ? 'border-red-500 bg-red-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Time Range</span>
                </button>
                <button
                  onClick={() => setClearMode('count')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    clearMode === 'count'
                      ? 'border-red-500 bg-red-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Record Count</span>
                </button>
              </div>
            </div>

            {/* Time Range Options */}
            {clearMode === 'time' && (
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-3 block">Select Time Range:</label>
                <select
                  value={clearTimeRange}
                  onChange={(e) => setClearTimeRange(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="30min">Last 30 minutes</option>
                  <option value="1hour">Last 1 hour</option>
                  <option value="3hours">Last 3 hours</option>
                  <option value="6hours">Last 6 hours</option>
                  <option value="12hours">Last 12 hours</option>
                  <option value="24hours">Last 24 hours</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="custom">Custom Minutes</option>
                </select>
                
                {clearTimeRange === 'custom' && (
                  <Input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Enter minutes"
                    className="mt-3 bg-white/10 border-white/20 text-white"
                    min="1"
                  />
                )}
              </div>
            )}

            {/* Count Options */}
            {clearMode === 'count' && (
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-3 block">Number of Records to Clear:</label>
                <Input
                  type="number"
                  value={clearCount}
                  onChange={(e) => setClearCount(e.target.value)}
                  placeholder="e.g., 300"
                  className="bg-white/10 border-white/20 text-white"
                  min="1"
                />
                <p className="text-gray-400 text-xs mt-2">
                  Will clear the most recent {clearCount || 'N'} records
                </p>
              </div>
            )}

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">Type "clear" to confirm:</label>
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder='Type "clear"'
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowClearDialog(false)
                  setClearConfirmText('')
                }}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearData}
                disabled={clearConfirmText.toLowerCase() !== 'clear'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Data
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Multiple Items Confirmation Dialog */}
      {showDeleteMultipleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowDeleteMultipleConfirm(false)
            setDeleteMultipleConfirmText('')
          }} />
          <div className="relative bg-gradient-to-br from-red-900/90 to-red-950/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <button
              onClick={() => {
                setShowDeleteMultipleConfirm(false)
                setDeleteMultipleConfirmText('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Delete {selectedItems.size} Record(s)?
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">
                This action cannot be undone. All selected visit records will be permanently deleted.
              </p>
            </div>

            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">Type "clear" to confirm:</label>
              <Input
                value={deleteMultipleConfirmText}
                onChange={(e) => setDeleteMultipleConfirmText(e.target.value)}
                placeholder='Type "clear"'
                className="bg-white/10 border-white/20 text-white"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteMultipleConfirm(false)
                  setDeleteMultipleConfirmText('')
                }}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteMultiple}
                disabled={deleteMultipleConfirmText.toLowerCase() !== 'clear'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete {selectedItems.size} Record(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IP Details and Visit History Popup */}
      {showIPDetailsPopup && selectedVisitForIP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowIPDetailsPopup(false)
            setSelectedVisitForIP(null)
            setIPDetails({
              isp: '',
              region: '',
              city: '',
              country: '',
              timezone: '',
              lat: 0,
              lon: 0,
              loading: false,
              error: null
            })
          }} />
          <div className="relative bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowIPDetailsPopup(false)
                setSelectedVisitForIP(null)
                setIPDetails({
                  isp: '',
                  region: '',
                  city: '',
                  country: '',
                  timezone: '',
                  lat: 0,
                  lon: 0,
                  loading: false,
                  error: null
                })
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Visit Details & IP Information
              </h3>
              <p className="text-gray-300 text-sm">
                {new Date(selectedVisitForIP.timestamp).toLocaleString()}
              </p>
            </div>

            {/* IP Details Section */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                IP Address Details
              </h4>
              
              {ipDetails.loading ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-300">Looking up IP address...</p>
                </div>
              ) : ipDetails.error ? (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-300">{ipDetails.error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">IP Address</span>
                    <p className="text-white font-mono text-lg mt-1">{selectedVisitForIP.ipAddress}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">ISP</span>
                    <p className="text-white text-lg mt-1">{ipDetails.isp}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">City</span>
                    <p className="text-white text-lg mt-1">{ipDetails.city}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">Region</span>
                    <p className="text-white text-lg mt-1">{ipDetails.region}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">Country</span>
                    <p className="text-white text-lg mt-1">{ipDetails.country}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <span className="text-gray-400 text-sm">Timezone</span>
                    <p className="text-white text-lg mt-1">{ipDetails.timezone}</p>
                  </div>
                  {ipDetails.lat && ipDetails.lon && (
                    <div className="bg-white/5 rounded-lg p-4 sm:col-span-2">
                      <span className="text-gray-400 text-sm">Coordinates</span>
                      <p className="text-white font-mono text-lg mt-1">
                        {ipDetails.lat.toFixed(4)}, {ipDetails.lon.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Device Information */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-400" />
                Device Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Device Type</span>
                  <p className="text-white text-lg mt-1 flex items-center gap-2">
                    {selectedVisitForIP.deviceType === 'Mobile' ? <Smartphone className="w-5 h-5 text-blue-400" /> : 
                     selectedVisitForIP.deviceType === 'Tablet' ? <Tablet className="w-5 h-5 text-purple-400" /> : 
                     <Monitor className="w-5 h-5 text-green-400" />}
                    {selectedVisitForIP.deviceType}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Browser</span>
                  <p className="text-white text-lg mt-1">{selectedVisitForIP.browser}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Operating System</span>
                  <p className="text-white text-lg mt-1">{selectedVisitForIP.os}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Screen Resolution</span>
                  <p className="text-white text-lg mt-1">{selectedVisitForIP.screenResolution}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 sm:col-span-2">
                  <span className="text-gray-400 text-sm">Device ID</span>
                  <p className="text-white font-mono text-sm mt-1 break-all">{selectedVisitForIP.deviceId}</p>
                </div>
              </div>
            </div>

            {/* User Visit History */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Complete Visit History for This Device
                <span className="text-sm text-gray-400 ml-auto">
                  ({[...allVisitors, ...allImpressions].filter(v => v.deviceId === selectedVisitForIP.deviceId).length} visits)
                </span>
              </h4>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[...allVisitors, ...allImpressions]
                  .filter(v => v.deviceId === selectedVisitForIP.deviceId)
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((visit, index) => (
                    <div 
                      key={visit.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-400 font-bold text-sm">#{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                visit.type === 'unique' 
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              }`}>
                                {visit.type === 'unique' ? 'First Visit' : 'Return Visit'}
                              </span>
                              <span className="text-gray-400 text-sm">
                                {new Date(visit.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Device: </span>
                                <span className="text-white">{visit.deviceType}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Browser: </span>
                                <span className="text-white">{visit.browser}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">OS: </span>
                                <span className="text-white">{visit.os}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">IP: </span>
                                <span className="text-white font-mono text-xs">{visit.ipAddress}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Item Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowDeleteConfirm(null)
            setDeleteConfirmText('')
          }} />
          <div className="relative bg-gradient-to-br from-red-900/90 to-red-950/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <button
              onClick={() => {
                setShowDeleteConfirm(null)
                setDeleteConfirmText('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Delete This Record?
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">
                This action cannot be undone. The visit record will be permanently deleted.
              </p>
            </div>

            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">Type "clear" to confirm:</label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Type "clear"'
                className="bg-white/10 border-white/20 text-white"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(null)
                  setDeleteConfirmText('')
                }}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const itemToDelete = [...allVisitors, ...allImpressions].find(v => v.id === showDeleteConfirm)
                  if (itemToDelete) {
                    handleDeleteSingleItem(itemToDelete.id, itemToDelete.type)
                  }
                }}
                disabled={deleteConfirmText.toLowerCase() !== 'clear'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
