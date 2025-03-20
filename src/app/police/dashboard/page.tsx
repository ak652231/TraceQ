"use client"
import { useState, useEffect, useRef } from "react"
import { Montserrat, Poppins } from "next/font/google"
import {
  MapPin,
  Calendar,
  Eye,
  AlertCircle,
  Search,
  FileText,
  User,
  Clock,
  X,
  List,
  Filter,
  ArrowLeft,
  ArrowRight,
  Info,
  MapIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import io from "socket.io-client"
import Cookies from "js-cookie"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  ),
})
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

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
  isSeen: boolean
  additionalPhotos: string[]
  behavioralTraits?: string
  healthConditions?: string
  height: number
  heightUnit: string
  weight: number
  weightUnit: string
  hairColor: string
  eyeColor: string
  clothingWorn: string
  identifyingMarks?: string
  reporterName: string
  relationship: string
  mobileNumber: string
  emailAddress?: string
  notificationCount?: number
  lat?: number
  lng?: number
}

export default function PoliceDashboard() {
  const [assignedReports, setAssignedReports] = useState<MissingPerson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showModal, setShowModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MissingPerson | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const router = useRouter()
  const socketRef = useRef<any>(null)
  const [userId, setUserId] = useState("")
  const [modalViewMode, setModalViewMode] = useState<"details" | "map">("details")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const [isLogin, setIsLogin] = useState(false)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

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
    if (typeof window !== "undefined") {
      import("leaflet/dist/leaflet.css")

      import("leaflet").then((L) => {
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })
      })
    }
  }, [])

  const initializeSocket = () => {
    if (!socketRef.current && userId) {
      const socket = io()

      socket.on("connect", () => {
        console.log("Socket connected in police dashboard")
        socket.emit("authenticate", userId)
        console.log("Emitting authenticate event with userId:", userId)
      })

      socket.on("notification", (data) => {
        const missingId = data.missingPersonId
        console.log("Notification received for missing person:", missingId)
        setAssignedReports((prevReports) =>
          prevReports.map((report) =>
            report.id === missingId ? { ...report, notificationCount: (report.notificationCount || 0) + 1 } : report,
          ),
        )
      })

      socketRef.current = socket
    }
  }

  const fetchAssignedReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/police/assigned-reports")

      if (!response.ok) {
        throw new Error("Failed to fetch assigned reports")
      }

      const data = await response.json()

      const reportsWithNotifications = await Promise.all(
        data.map(async (report: MissingPerson) => {
          try {
            const notifResponse = await fetch(`/api/notifications/countSighting?missingPersonId=${report.id}`)
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

      setAssignedReports(reportsWithNotifications)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching assigned reports:", error)
      setError("Failed to load assigned reports. Please try again later.")
      setIsLoading(false)
    }
  }

  const markReportAsSeen = async (reportId: string) => {
    try {
      const response = await fetch(`/api/police/mark-missing-seen/${reportId}`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark report as seen")
      }

      setAssignedReports((prevReports) =>
        prevReports.map((report) => (report.id === reportId ? { ...report, isSeen: true } : report)),
      )

      updateNavbarNotificationCount()
    } catch (error) {
      console.error("Error marking report as seen:", error)
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

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting user location:", error)
        },
      )
    }
  }

  const handleViewFullReport = (report: MissingPerson) => {
    setSelectedReport(report)
    setCurrentPhotoIndex(0)
    setShowModal(true)
    setModalViewMode("details") 
    getUserLocation() 
    if (!report.isSeen) {
      markReportAsSeen(report.id)
    }
  }

  const handleViewSightings = (reportId: string) => {
    router.push(`/police/sightings/${reportId}`)
  }

  const nextPhoto = () => {
    if (selectedReport && currentPhotoIndex < selectedReport.additionalPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1)
    }
  }

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      if (!userId) return

      initializeSocket()

      await fetchAssignedReports()
    }

    initializeData()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [userId, router])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-US", options)
  }

  const filteredReports = assignedReports.filter((report) => {
    const matchesSearch =
      report.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || report.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "active":
        return "bg-blue-100 text-blue-800"
      case "found":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">Police Dashboard</h1>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            Manage and track all missing person reports assigned to you.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
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

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="found">Found</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assigned reports...</p>
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
        {!isLoading && !error && assignedReports.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Assigned Reports</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You don't have any missing person reports assigned to you yet.
            </p>
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

                      {!report.isSeen && (
                        <div className="mt-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md inline-flex items-center text-sm">
                          <Info className="h-4 w-4 mr-1" />
                          New case assigned to you
                        </div>
                      )}

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
                          <p className="text-gray-600 text-sm">Reported by {report.reporterName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleViewFullReport(report)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
                      >
                        <div className="relative">
                          <Eye className="h-4 w-4 mr-1" />
                          {!report.isSeen && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              1
                            </span>
                          )}
                        </div>
                        View Full Report
                      </button>

                      <button
                        onClick={() => handleViewSightings(report.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
                      >
                        <div className="relative">
                          <List className="h-4 w-4 mr-1" />
                          {report.notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {report.notificationCount > 9 ? "9+" : report.notificationCount}
                            </span>
                          )}
                        </div>
                        View Sightings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No search results */}
        {!isLoading && !error && assignedReports.length > 0 && filteredReports.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Matching Reports</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No reports match your search criteria. Try adjusting your search terms or filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Full Report Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex justify-between items-center z-10">
              <h2 className="font-poppins font-semibold text-xl text-gray-800">
                {selectedReport.fullName} - Full Report
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setModalViewMode("details")}
                    className={`py-1.5 px-3 flex items-center text-sm ${
                      modalViewMode === "details" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </button>
                  <button
                    onClick={() => setModalViewMode("map")}
                    className={`py-1.5 px-3 flex items-center text-sm ${
                      modalViewMode === "map" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <MapIcon className="h-4 w-4 mr-1" />
                    Map
                  </button>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {modalViewMode === "details" ? (
                <>
                  {/* Main info section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Photo carousel */}
                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Photos</h3>
                      <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100 mb-2">
                        <Image
                          src={
                            currentPhotoIndex === 0
                              ? selectedReport.photo
                              : selectedReport.additionalPhotos[currentPhotoIndex - 1] ||
                                "/placeholder.svg?height=300&width=300"
                          }
                          alt={selectedReport.fullName}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Carousel controls */}
                      {(selectedReport.additionalPhotos.length > 0 || currentPhotoIndex > 0) && (
                        <div className="flex justify-between items-center">
                          <button
                            onClick={prevPhoto}
                            disabled={currentPhotoIndex === 0}
                            className={`p-1 rounded-full ${
                              currentPhotoIndex === 0 ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </button>

                          <span className="text-sm text-gray-500">
                            {currentPhotoIndex + 1} of {selectedReport.additionalPhotos.length + 1}
                          </span>

                          <button
                            onClick={nextPhoto}
                            disabled={currentPhotoIndex >= selectedReport.additionalPhotos.length}
                            className={`p-1 rounded-full ${
                              currentPhotoIndex >= selectedReport.additionalPhotos.length
                                ? "text-gray-300"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowRight className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Basic information */}
                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Basic Information</h3>
                      <div className="bg-gray-50 rounded-md p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-gray-500">Full Name</p>
                            <p className="font-medium">{selectedReport.fullName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Age</p>
                            <p className="font-medium">{selectedReport.age} years</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-gray-500">Gender</p>
                            <p className="font-medium">{selectedReport.gender}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}
                            >
                              {selectedReport.status}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Last Seen Location</p>
                          <p className="font-medium">{selectedReport.lastSeenLocation}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-gray-500">Last Seen Date</p>
                            <p className="font-medium">{formatDate(selectedReport.lastSeenDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Last Seen Time</p>
                            <p className="font-medium">{selectedReport.lastSeenTime}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical description */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-800 mb-3">Physical Description</h3>
                    <div className="bg-gray-50 rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Height</p>
                        <p className="font-medium">
                          {selectedReport.height} {selectedReport.heightUnit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Weight</p>
                        <p className="font-medium">
                          {selectedReport.weight} {selectedReport.weightUnit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hair Color</p>
                        <p className="font-medium">{selectedReport.hairColor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Eye Color</p>
                        <p className="font-medium">{selectedReport.eyeColor}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional details */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-800 mb-3">Additional Details</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-sm text-gray-500 mb-1">Clothing When Last Seen</p>
                        <p>{selectedReport.clothingWorn}</p>
                      </div>

                      {selectedReport.identifyingMarks && (
                        <div className="bg-gray-50 rounded-md p-4">
                          <p className="text-sm text-gray-500 mb-1">Identifying Marks</p>
                          <p>{selectedReport.identifyingMarks}</p>
                        </div>
                      )}

                      {selectedReport.behavioralTraits && (
                        <div className="bg-gray-50 rounded-md p-4">
                          <p className="text-sm text-gray-500 mb-1">Behavioral Traits</p>
                          <p>{selectedReport.behavioralTraits}</p>
                        </div>
                      )}

                      {selectedReport.healthConditions && (
                        <div className="bg-gray-50 rounded-md p-4">
                          <p className="text-sm text-gray-500 mb-1">Health Conditions</p>
                          <p>{selectedReport.healthConditions}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reporter information */}
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">Reporter Information</h3>
                    <div className="bg-gray-50 rounded-md p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Reporter Name</p>
                          <p className="font-medium">{selectedReport.reporterName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Relationship</p>
                          <p className="font-medium">{selectedReport.relationship}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Mobile Number</p>
                          <p className="font-medium">{selectedReport.mobileNumber}</p>
                        </div>
                        {selectedReport.emailAddress && (
                          <div>
                            <p className="text-sm text-gray-500">Email Address</p>
                            <p className="font-medium">{selectedReport.emailAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden">
                  {typeof window !== "undefined" && (
                    <MapContainer
                      center={[selectedReport.lat || 20.5937, selectedReport.lng || 78.9629]}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                      zoomControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Missing person marker (red) */}
                      {selectedReport.lat && selectedReport.lng && (
                        <Marker
                          position={[selectedReport.lat, selectedReport.lng]}
                          icon={
                            new window.L.Icon({
                              iconUrl:
                                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                              shadowUrl:
                                "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                              iconSize: [25, 41],
                              iconAnchor: [12, 41],
                              popupAnchor: [1, -34],
                              shadowSize: [41, 41],
                            })
                          }
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-medium text-sm">Last Seen Location</p>
                              <p className="text-xs text-gray-600">{selectedReport.lastSeenLocation}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* User location marker (blue) */}
                      {userLocation && (
                        <Marker
                          position={[userLocation.lat, userLocation.lng]}
                          icon={
                            new window.L.Icon({
                              iconUrl:
                                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                              shadowUrl:
                                "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                              iconSize: [25, 41],
                              iconAnchor: [12, 41],
                              popupAnchor: [1, -34],
                              shadowSize: [41, 41],
                            })
                          }
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-medium text-sm">Your Current Location</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Custom controls */}
                      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
                        <button
                          onClick={() => {
                            const map = document.querySelector(".leaflet-container")._leafletObject
                            map.zoomIn()
                          }}
                          className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
                          aria-label="Zoom in"
                        >
                          <ZoomIn className="h-5 w-5 text-gray-700" />
                        </button>
                        <button
                          onClick={() => {
                            const map = document.querySelector(".leaflet-container")._leafletObject
                            map.zoomOut()
                          }}
                          className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
                          aria-label="Zoom out"
                        >
                          <ZoomOut className="h-5 w-5 text-gray-700" />
                        </button>
                      </div>
                    </MapContainer>
                  )}

                  {!selectedReport.lat || !selectedReport.lng ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="text-center p-4">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-gray-700 font-medium">No location coordinates available for this report</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleViewSightings(selectedReport.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  View Sightings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

