"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'

export default function AadishPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  const handleQuickLoad = () => {
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>लोड हो रहा है...</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>

      <div 
        className="bg-gradient-to-br from-orange-200 via-amber-200 to-yellow-200 dark:from-gray-900 dark:to-black min-h-screen overflow-x-hidden relative"
        style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}
      >
        {/* Watermark Layer */}
        <div className="fixed inset-0 z-0 flex flex-wrap items-center justify-center gap-x-16 gap-y-8 overflow-hidden pointer-events-none transform -rotate-12 scale-125">
          {[...Array(10)].map((_, i) => (
            <span 
              key={i} 
              className="text-4xl font-bold text-black/5 dark:text-white/5 whitespace-nowrap"
            >
              आदिश
            </span>
          ))}
        </div>

        {/* Main Content */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
          {/* Profile Picture Card */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center">
            <img 
              src="https://i.ibb.co/PZK9dQwV/IMG-20251020-WA0083.jpg" 
              alt="Aesthetic Picture" 
              className="w-48 h-48 md:w-56 md:h-56 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-xl flex-shrink-0"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = 'https://placehold.co/224x224/E0BBE4/957DAD?text=Bummer!'
              }}
            />
            
            <div className="mt-6 w-full">
              <h1 className="font-bold text-4xl sm:text-5xl bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 bg-clip-text text-transparent break-words">
                आदिश बदमाश ही कहदे लाडले।
              </h1>
              
              {/* Instagram ID */}
              <a 
                href="https://instagram.com/iammulticellular" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-lg sm:text-xl text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                @iammulticellular
              </a>
              
              {/* Loading message */}
              <p className="text-xl sm:text-2xl md:text-3xl mt-4 text-cyan-800 dark:text-cyan-300">
                रुक जा भाई मूवीज लोड कर रहा हूँ...
              </p>
              
              {/* Quick Load Button */}
              <button
                onClick={handleQuickLoad}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl sm:text-2xl rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 active:scale-95"
              >
                जल्दी लोड कर
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
