"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Montserrat, Poppins } from "next/font/google"
import {
  MapPin,
  Calendar,
  User,
  Search,
  Filter,
  MapIcon,
  List,
  ChevronDown,
  Eye,
  Phone,
  AlertCircle,
  ArrowRight,
  X,
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"

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
const ZoomControl = dynamic(() => import("react-leaflet").then((mod) => mod.ZoomControl), { ssr: false })
const useMap = dynamic(() => import("react-leaflet").then((mod) => mod.useMap), { ssr: false })

const API_BASE_URL = "/api/missing-persons"

type MissingPerson = {
  id: string
  fullName: string
  age: number
  gender: string
  photo: string

  behavioralTraits?: string
  healthConditions?: string

  lastSeenLocation: string
  lastSeenDate: string
  lastSeenTime: string
  lat: number
  lng: number

  height: number
  heightUnit: string
  weight: number
  weightUnit: string
  hairColor: string
  eyeColor: string
  clothingWorn: string
  identifyingMarks?: string
  additionalPhotos: string[]

  reporterName: string
  relationship: string
  mobileNumber: string
  emailAddress?: string

  aadhaarImage: string
  createdAt: string
  distance?: number 
}

const MapControls = ({ userLocation }: { userLocation: { lat: number; lng: number } | null }) => {
  const map = useMap()

  const handleZoomIn = () => {
    map.zoomIn()
  }

  const handleZoomOut = () => {
    map.zoomOut()
  }

  const handleCenterOnUser = () => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 13, {
        animate: true,
        duration: 1.5,
      })
    }
  }

  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Zoom in"
      >
        <ZoomIn className="h-5 w-5 text-gray-700" />
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Zoom out"
      >
        <ZoomOut className="h-5 w-5 text-gray-700" />
      </button>
      {userLocation && (
        <button
          onClick={handleCenterOnUser}
          className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Center on your location"
        >
          <Crosshair className="h-5 w-5 text-red-600" />
        </button>
      )}
    </div>
  )
}

