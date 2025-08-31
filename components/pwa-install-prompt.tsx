'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if the app is already installed (standalone mode)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    
    // Check if it's iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or dismissed
  if (isStandalone || !showInstallPrompt || localStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-black/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Install Netvlyx</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-300 mb-4">
          {isIOS
            ? 'Add to your home screen for the best experience. Tap the share button and select "Add to Home Screen".'
            : 'Install our app for a better experience with offline access and faster loading.'
          }
        </p>
        
        {!isIOS && (
          <Button
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </div>
    </div>
  )
}
