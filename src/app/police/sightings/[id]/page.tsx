"use client"
import { useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import {
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  RefreshCw,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks"
import { checkUserLogin } from "../../../../../store/slices/authSlice"
import {
  fetchSightingReports,
  markNotificationsAsRead,
  setSearchTerm,
  setStatusFilter,
  setDateFilter,
  toggleFilters,
  resetFilters,
  setSelectedReport,
} from "../../../../../store/slices/policeSightingsSlice"
import { setReport } from "../../../../../store/slices/sightingReportDetailSlice"
import { setMousePosition, setLoading, setError } from "../../../../../store/slices/uiSlice"
import { initializeSocket, disconnectSocket } from "../../../utils/socket"
import { formatDate } from "../../../utils/formatters"
import StatusBadge from "@/components/police/status-badge"
import SightingReportDetails from "@/components/police/sighting-report-details"

// Dynamically import the map component to reduce initial load time
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

export default function PoliceSightingsPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params as { id: string }
  const dispatch = useAppDispatch()
  const reportDetailRef = useRef<HTMLDivElement>(null)

  // Redux state
  const { userId, isAuthenticated } = useAppSelector((state) => state.auth)
  const { isLoading, error, mousePosition } = useAppSelector((state) => state.ui)
  const {
    sightingReports,
    filteredReports,
    selectedReport,
    searchTerm,
    statusFilter,
    dateFilter,
    showFilters,
    mapCenter,
    mapZoom,
  } = useAppSelector((state) => state.policeSightings)

  // Handle mouse movement for background animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      dispatch(setMousePosition({ x: e.clientX, y: e.clientY }))
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [dispatch])

  // Initialize data and socket connection
  useEffect(() => {
    const initializeData = async () => {
      dispatch(setLoading(true))

      try {
        // Check user authentication
        const resultAction = await dispatch(checkUserLogin())
        if (checkUserLogin.rejected.match(resultAction)) {
          router.push("/auth")
          return
        }

        const currentUserId = resultAction.payload as string

        // Initialize socket connection
        initializeSocket(currentUserId, dispatch, null, "policeSightings")

        // Fetch sighting reports
        await dispatch(fetchSightingReports({ userId: currentUserId, missingPersonId: id }))
      } catch (err) {
        dispatch(setError("An unexpected error occurred. Please try again."))
      } finally {
        dispatch(setLoading(false))
      }
    }

    initializeData()

    return () => {
      disconnectSocket()
    }
  }, [dispatch, router, id])

  const handleReportSelect = async (reportId: string) => {
    const report = sightingReports.find((r) => r.id === reportId)
    if (report) {
      dispatch(setSelectedReport(report))

      if (report.notificationCount && report.notificationCount > 0) {
        await dispatch(markNotificationsAsRead(report.id))
      }

      if (window.innerWidth < 768 && reportDetailRef.current) {
        reportDetailRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const handleViewFullReport = (reportId: string) => {
    const report = sightingReports.find((r) => r.id === reportId)
    if (report) {
      dispatch(setReport(report))

      setTimeout(() => {
        router.push(`/police/report/${reportId}`)
      }, 100)
    }
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
      <div className="max-w-7xl mx-auto relative z-10 relative pt-20">
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
                  onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Filters</h3>
                <button
                  onClick={() => dispatch(toggleFilters())}
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
                      onChange={(e) => dispatch(setStatusFilter(e.target.value))}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="All">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="NOTIFIED_FAMILY">Family Notified</option>
                      <option value="SENT_TEAM">Team Dispatched</option>
                      <option value="SOLVED">Solved</option>
                      <option value="REJECT">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => dispatch(setDateFilter(e.target.value))}
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
                      onClick={() => dispatch(resetFilters())}
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
                      onClick={() => handleReportSelect(report.id)}
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
                    onMarkerClick={(reportId) => handleReportSelect(reportId)}
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
              <SightingReportDetails selectedReport={selectedReport} onViewFullReport={handleViewFullReport} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