const PulsingMarker = ({ person, onClick }: { person: MissingPerson; onClick: () => void }) => {
  return (
    <Marker
      position={[person.lat, person.lng]}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="flex flex-col items-center p-1">
          <div className="relative w-16 h-16 mb-2 rounded-full overflow-hidden border-2 border-red-500">
            <Image src={person.photo || "/placeholder.svg"} alt={person.fullName} fill className="object-cover" />
          </div>
          <h3 className="font-poppins font-semibold text-sm">{person.fullName}</h3>
          <p className="text-xs text-gray-600">
            {person.age} years, {person.gender}
          </p>
          <button
            onClick={onClick}
            className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded-sm hover:bg-red-700 transition-colors"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

const LayerControl = ({
  activeMapLayer,
  setActiveMapLayer,
}: {
  activeMapLayer: string
  setActiveMapLayer: (layer: string) => void
}) => {
  const map = useMap()
  const [activeLayer, setActiveLayer] = useState<string>(activeMapLayer)

  const layers = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
  }

  const handleLayerChange = (layer: string) => {
    setActiveLayer(layer)
    setActiveMapLayer(layer) 
  }

  return (
    <div className="absolute left-4 bottom-4 z-[1000]">
      <div className="bg-white rounded-md shadow-md p-2">
        <div className="flex items-center mb-2">
          <Layers className="h-4 w-4 text-gray-700 mr-1" />
          <span className="text-xs font-medium">Map Style</span>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => handleLayerChange("street")}
            className={`text-xs py-1 px-2 rounded-sm w-full text-left ${activeLayer === "street" ? "bg-red-100 text-red-700" : "hover:bg-gray-100"}`}
          >
            Street
          </button>
          <button
            onClick={() => handleLayerChange("satellite")}
            className={`text-xs py-1 px-2 rounded-sm w-full text-left ${activeLayer === "satellite" ? "bg-red-100 text-red-700" : "hover:bg-gray-100"}`}
          >
            Satellite
          </button>
          <button
            onClick={() => handleLayerChange("dark")}
            className={`text-xs py-1 px-2 rounded-sm w-full text-left ${activeLayer === "dark" ? "bg-red-100 text-red-700" : "hover:bg-gray-100"}`}
          >
            Dark
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MissingPersonsList() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "pending">("pending")
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    ageRange: [0, 100],
    gender: "all",
    dateRange: "all",
  })
  const [showFilters, setShowFilters] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [nearbyPersons, setNearbyPersons] = useState<MissingPerson[]>([])
  const [otherPersons, setOtherPersons] = useState<MissingPerson[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]) 
  const [mapZoom, setMapZoom] = useState(5)
  const [activeMapLayer, setActiveMapLayer] = useState("street")
  const mapRef = useRef(null)

  useEffect(() => {
    const requestLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              setUserLocation(location)
              setLocationPermission("granted")
              setMapCenter([location.lat, location.lng])
              setMapZoom(11)
              fetchNearbyPersons(location)
            },
            () => {
              setLocationPermission("denied")
              fetchOtherPersons()
            },
          )
        } else {
          setLocationPermission("denied")
          fetchOtherPersons()
        }
      } catch (error) {
        console.error("Error getting location:", error)
        setLocationPermission("denied")
        fetchOtherPersons()
      }
    }

    requestLocation()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      fetchNearbyPersons(userLocation)
    }
  }, [searchQuery, filters])

  useEffect(() => {
    if (userLocation && nearbyPersons) {
      fetchOtherPersons()
    }
  }, [nearbyPersons, userLocation])

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

  const fetchNearbyPersons = async (location: { lat: number; lng: number }) => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: "10",
        ...constructFilterParams(),
      })
      const response = await fetch(`${API_BASE_URL}/nearby?${queryParams}`)
      if (!response.ok) throw new Error("Failed to fetch nearby missing persons")
      const data = await response.json()
      setNearbyPersons(data)
    } catch (error) {
      console.error("Error fetching nearby missing persons:", error)
      setNearbyPersons([])
    }
  }

  const fetchOtherPersons = async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams(constructFilterParams())
      if (userLocation) {
        queryParams.append("excludeNearby", "true")
        queryParams.append("lat", userLocation.lat.toString())
        queryParams.append("lng", userLocation.lng.toString())
      }
      const response = await fetch(`${API_BASE_URL}?${queryParams}`)
      if (!response.ok) throw new Error("Failed to fetch missing persons")
      const data = await response.json()
      const filteredData = data.filter(
        (person: MissingPerson) => !nearbyPersons.some((nearby) => nearby.id === person.id),
      )
      setOtherPersons(filteredData)
    } catch (error) {
      console.error("Error fetching other missing persons:", error)
      setOtherPersons([])
    } finally {
      setIsLoading(false)
    }
  }

  const constructFilterParams = () => {
    const params: Record<string, string> = {}
    if (searchQuery) params.search = searchQuery
    if (filters.gender !== "all") params.gender = filters.gender
    params.minAge = filters.ageRange[0].toString()
    params.maxAge = filters.ageRange[1].toString()
    if (filters.dateRange !== "all") params.dateRange = filters.dateRange

    console.log("Constructed Params:", params)
    return params
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, [filterType]: value }
      console.log("Updated Filters:", updatedFilters)
      return updatedFilters
    })
  }

  const formatDate = (dateString: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-IN", options)
  }

  const renderPersonCard = (person: MissingPerson) => (
    <motion.div
      key={person.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      <div className="md:flex">
        <div className="md:w-1/3 relative h-48 md:h-auto">
          <Image src={person.photo || "/placeholder.svg"} alt={person.fullName} fill className="object-cover" />
          {person.distance !== undefined && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {person.distance} km away
            </div>
          )}
        </div>
        <div className="p-4 md:w-2/3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-poppins font-semibold text-xl text-gray-800">{person.fullName}</h3>
              <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                {person.gender}, {person.age} yrs
              </span>
            </div>

            <div className="mt-2 flex items-start">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
              <p className="text-gray-600 text-sm">{person.lastSeenLocation}</p>
            </div>

            <div className="mt-1 flex items-start">
              <Calendar className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
              <p className="text-gray-600 text-sm">
                Last seen on {formatDate(person.lastSeenDate)} at {person.lastSeenTime}
              </p>
            </div>

            <p className="mt-2 text-gray-600 text-sm line-clamp-2">
              {person.clothingWorn}
              {person.identifyingMarks && ` • ${person.identifyingMarks}`}
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectedPerson(person)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors duration-200 flex items-center"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )

  const renderDetailModal = () => {
    if (!selectedPerson) return null

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPerson(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={() => setSelectedPerson(null)}
                className="absolute top-4 right-4 bg-white rounded-full p-1 shadow-md z-10"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>

              <div className="h-64 sm:h-80 relative">
                <Image
                  src={selectedPerson.photo || "/placeholder.svg"}
                  alt={selectedPerson.fullName}
                  fill
                  className="object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                  <h2 className="font-poppins font-bold text-2xl text-white">{selectedPerson.fullName}</h2>
                  <div className="flex items-center mt-1">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded mr-2">
                      {selectedPerson.gender}
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded">
                      {selectedPerson.age} years old
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">Missing Details</h3>

                    <div className="space-y-3">
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Last Seen Location</p>
                          <p className="text-gray-600">{selectedPerson.lastSeenLocation}</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Last Seen Date & Time</p>
                          <p className="text-gray-600">
                            {formatDate(selectedPerson.lastSeenDate)} at {selectedPerson.lastSeenTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Description</p>
                          <p className="text-gray-600">
                            {selectedPerson.height} {selectedPerson.heightUnit} tall, {selectedPerson.weight}{" "}
                            {selectedPerson.weightUnit}, {selectedPerson.hairColor} hair, {selectedPerson.eyeColor}{" "}
                            eyes.
                            {selectedPerson.identifyingMarks && ` ${selectedPerson.identifyingMarks}.`}
                          </p>
                          <p className="text-gray-600 mt-1">Last seen wearing {selectedPerson.clothingWorn}.</p>
                        </div>
                      </div>

                      {(selectedPerson.behavioralTraits || selectedPerson.healthConditions) && (
                        <div className="flex items-start">
                          <User className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Additional Information</p>
                            {selectedPerson.behavioralTraits && (
                              <p className="text-gray-600">Behavioral traits: {selectedPerson.behavioralTraits}</p>
                            )}
                            {selectedPerson.healthConditions && (
                              <p className="text-gray-600">Health conditions: {selectedPerson.healthConditions}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {selectedPerson.additionalPhotos && selectedPerson.additionalPhotos.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">Additional Photos</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedPerson.additionalPhotos.map((photo, index) => (
                            <div key={index} className="relative h-32 rounded-md overflow-hidden">
                              <Image
                                src={photo || "/placeholder.svg"}
                                alt={`Additional photo of ${selectedPerson.fullName}`}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-red-50 rounded-lg border border-red-100 p-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Have you seen this person?</p>
                          <p className="text-gray-600 text-sm mt-1">
                            If you have any information about {selectedPerson.fullName}'s whereabouts, please contact
                            the police immediately.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Case ID:</span> {selectedPerson.id}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Reported:</span>{" "}
                        {new Date(selectedPerson.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/report-missing/${selectedPerson.id}`}>
  <button className="bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center">
    <Phone className="h-4 w-4 mr-2" />
    Report to police
  </button>
</Link>

                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Report Sighting
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  const renderLocationPermissionBanner = () => {
    if (locationPermission === "granted") return null

    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              {locationPermission === "pending"
                ? "Please allow location access to see missing persons near you."
                : "Location access denied. You won't be able to see missing persons near your location."}
            </p>
            {locationPermission === "denied" && (
              <button
                className="mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-600"
                onClick={() => {
                  // Attempt to request location again
                  setLocationPermission("pending")
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      }
                      setUserLocation(location)
                      setLocationPermission("granted")
                      setMapCenter([location.lat, location.lng])
                      setMapZoom(11)
                      fetchNearbyPersons(location)
                    },
                    () => {
                      setLocationPermission("denied")
                      fetchOtherPersons()
                    },
                  )
                }}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderMapView = () => {
    const L = typeof window !== "undefined" ? require("leaflet") : null
    const allPersons = [...nearbyPersons, ...otherPersons]

    const createUserLocationMarker = () => {
      if (!userLocation) return null

      return (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={L.divIcon({
            className: "custom-user-marker",
            html: '<div class="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-md"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
        >
          <Popup>
            <div className="text-center">
              <p className="font-medium text-sm">Your Location</p>
            </div>
          </Popup>
        </Marker>
      )
    }

    const getMapTileUrl = () => {
      switch (activeMapLayer) {
        case "satellite":
          return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        case "dark":
          return "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        default:
          return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      }
    }

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden h-[600px] relative">
        {typeof window !== "undefined" && (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={getMapTileUrl()}
              key={activeMapLayer} 
            />

            {/* User location marker */}
            {createUserLocationMarker()}

            {/* Missing persons markers */}
            {allPersons.map((person) => (
              <PulsingMarker key={person.id} person={person} onClick={() => setSelectedPerson(person)} />
            ))}

            {/* Custom controls */}
            <MapControls userLocation={userLocation} />
            <LayerControl activeMapLayer={activeMapLayer} setActiveMapLayer={setActiveMapLayer} />
          </MapContainer>
        )}

        {/* Map overlay with stats */}
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-md shadow-md">
          <h3 className="font-poppins font-semibold text-sm text-gray-800 mb-1">Missing Persons</h3>
          <div className="flex gap-3 text-xs">
            <div>
              <span className="font-medium text-red-600">{nearbyPersons.length}</span> nearby
            </div>
            <div>
              <span className="font-medium text-gray-700">{otherPersons.length}</span> total
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-[1001]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-3"></div>
              <p className="text-gray-700 font-medium">Loading map data...</p>
            </div>
          </div>
        )}
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
        <div
          className="absolute rounded-full bg-red-200 w-[200px] h-[200px] bottom-[10%] left-[10%] opacity-40"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
          }}
        ></div>
      </div>

      {/* Main container */}
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">Missing Persons</h1>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            Browse through profiles of missing persons. Your attention could help reunite someone with their loved ones.
          </p>
        </div>

        {renderLocationPermissionBanner()}

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
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>

              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`py-2 px-3 flex items-center ${viewMode === "list" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`py-2 px-3 flex items-center ${viewMode === "map" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block font-poppins text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={filters.gender}
                      onChange={(e) => handleFilterChange("gender", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    >
                      <option value="all">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-poppins text-sm font-medium text-gray-700 mb-1">Age Range</label>
                    <select
                      value={
                        filters.ageRange[0] === 0 && filters.ageRange[1] === 100
                          ? "all"
                          : filters.ageRange[0] === 0 && filters.ageRange[1] === 12
                            ? "children"
                            : filters.ageRange[0] === 13 && filters.ageRange[1] === 18
                              ? "teenagers"
                              : filters.ageRange[0] === 19 && filters.ageRange[1] === 100
                                ? "adults"
                                : "custom"
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        let newRange = [0, 100]

                        if (value === "children") newRange = [0, 12]
                        else if (value === "teenagers") newRange = [13, 18]
                        else if (value === "adults") newRange = [19, 100]

                        handleFilterChange("ageRange", newRange)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    >
                      <option value="all">All Ages</option>
                      <option value="children">Children (0-12)</option>
                      <option value="teenagers">Teenagers (13-18)</option>
                      <option value="adults">Adults (19+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-poppins text-sm font-medium text-gray-700 mb-1">Last Seen Date</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    >
                      <option value="all">Any Time</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="year">Last Year</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main content */}
        {viewMode === "list" ? (
          <div className="space-y-8">
            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading missing persons data...</p>
              </div>
            )}

            {/* Nearby Missing Persons */}
            {!isLoading && nearbyPersons.length > 0 && (
              <div>
                <h2 className="font-poppins font-semibold text-2xl text-gray-800 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 text-red-500 mr-2" />
                  Missing Persons Near You
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nearbyPersons.map((person) => renderPersonCard(person))}
                </div>
                {nearbyPersons.length > 0 && otherPersons.length > 0 && (
                  <div className="my-8 border-b border-gray-200"></div>
                )}
              </div>
            )}

            {/* All Missing Persons */}
            {!isLoading && otherPersons.length > 0 && (
              <div>
                <h2 className="font-poppins font-semibold text-2xl text-gray-800 mb-4">
                  {nearbyPersons.length > 0 ? "Other Missing Persons" : "All Missing Persons"}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {otherPersons.map((person) => renderPersonCard(person))}
                </div>
              </div>
            )}

            {/* No results */}
            {!isLoading && nearbyPersons.length === 0 && otherPersons.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-poppins font-semibold text-xl text-gray-700 mb-2">No Missing Persons Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No missing persons match your current search criteria. Try adjusting your filters or search query.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setFilters({
                      ageRange: [0, 100],
                      gender: "all",
                      dateRange: "all",
                    })
                  }}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          renderMapView()
        )}

        {/* Report a missing person CTA */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex items-center">
            <div className="p-6 md:p-8 md:w-2/3">
              <h2 className="font-poppins font-bold text-2xl text-white mb-2">
                Do you need to report a missing person?
              </h2>
              <p className="text-red-100 mb-6">
                Every minute counts when someone goes missing. File a detailed report to help us find your loved one.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center bg-white text-red-600 hover:bg-red-50 font-poppins font-medium py-2 px-6 rounded-md transition-colors duration-200"
              >
                Report Missing Person
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="hidden md:block md:w-1/3 h-full">
              <div className="h-full w-full relative">
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-red-700/80"></div>
                <Image
                  src="/placeholder.svg?height=300&width=300"
                  alt="Report Missing Person"
                  width={300}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {renderDetailModal()}
    </div>
  )
}

