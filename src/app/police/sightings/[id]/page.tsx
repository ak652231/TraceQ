"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  User,
  Phone,
  FileText,
  Layers,
  RefreshCw,
  Mail,
  Bell,
  Users,
  ShieldCheck,
} from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import Cookies from "js-cookie"
import io from "socket.io-client"
import PoliceNavbar from "@/components/police-navbar"

const MapWithNoSSR = dynamic(() => import("@/components/SightingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      Loading Map...
    </div>
  ),
})

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

enum PoliceActionType {
  NOTIFIED_FAMILY = "NOTIFIED_FAMILY",
  SENT_TEAM = "SENT_TEAM",
  SOLVED = "SOLVED",
  REJECT = "REJECT",
}

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    if (!status) return "bg-yellow-100 text-yellow-800" 

    switch (status.toUpperCase()) {
      case PoliceActionType.NOTIFIED_FAMILY:
        return "bg-blue-100 text-blue-800"
      case PoliceActionType.SENT_TEAM:
        return "bg-purple-100 text-purple-800"
      case PoliceActionType.SOLVED:
        return "bg-green-100 text-green-800"
      case PoliceActionType.REJECT:
        return "bg-red-100 text-red-800"
      case "VERIFIED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "INVESTIGATING":
        return "bg-blue-100 text-blue-800"
      case "PENDING":
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusText = (status) => {
    if (!status) return "Pending" 

    switch (status.toUpperCase()) {
      case PoliceActionType.NOTIFIED_FAMILY:
        return "Family Notified"
      case PoliceActionType.SENT_TEAM:
        return "Team Dispatched"
      case PoliceActionType.SOLVED:
        return "Solved"
      case PoliceActionType.REJECT:
        return "Rejected"
      case "VERIFIED":
        return "Verified"
      case "REJECTED":
        return "Rejected"
      case "INVESTIGATING":
        return "Investigating"
      case "PENDING":
      default:
        return "Pending"
    }
  }

  const getStatusIcon = (status) => {
    if (!status) return <AlertCircle className="h-3.5 w-3.5 mr-1" /> 

    switch (status.toUpperCase()) {
      case PoliceActionType.NOTIFIED_FAMILY:
        return <Bell className="h-3.5 w-3.5 mr-1" />
      case PoliceActionType.SENT_TEAM:
        return <Users className="h-3.5 w-3.5 mr-1" />
      case PoliceActionType.SOLVED:
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />
      case PoliceActionType.REJECT:
        return <XCircle className="h-3.5 w-3.5 mr-1" />
      case "VERIFIED":
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />
      case "REJECTED":
        return <XCircle className="h-3.5 w-3.5 mr-1" />
      case "INVESTIGATING":
        return <Search className="h-3.5 w-3.5 mr-1" />
      case "PENDING":
      default:
        return <AlertCircle className="h-3.5 w-3.5 mr-1" />
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(status)}`}
    >
      {getStatusIcon(status)}
      {getStatusText(status)}
    </span>
  )
}

export default function PoliceDashboard() {
  const router = useRouter()

  const params = useParams()
  const { id } = params
  const [sightingReports, setSightingReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All")
  const [showFilters, setShowFilters] = useState(false)
  const [mapCenter, setMapCenter] = useState(null)
  const [mapZoom, setMapZoom] = useState(12)
  const [error, setError] = useState(null)
  const reportDetailRef = useRef(null)
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
        console.log("Socket connected")
        socket.emit("authenticate", userId)
      })

      socket.on("notification", (data) => {
        const sightingReportId = data.sightingReportId
        console.log("Notification received for sighting report:", sightingReportId)

        setSightingReports((prevReports) =>
          prevReports.map((report) =>
            report.id === sightingReportId
              ? { ...report, notificationCount: (report.notificationCount || 0) + 1 }
              : report,
          ),
        )

        setFilteredReports((prevReports) =>
          prevReports.map((report) =>
            report.id === sightingReportId
              ? { ...report, notificationCount: (report.notificationCount || 0) + 1 }
              : report,
          ),
        )
      })

      socketRef.current = socket
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  useEffect(() => {
    const fetchSightingReports = async () => {
      console.log("sighting ", id)
      if (!userId) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/police/sighting-reports?policeId=${userId}&missingpersonId=${id}`)

        if (!response.ok) {
          console.log("Failed to fetch sighting reports:", response.status)
          throw new Error(`Failed to fetch sighting reports: ${response.status}`)
        }

        const data = await response.json()

        const reportsWithNotifications = await Promise.all(
          data.map(async (report) => {
            try {
              const notifResponse = await fetch(`/api/notifications/countReports?sightingReportId=${report.id}`)
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

        setSightingReports(reportsWithNotifications)
        setFilteredReports(reportsWithNotifications)

        if (reportsWithNotifications.length > 0) {
          setMapCenter([reportsWithNotifications[0].sightingLat, reportsWithNotifications[0].sightingLng])
        }
      } catch (error) {
        console.error("Error fetching sighting reports:", error)
        setError("Failed to load sighting reports. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSightingReports()
  }, [id, userId])

  useEffect(() => {
    if (!sightingReports.length) return

    let results = [...sightingReports]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      results = results.filter(
        (report) =>
          report.missingPerson?.fullName?.toLowerCase().includes(term) ||
          report.locationDetails?.toLowerCase().includes(term) ||
          report.appearanceNotes?.toLowerCase().includes(term) ||
          report.identifyingMarks?.toLowerCase().includes(term),
      )
    }

    if (statusFilter !== "All") {
      results = results.filter((report) => report.status === statusFilter)
    }

    if (dateFilter !== "All") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (dateFilter === "Today") {
        results = results.filter((report) => {
          const reportDate = new Date(report.sightingDate)
          return reportDate >= today
        })
      } else if (dateFilter === "Last 7 days") {
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)

        results = results.filter((report) => {
          const reportDate = new Date(report.sightingDate)
          return reportDate >= lastWeek
        })
      } else if (dateFilter === "Last 30 days") {
        const lastMonth = new Date(today)
        lastMonth.setDate(lastMonth.getDate() - 30)

        results = results.filter((report) => {
          const reportDate = new Date(report.sightingDate)
          return reportDate >= lastMonth
        })
      }
    }

    setFilteredReports(results)
  }, [searchTerm, statusFilter, dateFilter, sightingReports])

  const handleReportSelect = async (report) => {
    setSelectedReport(report)
    setMapCenter([report.sightingLat, report.sightingLng])
    setMapZoom(15)

    if (report.notificationCount && report.notificationCount > 0) {
      await markNotificationsAsRead(report.id)
    }

    if (window.innerWidth < 768 && reportDetailRef.current) {
      reportDetailRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const markNotificationsAsRead = async (sightingReportId) => {
    try {
      console.log("Marking notifications as read", sightingReportId)
      await fetch(`/api/notifications/mark-read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sightingReportId }),
      })

      updateNavbarNotificationCount()

      setSightingReports((prevReports) =>
        prevReports.map((report) => (report.id === sightingReportId ? { ...report, notificationCount: 0 } : report)),
      )

      setFilteredReports((prevReports) =>
        prevReports.map((report) => (report.id === sightingReportId ? { ...report, notificationCount: 0 } : report)),
      )
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  
  const updateNavbarNotificationCount = async () => {
    try {
      const notifResponse = await fetch("/api/police/total-notification-count")
      if (notifResponse.ok) {
        const data = await notifResponse.json()
        console.log("Notification count:", data.count)
        if (typeof window !== "undefined") {
            console.log("disatch")
          const event = new CustomEvent("updateNotificationCount", {
            detail: { count: data.count },
          })
          window.dispatchEvent(event)
        }
      }
    } catch (error) {
      console.error("Error updating navbar notification count:", error)
    }
  }
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 relative overflow-hidden ${montserrat.variable} ${poppins.variable}`}
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
      </div>

      {/* Main container */}
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">Police Dashboard</h1>
          <p className="font-montserrat text-gray-600 max-w-3xl">
            Welcome, {"Officer"}. View and manage sighting reports assigned to you. Verify reports, update statuses, and
            track missing person sightings.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Reports list */}
          <div className="lg:col-span-1">
            {/* Search and filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Filters</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </button>
              </div>

              {showFilters && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="All">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value={PoliceActionType.NOTIFIED_FAMILY}>Family Notified</option>
                      <option value={PoliceActionType.SENT_TEAM}>Team Dispatched</option>
                      <option value={PoliceActionType.SOLVED}>Solved</option>
                      <option value={PoliceActionType.REJECT}>Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="All">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Last 7 days">Last 7 days</option>
                      <option value="Last 30 days">Last 30 days</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setSearchTerm("")
                        setStatusFilter("All")
                        setDateFilter("All")
                      }}
                      className="text-sm text-red-600 hover:text-red-800 flex items-center"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reports list */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-poppins font-semibold text-lg text-gray-800">Sighting Reports</h2>
                <span className="text-sm text-gray-500">{filteredReports.length} reports</span>
              </div>

              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="font-medium text-gray-700 mb-1">No reports found</h3>
                  <p className="text-gray-500 text-sm">
                    {searchTerm || statusFilter !== "All" || dateFilter !== "All"
                      ? "Try adjusting your filters to see more results"
                      : "You don't have any sighting reports assigned to you yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className={`p-4 hover:bg-red-50 cursor-pointer transition-colors ${selectedReport?.id === report.id ? "bg-red-50" : ""}`}
                      onClick={() => handleReportSelect(report)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-800 truncate">
                          {report.missingPerson?.fullName || "Unknown Person"}
                        </h3>
                        <div className="flex items-center">
                          {report.notificationCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 mr-2 bg-red-600 text-white text-xs font-bold rounded-full">
                              {report.notificationCount > 9 ? "9+" : report.notificationCount}
                            </span>
                          )}
                          <StatusBadge status={report.status || "PENDING"} />
                        </div>
                      </div>

                      <div className="flex items-start text-sm text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 text-red-500 mt-0.5 mr-1.5 flex-shrink-0" />
                        <span className="truncate">{report.locationDetails?.split(",")[0] || "Unknown location"}</span>
                      </div>

                      <div className="flex items-start text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-red-500 mt-0.5 mr-1.5 flex-shrink-0" />
                        <span>{formatDate(report.sightingDate)}</span>
                        <Clock className="h-4 w-4 text-red-500 mt-0.5 ml-3 mr-1.5 flex-shrink-0" />
                        <span>{report.sightingTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Map and report details */}
          <div className="lg:col-span-2">
            {/* Map */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-poppins font-semibold text-lg text-gray-800">Sighting Locations</h2>
                <div className="flex items-center space-x-2">
                  <button
                    className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                    title="Toggle map layers"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="h-[400px] w-full rounded-lg overflow-hidden">
                {mapCenter ? (
                  <MapWithNoSSR
                    center={mapCenter}
                    zoom={mapZoom}
                    markers={filteredReports.map((report) => ({
                      id: report.id,
                      position: [report.sightingLat, report.sightingLng],
                      title: report.missingPerson?.fullName || "Unknown Person",
                      status: report.status,
                      isSelected: selectedReport?.id === report.id,
                    }))}
                    onMarkerClick={(reportId) => {
                      const report = filteredReports.find((r) => r.id === reportId)
                      if (report) handleReportSelect(report)
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-500">
                    No location data available
                  </div>
                )}
              </div>
            </div>

            {/* Report details */}
            <div ref={reportDetailRef} className="bg-white rounded-xl shadow-md overflow-hidden">
              {selectedReport ? (
                <div>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="font-poppins font-semibold text-xl text-gray-800">Sighting Report Details</h2>
                      <StatusBadge status={selectedReport.status || "PENDING"} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Missing person info */}
                      <div className="flex space-x-4">
                        <div className="w-20 h-20 relative flex-shrink-0">
                          <Image
                            src={selectedReport.missingPerson?.photo || "/placeholder.svg?height=80&width=80"}
                            alt={selectedReport.missingPerson?.fullName || "Missing Person"}
                            width={80}
                            height={80}
                            className="object-cover rounded-md"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {selectedReport.missingPerson?.fullName || "Unknown Person"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {selectedReport.missingPerson?.age} years, {selectedReport.missingPerson?.gender}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Missing since:{" "}
                            {selectedReport.missingPerson?.lastSeenDate
                              ? formatDate(selectedReport.missingPerson.lastSeenDate)
                              : "Unknown"}
                          </p>
                        </div>
                      </div>

                      {/* Reporter info */}
                      <div>
                        <h3 className="font-medium text-gray-800 flex items-center">
                          <User className="h-4 w-4 mr-1.5 text-red-500" />
                          Reported by
                        </h3>
                        <p className="text-sm text-gray-700 mt-1">{selectedReport.reporter?.name || "Anonymous"}</p>
                        {selectedReport.reporter?.phone && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                            {selectedReport.reporter.phone}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Reported on: {formatDate(selectedReport.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-medium text-gray-800 mb-4">Sighting Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Calendar className="h-4 w-4 mr-1.5 text-red-500" />
                            Date & Time
                          </p>
                          <p className="text-gray-800">
                            {formatDate(selectedReport.sightingDate)} at {selectedReport.sightingTime}
                          </p>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <MapPin className="h-4 w-4 mr-1.5 text-red-500" />
                            Location
                          </p>
                          <p className="text-gray-800">{selectedReport.locationDetails}</p>
                          <p className="text-sm text-gray-500 mt-1">Coordinates: {selectedReport.sightingName}</p>
                        </div>

                        {selectedReport.seenWith && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Seen With</p>
                            <p className="text-gray-800">{selectedReport.seenWith}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        {selectedReport.appearanceNotes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Appearance Notes</p>
                            <p className="text-gray-800">{selectedReport.appearanceNotes}</p>
                          </div>
                        )}

                        {selectedReport.behaviorNotes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Behavior Notes</p>
                            <p className="text-gray-800">{selectedReport.behaviorNotes}</p>
                          </div>
                        )}

                        {selectedReport.identifyingMarks && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Identifying Marks</p>
                            <p className="text-gray-800">{selectedReport.identifyingMarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Photo comparison section */}
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-medium text-gray-800 mb-4">Photo Comparison</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Reported Sighting Photo</p>
                        <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                          {selectedReport.reporterPhoto ? (
                            <Image
                              src={selectedReport.reporterPhoto || "/placeholder.svg"}
                              alt="Reported sighting"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">
                              No photo available
                            </div>
                          )}
                        </div>

                        {selectedReport.reporterHeat && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">AI Analysis Heatmap</p>
                            <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                              <Image
                                src={selectedReport.reporterHeat || "/placeholder.svg"}
                                alt="AI analysis heatmap"
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Missing Person Photo</p>
                        <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                          {selectedReport.originalPhoto ? (
                            <Image
                              src={selectedReport.originalPhoto || "/placeholder.svg"}
                              alt="Missing person"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">
                              No photo available
                            </div>
                          )}
                        </div>

                        {selectedReport.originalHeat && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">AI Analysis Heatmap</p>
                            <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                              <Image
                                src={selectedReport.originalHeat || "/placeholder.svg"}
                                alt="AI analysis heatmap"
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedReport.matchPercentage && (
                      <div className="mt-4 p-4 bg-red-50 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-gray-800">AI Match Confidence</p>
                          <p className="font-bold text-red-700">{selectedReport.matchPercentage}%</p>
                        </div>

                        {selectedReport.analysis && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">AI Analysis</p>
                            <p className="text-sm text-gray-800">{selectedReport.analysis}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Missing Person Details Section */}
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-medium text-gray-800 mb-4">Missing Person Details</h3>

                    {selectedReport.missingPerson ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Last Seen</p>
                            <div className="flex items-center text-gray-800">
                              <Calendar className="h-4 w-4 mr-1.5 text-red-500" />
                              {formatDate(selectedReport.missingPerson.lastSeenDate)} at{" "}
                              {selectedReport.missingPerson.lastSeenTime}
                            </div>
                            <div className="flex items-center mt-1 text-gray-800">
                              <MapPin className="h-4 w-4 mr-1.5 text-red-500" />
                              {selectedReport.missingPerson.lastSeenLocation}
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Physical Description</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div>
                                <span className="text-gray-500">Height:</span>{" "}
                                <span className="text-gray-800">
                                  {selectedReport.missingPerson.height} {selectedReport.missingPerson.heightUnit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Weight:</span>{" "}
                                <span className="text-gray-800">
                                  {selectedReport.missingPerson.weight} {selectedReport.missingPerson.weightUnit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Hair:</span>{" "}
                                <span className="text-gray-800">{selectedReport.missingPerson.hairColor}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Eyes:</span>{" "}
                                <span className="text-gray-800">{selectedReport.missingPerson.eyeColor}</span>
                              </div>
                            </div>
                          </div>

                          {selectedReport.missingPerson.clothingWorn && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Clothing When Last Seen</p>
                              <p className="text-gray-800">{selectedReport.missingPerson.clothingWorn}</p>
                            </div>
                          )}

                          {selectedReport.missingPerson.identifyingMarks && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Identifying Marks</p>
                              <p className="text-gray-800">{selectedReport.missingPerson.identifyingMarks}</p>
                            </div>
                          )}
                        </div>

                        <div>
                          {selectedReport.missingPerson.behavioralTraits && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Behavioral Traits</p>
                              <p className="text-gray-800">{selectedReport.missingPerson.behavioralTraits}</p>
                            </div>
                          )}

                          {selectedReport.missingPerson.healthConditions && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Health Conditions</p>
                              <p className="text-gray-800">{selectedReport.missingPerson.healthConditions}</p>
                            </div>
                          )}

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Reported By Family</p>
                            <div className="p-3 bg-gray-50 rounded-md">
                              <p className="text-gray-800 font-medium">{selectedReport.missingPerson.reporterName}</p>
                              <p className="text-sm text-gray-600">
                                {selectedReport.missingPerson.relationship} of missing person
                              </p>
                              <div className="mt-2 text-sm">
                                <div className="flex items-center">
                                  <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                  {selectedReport.missingPerson.mobileNumber}
                                </div>
                                {selectedReport.missingPerson.emailAddress && (
                                  <div className="flex items-center mt-1">
                                    <Mail className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                    {selectedReport.missingPerson.emailAddress}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded-md">
                        <p className="text-gray-500">Detailed information about this missing person is not available</p>
                      </div>
                    )}
                  </div>

                  {/* Actions section */}
                  <div className="p-6">
                    

                    <div className="mt-6">
                      <button
                        onClick={() => router.push(`/police/report/${selectedReport.id}`)}
                        className="w-full py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Report
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="font-medium text-gray-700 mb-1">Select a report to view details</h3>
                  <p className="text-gray-500 text-sm">
                    Click on any report from the list to view detailed information
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

