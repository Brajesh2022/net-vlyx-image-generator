"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'

export default function AadishPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect after 1 second
    const timer = setTimeout(() => {
      router.push('/')
    }, 1000)

    return () => clearTimeout(timer)
  }, [router])

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
              {/* Loading message */}
              <p className="text-xl sm:text-2xl md:text-3xl mt-4 text-cyan-800 dark:text-cyan-300 inline-block cursor-pointer">
                रुक जा भाई मूवीज लोड कर रहा हूँ...
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
