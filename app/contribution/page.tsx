"use client"

import { useState } from "react"
import { ArrowLeft, Heart, Smartphone, QrCode, IndianRupee, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ContributionPage() {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'qr'>('upi')

  const upiId = "8271081338@fam"

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    if (value.length <= 6) {
      setAmount(value)
    }
  }

  const handleProceedToPayment = () => {
    if (amount && parseInt(amount) >= 10) {
      setShowPayment(true)
    }
  }

  const handleUPIPayment = () => {
    if (amount) {
      const upiUrl = `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=NetVlyx Support`
      window.location.href = upiUrl
    }
  }

  const generateQRCode = () => {
    const upiString = `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=NetVlyx Support`
    // Using QR server with logo support
    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/2560px-UPI-Logo-vector.svg.png"
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}&logo=${encodeURIComponent(logoUrl)}&logo_size=40x20`
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-purple-900/10 to-blue-900/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}} />
      </div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-400 hover:text-white transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            
            {!showPayment ? (
              /* Amount Selection */
              <div className="relative">
                {/* Glass morphism container */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  {/* Floating elements */}
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-xl opacity-60 animate-bounce" />
                  <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-40 animate-pulse" />
                  
                  <div className="text-center mb-8">
                    <div className="relative inline-block mb-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-red-500/30">
                        <Heart className="w-10 h-10 text-red-400 fill-current animate-pulse" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce" />
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-red-200 to-pink-200 bg-clip-text text-transparent">
                      Support NetVlyx
                    </h1>
                    <p className="text-gray-400">Help us keep the platform free & fast</p>
                  </div>

                  {/* Amount Input Section */}
                  <div className="mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-2xl blur-xl" />
                      <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
                        <div className="text-center mb-4">
                          <IndianRupee className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Enter contribution amount</p>
                        </div>
                        
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-green-400">₹</span>
                          <input
                            type="text"
                            value={amount}
                            onChange={handleCustomAmount}
                            placeholder="0"
                            className="w-full pl-12 pr-4 py-6 bg-transparent border-2 border-gray-700/50 focus:border-red-500 rounded-xl text-white placeholder-gray-500 focus:outline-none text-2xl font-bold text-center transition-all duration-300"
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            MIN ₹10
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="text-center p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                      <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Secure</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                      <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Instant</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                      <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Appreciated</p>
                    </div>
                  </div>

                  {/* Proceed Button */}
                  <button
                    onClick={handleProceedToPayment}
                    disabled={!amount || parseInt(amount) < 10}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:hover:scale-100 group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center justify-center gap-3">
                      <IndianRupee className="w-6 h-6" />
                      {amount ? `Continue with ₹${amount}` : "Enter Amount to Continue"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Gateway */
              <div className="relative">
                {/* Glass morphism container */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full blur-lg opacity-60 animate-pulse" />
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-40 animate-bounce" />
                  
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-green-500/30">
                      <Smartphone className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Secure Payment</h2>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-gray-300">Amount:</span>
                      <span className="text-3xl font-bold text-green-400">₹{amount}</span>
                    </div>
                  </div>

                  {/* Payment Method Toggle */}
                  <div className="relative mb-8">
                    <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-700/50">
                      <button
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden ${
                          paymentMethod === 'upi'
                            ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/2560px-UPI-Logo-vector.svg.png"
                          alt="UPI"
                          className="w-8 h-4 object-contain"
                        />
                        UPI Apps
                      </button>
                      <button
                        onClick={() => setPaymentMethod('qr')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden ${
                          paymentMethod === 'qr'
                            ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                        QR Code
                      </button>
                    </div>
                  </div>

                  {/* Payment Content */}
                  <div className="mb-6">
                    {paymentMethod === 'upi' ? (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-sm">1</span>
                            </div>
                            <p className="text-blue-300 font-medium">Tap "Pay with UPI"</p>
                          </div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-sm">2</span>
                            </div>
                            <p className="text-blue-300 font-medium">Choose your UPI app</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-sm">3</span>
                            </div>
                            <p className="text-blue-300 font-medium">Complete payment</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleUPIPayment}
                          className="w-full relative overflow-hidden bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="relative flex items-center justify-center gap-3">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/2560px-UPI-Logo-vector.svg.png"
                              alt="UPI"
                              className="w-8 h-4 object-contain"
                            />
                            Pay with UPI
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-gray-700/50">
                          <div className="relative inline-block mb-4">
                            <img
                              src={generateQRCode()}
                              alt="UPI QR Code"
                              className="w-48 h-48 mx-auto rounded-2xl shadow-2xl"
                            />
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/2560px-UPI-Logo-vector.svg.png"
                                alt="UPI"
                                className="w-6 h-3 object-contain"
                              />
                            </div>
                          </div>
                          <p className="text-gray-300 font-medium">Scan with any UPI app</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-2xl p-4 backdrop-blur-sm">
                          <p className="text-green-400 font-semibold mb-2 text-center">Supported Apps</p>
                          <p className="text-sm text-gray-300 text-center">PhonePe • Google Pay • Paytm • BHIM • Amazon Pay</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:text-white py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    ← Change Amount
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">256-bit SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
