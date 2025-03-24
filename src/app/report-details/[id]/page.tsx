"use client"

import { useEffect, useCallback, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Eye,
  AlertCircle,
  CheckCircle,
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
import StatusIcon from "../../../components/status-icon"
import { useAppDispatch, useAppSelector } from "../../../../store/hooks"
import { checkUserLogin } from "../../../../store/slices/authSlice"
import { fetchMissingPersonDetails } from "../../../../store/slices/missingPersonSlice"
import { fetchSightingReports, setSelectedSighting, markNotificationsAsRead, handleSightingAction } from "../../../../store/slices/sightingReportsSlice"
import { fetchNotifications } from "../../../../store/slices/notificationsSlice"
import { setLoading, setError } from "../../../../store/slices/uiSlice"
import { formatDate, formatTime, getStatusColor, getStatusText, isAwaitingVerification } from "../../utils/formatters"
import { initializeSocket, disconnectSocket } from "../../utils/socket"
import type { SightingReport } from "../../../../types"

export default function ReportDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params as { id: string }
  const dispatch = useAppDispatch()

  const [mousePosition, setMousePositionLocal] = useState({ x: 0, y: 0 })

  const { userId } = useAppSelector((state) => state.auth)
  const missingPerson = useAppSelector((state) => state.missingPerson.data)
  const sightingReports = useAppSelector((state) => state.sightingReports.reports)
  const selectedSighting = useAppSelector((state) => state.sightingReports.selectedSighting)
  const { isLoading, error } = useAppSelector((state) => state.ui)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now()
    if (!handleMouseMove.lastUpdate || now - handleMouseMove.lastUpdate > 100) {
      setMousePositionLocal({ x: e.clientX, y: e.clientY })
      handleMouseMove.lastUpdate = now
    }
  }, [])
  handleMouseMove.lastUpdate = 0

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [handleMouseMove])

  useEffect(() => {
    let isMounted = true
    const initializeData = async () => {
      if (!isMounted) return
      dispatch(setLoading(true))

      try {
        const loginAction = dispatch(checkUserLogin())
        
        const resultAction = await loginAction
        if (checkUserLogin.rejected.match(resultAction)) {
          router.push("/auth")
          return
        }

        const currentUserId = resultAction.payload as string
        
        initializeSocket(currentUserId, dispatch, selectedSighting?.id || null)
        
        const [missingPersonAction, reportsAction] = await Promise.all([
          dispatch(fetchMissingPersonDetails({ id, userId: currentUserId })),
          dispatch(fetchSightingReports(id))
        ])

        if (fetchMissingPersonDetails.rejected.match(missingPersonAction)) {
          router.push("/my-reports")
          return
        }

        if (isMounted) {
          await dispatch(fetchNotifications({ missingPersonId: id }))
        }
      } catch (err) {
        if (isMounted) {
          dispatch(setError("An unexpected error occurred. Please try again."))
        }
      } finally {
        if (isMounted) {
          dispatch(setLoading(false))
        }
      }
    }

    initializeData()

    return () => {
      isMounted = false
      disconnectSocket()
    }
  }, [id, router, dispatch])

  const handleSightingSelect = useCallback(async (sighting: SightingReport) => {
    dispatch(setSelectedSighting(sighting))

    if (sighting.notificationCount && sighting.notificationCount > 0) {
      await dispatch(markNotificationsAsRead(sighting.id))
    }

    dispatch(fetchNotifications({ sightingReportId: sighting.id }))
  }, [dispatch])

  const handleSightAction = useCallback(async (action: "verify" | "decline") => {
    if (!selectedSighting) return

    await dispatch(
      handleSightingAction({
        sightingId: selectedSighting.id,
        action,
      })
    )
  }, [dispatch, selectedSighting])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8">
        <Navbar />
        <div className="max-w-6xl mx-auto relative z-10 pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8">
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 relative overflow-hidden">
      <Navbar />

      {/* Simplified background elements with reduced opacity and transforms */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full bg-red-100 w-[500px] h-[500px] -top-[250px] -left-[250px] opacity-30"
          style={{
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
          }}
        ></div>
        <div
          className="absolute rounded-full bg-red-100 w-[300px] h-[300px] top-[70%] -right-[150px] opacity-30"
          style={{
            transform: `translate(${-mousePosition.x * 0.005}px, ${-mousePosition.y * 0.005}px)`,
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
                          <StatusIcon status={sighting.status} />
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
                          sizes="(max-width: 768px) 100vw, 300px"
                          className="object-cover"
                          priority={false}
                          loading="lazy"
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
                              <StatusIcon status={selectedSighting.status} />
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
                  {isAwaitingVerification(selectedSighting.status) && selectedSighting.verifiedByFamily === null && (
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => handleSightAction("verify")}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Verify - This is them
                      </button>

                      <button
                        onClick={() => handleSightAction("decline")}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Decline - Not a match
                      </button>
                    </div>
                  )}

                  {/* Show verification status if already verified */}
                  {selectedSighting.verifiedByFamily !== null && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                      <p className="text-gray-700 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                        This report has been {selectedSighting.verifiedByFamily === true ? "verified" : "rejected"} by
                        you
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