"use client"

import { useEffect } from "react"

export function SecurityProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Track long press on mobile (only on images and links)
    let pressTimer: NodeJS.Timeout | null = null
    
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Only prevent long press on images and links, not on buttons or interactive elements
      if (target.tagName === "IMG" || (target.tagName === "A" && !target.closest("button"))) {
        pressTimer = setTimeout(() => {
          // This prevents the context menu after long press
          e.preventDefault()
        }, 500) // 500ms = long press threshold
      }
    }

    const handleTouchEnd = () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    }

    const handleTouchMove = () => {
      // Cancel long press if user scrolls
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    }

    // Prevent drag start (prevents dragging images)
    const preventDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      // Only prevent dragging images, not other elements
      if (target.tagName === "IMG") {
        e.preventDefault()
        return false
      }
    }

    // Detect dev tools opening
    const detectDevTools = () => {
      const threshold = 160
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold
      
      if (widthThreshold || heightThreshold) {
        // Dev tools detected - redirect or show warning
        document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#000;color:#fff;'><h1>Access Denied</h1></div>"
      }
    }

    // Disable common dev tools keyboard shortcuts
    const disableDevToolsShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || 
          (e.metaKey && e.altKey && e.keyCode === 73)) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac)
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 74) || 
          (e.metaKey && e.altKey && e.keyCode === 74)) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac) - Inspect element
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 67) || 
          (e.metaKey && e.altKey && e.keyCode === 67)) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+U (View source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+S (Save page)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+K (Firefox Web Console)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 75) {
        e.preventDefault()
        return false
      }
    }

    // Disable copy (but allow in input fields and textareas)
    const disableCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      // Allow copy in input fields, textareas, and contenteditable elements
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return true
      }
      e.preventDefault()
      return false
    }

    // Disable text selection (but allow in input fields)
    const disableSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      // Allow selection in input fields, textareas, and contenteditable elements
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return true
      }
      e.preventDefault()
      return false
    }

    // Add event listeners
    document.addEventListener("contextmenu", disableRightClick)
    document.addEventListener("touchstart", handleTouchStart, { passive: false })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("dragstart", preventDragStart)
    document.addEventListener("keydown", disableDevToolsShortcuts)
    document.addEventListener("copy", disableCopy)
    document.addEventListener("cut", disableCopy)
    document.addEventListener("selectstart", disableSelectStart)

    // Check for dev tools periodically (only on desktop, not mobile)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    let devToolsInterval: NodeJS.Timeout | null = null
    let debuggerCheck: NodeJS.Timeout | null = null
    
    if (!isMobile) {
      // Only check on desktop to avoid performance issues on mobile
      devToolsInterval = setInterval(detectDevTools, 1000)

      // Detect debugger (less aggressive)
      debuggerCheck = setInterval(() => {
        const start = new Date().getTime()
        // eslint-disable-next-line no-debugger
        debugger
        const end = new Date().getTime()
        if (end - start > 100) {
          // Debugger detected
          document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#000;color:#fff;'><h1>Access Denied</h1></div>"
        }
      }, 1000)
    }

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", disableRightClick)
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("dragstart", preventDragStart)
      document.removeEventListener("keydown", disableDevToolsShortcuts)
      document.removeEventListener("copy", disableCopy)
      document.removeEventListener("cut", disableCopy)
      document.removeEventListener("selectstart", disableSelectStart)
      if (devToolsInterval) clearInterval(devToolsInterval)
      if (debuggerCheck) clearInterval(debuggerCheck)
      if (pressTimer) clearTimeout(pressTimer)
    }
  }, [])

  return null
}
