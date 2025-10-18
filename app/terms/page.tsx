"use client"

import Link from "next/link"
import { Film, ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
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
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Terms of Service</h1>
              <p className="text-gray-400">Terms and conditions for using NetVlyx</p>
            </div>
          </div>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6">
              <p className="text-lg">
                By accessing and using NetVlyx, you agree to be bound by these Terms of Service. 
                Please read them carefully before using our platform.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using NetVlyx, you acknowledge that you have read, understood, and agree to be bound 
                by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not 
                use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Nature of Service</h2>
              <p className="mb-4">
                NetVlyx is a content discovery and aggregation platform. We provide:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Search functionality for finding entertainment content</li>
                <li>Links to content hosted on third-party platforms</li>
                <li>Information and metadata about movies and TV shows</li>
                <li>Content organization and categorization</li>
              </ul>
              <p className="mt-4 font-semibold text-white">
                IMPORTANT: NetVlyx does NOT host, store, or upload any copyrighted content. We only index and link 
                to content that is publicly available on the internet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
              <p className="mb-4">As a user of NetVlyx, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the platform only for lawful purposes</li>
                <li>Not attempt to circumvent any security features</li>
                <li>Not use automated systems (bots, scrapers) without permission</li>
                <li>Not interfere with the proper functioning of the platform</li>
                <li>Respect intellectual property rights</li>
                <li>Not engage in any activity that could harm NetVlyx or its users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Content and Copyright</h2>
              <p className="mb-4">
                NetVlyx respects intellectual property rights. We:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Do not host any copyrighted content on our servers</li>
                <li>Only provide links to content hosted by third parties</li>
                <li>Respond to valid DMCA takedown notices</li>
                <li>Have no control over content on third-party platforms</li>
              </ul>
              <p className="mt-4">
                If you believe any content infringes your copyright, please refer to our <Link href="/dmca" className="text-red-500 hover:text-red-400 transition-colors">DMCA Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Links</h2>
              <p className="mb-4">
                NetVlyx provides links to third-party websites and platforms. We:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Are not responsible for the content, accuracy, or availability of third-party sites</li>
                <li>Do not endorse or control third-party platforms</li>
                <li>Are not liable for any damages resulting from your use of third-party links</li>
                <li>Encourage you to review the terms and privacy policies of third-party sites</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Disclaimer of Warranties</h2>
              <p className="mb-4">
                NetVlyx is provided "as is" without any warranties, express or implied. We do not guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Uninterrupted or error-free service</li>
                <li>Accuracy or completeness of information</li>
                <li>Security of data transmission</li>
                <li>Availability of linked content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, NetVlyx and its developers (Vlyx Codes) shall not be liable for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of data, profits, or business opportunities</li>
                <li>Damages resulting from your use or inability to use the platform</li>
                <li>Any content accessed through third-party links</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Age Restriction</h2>
              <p>
                NetVlyx is intended for users aged 13 and above. By using the platform, you confirm that you meet 
                this age requirement. If you are under 18, you should have parental or guardian consent to use 
                NetVlyx.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Modifications to Service</h2>
              <p>
                We reserve the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Modify or discontinue the service at any time without notice</li>
                <li>Change features, functionality, or availability</li>
                <li>Update these Terms of Service</li>
              </ul>
              <p className="mt-4">
                Continued use of NetVlyx after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your access to NetVlyx at our discretion, without 
                notice, for conduct that we believe violates these Terms of Service or is harmful to other users, 
                us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with applicable laws. 
                Any disputes arising from these terms shall be resolved through appropriate legal channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
              <p className="mb-4">
                For questions about these Terms of Service, please contact:
              </p>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
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

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Acknowledgment</h2>
              <p>
                By using NetVlyx, you acknowledge that you have read and understood these Terms of Service and 
                agree to be bound by them. These terms constitute the entire agreement between you and NetVlyx 
                regarding the use of our platform.
              </p>
            </section>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-xl p-6 mt-8">
              <p className="text-center text-sm text-gray-400">
                Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-center text-sm text-gray-400 mt-2">
                Developed and Managed by <span className="text-purple-400 font-semibold">Vlyx Codes</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
