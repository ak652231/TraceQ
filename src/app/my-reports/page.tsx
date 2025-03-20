"use client"
import { useState, useEffect , useRef} from "react"
import { Montserrat, Poppins } from "next/font/google"
import { MapPin, Calendar, Bell, Eye, AlertCircle, ChevronRight, Search, FileText, User, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Navbar from "@/components/navbar"
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

interface MissingPerson {
  id: string
  fullName: string
  age: number
  gender: string
  photo: string
  lastSeenLocation: string
  lastSeenDate: string
  lastSeenTime: string
  status: string
  createdAt: string
  notificationCount?: number
}

export default function MyReportsPage() {
  const [myReports, setMyReports] = useState<MissingPerson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const [userId, setUserId] = useState("")
const [isLogin, setIsLogin] = useState(false)
const socketRef = useRef(null)

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
    checkUserLogin()
  }, []) 
  useEffect(() => {
    if (isLogin && userId) {
      initializeSocket()
    }
  }, [isLogin, userId])
  const initializeSocket = () => {
    if (!socketRef.current && isLogin && userId) {
      const socket = io()

      socket.on("connect", () => {
        console.log("Socket connected in myreports")
        socket.emit("authenticate", userId)
        console.log("Authenticated with socket server" + userId)
      })

      socket.on("notification", (data) => {
        const missingId = data.missingPersonId;
        console.log("Notification received for missing person:", missingId)
        setMyReports((prevReports) =>
          prevReports.map((report) =>
            report.id === missingId
              ? {
                ...report,
                notificationCount: (report.notificationCount || 0) + 1,
                status: data.newStatus === "SOLVED" 
                  ? "Found" 
                  : data.newStatus === "SENT_TEAM" 
                  ? "Investigating" 
                  : data.newStatus === "NOTIFIED_FAMILY" 
                  ? "Awaiting Verification"
                  : "Rejected"
              }
              
              : report
          )
        );
        
      
      });
      

      socketRef.current = socket
    }
  }
  useEffect(() => {
    if (userId) {
      fetchMyReports();
    }
  }, [userId]);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

    const fetchMyReports = async () => {
      setIsLoading(true)
      try {
        

        const response = await fetch(`/api/my-reports`)
        if (!response.ok) {
          throw new Error("Failed to fetch your reports")
        }

        const data = await response.json()
        console.log(data)
        const reportsWithNotifications = await Promise.all(
          data.map(async (report: MissingPerson) => {
            try {
              const notifResponse = await fetch(`/api/notifications/countReports?missingPersonId=${report.id}&userId=${userId}`)
              if (notifResponse.ok) {
                const notifData = await notifResponse.json()
                return { ...report, notificationCount: notifData.count }
              }
              return { ...report, notificationCount: 0 }
            } catch (error) {
              console.error(`Error fetching notifications for report ${report.id}:`, error)
              return { ...report, notificationCount: 0 }
            }
          }),
        )

        setMyReports(reportsWithNotifications)
      } catch (error) {
        console.error("Error fetching reports:", error)
        setError("Failed to load your reports. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-IN", options)
  }

  const filteredReports = myReports.filter(
    (report) =>
      report.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800"; 
  
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "found":
        return "bg-green-100 text-green-800";
      case "investigating":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 relative overflow-hidden ${montserrat.variable} ${poppins.variable} font-montserrat`}
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

      {/* Main container */}
      <div className="max-w-6xl mx-auto relative z-10 pt-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">My Missing Person Reports</h1>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            Track and manage all the missing person reports you have filed. Stay updated on any new developments.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your reports...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No reports state */}
        {!isLoading && !error && myReports.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Reports Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You haven't filed any missing person reports yet. If you need to report a missing person, you can do so by
              clicking the button below.
            </p>
            <Link href="/report-missing">
              <button className="bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200">
                Report Missing Person
              </button>
            </Link>
          </div>
        )}

        {/* Reports list */}
        {!isLoading && !error && filteredReports.length > 0 && (
          <div className="space-y-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="md:flex">
                  <div className="md:w-1/4 relative h-48 md:h-auto">
                    <Image
                      src={report.photo || "/placeholder.svg?height=300&width=300"}
                      alt={report.fullName}
                      fill
                      className="object-cover"
                    />
                    <div
                      className={`absolute top-2 right-2 ${getStatusColor(report.status)} text-xs font-bold px-2 py-1 rounded-full`}
                    >
                      {report.status}
                    </div>
                  </div>
                  <div className="p-4 md:w-3/4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-poppins font-semibold text-xl text-gray-800">{report.fullName}</h3>
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                          {report.gender}, {report.age} yrs
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">{report.lastSeenLocation}</p>
                        </div>

                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">Last seen on {formatDate(report.lastSeenDate)}</p>
                        </div>

                        <div className="flex items-start">
                          <Clock className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">At {report.lastSeenTime}</p>
                        </div>

                        <div className="flex items-start">
                          <User className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">Reported on {formatDate(report.createdAt)}</p>
                        </div>
                        <p className="text-red-600 text-sm">Case is being handled by a police station at {report.police.station}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="relative">
                          <Bell className="h-5 w-5 text-gray-500" />
                          {report.notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {report.notificationCount > 99 ? "99+" : report.notificationCount}
                            </span>
                          )}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {report.notificationCount
                            ? `${report.notificationCount} new update${report.notificationCount !== 1 ? "s" : ""}`
                            : "No new updates"}
                        </span>
                      </div>

                      <Link href={`/report-details/${report.id}`}>
                        <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          View Updates
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No search results */}
        {!isLoading && !error && myReports.length > 0 && filteredReports.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Matching Reports</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No reports match your search criteria. Try adjusting your search terms.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

