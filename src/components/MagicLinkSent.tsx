"use client"
import { useState, useEffect } from "react"
import { Montserrat, Poppins } from 'next/font/google'
import { Mail, ChevronLeft, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from "next/link"
import { motion } from "framer-motion"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
})

type MagicLinkSentProps = {
  email: string;
  isSignUp?: boolean;
  onResendLink?: () => void;
}

export default function MagicLinkSent({ 
  email, 
  isSignUp = false,
  onResendLink = () => console.log("Resend link clicked")
}: MagicLinkSentProps) {
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (resendDisabled) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendDisabled]);

  const handleResendLink = () => {
    if (!resendDisabled) {
      onResendLink();
      setResendDisabled(true);
    }
  };

  // Mask email for privacy
  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + 
      '*'.repeat(Math.max(1, username.length - 2)) + 
      (username.length > 1 ? username.charAt(username.length - 1) : '');
    return `${maskedUsername}@${domain}`;
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4 relative overflow-hidden ${montserrat.variable} ${poppins.variable}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute rounded-full bg-red-100 w-[500px] h-[500px] -top-[250px] -left-[250px] opacity-60"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
          }}
        ></div>
        <div 
          className="absolute rounded-full bg-red-100 w-[300px] h-[300px] top-[70%] -right-[150px] opacity-60"
          style={{
            transform: `translate(${-mousePosition.x * 0.01}px, ${-mousePosition.y * 0.01}px)`,
          }}
        ></div>
        <div 
          className="absolute rounded-full bg-red-200 w-[200px] h-[200px] bottom-[10%] left-[10%] opacity-40"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
          }}
        ></div>
      </div>

      {/* Back to home link */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center font-poppins text-gray-700 hover:text-red-600 transition-colors z-10"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Home
      </Link>

      {/* Main container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          {/* Header with icon */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                <Mail className="h-10 w-10 text-red-600" />
              </motion.div>
            </div>
            <h1 className="font-poppins font-bold text-2xl text-gray-800 text-center">
              Check Your Email
            </h1>
          </div>

          {/* Message */}
          <div className="text-center mb-8">
            <p className="font-montserrat text-gray-600 mb-4">
              We've sent a magic link to:
            </p>
            <div className="bg-gray-50 py-3 px-4 rounded-lg mb-4">
              <p className="font-poppins font-medium text-gray-800">{email}</p>
            </div>
            <p className="font-montserrat text-gray-600">
              {isSignUp 
                ? "Click the link in the email to complete your signup and access your account." 
                : "Click the link in the email to securely sign in to your account."}
            </p>
          </div>

          {/* Information cards */}
          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="font-montserrat text-sm text-blue-800">
                The magic link will expire in 10 minutes for security reasons.
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="font-montserrat text-sm text-amber-800">
                If you don't see the email, check your spam folder or try resending the link.
              </p>
            </div>
          </div>

          {/* Resend link button */}
          <div className="flex flex-col items-center">
            
            <div className="mt-6 text-center">
              <p className="font-montserrat text-gray-600">
                {isSignUp ? "Already have an account?" : "Need a different option?"}
                <Link
                  href="/auth"
                  className="ml-1 font-poppins font-medium text-red-600 hover:text-red-700"
                >
                  {isSignUp ? "Sign in" : "Try another method"}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="bg-green-50 p-4 border-t border-green-100 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <p className="font-poppins text-sm text-green-800">
            Email sent successfully
          </p>
        </div>
      </div>
    </div>
  )
}
