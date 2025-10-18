"use client"

import Link from "next/link"
import { Film, ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DMCAPage() {
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
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">DMCA Policy</h1>
              <p className="text-gray-400">Digital Millennium Copyright Act</p>
            </div>
          </div>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Important Notice</h2>
              <p className="text-lg">
                NetVlyx does NOT host any movies, TV shows, or other copyrighted content on our servers. 
                We are simply a search engine that indexes and displays content that is already publicly available on the internet.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What We Do</h2>
              <p className="mb-4">
                NetVlyx operates as a content aggregator and search platform. We:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Index publicly available content from various sources on the internet</li>
                <li>Provide search functionality to help users find content</li>
                <li>Display links to content hosted on third-party platforms</li>
                <li>Do NOT store, host, or upload any copyrighted materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What We Don't Do</h2>
              <p className="mb-4">
                NetVlyx does NOT:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Host any movies, TV shows, or copyrighted content on our servers</li>
                <li>Upload or distribute any copyrighted materials</li>
                <li>Control or manage content on third-party websites</li>
                <li>Have any affiliation with content hosting platforms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Copyright Infringement</h2>
              <p className="mb-4">
                If you believe that any content linked on NetVlyx infringes your copyright, please note that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The content is hosted on third-party platforms, not on our servers</li>
                <li>You should contact the hosting platform directly to request removal</li>
                <li>We can remove links to infringing content upon receipt of a valid DMCA notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Filing a DMCA Takedown Notice</h2>
              <p className="mb-4">
                To file a DMCA takedown notice for removing links from our search results, please send an email to:
              </p>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 my-4">
                <a 
                  href="mailto:vlyxcodes@gmail.com" 
                  className="text-red-500 hover:text-red-400 transition-colors text-lg font-semibold"
                >
                  vlyxcodes@gmail.com
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  Managed by <a href="https://vlyx.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Vlyx Codes</a>
                </p>
              </div>
              <p className="mb-4">
                Your notice must include:
              </p>
              <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>A physical or electronic signature of the copyright owner</li>
                <li>Identification of the copyrighted work claimed to have been infringed</li>
                <li>Identification of the material that is claimed to be infringing (URL/link)</li>
                <li>Contact information (address, telephone number, and email)</li>
                <li>A statement of good faith belief that use of the material is not authorized</li>
                <li>A statement that the information in the notification is accurate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Response Time</h2>
              <p>
                We aim to respond to all valid DMCA notices within 48-72 hours. Upon receipt of a valid notice, 
                we will remove the links to the allegedly infringing content from our search results.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Disclaimer</h2>
              <p>
                NetVlyx respects intellectual property rights and expects its users to do the same. 
                We comply with the DMCA and will respond to valid takedown notices. However, we have no control 
                over the content hosted on third-party platforms and cannot be held responsible for copyright 
                infringement by those platforms.
              </p>
            </section>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-xl p-6 mt-8">
              <p className="text-center text-sm text-gray-400">
                Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
