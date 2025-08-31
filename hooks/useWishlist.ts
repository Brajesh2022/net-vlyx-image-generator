"use client"

import { useState, useEffect } from 'react'

export interface WishlistItem {
  id: string
  title: string
  image: string
  year?: string
  rating?: string
  category?: string
  slug: string
}

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const savedWishlist = localStorage.getItem('netvlyx_wishlist')
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (error) {
        console.error('Error parsing wishlist:', error)
        localStorage.removeItem('netvlyx_wishlist')
      }
    }
  }, [])

  const saveWishlist = (newWishlist: WishlistItem[]) => {
    if (isClient) {
      setWishlist(newWishlist)
      localStorage.setItem('netvlyx_wishlist', JSON.stringify(newWishlist))
    }
  }

  const addToWishlist = (item: WishlistItem) => {
    const newWishlist = [...wishlist, item]
    saveWishlist(newWishlist)
  }

  const removeFromWishlist = (id: string) => {
    const newWishlist = wishlist.filter((item: WishlistItem) => item.id !== id)
    saveWishlist(newWishlist)
  }

  const isInWishlist = (id: string) => {
    return wishlist.some((item: WishlistItem) => item.id === id)
  }

  const toggleWishlist = (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id)
    } else {
      addToWishlist(item)
    }
  }

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    isClient
  }
}
