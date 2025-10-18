"use client"

import Link from "next/link"
import { Film, ArrowLeft, Mail, Instagram, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
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
              <Send className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Contact Us</h1>
              <p className="text-gray-400">Get in touch with the NetVlyx team</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">We'd Love to Hear From You!</h2>
              <p className="text-gray-300 mb-8">
                Whether you have questions, feedback, or need support, feel free to reach out to us through 
                any of the channels below. We aim to respond to all inquiries within 24-48 hours.
              </p>

              <div className="space-y-6">
                {/* Email Contact */}
                <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Email</h3>
                      <p className="text-gray-400 text-sm">Primary contact method</p>
                    </div>
                  </div>
                  <a
                    href="mailto:vlyxcodes@gmail.com"
                    className="text-red-400 hover:text-red-300 transition-colors text-lg font-semibold block mb-2"
                  >
                    vlyxcodes@gmail.com
                  </a>
                  <p className="text-gray-400 text-sm">
                    For general inquiries, support, DMCA notices, or business proposals
                  </p>
                  <a
                    href="mailto:vlyxcodes@gmail.com"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                  >
                    <Mail className="h-5 w-5" />
                    Send Email
                  </a>
                </div>

                {/* Instagram Contact */}
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Instagram</h3>
                      <p className="text-gray-400 text-sm">Follow for updates</p>
                    </div>
                  </div>
                  <a
                    href="https://instagram.com/vlyxcodes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors text-lg font-semibold block mb-2"
                  >
                    @vlyxcodes
                  </a>
                  <p className="text-gray-400 text-sm">
                    Follow us for platform updates, announcements, and behind-the-scenes content
                  </p>
                  <a
                    href="https://instagram.com/vlyxcodes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                  >
                    <Instagram className="h-5 w-5" />
                    Follow on Instagram
                  </a>
                </div>
              </div>
            </div>

            {/* What to Contact Us About */}
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">What Can We Help You With?</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">General Support</h3>
                  <p className="text-gray-400 text-sm">
                    Questions about using the platform, features, or functionality
                  </p>
                </div>
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Technical Issues</h3>
                  <p className="text-gray-400 text-sm">
                    Report bugs, broken links, or technical problems
                  </p>
                </div>
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">DMCA Notices</h3>
                  <p className="text-gray-400 text-sm">
                    Copyright infringement claims and takedown requests
                  </p>
                </div>
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Feedback & Suggestions</h3>
                  <p className="text-gray-400 text-sm">
                    Share your ideas for improving NetVlyx
                  </p>
                </div>
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Business Inquiries</h3>
                  <p className="text-gray-400 text-sm">
                    Partnership opportunities and collaborations
                  </p>
                </div>
                <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Content Requests</h3>
                  <p className="text-gray-400 text-sm">
                    Request specific content or features
                  </p>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">Response Time</h3>
              <p className="text-gray-300">
                We typically respond to all inquiries within <strong className="text-white">24-48 hours</strong> during business days. 
                For urgent matters, please mark your email subject line with <strong className="text-blue-400">[URGENT]</strong>.
              </p>
            </div>

            {/* Managed By */}
            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 text-center">
              <p className="text-gray-300 mb-2">
                NetVlyx is developed and managed by
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Vlyx Codes
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
