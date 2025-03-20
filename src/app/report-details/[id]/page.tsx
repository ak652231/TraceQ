"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  User,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Camera,
  ChevronRight,
  Check,
  X,
  Phone,
  Building,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Navbar from "@/components/navbar"
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
}

interface PoliceDetails {
  id: string
  station: string
  address?: string
  contactNumber?: string
}

interface SightingReport {
  id: string
  missingPersonId: string
  sightingDate: string
  sightingTime: string
  appearanceNotes: string
  behaviorNotes?: string
  identifyingMarks: string
  reporterPhoto: string
  status: string
  createdAt: string
  showUser: boolean
  notificationCount?: number
  latestNotification?: string
  verifiedByFamily?: string | null
  policeDetails?: PoliceDetails
}

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  sightingReportId: string
}

export default function ReportDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params

  const [missingPerson, setMissingPerson] = useState<MissingPerson | null>(null)
  const [sightingReports, setSightingReports] = useState<SightingReport[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedSighting, setSelectedSighting] = useState<SightingReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const socketRef = useRef<any>(null)
  const [userId, setUserId] = useState("")

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const checkUserLogin = async () => {
    try {
      const response = await fetch("/api/auth/verifyL", { method: "GET" })
      const data = await response.json()

      if (data.isValid) {
        setUserId(data.userId)
        return data.userId
      } else {
        router.push("/auth")
        return null
      }
    } catch (error) {
      console.error("Error verifying token:", error)
      router.push("/auth")
      return null
    }
  }

  const initializeSocket = (userId: string) => {
    if (!socketRef.current && userId) {
      const socket = io()

      socket.on("connect", () => {
        console.log("Socket connected")
        socket.emit("authenticate", userId)
      })

      socket.on("notification", (data) => {
        const sightingId = data.sightingReportId

        if (selectedSighting && selectedSighting.id === sightingId) {
          setSightingReports((prevReports) =>
            prevReports.map((report) =>
              report.id === sightingId
                ? {
                    ...report,
                    status:
                      data.newStatus === "SOLVED"
                        ? "SOLVED"
                        : data.newStatus === "SENT_TEAM"
                          ? "SENT_TEAM"
                          : data.newStatus === "NOTIFIED_FAMILY"
                            ? "NOTIFIED_FAMILY"
                            : "Pending",
                  }
                : report,
            ),
          )

          if (selectedSighting.id === sightingId) {
            setSelectedSighting((prev) =>
              prev
                ? {
                    ...prev,
                    status:
                      data.newStatus === "SOLVED"
                        ? "SOLVED"
                        : data.newStatus === "SENT_TEAM"
                          ? "SENT_TEAM"
                          : data.newStatus === "NOTIFIED_FAMILY"
                            ? "NOTIFIED_FAMILY"
                            : "Pending",
                  }
                : prev,
            )
          }
        } else {
          setSightingReports((prevReports) =>
            prevReports.map((report) =>
              report.id === sightingId
                ? {
                    ...report,
                    notificationCount: (report.notificationCount || 0) + 1,
                    status:
                      data.newStatus === "SOLVED"
                        ? "SOLVED"
                        : data.newStatus === "SENT_TEAM"
                          ? "SENT_TEAM"
                          : data.newStatus === "NOTIFIED_FAMILY"
                            ? "NOTIFIED_FAMILY"
                            : "Pending",
                  }
                : report,
            ),
          )
        }

        if (data.newStatus === "NOTIFIED_FAMILY") {
          console.log(data.notification.sightingReport)
          const exists = sightingReports.some((report) => report.id === data.notification.sightingReport.id)

          if (!exists) {
            setSightingReports((prevReports) => [...prevReports, data.notification.sightingReport])
          }
        }
      })

      socketRef.current = socket
    }
  }

  const fetchMissingPersonDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/missing-persons/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch missing person details")
      }
      const data = await response.json()

      if (data.userId !== userId) {
        router.push("/my-reports")
        return null
      }

      setMissingPerson(data)
      return data
    } catch (error) {
      console.error("Error fetching missing person details:", error)
      setError("Failed to load missing person details. Please try again later.")
      return null
    }
  }

  const fetchSightingReports = async () => {
    try {
      const response = await fetch(`/api/sighting-reports-user?missingPersonId=${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch sighting reports")
      }
      const data = await response.json()

      const reportsWithNotifications = await Promise.all(
        data.map(async (report: SightingReport) => {
          try {
            const notifResponse = await fetch(`/api/notifications/countReports?sightingReportId=${report.id}`)
            if (notifResponse.ok) {
              const notifData = await notifResponse.json()

              const latestNotifResponse = await fetch(`/api/notifications/latest?sightingReportId=${report.id}`)
              let latestNotification = ""
              if (latestNotifResponse.ok) {
                const latestNotifData = await latestNotifResponse.json()
                latestNotification = latestNotifData.message || ""
              }

              const policeResponse = await fetch(`/api/police/details?sightingReportId=${report.id}`)
              let policeDetails = null
              if (policeResponse.ok) {
                const policeData = await policeResponse.json()
                policeDetails = policeData
              }

              return {
                ...report,
                notificationCount: notifData.count,
                latestNotification,
                policeDetails,
              }
            }
            return { ...report, notificationCount: 0 }
          } catch (error) {
            console.error(`Error fetching notifications for report ${report.id}:`, error)
            return { ...report, notificationCount: 0 }
          }
        }),
      )

      setSightingReports(reportsWithNotifications)

      if (reportsWithNotifications.length > 0 && !selectedSighting) {
        const firstReport = reportsWithNotifications[0]
        setSelectedSighting(firstReport)

        if (firstReport.notificationCount && firstReport.notificationCount > 0) {
          await markNotificationsAsRead(firstReport.id)
        }
      }
    } catch (error) {
      console.error("Error fetching sighting reports:", error)
      setError("Failed to load sighting reports. Please try again later.")
    }
  }

  const fetchNotifications = async (sightingReportId?: string) => {
    try {
      const url = sightingReportId
        ? `/api/notifications?sightingReportId=${sightingReportId}`
        : `/api/notifications?missingPersonId=${id}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markNotificationsAsRead = async (sightingReportId: string) => {
    try {
      console.log("Marking notifications as read", sightingReportId)
      await fetch(`/api/notifications/mark-read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sightingReportId }),
      })

      const navbarNotifResponse = await fetch("/api/notifications/count")
      if (navbarNotifResponse.ok) {
        const navbarNotifData = await navbarNotifResponse.json()

        if (typeof window !== "undefined") {
          const event = new CustomEvent("updateNotificationCount", {
            detail: { count: navbarNotifData.count },
          })
          window.dispatchEvent(event)
        }
      }

      setSightingReports((prevReports) =>
        prevReports.map((report) => (report.id === sightingReportId ? { ...report, notificationCount: 0 } : report)),
      )
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  const handleSightingSelect = async (sighting: SightingReport) => {
    setSelectedSighting(sighting)

    if (sighting.notificationCount && sighting.notificationCount > 0) {
      await markNotificationsAsRead(sighting.id)
    }

    fetchNotifications(sighting.id)
  }

  const handleSightingAction = async (action: "verify" | "decline") => {
    if (!selectedSighting) return

    try {
      const response = await fetch(`/api/sighting-reports-user/${selectedSighting.id}/family-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: action === "verify" ? "CONFIRMED" : "DENIED",
          notes: `Family member ${action === "verify" ? "confirmed" : "denied"} this sighting.`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} sighting report`)
      }

      const updatedData = await response.json()

      setSelectedSighting({
        ...selectedSighting,
        verifiedByFamily: action === "verify" ? true : false,
      })

      fetchSightingReports()

    } catch (error) {
      console.error(`Error ${action}ing sighting report:`, error)
      alert(`Failed to ${action} sighting report. Please try again.`)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)

      const userId = await checkUserLogin()
      if (!userId) return

      initializeSocket(userId)

      const missingPersonData = await fetchMissingPersonDetails(userId)
      if (!missingPersonData) return

      await fetchSightingReports()

      await fetchNotifications()

      setIsLoading(false)
    }

    initializeData()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [id, router])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-IN", options)
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "notified_family":
        return "bg-blue-100 text-blue-800"
      case "sent_team":
        return "bg-purple-100 text-purple-800"
      case "solved":
        return "bg-green-100 text-green-800"
      case "reject":
        return "bg-red-100 text-red-800"
      case "verified":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "denied":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Pending"
      case "notified_family":
        return "Awaiting Verification"
      case "sent_team":
        return "Under Investigation"
      case "solved":
        return "Solved"
      case "reject":
        return "Rejected"
      case "verified":
        return "Verified"
      case "rejected":
        return "Rejected"
      case "confirmed":
        return "Verified"
      case "denied":
        return "Rejected"
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <AlertCircle className="h-3.5 w-3.5 mr-1" />
      case "notified_family":
        return <Eye className="h-3.5 w-3.5 mr-1" />
      case "sent_team":
        return <User className="h-3.5 w-3.5 mr-1" />
      case "solved":
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />
      case "reject":
        return <XCircle className="h-3.5 w-3.5 mr-1" />
      case "verified":
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />
      case "rejected":
        return <XCircle className="h-3.5 w-3.5 mr-1" />
      case "confirmed":
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />
      case "denied":
        return <XCircle className="h-3.5 w-3.5 mr-1" />
      default:
        return <AlertCircle className="h-3.5 w-3.5 mr-1" />
    }
  }

  const isAwaitingVerification = (status: string) => {
    return status.toLowerCase() === "notified_family" 
  }

  if (isLoading) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 ${montserrat.variable} ${poppins.variable} font-montserrat`}
      >
        <Navbar />
        <div className="max-w-6xl mx-auto relative z-10 pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 ${montserrat.variable} ${poppins.variable} font-montserrat`}
      >
        <Navbar />
        <div className="max-w-6xl mx-auto relative z-10 pt-20">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <Link
                  href="/my-reports"
                  className="mt-2 inline-block text-sm text-red-700 font-medium hover:text-red-800"
                >
                  Back to My Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 relative overflow-hidden ${montserrat.variable} ${poppins.variable} font-montserrat`}
    >
      <Navbar />

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
        {/* Back button */}
        <Link href="/my-reports" className="inline-flex items-center text-gray-700 hover:text-red-600 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Reports
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-poppins font-bold text-2xl md:text-3xl text-gray-800 mb-2">
            {missingPerson?.fullName || "Missing Person"} - Sighting Reports
          </h1>
          <p className="font-montserrat text-gray-600">
            Review potential sightings of your missing person and verify if they match.
          </p>
        </div>

        {/* Main content - Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Sighting reports list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-red-500" />
                  Sighting Reports
                </h2>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {sightingReports.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-poppins font-medium text-gray-700 mb-1">No Sighting Reports</h3>
                    <p className="text-gray-500 text-sm">There are no sighting reports for this missing person yet.</p>
                  </div>
                ) : (
                  sightingReports.map((sighting) => (
                    <div
                      key={sighting.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedSighting?.id === sighting.id ? "bg-red-50" : ""
                      }`}
                      onClick={() => handleSightingSelect(sighting)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="relative">
                            <Calendar className="h-4 w-4 text-red-500 mr-2" />
                            {sighting.notificationCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                {sighting.notificationCount > 9 ? "9+" : sighting.notificationCount}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium">{formatDate(sighting.sightingDate)}</span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sighting.status)}`}
                        >
                          {getStatusIcon(sighting.status)}
                          {getStatusText(sighting.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <Clock className="h-4 w-4 text-gray-400 inline mr-1" />
                        {formatTime(sighting.sightingTime)}
                      </p>
                      {sighting.latestNotification && (
                        <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded-md">
                          <Bell className="h-4 w-4 text-red-500 inline mr-1" />
                          {sighting.latestNotification}
                        </p>
                      )}
                      <div className="flex justify-end mt-2">
                        <button className="text-xs text-red-600 hover:text-red-800 flex items-center">
                          View Details
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column - Selected sighting details */}
          <div className="lg:col-span-2">
            {selectedSighting ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-red-500" />
                    Sighting Details
                  </h2>
                </div>

                <div className="p-6">
                  {/* Sighting photo and basic info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Reported Photo</h3>
                      <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                        <Image
                          src={selectedSighting.reporterPhoto || "/placeholder.svg?height=300&width=300"}
                          alt="Reported sighting"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Sighting Information</h3>
                      <div className="bg-gray-50 rounded-md p-4 space-y-3">
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Date & Time</p>
                            <p className="text-gray-600">
                              {formatDate(selectedSighting.sightingDate)} at {formatTime(selectedSighting.sightingTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Status</p>
                            <p
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSighting.status)}`}
                            >
                              {getStatusIcon(selectedSighting.status)}
                              {getStatusText(selectedSighting.status)}
                            </p>
                          </div>
                        </div>

                        {/* Police Station Information */}
                        {selectedSighting.policeDetails && (
                          <div className="flex items-start">
                            <Building className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Police Station</p>
                              <p className="text-gray-600">
                                {selectedSighting.policeDetails.station || "Not specified"}
                              </p>
                              {selectedSighting.policeDetails.contactNumber && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  {selectedSighting.policeDetails.contactNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Appearance and behavior details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Appearance Notes</h3>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-gray-700">
                          {selectedSighting.appearanceNotes || "No appearance notes provided."}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-800 mb-3">Identifying Marks</h3>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-gray-700">
                          {selectedSighting.identifyingMarks || "No identifying marks noted."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedSighting.behaviorNotes && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-800 mb-3">Behavior Notes</h3>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-gray-700">{selectedSighting.behaviorNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons - Only show when status is NOTIFIED_FAMILY and not already verified */}
                  {isAwaitingVerification(selectedSighting.status) && selectedSighting.verifiedByFamily=== null && (
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => handleSightingAction("verify")}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Verify - This is them
                      </button>

                      <button
                        onClick={() => handleSightingAction("decline")}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Decline - Not a match
                      </button>
                    </div>
                  )}

                  {/* Show verification status if already verified */}
                  {selectedSighting.verifiedByFamily!==null && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                      <p className="text-gray-700 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                        This report has been{" "}
                        {selectedSighting.verifiedByFamily === true ? "verified" : "rejected"} by you 
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Sighting Selected</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {sightingReports.length > 0
                    ? "Select a sighting report from the list to view details."
                    : "There are no sighting reports for this missing person yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

