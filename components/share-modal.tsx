"use client"

import { useState } from 'react'
import { Share, X, Copy, Check, MessageCircle, Hash, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  movieTitle: string
  movieImage?: string
}

export const ShareModal = ({ isOpen, onClose, movieTitle, movieImage }: ShareModalProps) => {
  const [copied, setCopied] = useState(false)

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `🎬 Watch or download "${movieTitle}" easily from NetVlyx - Your ultimate entertainment destination! 🍿`
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(currentUrl)
  const encodedImage = movieImage ? encodeURIComponent(movieImage) : ''

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Facebook',
      icon: 'f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Twitter',
      icon: Hash,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: 'bg-sky-600 hover:bg-sky-700'
    },
    {
      name: 'Instagram',
      icon: 'IG',
      url: `https://www.instagram.com/`,
      color: 'bg-pink-600 hover:bg-pink-700',
      note: 'Copy the link and share on Instagram'
    },
    {
      name: 'Telegram',
      icon: Send,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Reddit',
      icon: 'r/',
      url: `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(movieTitle)}`,
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ]

  const handleShare = (url: string, name: string) => {
    if (name === 'Instagram') {
      handleCopyLink()
      return
    }
    window.open(url, '_blank', 'width=600,height=400')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Share className="h-5 w-5 text-red-500" />
            Share Movie
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Movie Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            {movieImage && (
              <img 
                src={movieImage} 
                alt={movieTitle}
                className="w-12 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm">{movieTitle}</h3>
              <p className="text-gray-400 text-xs">Share this movie with friends</p>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-3">
            {shareLinks.map((link, index) => (
              <Button
                key={index}
                onClick={() => handleShare(link.url, link.name)}
                className={`${link.color} text-white border-none hover:scale-105 transition-all duration-200 h-12 flex items-center justify-center gap-2`}
              >
                {typeof link.icon === 'string' ? (
                  <span className="text-lg font-bold">{link.icon}</span>
                ) : (
                  <link.icon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{link.name}</span>
              </Button>
            ))}
          </div>

          {/* Copy Link */}
          <div className="pt-2 border-t border-gray-700">
            <Button
              onClick={handleCopyLink}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 h-12 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
