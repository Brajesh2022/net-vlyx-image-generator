"use client"

import Link from "next/link"
import { Film, ArrowLeft, Code, Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-gray-800/50">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-lg">
                <Film className="h-5 w-5 text-white" />
              </div>
              <Link href="/">
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent cursor-pointer">
                  NetVlyx
                </h1>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">About NetVlyx</h1>
              <p className="text-gray-400">Your Premium Entertainment Destination</p>
            </div>
          </div>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What is NetVlyx?</h2>
              <p className="mb-4">
                NetVlyx is a modern, user-friendly platform designed to help you discover and access entertainment content 
                from across the internet. We provide a seamless browsing experience with an intuitive interface inspired 
                by the best streaming platforms.
              </p>
              <p>
                Our mission is to make content discovery easy and enjoyable, whether you're looking for the latest 
                Bollywood blockbusters, trending international movies, popular TV series, or classic films.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What We Offer</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <strong className="text-white">Extensive Content Library:</strong> Browse through thousands of movies and TV shows across multiple genres and languages
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <strong className="text-white">Smart Search:</strong> Powerful search functionality to find exactly what you're looking for
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <strong className="text-white">Curated Categories:</strong> Organized sections for Bollywood, South Indian, Korean, Animation, and more
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <strong className="text-white">Latest & Popular:</strong> Stay updated with trending content and newest releases
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <strong className="text-white">Responsive Design:</strong> Beautiful UI that works seamlessly on all devices
                  </div>
                </li>
              </ul>
            </section>

            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Developed & Managed By</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    Vlyx Codes
                  </h3>
                  <p className="text-gray-300 mb-4">
                    NetVlyx is proudly developed and maintained by <strong className="text-white">Vlyx Codes</strong>, 
                    a passionate developer dedicated to creating innovative and user-friendly web applications.
                  </p>
                </div>

                <div className="bg-black/40 rounded-lg p-6 border border-gray-700">
                  <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                    Credits & Appreciation
                  </h4>
                  <p className="text-gray-300 mb-4">
                    A huge thank you to Vlyx Codes for the countless hours of development, design, and maintenance 
                    that went into building this platform. Their expertise in modern web technologies and commitment 
                    to delivering an exceptional user experience has made NetVlyx what it is today.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <a
                      href="mailto:vlyxcodes@gmail.com"
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105 text-center"
                    >
                      Email: vlyxcodes@gmail.com
                    </a>
                    <a
                      href="https://instagram.com/vlyxcodes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105 text-center"
                    >
                      Instagram: @vlyxcodes
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Our Commitment</h2>
              <p className="mb-4">
                We are committed to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Providing a safe and reliable platform for content discovery</li>
                <li>Respecting intellectual property rights and DMCA guidelines</li>
                <li>Continuously improving user experience with regular updates</li>
                <li>Maintaining transparency in our operations</li>
                <li>Responding promptly to user feedback and concerns</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Technology Stack</h2>
              <p className="mb-4">
                NetVlyx is built with cutting-edge web technologies:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">Next.js 14</p>
                  <p className="text-sm text-gray-400">React Framework</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">TypeScript</p>
                  <p className="text-sm text-gray-400">Type Safety</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">Tailwind CSS</p>
                  <p className="text-sm text-gray-400">Modern Styling</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">TMDB API</p>
                  <p className="text-sm text-gray-400">Movie Data</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">Vercel</p>
                  <p className="text-sm text-gray-400">Hosting</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="font-semibold text-white">PWA</p>
                  <p className="text-sm text-gray-400">Progressive App</p>
                </div>
              </div>
            </section>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-xl p-6 mt-8">
              <p className="text-center text-gray-400">
                Thank you for using NetVlyx. We hope you enjoy your entertainment journey with us!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
