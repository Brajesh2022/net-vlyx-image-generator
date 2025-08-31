"use client"

import { Heart, X, Trash2, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWishlist, WishlistItem } from '@/hooks/useWishlist'
import Link from 'next/link'

interface WishlistModalProps {
  isOpen: boolean
  onClose: () => void
}

export const WishlistModal = ({ isOpen, onClose }: WishlistModalProps) => {
  const { wishlist, removeFromWishlist } = useWishlist()

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeFromWishlist(id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
            My Wishlist ({wishlist.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {wishlist.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 mb-6">Start adding movies to your wishlist to watch them later</p>
              <Button
                onClick={onClose}
                className="netflix-gradient"
              >
                Browse Movies
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {wishlist.map((item: WishlistItem) => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-3 sm:p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="relative w-16 h-20 sm:w-20 sm:h-28 flex-shrink-0">
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.title}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm sm:text-lg mb-1 line-clamp-2 leading-tight">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.category && (
                          <Badge className="bg-red-600 text-white text-xs">
                            {item.category}
                          </Badge>
                        )}
                        {item.year && (
                          <span className="text-gray-400 text-xs sm:text-sm">{item.year}</span>
                        )}
                        {item.rating && (
                          <span className="text-yellow-400 text-xs sm:text-sm">★ {item.rating}</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs sm:text-sm">Added to wishlist</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                      <Link href={`/movie/${item.slug}`} onClick={onClose}>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                        >
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Watch
                        </Button>
                      </Link>
                      
                      <Button
                        onClick={(e) => handleRemove(item.id, e)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2 sm:px-3 py-1 sm:py-2"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
