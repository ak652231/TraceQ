"use client"

import { useState, useEffect , useRef} from "react"
import { useRouter, useParams } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import Image from "next/image"
import dynamic from "next/dynamic"
import {
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Camera,
  Download,
  Printer,
  Share2,
  MessageCircle,
  Bell,
  Users,
  FileCheck,
  ChevronDown,
  ChevronUp,
  BarChart,
  Clipboard,
  History,
  Eye,
} from "lucide-react"
import Cookies from "js-cookie"
import { io } from "socket.io-client"

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

const StatusBadge = ({ status }) => {
  const statusStyles = {
    Pending: "bg-yellow-100 text-yellow-800",
    Verified: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Investigating: "bg-blue-100 text-blue-800",
  }

  const statusIcons = {
    Pending: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
    Verified: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    Rejected: <XCircle className="h-3.5 w-3.5 mr-1" />,
    Investigating: <Search className="h-3.5 w-3.5 mr-1" />,
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {statusIcons[status]}
      {status}
    </span>
  )
}

const TimelineItem = ({ date, title, description, icon: Icon, color }) => {
  return (
    <div className="flex mb-6 last:mb-0">
      <div className="flex flex-col items-center mr-4">
        <div className={`p-2 rounded-full ${color} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-gray-200 my-2"></div>
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{date}</p>
        <h4 className="font-medium text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

export default function SightingReportDetail() {
  const router = useRouter()
  const params = useParams()
  const reportId = params.id

  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionType, setActionType] = useState("NOTIFIED_FAMILY")
  const [actionRemarks, setActionRemarks] = useState("")
  const [mapMarkers, setMapMarkers] = useState([])
  
  const socketRef = useRef(null)
  const [expandedSections, setExpandedSections] = useState({
    missingPerson: true,
    sightingDetails: true,
    photoEvidence: true,
    familyInteractions: true,
    policeActions: true,
  })
  const [userId, setUserId] = useState("")
  const [isLogin, setIsLogin] = useState(false)

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
        const sightingId = data.sightingReportId;
        console.log("Notification received for missing person:", sightingId);
      
        setReport((prevReport) => ({
          ...prevReport,
          familyInteractions: {
            ...prevReport.familyInteractions, 
            response: data.action 
          }
        }));
      });
      
      

      socketRef.current = socket
    }
  }
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatDateTime = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  useEffect(() => {
    const fetchReportData = async () => {
      if (!reportId || !userId) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/sighting-reports/${reportId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch report: ${response.status}`)
        }

        const data = await response.json()
        setReport(data)

        const markers = []

        markers.push({
          id: "sighting",
          position: [data.sightingLat, data.sightingLng],
          title: "Sighting Location",
          status: data.status,
          isSelected: true,
        })

        if (data.missingPerson?.lat && data.missingPerson?.lng) {
          markers.push({
            id: "lastSeen",
            position: [data.missingPerson.lat, data.missingPerson.lng],
            title: "Last Seen Location",
            status: "lastSeen",
            isSelected: false,
          })
        }

        setMapMarkers(markers)
      } catch (error) {
        console.error("Error fetching report:", error)
        setError("Failed to load report details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchReportData()
  }, [reportId,  userId])

  const updateReportStatus = async (newStatus) => {
    if (!userId || !report) return

    try {
      setIsUpdating(true)
      setError(null)

      const response = await fetch(`/api/police/update-report-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: report.id,
          status: newStatus,
          policeId: userId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update report status: ${response.status}`)
      }

      setReport((prev) => ({
        ...prev,
        status: newStatus,
      }))

      let notificationMessage = ""

      switch (newStatus) {
        case "NOTIFIED_FAMILY":
          notificationMessage = "A new suspect has been found. Please verify if this is your missing person."
          break
        case "SENT_TEAM":
          if (report.showUser) {
            notificationMessage = "Police have started an investigation on your sighting report."
          }
          break
        case "SOLVED":
          notificationMessage = "Your missing person case has been marked as solved by the police."
          break
        case "REJECT":
          if (report.showUser) {
            notificationMessage = "Your sighting report has been closed by the police."
          }
          break
      }

      if (notificationMessage) {
        await fetch("/api/notifications/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: report.missingPerson.userId,
            sightingReportId: report.id,
            missingPersonId: report.missingPersonId,
            type: "POLICE_ACTION_UPDATE",
            message: notificationMessage,
            status: newStatus
          }),
        })
      }
    } catch (error) {
      console.error("Error updating report status:", error)
      setError("Failed to update report status. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const printReport = () => {
    window.print()
  }

  if (!userId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md max-w-md">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 mb-2">Error Loading Report</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => router.push("/police/dashboard")}
                className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-md max-w-md">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-2">Report Not Found</h3>
              <p className="text-yellow-700">The requested sighting report could not be found.</p>
              <button
                onClick={() => router.push("/police/dashboard")}
                className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const timelineEvents = []

  if (report.missingPerson?.createdAt) {
    timelineEvents.push({
      date: formatDateTime(report.missingPerson.createdAt),
      title: "Missing Person Reported",
      description: `${report.missingPerson.reporterName} reported ${report.missingPerson.fullName} as missing.`,
      icon: AlertCircle,
      color: "bg-red-500",
    })
  }

  timelineEvents.push({
    date: formatDateTime(report.createdAt),
    title: "Sighting Reported",
    description: `${report.reporter?.name || "Anonymous"} reported seeing the missing person at ${report.locationDetails}.`,
    icon: Eye,
    color: "bg-blue-500",
  })

  if (report.policeActions) {
    const actionTitle =
      report.policeActions.actionTaken === "NOTIFIED_FAMILY"
        ? "Family Notified"
        : report.policeActions.actionTaken === "SENT_TEAM"
          ? "Investigation Team Dispatched"
          : "Case Closed"

    const actionIcon =
      report.policeActions.actionTaken === "NOTIFIED_FAMILY"
        ? Bell
        : report.policeActions.actionTaken === "SENT_TEAM"
          ? Users
          : FileCheck

    timelineEvents.push({
      date: formatDateTime(report.policeActions.createdAt),
      title: actionTitle,
      description: report.policeActions.remarks || `Police officer took action: ${actionTitle}`,
      icon: actionIcon,
      color: "bg-indigo-500",
    })
  }

  if (report.familyInteractions) {
    timelineEvents.push({
      date: formatDateTime(report.familyInteractions.createdAt),
      title:
        report.familyInteractions.response === "CONFIRMED" ? "Family Confirmed Sighting" : "Family Denied Sighting",
      description:
        report.familyInteractions.notes ||
        `Family ${report.familyInteractions.response === "CONFIRMED" ? "confirmed" : "denied"} this sighting report.`,
      icon: report.familyInteractions.response === "CONFIRMED" ? CheckCircle : XCircle,
      color: report.familyInteractions.response === "CONFIRMED" ? "bg-green-500" : "bg-red-500",
    })
  }

  timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 ${montserrat.variable} ${poppins.variable}`}
    >
      {/* Main container */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <button
              onClick={() => router.push("/police/dashboard")}
              className="mr-4 p-2 rounded-full bg-white shadow-sm hover:bg-gray-100"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-poppins font-bold text-2xl md:text-3xl text-gray-800 flex items-center">
                Sighting Report
                <StatusBadge status={report.status} className="ml-3" />
              </h1>
              <p className="font-montserrat text-gray-600">
                {report.missingPerson?.fullName || "Unknown Person"} • Report #{report.id.substring(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={printReport}
              className="px-3 py-1.5 bg-white shadow-sm rounded-md text-gray-700 text-sm flex items-center hover:bg-gray-100"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </button>
            <button
              onClick={() => {
                /* Share functionality */
              }}
              className="px-3 py-1.5 bg-white shadow-sm rounded-md text-gray-700 text-sm flex items-center hover:bg-gray-100"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </button>
            <button
              onClick={() => {
                /* Download functionality */
              }}
              className="px-3 py-1.5 bg-white shadow-sm rounded-md text-gray-700 text-sm flex items-center hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === "details" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              Report Details
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === "timeline"
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-600 hover:text-gray-800"
                }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === "map" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              Map View
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === "actions" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              Actions
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Report details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Missing Person Section */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSection("missingPerson")}
                >
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <User className="h-5 w-5 mr-2 text-red-500" />
                    Missing Person Details
                  </h2>
                  {expandedSections.missingPerson ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {expandedSections.missingPerson && (
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                          <Image
                            src={report.missingPerson?.photo || "/placeholder.svg?height=256&width=256"}
                            alt={report.missingPerson?.fullName || "Missing Person"}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="mt-4 bg-gray-50 rounded-md p-4">
                          <h3 className="font-medium text-gray-800 mb-2">Basic Information</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium text-gray-800">
                                {report.missingPerson?.fullName || "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium text-gray-800">
                                {report.missingPerson?.age || "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Gender:</span>
                              <span className="font-medium text-gray-800">
                                {report.missingPerson?.gender || "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Missing Since:</span>
                              <span className="font-medium text-gray-800">
                                {report.missingPerson?.lastSeenDate
                                  ? formatDate(report.missingPerson.lastSeenDate)
                                  : "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-2/3 space-y-6">
                        <div>
                          <h3 className="font-medium text-gray-800 mb-3">Last Seen</h3>
                          <div className="bg-gray-50 rounded-md p-4">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-4 w-4 text-red-500 mr-2" />
                              <span className="text-gray-800">
                                {report.missingPerson?.lastSeenDate
                                  ? formatDate(report.missingPerson.lastSeenDate)
                                  : "Unknown date"}
                                {report.missingPerson?.lastSeenTime ? ` at ${report.missingPerson.lastSeenTime}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-red-500 mr-2" />
                              <span className="text-gray-800">
                                {report.missingPerson?.lastSeenLocation || "Unknown location"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-800 mb-3">Physical Description</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-md p-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Height:</span>
                                  <span className="font-medium text-gray-800">
                                    {report.missingPerson?.height
                                      ? `${report.missingPerson.height} ${report.missingPerson.heightUnit}`
                                      : "Unknown"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Weight:</span>
                                  <span className="font-medium text-gray-800">
                                    {report.missingPerson?.weight
                                      ? `${report.missingPerson.weight} ${report.missingPerson.weightUnit}`
                                      : "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-md p-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Hair Color:</span>
                                  <span className="font-medium text-gray-800">
                                    {report.missingPerson?.hairColor || "Unknown"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Eye Color:</span>
                                  <span className="font-medium text-gray-800">
                                    {report.missingPerson?.eyeColor || "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(report.missingPerson?.clothingWorn || report.missingPerson?.identifyingMarks) && (
                          <div>
                            <h3 className="font-medium text-gray-800 mb-3">Additional Details</h3>
                            <div className="space-y-4">
                              {report.missingPerson?.clothingWorn && (
                                <div className="bg-gray-50 rounded-md p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Clothing When Last Seen</h4>
                                  <p className="text-gray-800">{report.missingPerson.clothingWorn}</p>
                                </div>
                              )}

                              {report.missingPerson?.identifyingMarks && (
                                <div className="bg-gray-50 rounded-md p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Identifying Marks</h4>
                                  <p className="text-gray-800">{report.missingPerson.identifyingMarks}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {(report.missingPerson?.behavioralTraits || report.missingPerson?.healthConditions) && (
                          <div>
                            <h3 className="font-medium text-gray-800 mb-3">Behavioral & Health Information</h3>
                            <div className="space-y-4">
                              {report.missingPerson?.behavioralTraits && (
                                <div className="bg-gray-50 rounded-md p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Behavioral Traits</h4>
                                  <p className="text-gray-800">{report.missingPerson.behavioralTraits}</p>
                                </div>
                              )}

                              {report.missingPerson?.healthConditions && (
                                <div className="bg-gray-50 rounded-md p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Health Conditions</h4>
                                  <p className="text-gray-800">{report.missingPerson.healthConditions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sighting Details Section */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSection("sightingDetails")}
                >
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-red-500" />
                    Sighting Details
                  </h2>
                  {expandedSections.sightingDetails ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {expandedSections.sightingDetails && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">Sighting Information</h3>
                        <div className="bg-gray-50 rounded-md p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                              <Calendar className="h-4 w-4 mr-1.5 text-red-500" />
                              Date & Time
                            </h4>
                            <p className="text-gray-800">
                              {formatDate(report.sightingDate)} at {report.sightingTime}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                              <MapPin className="h-4 w-4 mr-1.5 text-red-500" />
                              Location
                            </h4>
                            <p className="text-gray-800">{report.locationDetails}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Coordinates: {report.sightingLat}, {report.sightingLng}
                            </p>
                          </div>

                          {report.seenWith && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Seen With</h4>
                              <p className="text-gray-800">{report.seenWith}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">Appearance & Behavior</h3>
                        <div className="bg-gray-50 rounded-md p-4 space-y-4">
                          {report.appearanceNotes && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Appearance Notes</h4>
                              <p className="text-gray-800">{report.appearanceNotes}</p>
                            </div>
                          )}

                          {report.behaviorNotes && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Behavior Notes</h4>
                              <p className="text-gray-800">{report.behaviorNotes}</p>
                            </div>
                          )}

                          {report.identifyingMarks && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Identifying Marks</h4>
                              <p className="text-gray-800">{report.identifyingMarks}</p>
                            </div>
                          )}

                          {!report.appearanceNotes && !report.behaviorNotes && !report.identifyingMarks && (
                            <p className="text-gray-500 italic">No appearance or behavior details provided</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-medium text-gray-800 mb-3">Reporter Information</h3>
                      <div className="bg-gray-50 rounded-md p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="md:w-1/4">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-8 w-8 text-gray-500" />
                            </div>
                          </div>
                          <div className="md:w-3/4">
                            <h4 className="font-medium text-gray-800">{report.reporter?.name || "Anonymous"}</h4>
                            {report.reporter?.phone && (
                              <p className="text-sm text-gray-600 flex items-center mt-1">
                                <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                {report.reporter.phone}
                              </p>
                            )}
                            {report.reporter?.email && (
                              <p className="text-sm text-gray-600 flex items-center mt-1">
                                <Mail className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                {report.reporter.email}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              Reported on: {formatDateTime(report.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Evidence Section */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSection("photoEvidence")}
                >
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-red-500" />
                    Photo Evidence & AI Analysis
                  </h2>
                  {expandedSections.photoEvidence ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {expandedSections.photoEvidence && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">Reported Sighting Photo</h3>
                        <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                          {report.reporterPhoto ? (
                            <Image
                              src={report.reporterPhoto || "/placeholder.svg"}
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

                        {report.reporterHeat && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis Heatmap</h4>
                            <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                              <Image
                                src={report.reporterHeat || "/placeholder.svg"}
                                alt="AI analysis heatmap"
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">Missing Person Photo</h3>
                        <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                          {report.originalPhoto ? (
                            <Image
                              src={report.originalPhoto || "/placeholder.svg"}
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

                        {report.originalHeat && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis Heatmap</h4>
                            <div className="relative h-64 w-full rounded-md overflow-hidden bg-gray-100">
                              <Image
                                src={report.originalHeat || "/placeholder.svg"}
                                alt="AI analysis heatmap"
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {report.matchPercentage && (
                      <div className="mt-6 p-4 bg-red-50 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium text-gray-800">AI Match Confidence</h3>
                          <div className="text-xl font-bold text-red-700">{report.matchPercentage}%</div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                          <div
                            className="bg-red-600 h-2.5 rounded-full"
                            style={{ width: `${report.matchPercentage}%` }}
                          ></div>
                        </div>

                        {report.analysis && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">AI Analysis</h4>
                            <p className="text-sm text-gray-800">{report.analysis}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Family interactions and police actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Family Interactions Section */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSection("familyInteractions")}
                >
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2 text-red-500" />
                    Family Interactions
                  </h2>
                  {expandedSections.familyInteractions ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {expandedSections.familyInteractions && (
                  <div className="p-6">
                    {report.familyInteractions ? (
                      <div className="bg-gray-50 rounded-md p-4">
                        <div className="flex items-start mb-3">
                          <div
                            className={`p-2 rounded-full mr-3 ${report.familyInteractions.response === "CONFIRMED" ? "bg-green-100" : "bg-red-100"
                              }`}
                          >
                            {report.familyInteractions.response === "CONFIRMED" ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Family {report.familyInteractions.response === "CONFIRMED" ? "confirmed" : "denied"} this
                              sighting
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDateTime(report.familyInteractions.createdAt)}
                            </p>
                            {report.familyInteractions.notes && (
                              <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                                <p className="text-sm text-gray-700">{report.familyInteractions.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-700">No family interaction recorded yet</p>
                          <p className="text-sm text-gray-600 mt-1">
                            The family has not yet confirmed or denied this sighting report
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <h3 className="font-medium text-gray-800 mb-3">Family Contact Information</h3>
                      <div className="bg-gray-50 rounded-md p-4">
                        {report.missingPerson ? (
                          <div>
                            <p className="font-medium text-gray-800">{report.missingPerson.reporterName}</p>
                            <p className="text-sm text-gray-600">
                              {report.missingPerson.relationship} of missing person
                            </p>
                            <div className="mt-2 text-sm">
                              <div className="flex items-center">
                                <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                {report.missingPerson.mobileNumber}
                              </div>
                              {report.missingPerson.emailAddress && (
                                <div className="flex items-center mt-1">
                                  <Mail className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                  {report.missingPerson.emailAddress}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No family contact information available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Police Actions Section */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSection("policeActions")}
                >
                  <h2 className="font-poppins font-semibold text-lg text-gray-800 flex items-center">
                    <Clipboard className="h-5 w-5 mr-2 text-red-500" />
                    Police Actions
                  </h2>
                  {expandedSections.policeActions ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-3">Current Status:</div>
                    <StatusBadge status={report.status} />
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => updateReportStatus("NOTIFIED_FAMILY")}
                      disabled={isUpdating || report.status === "NOTIFIED_FAMILY" || report.verifiedByFamily}
                      className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "NOTIFIED_FAMILY" || isUpdating || report.verifiedByFamily
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                    >
                      {isUpdating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Verify with family
                      {report.verifiedByFamily && <span className="ml-2 text-xs">(Already verified)</span>}
                    </button>

                    <button
                      onClick={() => updateReportStatus("SENT_TEAM")}
                      disabled={isUpdating || report.status === "SENT_TEAM"}
                      className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "SENT_TEAM" || isUpdating
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                    >
                      {isUpdating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Mark as Investigating
                    </button>

                    <button
                      onClick={() => updateReportStatus("SOLVED")}
                      disabled={isUpdating || report.status === "SOLVED"}
                      className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "SOLVED" || isUpdating
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                    >
                      {isUpdating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Mark as solved
                    </button>

                    <button
                      onClick={() => updateReportStatus("REJECT")}
                      disabled={isUpdating || report.status === "REJECT"}
                      className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "REJECT" || isUpdating
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                    >
                      {isUpdating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject sighting
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Update Section */}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-poppins font-semibold text-xl text-gray-800 mb-6 flex items-center">
              <History className="h-5 w-5 mr-2 text-red-500" />
              Case Timeline
            </h2>

            <div className="max-w-3xl mx-auto">
              {timelineEvents.length > 0 ? (
                <div>
                  {timelineEvents.map((event, index) => (
                    <TimelineItem
                      key={index}
                      date={event.date}
                      title={event.title}
                      description={event.description}
                      icon={event.icon}
                      color={event.color}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-700 mb-1">No timeline events</h3>
                  <p className="text-gray-500 text-sm">There are no recorded events for this case yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-poppins font-semibold text-xl text-gray-800 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-red-500" />
              Location Map
            </h2>

            <div className="h-[600px] w-full rounded-lg overflow-hidden">
              {mapMarkers.length > 0 ? (
                <MapWithNoSSR center={mapMarkers[0].position} zoom={13} markers={mapMarkers} showBothLocations={true} />
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-500">
                  No location data available
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm text-gray-700">Sighting Location</span>
              </div>

              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm text-gray-700">Last Seen Location</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-poppins font-semibold text-xl text-gray-800 mb-6 flex items-center">
              <Clipboard className="h-5 w-5 mr-2 text-red-500" />
              Actions & Recommendations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-4">Update Status</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => updateReportStatus("NOTIFIED_FAMILY")}
                    disabled={isUpdating || report.status === "NOTIFIED_FAMILY" || report.verifiedByFamily}
                    className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "NOTIFIED_FAMILY" || isUpdating || report.verifiedByFamily
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Verify Sighting
                    {report.verifiedByFamily && <span className="ml-2 text-xs">(Already verified)</span>}
                  </button>

                  <button
                    onClick={() => updateReportStatus("SENT_TEAM")}
                    disabled={isUpdating || report.status === "SENT_TEAM"}
                    className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "SENT_TEAM" || isUpdating
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Mark as Investigating
                  </button>

                  <button
                    onClick={() => updateReportStatus("SOLVED")}
                    disabled={isUpdating || report.status === "SOLVED"}
                    className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "SOLVED" || isUpdating
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark as solved
                  </button>

                  <button
                    onClick={() => updateReportStatus("REJECT")}
                    disabled={isUpdating || report.status === "REJECT"}
                    className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${report.status === "REJECT" || isUpdating
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject sighting
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-4">Recommended Actions</h3>
                <div className="bg-blue-50 rounded-md p-4 space-y-4">
                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Contact Family</p>
                      <p className="text-sm text-gray-600">
                        Notify the family about this sighting report and gather additional information.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Dispatch Investigation Team</p>
                      <p className="text-sm text-gray-600">
                        Send officers to the reported location to investigate and gather evidence.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Review Nearby CCTV</p>
                      <p className="text-sm text-gray-600">
                        Check for surveillance cameras in the area that might have captured the missing person.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <BarChart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Analyze AI Match Results</p>
                      <p className="text-sm text-gray-600">
                        Review the AI analysis and determine if further investigation is warranted based on the match
                        percentage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium text-gray-800 mb-4">Contact Information</h3>
                  <div className="bg-gray-50 rounded-md p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Family Contact</h4>
                      {report.missingPerson ? (
                        <div className="mt-2">
                          <p className="text-gray-800">{report.missingPerson.reporterName}</p>
                          <div className="flex items-center mt-1">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                            <span className="text-gray-600">{report.missingPerson.mobileNumber}</span>
                          </div>
                          {report.missingPerson.emailAddress && (
                            <div className="flex items-center mt-1">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                              <span className="text-gray-600">{report.missingPerson.emailAddress}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No family contact information available</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Sighting Reporter</h4>
                      {report.reporter ? (
                        <div className="mt-2">
                          <p className="text-gray-800">{report.reporter.name}</p>
                          {report.reporter.phone && (
                            <div className="flex items-center mt-1">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                              <span className="text-gray-600">{report.reporter.phone}</span>
                            </div>
                          )}
                          {report.reporter.email && (
                            <div className="flex items-center mt-1">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                              <span className="text-gray-600">{report.reporter.email}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No reporter contact information available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

