"use client"

import { useEffect, useRef } from 'react'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Helper to get device information
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent
  let deviceType = 'Desktop'
  
  if (/mobile/i.test(userAgent)) {
    deviceType = 'Mobile'
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'Tablet'
  }
  
  // Get browser info
  let browser = 'Unknown'
  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox'
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome'
  } else if (userAgent.indexOf('Safari') > -1) {
    browser = 'Safari'
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge'
  }
  
  // Get OS info
  let os = 'Unknown'
  if (userAgent.indexOf('Win') > -1) {
    os = 'Windows'
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'MacOS'
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux'
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android'
  } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    os = 'iOS'
  }
  
  return {
    deviceType,
    browser,
    os,
    userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  }
}

// Generate a unique device ID based on browser fingerprint
const generateDeviceId = () => {
  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem('netvlyx_device_id')
  if (existingId) {
    return existingId
  }
  
  // Create a new ID based on browser fingerprint
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('NetVlyx', 2, 2)
  }
  
  const canvasData = canvas.toDataURL()
  const fingerprint = `${navigator.userAgent}-${navigator.language}-${screen.colorDepth}-${screen.width}x${screen.height}-${canvasData.slice(0, 100)}`
  
  // Create a simple hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const deviceId = `device_${Math.abs(hash)}_${Date.now()}`
  
  // Store in localStorage and set cookie as backup
  localStorage.setItem('netvlyx_device_id', deviceId)
  document.cookie = `netvlyx_device_id=${deviceId}; max-age=31536000; path=/` // 1 year
  
  return deviceId
}

// Get device ID from localStorage or cookie
const getDeviceId = () => {
  // Check localStorage first
  let deviceId = localStorage.getItem('netvlyx_device_id')
  
  // If not in localStorage, check cookie
  if (!deviceId) {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'netvlyx_device_id') {
        deviceId = value
        // Restore to localStorage
        localStorage.setItem('netvlyx_device_id', deviceId)
        break
      }
    }
  }
  
  // If still not found, generate new one
  if (!deviceId) {
    deviceId = generateDeviceId()
  }
  
  return deviceId
}

// Get IP address (using public API)
const getIpAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'Unknown'
  } catch (error) {
    console.error('Error fetching IP:', error)
    return 'Unknown'
  }
}

export const useVisitorTracking = () => {
  const hasTracked = useRef(false)
  
  useEffect(() => {
    // Only track once per session
    if (hasTracked.current) return
    
    // IMPORTANT: Only track visitors from the official domain
    // Do NOT track if accessing from other domains (proxies, mirrors, etc.)
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : ''
    const isOfficialDomain = currentDomain === 'netvlyx.vercel.app' || currentDomain === 'localhost'
    
    if (!isOfficialDomain) {
      console.log('Visitor tracking skipped: not from official domain')
      return
    }
    
    const trackVisitor = async () => {
      try {
        const deviceId = getDeviceId()
        const deviceInfo = getDeviceInfo()
        const ipAddress = await getIpAddress()
        
        const visitData = {
          deviceId,
          timestamp: Date.now(),
          date: new Date().toISOString(),
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          screenResolution: deviceInfo.screenResolution,
          ipAddress,
          userAgent: deviceInfo.userAgent,
        }
        
        // Check if this device has visited before (check by deviceId)
        const visitorsRef = collection(db, 'visitor-tracking')
        const q = query(visitorsRef, where('deviceId', '==', deviceId))
        const querySnapshot = await getDocs(q)
        
        if (querySnapshot.empty) {
          // New unique visitor (first visit from this device)
          await addDoc(collection(db, 'visitor-tracking'), {
            ...visitData,
            type: 'unique',
            firstVisit: new Date().toISOString(),
            visitCount: 1,
          })
          console.log('Tracked unique visitor:', deviceId)
        } else {
          // Returning visitor - track as impression (linked to device ID)
          await addDoc(collection(db, 'visitor-impressions'), {
            ...visitData,
            type: 'impression',
          })
          console.log('Tracked impression for device:', deviceId)
        }
        
        hasTracked.current = true
      } catch (error) {
        console.error('Error tracking visitor:', error)
      }
    }
    
    // Track after a small delay to ensure page is loaded
    const timer = setTimeout(() => {
      trackVisitor()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
}
