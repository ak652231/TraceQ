"use client"
import { Montserrat, Poppins } from "next/font/google"
import { Search, Bell, Menu, X, Shield, LogOut } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef, use } from "react"
import Cookies from "js-cookie"
import io from "socket.io-client"

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

export default function PoliceNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const socketRef = useRef(null)
  const [userId, setUserId] = useState("")
  const [policeName, setPoliceName] = useState("")

  const handleLogout = () => {
    console.log("removing")
    Cookies.remove("sessionToken", { path: "/" })
    setIsLogin(false) 
    setNotificationCount(0) 
    window.location.href = "/auth"
  }

  const checkUserLogin = () => {
    const token = Cookies.get("sessionToken")
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]))
        setUserId(decoded.id)
        setIsLogin(true)
        return true
      } catch (error) {
        console.error("Error decoding token:", error)
        setIsLogin(false)
        return false
      }
    } else {
      setIsLogin(false)
      return false
    }
  }

  useEffect(() => {
    if (isLogin && userId) {
      console.log("User ID updated, fetching notification count")
      fetchNotificationCount()
    }
  }, [isLogin, userId])
  
  const fetchNotificationCount = async () => {
    console.log(isLogin,userId)
    if (!isLogin) return
    try {
      const response = await fetch("/api/police/total-notification-count")
      console.log(response)
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count)
        console.log("Notification count:", data.count)
      }
    } catch (error) {
      console.error("Error fetching notification count:", error)
    }
  }

  const initializeSocket = () => {
    if (!socketRef.current && isLogin && userId) {
      const socket = io()

      socket.on("connect", () => {
        console.log("Socket connected")
        socket.emit("authenticate", userId)
      })

      socket.on("notification", (data) => {
        if (data.userId === userId) {
          console.log("New notification received:", data)
          fetchNotificationCount()
        }
      })

      socketRef.current = socket
    }
  }

  
  const handleNotificationClick = async () => {
    if (!isLogin) return

    try {
      window.location.href = "/police/notifications"
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      const isUserLoggedIn = await checkUserLogin()
        console.log("isUserLoggedIn", isUserLoggedIn)
      
    }

    initializeData()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, []) 
  useEffect(() => {
    if (isLogin && userId) {
      initializeSocket()
    }
  }, [isLogin, userId])

  useEffect(() => {
    const handleUpdateNotificationCount = (event: any) => {
      setNotificationCount(event.detail.count)
    }
    console.log("adding event listener")
    window.addEventListener("updateNotificationCount", handleUpdateNotificationCount)

    return () => {
      window.removeEventListener("updateNotificationCount", handleUpdateNotificationCount)
    }
  }, [])

  return (
    <main className={`relative overflow-x-hidden ${montserrat.variable} ${poppins.variable} font-montserrat`}>
      {/* Enhanced Navigation */}
      <nav className="fixed top-1 rounded-md left-4 right-4 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/police/dashboard" passHref>
                <span className="font-poppins text-red-600 font-bold text-xl tracking-tight cursor-pointer flex items-center">
                  <Shield className="h-5 w-5 mr-1" />
                  FindMate Police
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <Link href="/police/dashboard" passHref>
                  <span className="font-poppins text-gray-800 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 border-b-2 border-transparent hover:border-red-600 cursor-pointer">
                    Dashboard
                  </span>
                </Link>
                <Link href="/police/assigned-cases" passHref>
                  <span className="font-poppins text-gray-800 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 border-b-2 border-transparent hover:border-red-600 cursor-pointer">
                    Assigned Cases
                  </span>
                </Link>
                <Link href="/police/all-reports" passHref>
                  <span className="font-poppins text-gray-800 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 border-b-2 border-transparent hover:border-red-600 cursor-pointer">
                    All Reports
                  </span>
                </Link>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="p-1 rounded-full text-gray-600 hover:text-red-600 focus:outline-none">
                <Search className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={handleNotificationClick}
                  className="p-1 rounded-full text-gray-600 hover:text-red-600 focus:outline-none"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>
              </div>

              {/* User profile and logout */}
              {isLogin ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{policeName}</p>
                    <p className="text-xs text-gray-500">Police Officer</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded-full text-gray-600 hover:text-red-600 focus:outline-none"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <Link href="/auth" passHref>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm">
                    Sign In
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-red-600 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/police/dashboard" passHref>
                <span className="font-poppins text-gray-800 hover:text-red-600 block px-3 py-2 text-base font-medium cursor-pointer">
                  Dashboard
                </span>
              </Link>
              <Link href="/police/assigned-cases" passHref>
                <span className="font-poppins text-gray-800 hover:text-red-600 block px-3 py-2 text-base font-medium cursor-pointer">
                  Assigned Cases
                </span>
              </Link>
              <Link href="/police/all-reports" passHref>
                <span className="font-poppins text-gray-800 hover:text-red-600 block px-3 py-2 text-base font-medium cursor-pointer">
                  All Reports
                </span>
              </Link>
              <div className="flex items-center space-x-4 px-3 py-2">
                <button className="p-1 rounded-full text-gray-600 hover:text-red-600 focus:outline-none">
                  <Search className="h-5 w-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={handleNotificationClick}
                    className="p-1 rounded-full text-gray-600 hover:text-red-600 focus:outline-none"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              {isLogin ? (
                <div className="flex items-center justify-between px-5">
                  <div className="flex items-center">
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{policeName}</div>
                      <div className="text-sm font-medium text-gray-500">Police Officer</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-auto bg-red-600 flex items-center justify-center h-8 w-8 rounded-full text-white hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-5">
                  <Link href="/auth" passHref>
                    <button className="bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm w-full">
                      Sign In
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </main>
  )
}

