"use client"

import Link from "next/link"
import { Film, ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
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
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-gray-400">How we protect your information</p>
            </div>
          </div>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-6">
              <p className="text-lg">
                At NetVlyx, we are committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, and safeguard your information when you use our platform.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
              <p className="mb-4">We may collect the following types of information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Usage Data:</strong> Information about how you interact with our platform (pages visited, search queries, click data)</li>
                <li><strong className="text-white">Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
                <li><strong className="text-white">Cookies:</strong> Small data files stored on your device to improve user experience</li>
                <li><strong className="text-white">Local Storage:</strong> Preferences and wishlist data stored locally in your browser</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">How We Use Your Information</h2>
              <p className="mb-4">We use the collected information for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Providing and improving our services</li>
                <li>Personalizing your experience</li>
                <li>Analyzing platform usage and trends</li>
                <li>Maintaining security and preventing fraud</li>
                <li>Responding to user inquiries and support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Data Storage and Security</h2>
              <p className="mb-4">
                Most of your data (such as wishlist and preferences) is stored locally on your device using browser 
                storage. This means:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We do not store your personal preferences on our servers</li>
                <li>Your data remains under your control</li>
                <li>Clearing browser data will remove your stored preferences</li>
                <li>We implement industry-standard security measures to protect any server-side data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
              <p className="mb-4">
                NetVlyx uses third-party services that may collect information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">TMDB API:</strong> For movie information and ratings</li>
                <li><strong className="text-white">Content Providers:</strong> Third-party platforms that host content</li>
                <li><strong className="text-white">Analytics:</strong> To understand platform usage</li>
              </ul>
              <p className="mt-4">
                These third-party services have their own privacy policies. We encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
              <p className="mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Remember your preferences</li>
                <li>Understand how you use our platform</li>
                <li>Improve our services</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Note that disabling cookies may affect 
                platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your data stored locally on your device</li>
                <li>Clear your browsing data and preferences at any time</li>
                <li>Opt-out of data collection where applicable</li>
                <li>Request information about data we may have collected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Children's Privacy</h2>
              <p>
                NetVlyx is not intended for users under the age of 13. We do not knowingly collect personal 
                information from children under 13. If you believe we have collected information from a child, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with 
                an updated revision date. Continued use of NetVlyx after changes constitutes acceptance of the 
                updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p className="mb-4">
                If you have questions about this Privacy Policy, please contact us:
              </p>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <p className="mb-2">
                  <strong className="text-white">Website:</strong>{" "}
                  <a 
                    href="https://vlyx.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    vlyx.vercel.app
                  </a>
                </p>
                <p className="mb-2">
                  <strong className="text-white">Email:</strong>{" "}
                  <a href="mailto:vlyxcodes@gmail.com" className="text-red-500 hover:text-red-400 transition-colors">
                    vlyxcodes@gmail.com
                  </a>
                </p>
                <p>
                  <strong className="text-white">Instagram:</strong>{" "}
                  <a 
                    href="https://instagram.com/vlyxcodes" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-400 transition-colors"
                  >
                    @vlyxcodes
                  </a>
                </p>
              </div>
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
