"use client"

import { useEffect } from "react"

export function SecurityProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Disable long press on mobile devices
    const disableLongPress = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Prevent long press context menu on images and links
      if (target.tagName === "IMG" || target.tagName === "A" || target.closest("a")) {
        e.preventDefault()
        return false
      }
    }

    // Prevent drag start (prevents dragging images)
    const preventDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
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

    // Disable text selection and copy
    const disableCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    const disableSelectStart = (e: Event) => {
      e.preventDefault()
      return false
    }

    // Add event listeners
    document.addEventListener("contextmenu", disableRightClick)
    document.addEventListener("touchstart", disableLongPress, { passive: false })
    document.addEventListener("touchend", disableLongPress, { passive: false })
    document.addEventListener("dragstart", preventDragStart)
    document.addEventListener("keydown", disableDevToolsShortcuts)
    document.addEventListener("copy", disableCopy)
    document.addEventListener("cut", disableCopy)
    document.addEventListener("selectstart", disableSelectStart)

    // Check for dev tools periodically
    const devToolsInterval = setInterval(detectDevTools, 1000)

    // Detect debugger
    const debuggerCheck = setInterval(() => {
      const start = new Date().getTime()
      // eslint-disable-next-line no-debugger
      debugger
      const end = new Date().getTime()
      if (end - start > 100) {
        // Debugger detected
        document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#000;color:#fff;'><h1>Access Denied</h1></div>"
      }
    }, 1000)

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", disableRightClick)
      document.removeEventListener("touchstart", disableLongPress)
      document.removeEventListener("touchend", disableLongPress)
      document.removeEventListener("dragstart", preventDragStart)
      document.removeEventListener("keydown", disableDevToolsShortcuts)
      document.removeEventListener("copy", disableCopy)
      document.removeEventListener("cut", disableCopy)
      document.removeEventListener("selectstart", disableSelectStart)
      clearInterval(devToolsInterval)
      clearInterval(debuggerCheck)
    }
  }, [])

  return null
}
