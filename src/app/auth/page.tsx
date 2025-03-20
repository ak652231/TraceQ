"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ChevronLeft,
  Calendar,
  Shield,
  MapPin,
  FileText,
  Check,
  ChevronRight,
  Info,
} from "lucide-react"

import CloudinaryUpload from "@/components/CloudinaryUpload"

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

type UserType = "regular" | "police"
type PoliceSignupStep = 1 | 2 | 3 | 4

interface LocationSuggestion {
  id: string
  name: string
  shortName?: string
  lat: number
  lng: number
  district?: string
  state?: string
}

interface FormData {
  name: string
  email: string
  phone: string
  role: UserType
  dateOfBirth: string
  badgeId: string
  designation: string
  policeStation: string
  department: string
  lat: number
  lng: number
  address: string
  district: string
  state: string
  idCardFront: string | File | null
  idCardBack: string | File | null
  verified: boolean
}

interface FormErrors {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  badgeId: string
  designation: string
  policeStation: string
  department: string
  district: string
  state: string
  idCardFront: string
  idCardBack: string
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [userType, setUserType] = useState<UserType>("regular")
  const [policeSignupStep, setPoliceSignupStep] = useState<PoliceSignupStep>(1)
  const [emailLogin, setEmailLogin] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    role: "regular",
    dateOfBirth: "",
    badgeId: "",
    designation: "",
    policeStation: "",
    department: "",
    lat: 0,
    lng: 0,
    address: "",
    district: "",
    state: "",
    idCardFront: null,
    idCardBack: null,
    verified: false,
  })

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<LocationSuggestion[]>([])
  const suggestionRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [errors, setErrors] = useState<FormErrors>({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    badgeId: "",
    designation: "",
    policeStation: "",
    department: "",
    district: "",
    state: "",
    idCardFront: "",
    idCardBack: "",
  })

  useEffect(() => {
    const savedSearches = localStorage.getItem("recentLocationSearches")
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches))
      } catch (e) {
        console.error("Error parsing saved searches", e)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const saveToRecentSearches = (location: LocationSuggestion) => {
    const updatedSearches = [location, ...recentSearches.filter((item) => item.id !== location.id)].slice(0, 5)
    setRecentSearches(updatedSearches)
    localStorage.setItem("recentLocationSearches", JSON.stringify(updatedSearches))
  }

  const fetchLocationSuggestions = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`,
      )
      if (response.ok) {
        const data = await response.json()
        const formattedData = data.map((item: any) => ({
          id: item.place_id,
          name: item.display_name,
          shortName: item.name,
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon),
          district: item.address?.state_district || item.address?.county || "",
          state: item.address?.state || "",
        }))
        setSuggestions(formattedData)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFormData({ ...formData, policeStation: value })

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length >= 2) {
      setIsLoading(true)
      searchTimeoutRef.current = setTimeout(() => fetchLocationSuggestions(value), 300)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    const locationName = suggestion.name || ""
    const locationParts = locationName.split(",").map((part) => part.trim())

    const districtFallback =
      suggestion.district || (locationParts.length > 1 ? locationParts[locationParts.length - 2] : "")
    const stateFallback = suggestion.state || (locationParts.length > 0 ? locationParts[locationParts.length - 1] : "")

    setFormData({
      ...formData,
      policeStation: suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
      district: suggestion.district || districtFallback || "Not specified",
      state: suggestion.state || stateFallback || "Not specified",
    })
    setSelectedLocation(suggestion)
    setShowSuggestions(false)
    saveToRecentSearches(suggestion)

    if (errors.policeStation || errors.district || errors.state) {
      setErrors({
        ...errors,
        policeStation: "",
        district: "",
        state: "",
      })
    }
  }

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: "",
      } as FormErrors)
    }
  }

  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailLogin(e.target.value)

    if (errors.email) {
      setErrors({
        ...errors,
        email: "",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "idCardFront" | "idCardBack") => {
    const file = e.target.files?.[0] || null

    setFormData({
      ...formData,
      [fieldName]: file,
    })

    if (errors[fieldName]) {
      setErrors({
        ...errors,
        [fieldName]: "",
      } as FormErrors)
    }
  }

  const triggerFileInput = (inputRef: React.RefObject<HTMLInputElement>) => {
    inputRef.current?.click()
  }

  const validateRegularForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    if (!isLogin && !formData.name.trim()) {
      newErrors.name = "Name is required"
      isValid = false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
      isValid = false
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
      isValid = false
    }

    if (!isLogin && formData.phone) {
      const phoneRegex = /^\d{10}$/
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = "Please enter a valid 10-digit phone number"
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const validatePoliceStep = (step: PoliceSignupStep) => {
    let isValid = true
    const newErrors = { ...errors }

    setFormError("")

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = "Full name is required"
          isValid = false
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!formData.email.trim()) {
          newErrors.email = "Email is required"
          isValid = false
        } else if (!emailRegex.test(formData.email)) {
          newErrors.email = "Please enter a valid email"
          isValid = false
        }

        const phoneRegex = /^\d{10}$/
        if (!formData.phone.trim()) {
          newErrors.phone = "Phone number is required"
          isValid = false
        } else if (!phoneRegex.test(formData.phone)) {
          newErrors.phone = "Please enter a valid 10-digit phone number"
          isValid = false
        }

        if (!formData.dateOfBirth) {
          newErrors.dateOfBirth = "Date of birth is required"
          isValid = false
        }
        break

      case 2: 
        if (!formData.badgeId.trim()) {
          newErrors.badgeId = "Badge/ID number is required"
          isValid = false
        }

        if (!formData.designation.trim()) {
          newErrors.designation = "Designation/Rank is required"
          isValid = false
        }

        if (!formData.policeStation.trim()) {
          newErrors.policeStation = "Police station name is required"
          isValid = false
        }

        if (!formData.department.trim()) {
          newErrors.department = "Department/Branch is required"
          isValid = false
        }

        if (!formData.district.trim()) {
          setFormData((prev) => ({
            ...prev,
            district: "Not specified",
          }))
        }

        if (!formData.state.trim()) {
          setFormData((prev) => ({
            ...prev,
            state: "Not specified",
          }))
        }

        break

      case 3: 
        if (!formData.idCardFront) {
          newErrors.idCardFront = "Police ID card (front) is required"
          isValid = false
        }
        break
    }

    setErrors(newErrors)

    if (!isValid) {
      setFormError("Please fill in all required fields before proceeding.")
    }

    return isValid
  }

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailLogin.trim()) {
      setErrors({
        ...errors,
        email: "Email is required",
      })
      return
    } else if (!emailRegex.test(emailLogin)) {
      setErrors({
        ...errors,
        email: "Please enter a valid email",
      })
      return
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailLogin }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to login")
      }

      await response.json()

      router.push(`/MagicLinkSent?email=${encodeURIComponent(emailLogin)}&signup=false`)

      setErrors({
        name: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        badgeId: "",
        designation: "",
        policeStation: "",
        department: "",
        district: "",
        state: "",
        idCardFront: "",
        idCardBack: "",
      })
    } catch (error) {
      console.error("An error occurred:", error)
      setFormError(error instanceof Error ? error.message : "An error occurred while logging in.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (userType === "regular") {
      if (!validateRegularForm()) return
    } else {
      if (!validatePoliceStep(policeSignupStep)) return
    }

    const formDataToSubmit = new FormData()

    for (const key in formData) {
      const value = formData[key as keyof FormData]

      if (value instanceof File) {
        formDataToSubmit.append(key, value)
      } else if (value !== null && value !== undefined) {
        formDataToSubmit.append(key, String(value))
      }
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formDataToSubmit,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to register user")
      }

      await response.json()

      router.push(`/MagicLinkSent?email=${encodeURIComponent(formData.email)}&signup=true`)

      setErrors({
        name: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        badgeId: "",
        designation: "",
        policeStation: "",
        department: "",
        district: "",
        state: "",
        idCardFront: "",
        idCardBack: "",
      })
    } catch (error) {
      console.error("Error:", error)
      setSuccessMessage("")
      setFormError(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  const handleNextStep = () => {
    if (validatePoliceStep(policeSignupStep)) {
      setPoliceSignupStep((prev) => (prev < 4 ? ((prev + 1) as PoliceSignupStep) : prev))
    } else {
      const formContainer = document.querySelector(".max-w-md")
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  const handlePrevStep = () => {
    setPoliceSignupStep((prev) => (prev > 1 ? ((prev - 1) as PoliceSignupStep) : prev))
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setUserType("regular")
    setPoliceSignupStep(1)
    setEmailLogin("")
    setFormError("")

    setErrors({
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      badgeId: "",
      designation: "",
      policeStation: "",
      department: "",
      district: "",
      state: "",
      idCardFront: "",
      idCardBack: "",
    })
  }

  const toggleUserType = (type: UserType) => {
    setUserType(type)
    setPoliceSignupStep(1)
    setFormError("")

    setErrors({
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      badgeId: "",
      designation: "",
      policeStation: "",
      department: "",
      district: "",
      state: "",
      idCardFront: "",
      idCardBack: "",
    })

    setFormData({
      name: "",
      email: "",
      phone: "",
      role: type,
      dateOfBirth: "",
      badgeId: "",
      designation: "",
      policeStation: "",
      department: "",
      lat: 0,
      lng: 0,
      address: "",
      district: "",
      state: "",
      idCardFront: null,
      idCardBack: null,
      verified: false,
    })

    setSelectedLocation(null)
  }

  const renderPoliceSignupStep = () => {
    switch (policeSignupStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">
              Step 1: Basic Personal Information
            </h3>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Full Name (as per official ID) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.name ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Email Address (official preferred) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                  placeholder="officer@police.gov.in"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.phone ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                  placeholder="1234567890"
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.dateOfBirth ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                />
              </div>
              {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
            </div>

            {/* Next Step Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next Step</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 2:
        const debugFormData = () => {
          console.log("Current form data:", {
            policeStation: formData.policeStation,
            district: formData.district,
            state: formData.state,
            lat: formData.lat,
            lng: formData.lng,
          })
          console.log("Current errors:", errors)
        }
        return (
          <div className="space-y-4">
            <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">Step 2: Official Police Details</h3>

            {/* Police Badge/ID Number */}
            <div>
              <label htmlFor="badgeId" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Police Badge/ID Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="badgeId"
                  name="badgeId"
                  value={formData.badgeId}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.badgeId ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors `}
                  placeholder="e.g., PB12345"
                />
              </div>
              {errors.badgeId && <p className="mt-1 text-sm text-red-600">{errors.badgeId}</p>}
            </div>

            {/* Designation/Rank */}
            <div>
              <label htmlFor="designation" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Designation/Rank <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.designation ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                >
                  <option value="">Select Designation</option>
                  <option value="Inspector General">Inspector General</option>
                  <option value="Deputy Inspector General">Deputy Inspector General</option>
                  <option value="Superintendent">Superintendent of Police</option>
                  <option value="Deputy Superintendent">Deputy Superintendent</option>
                  <option value="Inspector">Inspector</option>
                  <option value="Sub-Inspector">Sub-Inspector</option>
                  <option value="Assistant Sub-Inspector">Assistant Sub-Inspector</option>
                  <option value="Head Constable">Head Constable</option>
                  <option value="Constable">Constable</option>
                </select>
              </div>
              {errors.designation && <p className="mt-1 text-sm text-red-600">{errors.designation}</p>}
            </div>

            {/* Department/Branch */}
            <div>
              <label htmlFor="department" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Department/Branch <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.department ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                >
                  <option value="">Select Department</option>
                  <option value="Missing Persons Unit">Missing Persons Unit</option>
                  <option value="Cybercrime">Cybercrime</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Crime Branch">Crime Branch</option>
                  <option value="Special Branch">Special Branch</option>
                  <option value="Intelligence">Intelligence</option>
                  <option value="Women & Child Protection">Women & Child Protection</option>
                  <option value="Anti-Terrorism Squad">Anti-Terrorism Squad</option>
                  <option value="General">General</option>
                </select>
              </div>
              {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
            </div>

            {/* Police Station Location */}
            <div>
              <label htmlFor="policeStation" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Police Station Location <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={suggestionRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="policeStation"
                  name="policeStation"
                  value={formData.policeStation}
                  onChange={handleLocChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.policeStation ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="Enter police station location"
                  autoComplete="off"
                />

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  </div>
                )}

                {/* Location Suggestions */}
                {showSuggestions && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="px-4 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-0"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-start">
                            <MapPin className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium">{suggestion.shortName}</div>
                              {suggestion.shortName !== suggestion.name && (
                                <div className="text-xs text-gray-500 truncate max-w-full">{suggestion.name}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-600">
                        No locations found. Try a different search term.
                      </div>
                    )}

                    {/* Recent Searches */}
                    {!isLoading && suggestions.length === 0 && recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">RECENT SEARCHES</div>
                        {recentSearches.map((search) => (
                          <div
                            key={search.id}
                            className="px-4 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-start"
                            onClick={() => handleSuggestionClick(search)}
                          >
                            <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">{search.shortName || search.name}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              {errors.policeStation && <p className="mt-1 text-sm text-red-600">{errors.policeStation}</p>}
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Start typing to see location suggestions
              </p>
            </div>

            {/* Map Preview */}
            <div className="mt-4 border border-gray-300 rounded-lg overflow-hidden">
              {selectedLocation ? (
                <div className="h-64 w-full">
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.01},${selectedLocation.lat - 0.01},${selectedLocation.lng + 0.01},${selectedLocation.lat + 0.01}&layer=mapnik&marker=${selectedLocation.lat},${selectedLocation.lng}`}
                    style={{ border: "none" }}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 h-64 flex items-center justify-center">
                  <div className="text-center p-4">
                    <MapPin className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-gray-600 font-poppins">Enter and select a location to see map preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  debugFormData() 
                  handleNextStep()
                }}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next Step</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">Step 3: Verification Documents</h3>

            {/* Upload Police ID Card (Front) */}
            <div>
              <label className="block font-poppins text-sm font-medium text-gray-700 mb-3">
                Upload Police ID Card (Front) <span className="text-red-500">*</span>
              </label>

              <CloudinaryUpload
                label="Upload Police ID Card (Front)"
                onUploadSuccess={(url) => {
                  setFormData((prev) => ({
                    ...prev,
                    idCardFront: url,
                  }))
                }}
                acceptedFileTypes="image/*"
                className={`border-2 border-dashed ${
                  errors.idCardFront ? "border-red-500" : "border-gray-300"
                } rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors`}
              />

              {formData.idCardFront ? (
                <div className="flex flex-col items-center mt-3">
                  <div className="flex items-center justify-center mb-2 text-green-600">
                    <Check className="h-6 w-6 mr-1" />
                    <span className="font-medium">File uploaded</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate max-w-full">
                    {typeof formData.idCardFront === "string" ? formData.idCardFront : formData.idCardFront.name}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        idCardFront: null,
                      }))
                    }
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center mt-2">PNG, JPG, or PDF (max. 5MB)</p>
              )}

              {errors.idCardFront && <p className="mt-1 text-sm text-red-600">{errors.idCardFront}</p>}
            </div>

            {/* Upload Police ID Card (Back) - Optional */}
            <div>
              <label className="block font-poppins text-sm font-medium text-gray-700 mb-3">
                Upload Police ID Card (Back) <span className="text-gray-500 text-xs">(Optional)</span>
              </label>

              <CloudinaryUpload
                label="Upload Police ID Card (Back)"
                onUploadSuccess={(url) => {
                  setFormData((prev) => ({
                    ...prev,
                    idCardBack: url,
                  }))
                }}
                acceptedFileTypes="image/*"
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              />

              {formData.idCardBack ? (
                <div className="flex flex-col items-center mt-3">
                  <div className="flex items-center justify-center mb-2 text-green-600">
                    <Check className="h-6 w-6 mr-1" />
                    <span className="font-medium">File uploaded</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate max-w-full">
                    {typeof formData.idCardBack === "string" ? formData.idCardBack : formData.idCardBack.name}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        idCardBack: null,
                      }))
                    }
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center mt-2">PNG, JPG, or PDF (max. 5MB)</p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next Step</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-4">Step 4: Account Credentials</h3>

            {/* Terms and Conditions */}
            <div className="flex items-start mt-4">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="font-montserrat text-gray-600">
                  I agree to the{" "}
                  <a href="#" className="text-red-600 hover:text-red-800">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-red-600 hover:text-red-800">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Create Account</span>
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4 relative overflow-hidden ${montserrat.variable} ${poppins.variable}`}
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

      {/* Back to home link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center font-poppins text-gray-700 hover:text-red-600 transition-colors z-10"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Home
      </Link>

      {/* Main container */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Left side - Illustration/Info */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-red-600 to-red-700 p-8 lg:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <svg
              className="absolute top-0 left-0 opacity-10"
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="white" strokeWidth="0.5"></path>
              <path d="M0,0 L100,100 M100,0 L0,100" stroke="white" strokeWidth="0.5"></path>
              <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="0.5" fill="none"></circle>
              <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="0.5" fill="none"></circle>
            </svg>
          </div>

          <div className="relative z-10">
            <h1 className="font-poppins font-bold text-3xl mb-6">FindMissing</h1>
            <h2 className="font-poppins font-bold text-2xl mb-4">
              {isLogin
                ? "Welcome Back!"
                : userType === "regular"
                  ? "Join Our Community"
                  : "Police Officer Registration"}
            </h2>
            <p className="font-montserrat mb-8 opacity-90 leading-relaxed">
              {isLogin
                ? "Sign in to access your account and continue your mission to help find missing persons."
                : userType === "regular"
                  ? "Create an account to join our network of volunteers and help reunite missing persons with their loved ones."
                  : "Register as a verified police officer to access enhanced features for missing person cases and investigations."}
            </p>

            <div className="mt-auto">
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <div className="flex items-start mb-4">
                  <div className="bg-white/20 p-2 rounded-full mr-4">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg">Make a Difference</h3>
                    <p className="font-montserrat text-sm opacity-90">
                      {userType === "police"
                        ? "Collaborate with volunteers and other agencies to find missing persons faster."
                        : "Join thousands of volunteers helping to find missing persons."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-full mr-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg">Secure & Private</h3>
                    <p className="font-montserrat text-sm opacity-90">
                      Your data is encrypted and never shared without consent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-7/12 bg-white p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-poppins font-bold text-2xl text-gray-800 mb-2">
                {isLogin
                  ? "Sign In to Your Account"
                  : userType === "regular"
                    ? "Create Your Account"
                    : `Police Registration - Step ${policeSignupStep} of 4`}
              </h2>
              <p className="font-montserrat text-gray-600">
                {isLogin
                  ? "Enter your credentials to access your account"
                  : userType === "regular"
                    ? "Fill in your details to join our community"
                    : "Complete your verification as a police officer"}
              </p>
            </div>

            {/* Form error message */}
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">{formError}</div>
            )}

            {/* User type toggle - only show when in signup mode */}
            {!isLogin && (
              <div className="mb-6">
                <div className="flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleUserType("regular")}
                    className={`w-1/2 py-2 px-4 text-sm font-medium rounded-l-md focus:outline-none ${
                      userType === "regular" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Regular User
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleUserType("police")}
                    className={`w-1/2 py-2 px-4 text-sm font-medium rounded-r-md focus:outline-none ${
                      userType === "police" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Police Officer
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmitLogin}
                  className="space-y-4"
                >
                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={emailLogin}
                        onChange={handleEmail}
                        className={`w-full pl-10 pr-4 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                        placeholder="your@email.com"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
                    >
                      <span>Sign In</span>
                      <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Social login options */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 font-montserrat">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => signIn("google")}
                      className="w-full flex items-center justify-center gap-2 mt-4 py-2 border rounded-md shadow-md text-black"
                    >
                      <img src="/google-icon-logo.svg" alt="Google" className="w-5 h-5" />
                      Sign in with Google
                    </button>
                  </div>
                </motion.form>
              ) : userType === "regular" ? (
                <motion.form
                  key="regular-signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2 border ${errors.name ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                        placeholder="your@email.com"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone field */}
                  <div>
                    <label htmlFor="phone" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2 border ${errors.phone ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors placeholder-gray-300`}
                        placeholder="1234567890"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
                    >
                      <span>Create Account</span>
                      <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Social login options */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 font-montserrat">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => signIn("google")}
                      className="w-full flex items-center justify-center gap-2 mt-4 py-2 border rounded-md shadow-md text-black"
                    >
                      <img src="/google-icon-logo.svg" alt="Google" className="w-5 h-5" />
                      Sign in with Google
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="police-signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Progress indicator */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step <= policeSignupStep ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {step < policeSignupStep ? <Check className="h-4 w-4" /> : <span>{step}</span>}
                          </div>
                          <div className="text-xs mt-1 text-gray-500 hidden sm:block">
                            {step === 1 && "Personal"}
                            {step === 2 && "Official"}
                            {step === 3 && "Verification"}
                            {step === 4 && "Account"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="relative mt-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-1 bg-gray-200 rounded"></div>
                      </div>
                      <div
                        className="absolute inset-0 flex items-center"
                        style={{ width: `${(policeSignupStep - 1) * 33.33}%` }}
                      >
                        <div className="h-1 bg-red-600 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Form steps */}
                  {renderPoliceSignupStep()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle between login and signup */}
            <div className="mt-8 text-center">
              <p className="font-montserrat text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="ml-1 font-poppins font-medium text-red-600 hover:text-red-700 focus:outline-none"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

