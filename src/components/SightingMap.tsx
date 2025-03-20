"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

const ChangeMapView = dynamic(
  () => import("react-leaflet").then((mod) => {
    const { useMap } = mod
    return function ChangeView({ center, zoom }) {
      const map = useMap()
      useEffect(() => {
        if (center && map) {
          map.flyTo(center, zoom, { duration: 1.5 })
        }
      }, [center, zoom, map])
      return null
    }
  }),
  { ssr: false }
)

export default function SightingMap({ center, zoom, markers, onMarkerClick }) {
  const [isMounted, setIsMounted] = useState(false)
  const mapRef = useRef(null)
  
  // Default center if none provided
  const defaultCenter = useMemo(() => [20.5937, 78.9629], []) // Center of India
  const mapCenter = useMemo(() => center || defaultCenter, [center, defaultCenter])
  const mapZoom = useMemo(() => zoom || 5, [zoom])
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getMarkerIcon = (status, isSelected) => {
    return new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: isSelected ? [30, 45] : [25, 41],
      iconAnchor: isSelected ? [15, 45] : [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }
  
  if (!isMounted) return <div>Loading map...</div>
  
  if (!mapCenter || mapCenter.length !== 2) return <div>Loading map...</div>
  
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers?.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={getMarkerIcon(marker.status, marker.isSelected)}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) onMarkerClick(marker.id)
            },
          }}
        >
          <Popup>
            <div className="text-center">
              <p className="font-medium">{marker.title}</p>
              <p className="text-sm text-gray-600">Status: {marker.status}</p>
              <button
                className="mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                onClick={() => {
                  if (onMarkerClick) onMarkerClick(marker.id)
                }}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
      <ChangeMapView center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  )
}