"use client"
import { useEffect, useState } from "react"
import { AlertCircle, ZoomIn, ZoomOut } from "lucide-react"
import dynamic from "next/dynamic"
import type { MissingPerson } from "../../../types"

// Dynamically import Leaflet components with no SSR
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

interface LocationMapProps {
  report: MissingPerson
  userLocation: { lat: number; lng: number } | null
}

export default function LocationMap({ report, userLocation }: LocationMapProps) {
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS
    import("leaflet/dist/leaflet.css")

    // Configure Leaflet icons
    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })
      setIsMapReady(true)
    })
  }, [])

  if (!isMapReady) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden relative">
      <MapContainer
        center={[report.lat || 20.5937, report.lng || 78.9629]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Missing person marker (red) */}
        {report.lat && report.lng && (
          <Marker
            position={[report.lat, report.lng]}
            icon={
              new window.L.Icon({
                iconUrl:
                  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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
                <p className="text-xs text-gray-600">{report.lastSeenLocation}</p>
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
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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

      {!report.lat || !report.lng ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center p-4">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">No location coordinates available for this report</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

