"use client"
import { useEffect } from "react"
import Image from "next/image"
import { X, FileText, MapIcon, ArrowLeft, ArrowRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../../store/hooks"
import {
  setShowModal,
  setModalViewMode,
  nextPhoto,
  prevPhoto,
  getUserLocation,
} from "../../../store/slices/policeDashboardSlice"
import { formatDate } from "app/utils/formatters"
import { getStatusColor } from "app/utils/formatters"
import dynamic from "next/dynamic"

// Lazy load the map component
const LocationMap = dynamic(() => import("./location-map"), {
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  ),
  ssr: false,
})

interface ReportModalProps {
  onViewSightings: (reportId: string) => void
}

export default function ReportModal({ onViewSightings }: ReportModalProps) {
  const dispatch = useAppDispatch()
  const { selectedReport, showModal, modalViewMode, currentPhotoIndex, userLocation } = useAppSelector(
    (state) => state.policeDashboard,
  )

  useEffect(() => {
    if (showModal && selectedReport && modalViewMode === "map") {
      dispatch(getUserLocation())
    }
  }, [showModal, selectedReport, modalViewMode, dispatch])

  if (!showModal || !selectedReport) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex justify-between items-center z-10">
          <h2 className="font-poppins font-semibold text-xl text-gray-800">{selectedReport.fullName} - Full Report</h2>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => dispatch(setModalViewMode("details"))}
                className={`py-1.5 px-3 flex items-center text-sm ${
                  modalViewMode === "details" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText className="h-4 w-4 mr-1" />
                Details
              </button>
              <button
                onClick={() => dispatch(setModalViewMode("map"))}
                className={`py-1.5 px-3 flex items-center text-sm ${
                  modalViewMode === "map" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <MapIcon className="h-4 w-4 mr-1" />
                Map
              </button>
            </div>
            <button onClick={() => dispatch(setShowModal(false))} className="p-1 rounded-full hover:bg-gray-100">
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
                  {(selectedReport.additionalPhotos?.length > 0 || currentPhotoIndex > 0) && (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => dispatch(prevPhoto())}
                        disabled={currentPhotoIndex === 0}
                        className={`p-1 rounded-full ${
                          currentPhotoIndex === 0 ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>

                      <span className="text-sm text-gray-500">
                        {currentPhotoIndex + 1} of {(selectedReport.additionalPhotos?.length || 0) + 1}
                      </span>

                      <button
                        onClick={() => dispatch(nextPhoto())}
                        disabled={currentPhotoIndex >= (selectedReport.additionalPhotos?.length || 0)}
                        className={`p-1 rounded-full ${
                          currentPhotoIndex >= (selectedReport.additionalPhotos?.length || 0)
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
              {selectedReport.height && selectedReport.weight && (
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
              )}

              {/* Additional details */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3">Additional Details</h3>
                <div className="space-y-4">
                  {selectedReport.clothingWorn && (
                    <div className="bg-gray-50 rounded-md p-4">
                      <p className="text-sm text-gray-500 mb-1">Clothing When Last Seen</p>
                      <p>{selectedReport.clothingWorn}</p>
                    </div>
                  )}

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
            <LocationMap report={selectedReport} userLocation={userLocation} />
          )}

          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => dispatch(setShowModal(false))}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => onViewSightings(selectedReport.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              View Sightings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

