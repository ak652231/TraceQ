"use client"
import { useEffect } from "react"
import { Montserrat, Poppins } from "next/font/google"
import { MapPin, Calendar, Eye, AlertCircle, Search, FileText, User, Clock, List, Filter, Info } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "../../../../store/hooks"
import { checkUserLogin } from "../../../../store/slices/authSlice"
import {
  fetchAssignedReports,
  setSearchQuery,
  setStatusFilter,
  setSelectedReport,
  setShowModal,
  markReportAsSeen,
  clearFilters,
} from "../../../../store/slices/policeDashboardSlice"
import { setMousePosition, setLoading, setError } from "../../../../store/slices/uiSlice"
import { initializeSocket, disconnectSocket } from "../../utils/socket"
import { formatDate } from "../../utils/formatters"
import { getStatusColor } from "../../utils/formatters"
import ReportModal from "../../../components/police/report-modal"

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

export default function PoliceDashboard() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const { userId, isAuthenticated } = useAppSelector((state) => state.auth)
  const { isLoading, error, mousePosition } = useAppSelector((state) => state.ui)
  const { assignedReports, searchQuery, statusFilter, showModal } = useAppSelector((state) => state.policeDashboard)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      dispatch(setMousePosition({ x: e.clientX, y: e.clientY }))
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [dispatch])

  useEffect(() => {
    const initializeData = async () => {
      dispatch(setLoading(true))

      try {
        const resultAction = await dispatch(checkUserLogin())
        if (checkUserLogin.rejected.match(resultAction)) {
          router.push("/auth")
          return
        }

        const currentUserId = resultAction.payload as string

        initializeSocket(currentUserId, dispatch, null, "policeDashboard")

        await dispatch(fetchAssignedReports())
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
  }, [dispatch, router])

  const handleViewFullReport = (reportId: string) => {
    const report = assignedReports.find((r) => r.id === reportId)
    if (report) {
      dispatch(setSelectedReport(report))
      dispatch(setShowModal(true))

      if (!report.isSeen) {
        dispatch(markReportAsSeen(reportId))
      }
    }
  }

  const handleViewSightings = (reportId: string) => {
    router.push(`/police/sightings/${reportId}`)
  }

  const filteredReports = assignedReports.filter((report) => {
    const matchesSearch =
      report.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || report.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

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
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => dispatch(setStatusFilter(e.target.value))}
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
                        onClick={() => handleViewFullReport(report.id)}
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
              onClick={() => dispatch(clearFilters())}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal onViewSightings={handleViewSightings} />
    </div>
  )
}

