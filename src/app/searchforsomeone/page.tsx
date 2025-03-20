"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"
import { useParams, useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Montserrat, Poppins } from "next/font/google"
import {
  User,
  Calendar,
  MapPin,
  Clock,
  Ruler,
  Weight,
  Palette,
  Eye,
  Upload,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Heart,
  AlertCircle,
  Search,
  ArrowRight,
  Info,
  FileText,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Navbar from "@/components/navbar"
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

type SearchStep = 1 | 2 | 3 | 4 | 5

export default function SearchMissingPerson() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<SearchStep>(1)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isAadhaarValid, setIsAadhaarValid] = useState(false);
  const [LocName, setLocName] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    photo: "",
    behavioralTraits: "",
    healthConditions: "",

    lastSeenLocation: "",
    lastSeenDate: "",
    lastSeenTime: "",
    lat: "",
    lng: "",
    height: "",
    heightUnit: "cm",
    weight: "",
    weightUnit: "kg",
    hairColor: "",
    eyeColor: "",
    clothingWorn: "",
    identifyingMarks: "",
    additionalPhotos: [] as string[],

    reporterName: "",
    relationship: "",
    mobileNumber: "",
    emailAddress: "",

    aadhaarImage: "",
  })

  const [errors, setErrors] = useState({
    fullName: "",
    age: "",
    gender: "",
    photo: "",
    behavioralTraits: "",
    healthConditions: "",
    lastSeenLocation: "",
    lastSeenDate: "",
    lastSeenTime: "",
    height: "",
    weight: "",
    hairColor: "",
    eyeColor: "",
    clothingWorn: "",
    identifyingMarks: "",
    additionalPhotos: "",
    reporterName: "",
    relationship: "",
    mobileNumber: "",
    emailAddress: "",
    aadhaarImage: "",
  })
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const suggestionRef = useRef(null);
  const searchTimeoutRef = useRef(null);
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
    const savedSearches = localStorage.getItem('recentLocationSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error("Error parsing saved searches", e);
      }
    }
  }, []);

  const saveToRecentSearches = (location) => {
    const updatedSearches = [location, ...recentSearches.filter(item => item.id !== location.id)].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentLocationSearches', JSON.stringify(updatedSearches));
  };

  const fetchFromNominatim = async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MissingPersonApp/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.map(item => ({
          id: `nom-${item.place_id}`,
          name: item.display_name,
          shortName: formatDisplayName(item),
          source: 'nominatim',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));
      }
      return [];
    } catch (error) {
      console.error("Nominatim error:", error);
      return [];
    }
  };

  // Helper to format Nominatim display name to be more concise
  const formatDisplayName = (item) => {
    if (!item.address) return item.display_name;

    const parts = [];

    // Add the specific local feature first if available
    if (item.type !== 'administrative' && item.name) {
      parts.push(item.name);
    }

    // Add meaningful address components (more specific to less specific)
    const addressPriority = ['road', 'neighbourhood', 'suburb', 'quarter', 'city_district', 'village', 'town', 'city', 'county', 'state_district', 'state'];

    for (const key of addressPriority) {
      if (item.address[key] && !parts.includes(item.address[key])) {
        parts.push(item.address[key]);
      }
    }

    // Always include the city/town and state for context
    const cityValue = item.address.city || item.address.town || item.address.village;
    if (cityValue && !parts.includes(cityValue)) {
      parts.push(cityValue);
    }

    if (item.address.state && !parts.includes(item.address.state)) {
      parts.push(item.address.state);
    }

    return parts.join(', ');
  };

  // Function to fetch from PhotonAPI (another free geocoding service)
  const fetchFromPhoton = async (query) => {
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&lat=20.5937&lon=78.9629`,
        // Using approximate center of India to bias results
      );

      if (response.ok) {
        const data = await response.json();
        return data.features.map(item => ({
          id: `photon-${item.properties.osm_id}`,
          name: formatPhotonResult(item.properties),
          shortName: formatPhotonResult(item.properties, true),
          source: 'photon',
          lat: item.geometry.coordinates[1],
          lng: item.geometry.coordinates[0]
        }));
      }
      return [];
    } catch (error) {
      console.error("Photon error:", error);
      return [];
    }
  };

  // Helper to format Photon result
  const formatPhotonResult = (props, short = false) => {
    const parts = [];

    // Add specific place name if available
    if (props.name) {
      parts.push(props.name);
    }

    // Add address components from most to least specific
    if (props.street && !short) {
      parts.push(props.street);
    }

    if (props.district) {
      parts.push(props.district);
    } else if (props.neighbourhood) {
      parts.push(props.neighbourhood);
    } else if (props.suburb) {
      parts.push(props.suburb);
    }

    // Always include city and state for context
    if (props.city) {
      parts.push(props.city);
    } else if (props.town) {
      parts.push(props.town);
    } else if (props.village) {
      parts.push(props.village);
    }

    if (props.state) {
      parts.push(props.state);
    }

    return parts.join(', ');
  };

  // Function to fetch from both services and combine results
  const fetchLocationSuggestions = async (query) => {
    setIsLoading(true);

    try {
      // Request from both services in parallel
      const [nominatimResults, photonResults] = await Promise.all([
        fetchFromNominatim(query),
        fetchFromPhoton(query)
      ]);

      // Combine and deduplicate results
      // This simple deduplication strategy may need refinement
      const combinedResults = [];
      const addedNames = new Set();

      // First add Nominatim results (often better for India)
      for (const result of nominatimResults) {
        if (!addedNames.has(result.shortName)) {
          combinedResults.push(result);
          addedNames.add(result.shortName);
        }
      }

      // Then add unique Photon results
      for (const result of photonResults) {
        if (!addedNames.has(result.shortName)) {
          combinedResults.push(result);
          addedNames.add(result.shortName);
        }
      }

      setSuggestions(combinedResults);
      setShowSuggestions(combinedResults.length > 0);

    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'lastSeenLocation') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length >= 2) {
        setIsLoading(true);
        searchTimeoutRef.current = setTimeout(() => {
          fetchLocationSuggestions(value);
        }, 300); // 300ms debounce
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData({
      ...formData,
      lastSeenLocation: suggestion.name
    });
    setSelectedLocation(suggestion);
    setLocName(suggestion.name);
    setShowSuggestions(false);
    saveToRecentSearches(suggestion);
    setFormData({
      ...formData,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    console.log(suggestion.lng);

  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [suggestionRef]);



  const handleVerify = async () => {
    if (!formData.aadhaarImage || !formData.photo) {
      setVerificationMessage("Aadhaar image and user face image are required.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/validate-aadhaar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aadhaar_url: formData.aadhaarImage,
          user_face_url: formData.photo, 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setVerificationMessage(data.message);
      setIsAadhaarValid(true);
    } catch (error) {
      setVerificationMessage(error.message);
      setIsAadhaarValid(false);
    }
  };


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
    console.log(formData.aadhaarImage);
  }, [formData.aadhaarImage])
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "photo" | "aadhaarImage") => {
    const file = e.target.files?.[0] || null

    setFormData({
      ...formData,
      [fieldName]: file,
    })

    // Clear error when user uploads a file
    if (errors[fieldName]) {
      setErrors({
        ...errors,
        [fieldName]: "",
      })
    }
  }

  const handleAdditionalPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      setFormData({
        ...formData,
        additionalPhotos: [...formData.additionalPhotos, ...newFiles],
      })
    }
  }

  const removeAdditionalPhoto = (index: number) => {
    const updatedPhotos = [...formData.additionalPhotos]
    updatedPhotos.splice(index, 1)
    setFormData({
      ...formData,
      additionalPhotos: updatedPhotos,
    })
  }

  const triggerFileInput = (inputRef: React.RefObject<HTMLInputElement>) => {
    inputRef.current?.click()
  }

  const validateStep = (step: SearchStep) => {
    let isValid = true
    const newErrors = { ...errors }

    switch (step) {
      case 1:
        if (!formData.fullName.trim()) {
          newErrors.fullName = "Full name is required"
          isValid = false
        }

        if (!formData.age.trim()) {
          newErrors.age = "Age is required"
          isValid = false
        } else if (isNaN(Number(formData.age)) || Number(formData.age) <= 0 || Number(formData.age) > 120) {
          newErrors.age = "Please enter a valid age"
          isValid = false
        }

        if (!formData.gender) {
          newErrors.gender = "Gender is required"
          isValid = false
        }

        if (!formData.photo) {
          newErrors.photo = "A recent photo is required"
          isValid = false
        }
        break

      case 2: 
        if (!formData.lastSeenLocation.trim()) {
          newErrors.lastSeenLocation = "Last seen location is required"
          isValid = false
        }

        if (!formData.lastSeenDate) {
          newErrors.lastSeenDate = "Last seen date is required"
          isValid = false
        }

        if (!formData.lastSeenTime) {
          newErrors.lastSeenTime = "Last seen time is required"
          isValid = false
        }
        break

      case 3: 
        if (!formData.height.trim()) {
          newErrors.height = "Height is required"
          isValid = false
        } else if (isNaN(Number(formData.height)) || Number(formData.height) <= 0) {
          newErrors.height = "Please enter a valid height"
          isValid = false
        }

        if (!formData.weight.trim()) {
          newErrors.weight = "Weight is required"
          isValid = false
        } else if (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0) {
          newErrors.weight = "Please enter a valid weight"
          isValid = false
        }

        if (!formData.hairColor) {
          newErrors.hairColor = "Hair color is required"
          isValid = false
        }

        if (!formData.eyeColor) {
          newErrors.eyeColor = "Eye color is required"
          isValid = false
        }
        break

      case 4: 
        if (!formData.reporterName.trim()) {
          newErrors.reporterName = "Your name is required"
          isValid = false
        }

        if (!formData.relationship.trim()) {
          newErrors.relationship = "Relationship is required"
          isValid = false
        }

        if (!formData.mobileNumber.trim()) {
          newErrors.mobileNumber = "Mobile number is required"
          isValid = false
        } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
          newErrors.mobileNumber = "Please enter a valid 10-digit mobile number"
          isValid = false
        }

        if (formData.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
          newErrors.emailAddress = "Please enter a valid email address"
          isValid = false
        }
        break

      case 5: 
        if (!formData.aadhaarImage) {
          newErrors.aadhaarImage = "Aadhaar card image is required for verification"
          isValid = false
        }
        break
    }

    setErrors(newErrors)
    return isValid
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 5 ? ((prev + 1) as SearchStep) : prev))
      window.scrollTo(0, 0)
    }
  }

  const handlePrevStep = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as SearchStep) : prev))
    window.scrollTo(0, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validateStep(currentStep)) {
      try {
        let policeId;
        try {
          const response = await fetch(`/api/nearest-police?lat=${formData.lat}&lng=${formData.lng}`);
          const data = await response.json();
          console.log("Nearest Police Officer Data:", data);
          if (data) {
            policeId = data.nearestOfficer.userId;  
            console.log("Nearest Police Officer ID:", policeId);
          } else {
            console.log("No police officer found near the selected location.");
          }

        } catch (error) {
          console.error("Error fetching nearest police officer:", error);
        }
        const response = await fetch("/api/reportmissing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            age: formData.age,
            gender: formData.gender,
            photo: formData.photo,
            behavioralTraits: formData.behavioralTraits || null,
            healthConditions: formData.healthConditions || null,

            lastSeenLocation: LocName,
            lastSeenDate: formData.lastSeenDate,
            lastSeenTime: formData.lastSeenTime,
            lat: formData.lat || null,
            lng: formData.lng || null,

            height: formData.height || null,
            heightUnit: formData.heightUnit,
            weight: formData.weight || null,
            weightUnit: formData.weightUnit,
            hairColor: formData.hairColor || null,
            eyeColor: formData.eyeColor || null,
            clothingWorn: formData.clothingWorn || null,
            identifyingMarks: formData.identifyingMarks || null,
            additionalPhotos: formData.additionalPhotos.length > 0 ? formData.additionalPhotos : [],

            reporterName: formData.reporterName,
            relationship: formData.relationship,
            mobileNumber: formData.mobileNumber,
            emailAddress: formData.emailAddress || null,
            userId: userId,
            handledByPoliceId: policeId,
            aadhaarImage: formData.aadhaarImage,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        console.log("Report submitted successfully:", data);
      } catch (error) {
        console.error("Error submitting report:", error);
      }
    }
  }

  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-4">Basic Details</h3>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.fullName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="First and Last Name"
                />
              </div>
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {/* Age and Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  className={`w-full px-4 py-2 border ${errors.age ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="e.g., 25"
                />
                {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
              </div>

              <div>
                <label htmlFor="gender" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border ${errors.gender ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>
            </div>

            {/* Photo Upload */}
            <div>

              <CloudinaryUpload
                label="Recent Photo"
                onUploadSuccess={(url) => {
                  setFormData((prev) => ({
                    ...prev,
                    photo: url, // Store uploaded image URL in formData
                  }));
                }}
                acceptedFileTypes="image/*"
                className="mb-4"
              />

              {/* Show uploaded image preview */}
              {formData.photo && (
                <div className="flex flex-col items-center mt-2">
                  <div className="w-32 h-32 relative mb-3 rounded-md overflow-hidden">
                    <img
                      src={formData.photo}
                      alt="Uploaded photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, photo: null }))
                    }
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              {errors.photo && <p className="mt-1 text-sm text-red-600">{errors.photo}</p>}

              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Clear, recent face photo helps in identification
              </p>
            </div>



            {/* Behavioral Traits */}
            <div>
              <label htmlFor="behavioralTraits" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Behavioral Traits <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                id="behavioralTraits"
                name="behavioralTraits"
                value={formData.behavioralTraits}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="e.g., Shy, outgoing, anxious, etc."
              />
              <p className="mt-1 text-xs text-gray-500">
                Include any notable behaviors that might help in identification
              </p>
            </div>

            {/* Health Conditions */}
            <div>
              <label htmlFor="healthConditions" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Health Conditions <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                id="healthConditions"
                name="healthConditions"
                value={formData.healthConditions}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="e.g., Diabetes, requires medication, etc."
              />
              <p className="mt-1 text-xs text-gray-500">Include any medical conditions that require attention</p>
            </div>

            {/* Next Step Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next: Last Seen Information</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-4">Last Seen Information</h3>

            {/* Last Seen Location */}
            <div>
              <label htmlFor="lastSeenLocation" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Last Seen Location <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={suggestionRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="lastSeenLocation"
                  name="lastSeenLocation"
                  value={formData.lastSeenLocation}
                  onChange={handleLocChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.lastSeenLocation ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="Enter location "
                  autoComplete="off"
                />

                {/* Loading indicator */}
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map(suggestion => (
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

                    {/* Recent searches section */}
                    {!isLoading && suggestions.length === 0 && recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                          RECENT SEARCHES
                        </div>
                        {recentSearches.map(search => (
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
              {errors.lastSeenLocation && <p className="mt-1 text-sm text-red-600">{errors.lastSeenLocation}</p>}
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Start typing to see location suggestions
              </p>
            </div>

            {/* Last Seen Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lastSeenDate" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Last Seen Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="lastSeenDate"
                    name="lastSeenDate"
                    value={formData.lastSeenDate}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.lastSeenDate ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  />
                </div>
                {errors.lastSeenDate && <p className="mt-1 text-sm text-red-600">{errors.lastSeenDate}</p>}
              </div>

              <div>
                <label htmlFor="lastSeenTime" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Last Seen Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="time"
                    id="lastSeenTime"
                    name="lastSeenTime"
                    value={formData.lastSeenTime}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.lastSeenTime ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  />
                </div>
                {errors.lastSeenTime && <p className="mt-1 text-sm text-red-600">{errors.lastSeenTime}</p>}
              </div>
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
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.01},${selectedLocation.lat - 0.01},${selectedLocation.lng + 0.01},${selectedLocation.lat + 0.01}&layer=mapnik&marker=${selectedLocation.lat},${selectedLocation.lng}`}
                    style={{ border: "none" }}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 h-64 flex items-center justify-center">
                  <div className="text-center p-4">
                    <MapPin className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-gray-600 font-poppins">
                      Enter and select a location to see map preview
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                <span className="flex items-center">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next: Physical Description</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-4">Physical Description</h3>

            {/* Height & Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="height" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Height <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Ruler className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      min="1"
                      className={`w-full pl-10 pr-4 py-2 border ${errors.height ? "border-red-500" : "border-gray-300"} rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                      placeholder="e.g., 170"
                    />
                  </div>
                  <select
                    name="heightUnit"
                    value={formData.heightUnit}
                    onChange={handleChange}
                    className="w-20 py-2 px-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                {errors.height && <p className="mt-1 text-sm text-red-600">{errors.height}</p>}
              </div>

              <div>
                <label htmlFor="weight" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Weight <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Weight className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="1"
                      className={`w-full pl-10 pr-4 py-2 border ${errors.weight ? "border-red-500" : "border-gray-300"} rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                      placeholder="e.g., 65"
                    />
                  </div>
                  <select
                    name="weightUnit"
                    value={formData.weightUnit}
                    onChange={handleChange}
                    className="w-20 py-2 px-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
                {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
              </div>
            </div>

            {/* Hair & Eye Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="hairColor" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Hair Color <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Palette className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="hairColor"
                    name="hairColor"
                    value={formData.hairColor}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.hairColor ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                  >
                    <option value="">Select Hair Color</option>
                    <option value="Black">Black</option>
                    <option value="Brown">Brown</option>
                    <option value="Blonde">Blonde</option>
                    <option value="Red">Red</option>
                    <option value="Grey">Grey</option>
                    <option value="White">White</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {errors.hairColor && <p className="mt-1 text-sm text-red-600">{errors.hairColor}</p>}
              </div>

              <div>
                <label htmlFor="eyeColor" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Eye Color <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Eye className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="eyeColor"
                    name="eyeColor"
                    value={formData.eyeColor}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.eyeColor ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                  >
                    <option value="">Select Eye Color</option>
                    <option value="Black">Black</option>
                    <option value="Brown">Brown</option>
                    <option value="Blue">Blue</option>
                    <option value="Green">Green</option>
                    <option value="Hazel">Hazel</option>
                    <option value="Grey">Grey</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {errors.eyeColor && <p className="mt-1 text-sm text-red-600">{errors.eyeColor}</p>}
              </div>
            </div>

            {/* Clothing Worn */}
            <div>
              <label htmlFor="clothingWorn" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Clothing Worn at the Time <span className="text-red-500">*</span>
              </label>
              <textarea
                id="clothingWorn"
                name="clothingWorn"
                value={formData.clothingWorn}
                onChange={handleChange}
                rows={2}
                className={`w-full px-4 py-2 border ${errors.clothingWorn ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                placeholder="e.g., Blue jeans, red t-shirt, black jacket"
              />
              {errors.clothingWorn && <p className="mt-1 text-sm text-red-600">{errors.clothingWorn}</p>}
            </div>

            {/* Identifying Marks */}
            <div>
              <label htmlFor="identifyingMarks" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Identifying Marks <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                id="identifyingMarks"
                name="identifyingMarks"
                value={formData.identifyingMarks}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="e.g., Scar on left cheek, tattoo on right arm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Include any scars, tattoos, birthmarks, or other distinctive features
              </p>
            </div>

            {/* Additional Photos */}
            <div>
              <label className="block font-poppins text-sm font-medium text-gray-700 mb-3">
                Additional Photos <span className="text-gray-500 text-xs">(Optional)</span>
              </label>

              {/* CloudinaryUpload component for multiple photos */}
              <CloudinaryUpload
                label="Upload Additional Photos"
                onUploadSuccess={(url) => {
                  setFormData((prev) => ({
                    ...prev,
                    additionalPhotos: [...prev.additionalPhotos, url], // Append new URL
                  }));
                }}
                acceptedFileTypes="image/*"
                className="mb-4"
              />

              {/* Display additional uploaded photos */}
              {formData.additionalPhotos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.additionalPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="w-full h-24 relative rounded-md overflow-hidden">
                        <Image
                          src={photo || "/placeholder.svg"} // Use Cloudinary URL directly
                          alt={`Additional photo ${index + 1}`}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            additionalPhotos: prev.additionalPhotos.filter((_, i) => i !== index), // Remove photo
                          }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Additional photos from different angles can help with identification
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                <span className="flex items-center">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next: Contact Information</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-4">Family Contact Information</h3>

            {/* Reporter's Name */}
            <div>
              <label htmlFor="reporterName" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="reporterName"
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.reporterName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="Your full name"
                />
              </div>
              {errors.reporterName && <p className="mt-1 text-sm text-red-600">{errors.reporterName}</p>}
            </div>

            {/* Relationship */}
            <div>
              <label htmlFor="relationship" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                Your Relationship to Missing Person <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Heart className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="relationship"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${errors.relationship ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors appearance-none`}
                >
                  <option value="">Select Relationship</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other Family">Other Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {errors.relationship && <p className="mt-1 text-sm text-red-600">{errors.relationship}</p>}
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mobileNumber" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="mobileNumber"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.mobileNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                    placeholder="10-digit mobile number"
                  />
                </div>
                {errors.mobileNumber && <p className="mt-1 text-sm text-red-600">{errors.mobileNumber}</p>}
              </div>

              <div>
                <label htmlFor="emailAddress" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="emailAddress"
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.emailAddress ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.emailAddress && <p className="mt-1 text-sm text-red-600">{errors.emailAddress}</p>}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-poppins font-medium text-gray-800 mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                Privacy Notice
              </h4>
              <p className="text-sm text-gray-600 mb-2">Your contact information will be used only for:</p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Verifying your identity and relationship to the missing person</li>
                <li>Communicating updates about the search</li>
                <li>Connecting you with relevant authorities if needed</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                We prioritize your privacy and will not share your information with unauthorized parties.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                <span className="flex items-center">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group"
              >
                <span>Next: Verification</span>
                <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-4">Aadhaar Authentication</h3>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <h4 className="font-poppins font-medium text-gray-800 mb-2 flex items-center">
                <Info className="h-5 w-5 text-red-600 mr-2" />
                Why We Need Aadhaar Verification
              </h4>
              <p className="text-sm text-gray-600 mb-2">Aadhaar verification helps us:</p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Prevent misuse of the platform and false reports</li>
                <li>Establish a verified connection to the missing person</li>
                <li>Enable faster coordination with authorities</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                Your Aadhaar information is encrypted and securely stored in compliance with privacy regulations.
              </p>
            </div>

            {/* Aadhaar Card Upload */}
            <div>
              <label className="block font-poppins text-sm font-medium text-gray-700 mb-3">
                Upload Aadhaar Nano Card Image <span className="text-red-500">*</span>
              </label>

              <CloudinaryUpload
                label="Upload Aadhaar Card"
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, aadhaarImage: url }))}
                acceptedFileTypes="image/*"
                className="mb-4"
              />

              {formData.aadhaarImage && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="w-40 h-40 relative rounded-md overflow-hidden">
                    <Image src={formData.aadhaarImage} alt="Aadhaar Card" fill style={{ objectFit: "cover" }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, aadhaarImage: null }));
                      setIsAadhaarValid(false); // ❌ Reset Aadhaar validation when image is removed
                      setVerificationMessage(""); // ❌ Clear any previous verification message
                    }}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                  >
                    <X className="mr-1 h-4 w-4" /> Remove
                  </button>

                </div>
              )}

              {formData.aadhaarImage && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-2 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Verify Aadhaar
                  </button>
                  <p className="mt-2 text-xs text-gray-500">Click to verify the authenticity of the uploaded Aadhaar card.</p>
                </div>
              )}

              {/* ✅ Aadhaar Verification Message */}
              {verificationMessage && (
                <p className={`mt-2 text-sm ${isAadhaarValid ? "text-green-600" : "text-red-600"}`}>
                  {verificationMessage}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start mt-6">
              <input id="terms" name="terms" type="checkbox" className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
              <label htmlFor="terms" className="ml-3 text-sm font-montserrat text-gray-600">
                I confirm that all information provided is accurate to the best of my knowledge. I understand that filing a false report may lead to legal consequences.
                I agree to the{" "}
                <a href="#" className="text-red-600 hover:text-red-800">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-red-600 hover:text-red-800">Privacy Policy</a>.
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-6 flex space-x-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                <span className="flex items-center">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </span>
              </button>

              <button
                type="submit"
                onClick={handleSubmit}
                className={`w-1/2 font-poppins font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center group ${isAadhaarValid ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-400 cursor-not-allowed text-gray-200"
                  }`}
                disabled={!isAadhaarValid}
              >
                <span>Submit Search Request</span>
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
      className={`min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8 relative overflow-hidden ${montserrat.variable} ${poppins.variable}`}
    >
      <Navbar />
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
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">
            Search for a Missing Person
          </h1>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            Provide detailed information to help us locate your loved one. The more information you provide, the better
            our chances of finding them.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${step < currentStep
                    ? "bg-green-500 text-white"
                    : step === currentStep
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-500"
                    }`}
                >
                  {step < currentStep ? <Check className="h-5 w-5" /> : <span>{step}</span>}
                </div>
                <div className="text-xs mt-2 text-gray-500 hidden md:block">
                  {step === 1 && "Basic Details"}
                  {step === 2 && "Last Seen"}
                  {step === 3 && "Physical Description"}
                  {step === 4 && "Contact Info"}
                  {step === 5 && "Verification"}
                </div>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1 bg-gray-200 rounded"></div>
            </div>
            <div className="absolute inset-0 flex items-center" style={{ width: `${(currentStep - 1) * 25}%` }}>
              <div className="h-1 bg-green-500 rounded"></div>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Help information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start">
            <div className="bg-red-100 p-2 rounded-full mr-4">
              <Search className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-2">Need Help?</h3>
              <p className="font-montserrat text-gray-600 mb-4">
                If you need assistance filling out this form or have questions about the search process, our support
                team is available 24/7.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:1800XXXXXXX"
                  className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Helpline: 1800-XXX-XXXX
                </a>
                <a
                  href="mailto:help@findmissing.org"
                  className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

