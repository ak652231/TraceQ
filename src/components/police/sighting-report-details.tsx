"use client"
import Image from "next/image"
import { Calendar, MapPin, User, Phone, FileText, Eye } from "lucide-react"
import { formatDate } from "app/utils/formatters"
import StatusBadge from "@/components/police/status-badge"
import type { SightingReport } from "../../../types"

interface SightingReportDetailsProps {
  selectedReport: SightingReport | null
  onViewFullReport: (reportId: string) => void
}

export default function SightingReportDetails({ selectedReport, onViewFullReport }: SightingReportDetailsProps) {
  if (!selectedReport) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-medium text-gray-700 mb-1">Select a report to view details</h3>
        <p className="text-gray-500 text-sm">Click on any report from the list to view detailed information</p>
      </div>
    )
  }

  return (
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
            <p className="text-sm text-gray-500 mt-1">Reported on: {formatDate(selectedReport.createdAt)}</p>
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
                <div className="h-full w-full flex items-center justify-center text-gray-500">No photo available</div>
              )}
            </div>
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
                <div className="h-full w-full flex items-center justify-center text-gray-500">No photo available</div>
              )}
            </div>
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

      {/* Actions section */}
      <div className="p-6">
        <div className="mt-6">
          <button
            onClick={() => onViewFullReport(selectedReport.id)}
            className="w-full py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Full Report
          </button>
        </div>
      </div>
    </div>
  )
}

