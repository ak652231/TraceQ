"use client"
import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Montserrat, Poppins } from "next/font/google"
import { Calendar, MapPin, Clock, Check, AlertCircle, Info, Users, FileText, Crosshair, Phone } from "lucide-react"
import Image from "next/image"
import Cookies from "js-cookie"
import CloudinaryUpload from "@/components/CloudinaryUpload"
import { set } from "@cloudinary/url-gen/actions/variable"

// Font setup
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

export default function ReportSighting() {
  const params = useParams()
  const router = useRouter()
  const missingPersonId = params.id as string
  const [missingPerson, setMissingPerson] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const suggestionRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [useCurrentTime, setUseCurrentTime] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [analysis,setAnalysis]=useState(null)
  const [heatmapReported, setHeatmapReported] = useState(null)
  const [heatmapMissing, setHeatmapMissing] = useState(null)
  const [matchPercentage, setMatchPercentage] = useState(null)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const [isLogin, setIsLogin] = useState(false)
  const socketRef = useRef(null)
  const [userId, setUserId] = useState("")

  const checkUserLogin = () => {
    const token = Cookies.get("sessionToken") // Get the cookie by its name
    if (token) {
      try {
        // In a real app, you'd properly decode the token
        // This is a simplified example assuming the token contains a userId field
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
  }, []) // This runs only once when the component mounts

  const fetchMissingPersonData = async () => {
    try {
      setIsLoading(true);
      // Your code to fetch missing person data based on missingPersonId
      // ...
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching missing person data:", error);
      setIsLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    sightingDate: new Date().toISOString().split("T")[0],
    sightingTime: new Date().toTimeString().slice(0, 5),
    sightingLocation: "",
    sightingLat: "",
    sightingLng: "",
    sightingName: "",
    locationDetails: "",
    appearanceNotes: "",
    behaviorNotes: "",
    identifyingMarks: "",
    reporterPhoto: "",
    seenWith: "",
  })

  const [errors, setErrors] = useState({
    sightingDate: "",
    sightingTime: "",
    sightingLocation: "",
    locationDetails: "",
    appearanceNotes: "",
    identifyingMarks: "",
    reporterPhoto: "",
  })

  useEffect(() => {
    const fetchMissingPerson = async () => {
      try {
        console.log("Fetching missing person data...")
        const response = await fetch(`/api/missing-persons/${missingPersonId}`)
        if (!response.ok) throw new Error("Failed to fetch missing person")
        const data = await response.json()
        setMissingPerson(data)
        console.log("Missing person data:", data)
      } catch (error) {
        console.error("Error fetching missing person:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMissingPerson()
  }, [missingPersonId])

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
    if (useCurrentLocation) {
      getCurrentLocation()
    }
  }, [useCurrentLocation])

  useEffect(() => {
    if (useCurrentTime) {
      const now = new Date()
      setFormData({
        ...formData,
        sightingDate: now.toISOString().split("T")[0],
        sightingTime: now.toTimeString().slice(0, 5),
      })
    }
  }, [useCurrentTime])

  const saveToRecentSearches = (location) => {
    const updatedSearches = [location, ...recentSearches.filter((item) => item.id !== location.id)].slice(0, 5)
    setRecentSearches(updatedSearches)
    localStorage.setItem("recentLocationSearches", JSON.stringify(updatedSearches))
  }

  const fetchFromNominatim = async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "MissingPersonApp/1.0",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        return data.map((item) => ({
          id: `nom-${item.place_id}`,
          name: item.display_name,
          shortName: formatDisplayName(item),
          source: "nominatim",
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon),
        }))
      }
      return []
    } catch (error) {
      console.error("Nominatim error:", error)
      return []
    }
  }

  // Helper to format Nominatim display name to be more concise
  const formatDisplayName = (item) => {
    if (!item.address) return item.display_name

    const parts = []

    // Add the specific local feature first if available
    if (item.type !== "administrative" && item.name) {
      parts.push(item.name)
    }

    // Add meaningful address components (more specific to less specific)
    const addressPriority = [
      "road",
      "neighbourhood",
      "suburb",
      "quarter",
      "city_district",
      "village",
      "town",
      "city",
      "county",
      "state_district",
      "state",
    ]

    for (const key of addressPriority) {
      if (item.address[key] && !parts.includes(item.address[key])) {
        parts.push(item.address[key])
      }
    }

    // Always include the city/town and state for context
    const cityValue = item.address.city || item.address.town || item.address.village
    if (cityValue && !parts.includes(cityValue)) {
      parts.push(cityValue)
    }

    if (item.address.state && !parts.includes(item.address.state)) {
      parts.push(item.address.state)
    }

    return parts.join(", ")
  }

  // Function to fetch from PhotonAPI (another free geocoding service)
  const fetchFromPhoton = async (query) => {
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&lat=20.5937&lon=78.9629`,
        // Using approximate center of India to bias results
      )

      if (response.ok) {
        const data = await response.json()
        return data.features.map((item) => ({
          id: `photon-${item.properties.osm_id}`,
          name: formatPhotonResult(item.properties),
          shortName: formatPhotonResult(item.properties, true),
          source: "photon",
          lat: item.geometry.coordinates[1],
          lng: item.geometry.coordinates[0],
        }))
      }
      return []
    } catch (error) {
      console.error("Photon error:", error)
      return []
    }
  }

  const formatPhotonResult = (props, short = false) => {
    const parts = []

    if (props.name) {
      parts.push(props.name)
    }

    if (props.street && !short) {
      parts.push(props.street)
    }

    if (props.district) {
      parts.push(props.district)
    } else if (props.neighbourhood) {
      parts.push(props.neighbourhood)
    } else if (props.suburb) {
      parts.push(props.suburb)
    }

    if (props.city) {
      parts.push(props.city)
    } else if (props.town) {
      parts.push(props.town)
    } else if (props.village) {
      parts.push(props.village)
    }

    if (props.state) {
      parts.push(props.state)
    }

    return parts.join(", ")
  }

  // Function to fetch from both services and combine results
  const fetchLocationSuggestions = async (query) => {
    setIsLocationLoading(true)

    try {
      // Request from both services in parallel
      const [nominatimResults, photonResults] = await Promise.all([fetchFromNominatim(query), fetchFromPhoton(query)])

      // Combine and deduplicate results
      const combinedResults = []
      const addedNames = new Set()

      // First add Nominatim results (often better for India)
      for (const result of nominatimResults) {
        if (!addedNames.has(result.shortName)) {
          combinedResults.push(result)
          addedNames.add(result.shortName)
        }
      }

      // Then add unique Photon results
      for (const result of photonResults) {
        if (!addedNames.has(result.shortName)) {
          combinedResults.push(result)
          addedNames.add(result.shortName)
        }
      }

      setSuggestions(combinedResults)
      setShowSuggestions(combinedResults.length > 0)
    } catch (error) {
      console.error("Error fetching location suggestions:", error)
    } finally {
      setIsLocationLoading(false)
    }
  }

  // Function to handle input change with debounce
  const handleLocationChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }

    // If the input is for location, show suggestions with debounce
    if (name === "sightingLocation") {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      if (value.trim().length >= 2) {
        setIsLocationLoading(true)
        searchTimeoutRef.current = setTimeout(() => {
          fetchLocationSuggestions(value)
        }, 300) // 300ms debounce
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        setIsLocationLoading(false)
      }
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setFormData({
      ...formData,
      sightingLocation: suggestion.name,
      sightingLat: suggestion.lat.toString(),
      sightingLng: suggestion.lng.toString(),
    })
    setSelectedLocation(suggestion)
    setShowSuggestions(false)
    saveToRecentSearches(suggestion)
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
              {
                headers: {
                  "Accept-Language": "en",
                  "User-Agent": "MissingPersonApp/1.0",
                },
              },
            )

            if (response.ok) {
              const data = await response.json()
              const locationName = data.display_name

              setFormData({
                ...formData,
                sightingLocation: locationName,
                sightingLat: lat.toString(),
                sightingLng: lng.toString(),
                sightingName: formatDisplayName(data),
              })

              setSelectedLocation({
                id: `current-location`,
                name: locationName,
                shortName: formatDisplayName(data),
                lat,
                lng,
              })
            }
          } catch (error) {
            console.error("Error reverse geocoding:", error)
            setFormData({
              ...formData,
              sightingLocation: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
              sightingLat: lat.toString(),
              sightingLng: lng.toString(),
              sigh
            })
          }
        },
        (error) => {
          console.error("Error getting location:", error)
          alert("Unable to get your current location. Please enter location manually.")
          setUseCurrentLocation(false)
        },
      )
    } else {
      alert("Geolocation is not supported by your browser. Please enter location manually.")
      setUseCurrentLocation(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  // Validate form
  const validateForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    if (!formData.sightingDate) {
      newErrors.sightingDate = "Sighting date is required"
      isValid = false
    }

    if (!formData.sightingTime) {
      newErrors.sightingTime = "Sighting time is required"
      isValid = false
    }

    if (!formData.sightingLocation) {
      newErrors.sightingLocation = "Sighting location is required"
      isValid = false
    }

    if (!formData.locationDetails) {
      newErrors.locationDetails = "Location details are required"
      isValid = false
    }

    if (!formData.appearanceNotes) {
      newErrors.appearanceNotes = "Appearance notes are required"
      isValid = false
    }

    if (!formData.identifyingMarks) {
      newErrors.identifyingMarks = "Identifying marks are required"
      isValid = false
    }

    if (!formData.reporterPhoto) {
      newErrors.reporterPhoto = "A photo of the sighting is required"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }
  const drawHeatmaps = async (imageUrl, heatmapData) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the original image first
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Convert 2D array heatmap data to visual representation
            if (heatmapData && Array.isArray(heatmapData) && heatmapData.length > 0) {
                const heatmapHeight = heatmapData.length;
                const heatmapWidth = heatmapData[0].length;
                
                // Create a new canvas for the heatmap
                const heatmapCanvas = document.createElement('canvas');
                const heatmapCtx = heatmapCanvas.getContext('2d');
                heatmapCanvas.width = heatmapWidth;
                heatmapCanvas.height = heatmapHeight;
                
                // Find the maximum value in the heatmap data for better normalization
                let maxValue = 0;
                for (let y = 0; y < heatmapHeight; y++) {
                    for (let x = 0; x < heatmapWidth; x++) {
                        maxValue = Math.max(maxValue, heatmapData[y][x]);
                    }
                }
                
                // Draw the heatmap on the small canvas
                const imageData = heatmapCtx.createImageData(heatmapWidth, heatmapHeight);
                
                for (let y = 0; y < heatmapHeight; y++) {
                    for (let x = 0; x < heatmapWidth; x++) {
                        // Normalize the value by the maximum found
                        const value = heatmapData[y][x] / maxValue;
                        const index = (y * heatmapWidth + x) * 4;
                        
                        // Use a color scale that's more informative for facial comparison
                        // Blue (low importance) to Green (medium) to Red (high importance)
                        if (value < 0.3) {  // Low importance
                            imageData.data[index] = 0;
                            imageData.data[index + 1] = 0;
                            imageData.data[index + 2] = Math.floor(value * 3 * 255);
                            imageData.data[index + 3] = Math.floor(value * 200); // Lower alpha for low values
                        } else if (value < 0.7) {  // Medium importance
                            imageData.data[index] = 0;
                            imageData.data[index + 1] = Math.floor((value - 0.3) * 2.5 * 255);
                            imageData.data[index + 2] = 0;
                            imageData.data[index + 3] = Math.floor(value * 220); // Medium alpha
                        } else {  // High importance
                            imageData.data[index] = Math.floor((value - 0.7) * 3.33 * 255);
                            imageData.data[index + 1] = 0;
                            imageData.data[index + 2] = 0;
                            imageData.data[index + 3] = Math.floor(value * 255); // Full alpha for high values
                        }
                    }
                }
                
                heatmapCtx.putImageData(imageData, 0, 0);
                
                // Add a semi-transparent overlay of the original image
                ctx.globalAlpha = 0.7; // Make the overlay semi-transparent
                ctx.drawImage(
                    heatmapCanvas, 
                    0, 0, heatmapWidth, heatmapHeight,
                    0, 0, img.width, img.height
                );
                
                // Add feature markers for key facial features
                // This assumes the heatmap has higher values at key facial features
                const featureThreshold = 0.8 * maxValue;
                const potentialFeatures = [];
                
                // Find potential facial features
                for (let y = 1; y < heatmapHeight - 1; y++) {
                    for (let x = 1; x < heatmapWidth - 1; x++) {
                        if (heatmapData[y][x] > featureThreshold) {
                            // Check if it's a local maximum
                            let isMax = true;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    if (heatmapData[y + dy][x + dx] > heatmapData[y][x]) {
                                        isMax = false;
                                        break;
                                    }
                                }
                                if (!isMax) break;
                            }
                            
                            if (isMax) {
                                potentialFeatures.push({
                                    x: x / heatmapWidth * img.width,
                                    y: y / heatmapHeight * img.height,
                                    value: heatmapData[y][x]
                                });
                            }
                        }
                    }
                }
                
                // Draw feature markers
                ctx.globalAlpha = 1.0;
                potentialFeatures.forEach((feature, index) => {
                    // Draw a circle around the feature
                    ctx.beginPath();
                    ctx.arc(feature.x, feature.y, 10, 0, Math.PI * 2);
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Label the feature
                    ctx.fillStyle = 'yellow';
                    ctx.font = '12px Arial';
                    ctx.fillText(`F${index + 1}`, feature.x + 12, feature.y);
                });
                
                // Add a legend
                const legendHeight = 20;
                const legendWidth = 200;
                const legendX = 10;
                const legendY = img.height - legendHeight - 10;
                
                // Draw the gradient legend
                const gradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY);
                gradient.addColorStop(0, 'blue');
                gradient.addColorStop(0.5, 'green');
                gradient.addColorStop(1, 'red');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
                
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText('Low', legendX, legendY - 5);
                ctx.fillText('Medium', legendX + legendWidth/2 - 20, legendY - 5);
                ctx.fillText('High', legendX + legendWidth - 20, legendY - 5);
                
                console.log("Enhanced heatmap drawn on image with feature markers.");
            } else {
                console.warn("No heatmap data provided or invalid format.");
            }

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error("Canvas toBlob failed"));
                }
                resolve(blob); 
            }, 'image/png');
        };

        img.onerror = (error) => reject(new Error("Failed to load image for processing: " + error.message));
    });
};

const uploadToCloudinary = async (imageBlob) => {
    if (!imageBlob) {
        console.error("Invalid image blob for upload");
        return null;
    }

    const formData = new FormData();
    formData.append("file", imageBlob, "processed_image.png");
    formData.append("upload_preset", uploadPreset);

    console.log("Uploading processed image to Cloudinary...");

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Upload failed");
        }

        const data = await response.json();
        console.log("Upload successful:", data.secure_url);
        return data.secure_url; 
    } catch (error) {
        console.error("Upload failed:", error);
        return null;
    }
};
function generateAIExplanation(analysis_summary) {
  if (!analysis_summary) return "No analysis available.";

  const matchPercent = analysis_summary.confidence_level === "High" ? "Matched strongly" : 
                       analysis_summary.confidence_level === "Medium" ? "Moderate match" : 
                       "Low match";
  
  const topMatches = analysis_summary.key_matching_features.map(([feature]) => feature).join(" and ");
  const topDifferences = analysis_summary.key_differing_features.map(([feature]) => feature).join(" and ");

  return `${matchPercent} based on ${topMatches}, but differs in ${topDifferences}.`;
}


const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
      if (!formData.reporterPhoto || !missingPerson.photo) {
          throw new Error("Both photos are required.");
      }

      console.log("Calling face comparison API...");
      const faceLandmarkResponse = await fetch(
          `http://localhost:5000/compare-faces?image1_url=${encodeURIComponent(formData.reporterPhoto)}&image2_url=${encodeURIComponent(missingPerson.photo)}`
      );

      if (!faceLandmarkResponse.ok) {
          throw new Error(`Face comparison API error: ${faceLandmarkResponse.statusText}`);
      }

      const comparisonData = await faceLandmarkResponse.json();
      if (!comparisonData || !comparisonData.image1_heatmap || !comparisonData.image2_heatmap) {
          throw new Error("Invalid heatmap data received.");
      }

      const { 
        match_percentage, 
        region_matches, 
        image1_heatmap, 
        image2_heatmap, 
        landmarks1, 
        landmarks2, 
        analysis_summary 
    } = comparisonData;
    const explanation = generateAIExplanation(analysis_summary);
    setAnalysis(explanation);
    console.log(explanation);
    console.log("Match Percentage:", match_percentage);
    console.log("Region Matches:", region_matches);
    console.log("Image 1 Heatmap:", image1_heatmap);
    console.log("Image 2 Heatmap:", image2_heatmap);
    console.log("Landmarks in Image 1:", landmarks1);
    console.log("Landmarks in Image 2:", landmarks2);
      console.log("Processing reporter photo...");
      const processedImage1 = await drawHeatmaps(formData.reporterPhoto, image1_heatmap);
      if (!processedImage1) throw new Error("Failed to process reporter photo");

      console.log("Processing missing person photo...");
      const processedImage2 = await drawHeatmaps(missingPerson.photo, image2_heatmap);
      if (!processedImage2) throw new Error("Failed to process missing person photo");

      console.log("Uploading processed images...");
      const uploadedReporterPhoto = await uploadToCloudinary(processedImage1);
      const uploadedMissingPersonPhoto = await uploadToCloudinary(processedImage2);

      if (!uploadedReporterPhoto || !uploadedMissingPersonPhoto) {
          throw new Error("One or both image uploads failed.");
      }

      console.log("Successfully uploaded processed images.");
      console.log("Reporter photo URL:", uploadedReporterPhoto);
      console.log("Missing person photo URL:", uploadedMissingPersonPhoto);
      setHeatmapReported(uploadedReporterPhoto);
      setMatchPercentage(match_percentage);
      console.log(selectedLocation.lat, selectedLocation.lng);
      const response = await submitSightingReport(uploadedMissingPersonPhoto,uploadedReporterPhoto, match_percentage,explanation);
      if (!response.success) {
          console.error("Failed to submit sighting report:", response.error);
      }
      console.log("Sighting report submitted successfully:", response.success);
      setSubmitSuccess(true);
  } catch (error) {
      console.error("Error submitting form:", error);
  } finally {
      setIsSubmitting(false);
  }
};

const submitSightingReport = async (reporterPhoto, missingPersonPhoto, match_percentage, explanation) => {
  try {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    console.log("Submitting sighting report...");
    const payload = {
      reportedByUserId: userId,
      verifiedByPoliceId: missingPerson.handledByPoliceId, 
      sightingDate: formData.sightingDate,
      sightingTime: formData.sightingTime,
      sightingLat: parseFloat(formData.sightingLat),
      sightingLng: parseFloat(formData.sightingLng),
      sightingName: formData.sightingName,
      locationDetails: formData.locationDetails,
      appearanceNotes: formData.appearanceNotes,
      behaviorNotes: formData.behaviorNotes || null,
      identifyingMarks: formData.identifyingMarks,
      reporterPhoto: formData.reporterPhoto,
      seenWith: formData.seenWith || null,
      originalPhoto: missingPerson.photo,
      missingPersonId: missingPersonId,
      analysis: explanation || "Pending",
      reporterHeat: reporterPhoto ,
      originalHeat: missingPersonPhoto ,
      matchPercentage: match_percentage ,
      status: "Pending",
    };
    console.log("Sighting report payload:", payload);
   
    const response = await fetch("/api/sighting-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to submit sighting report");
    }

    console.log("Sighting report submitted:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error submitting sighting report:", error);
    return { success: false, error: error.message };
  }
};


  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [suggestionRef])

  if (isLoading) {
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
        <div
          className="absolute rounded-full bg-red-200 w-[200px] h-[200px] bottom-[10%] left-[10%] opacity-40"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
          }}
        ></div>
      </div>

      {/* Main container */}
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-gray-800 mb-2">Report a Sighting</h1>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            Your information could help reunite a missing person with their loved ones. Please provide as much detail as
            possible.
          </p>
        </div>

        {/* Missing person info card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-1/3 relative h-48 md:h-auto">
              <Image
                src={missingPerson?.photo || "/placeholder.svg?height=300&width=200"}
                alt={missingPerson?.fullName || "Missing Person"}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 md:w-2/3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-poppins font-semibold text-xl text-gray-800">
                    {missingPerson?.fullName || "Missing Person"}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {missingPerson?.age} years, {missingPerson?.gender}
                  </p>
                </div>
                <div className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">Missing</div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                  <p className="text-gray-600 text-sm">Last seen at {missingPerson?.lastSeenLocation}</p>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                  <p className="text-gray-600 text-sm">
                    On{" "}
                    {missingPerson?.lastSeenDate
                      ? new Date(missingPerson.lastSeenDate).toLocaleDateString()
                      : "Unknown date"}
                    at {missingPerson?.lastSeenTime || "Unknown time"}
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    You are reporting that you have seen this person. This information will be shared with authorities
                    and the person's family.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              <h3 className="font-poppins font-semibold text-xl text-gray-800 mb-6">Sighting Details</h3>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="sightingDate" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                    Date of Sighting <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="sightingDate"
                      name="sightingDate"
                      value={formData.sightingDate}
                      onChange={handleChange}
                      disabled={useCurrentTime}
                      className={`w-full pl-10 pr-4 py-2 border ${errors.sightingDate ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${useCurrentTime ? "bg-gray-100" : ""}`}
                    />
                  </div>
                  {errors.sightingDate && <p className="mt-1 text-sm text-red-600">{errors.sightingDate}</p>}
                </div>

                <div>
                  <label htmlFor="sightingTime" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                    Time of Sighting <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="sightingTime"
                      name="sightingTime"
                      value={formData.sightingTime}
                      onChange={handleChange}
                      disabled={useCurrentTime}
                      className={`w-full pl-10 pr-4 py-2 border ${errors.sightingTime ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${useCurrentTime ? "bg-gray-100" : ""}`}
                    />
                  </div>
                  {errors.sightingTime && <p className="mt-1 text-sm text-red-600">{errors.sightingTime}</p>}
                </div>
              </div>

              {/* Use current date/time option */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useCurrentTime}
                    onChange={() => setUseCurrentTime(!useCurrentTime)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use current date and time</span>
                </label>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label htmlFor="sightingLocation" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Location of Sighting <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={suggestionRef}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="sightingLocation"
                    name="sightingLocation"
                    value={formData.sightingLocation}
                    onChange={handleLocationChange}
                    disabled={useCurrentLocation}
                    className={`w-full pl-10 pr-4 py-2 border ${errors.sightingLocation ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${useCurrentLocation ? "bg-gray-100" : ""}`}
                    placeholder="Enter location where you saw the person"
                    autoComplete="off"
                  />

                  {/* Loading indicator */}
                  {isLocationLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    </div>
                  )}

                  {/* Suggestions dropdown */}
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

                      {/* Recent searches section */}
                      {!isLocationLoading && suggestions.length === 0 && recentSearches.length > 0 && (
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
                {errors.sightingLocation && <p className="mt-1 text-sm text-red-600">{errors.sightingLocation}</p>}
              </div>

              {/* Use current location option */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useCurrentLocation}
                    onChange={() => setUseCurrentLocation(!useCurrentLocation)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use my current location</span>
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
                >
                  <Crosshair className="h-4 w-4 mr-1" />
                  Get current location
                </button>
              </div>

              {/* Location Details */}
              <div className="mb-6">
                <label htmlFor="locationDetails" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Location Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="locationDetails"
                  name="locationDetails"
                  value={formData.locationDetails}
                  onChange={handleChange}
                  rows={2}
                  className={`w-full px-4 py-2 border ${errors.locationDetails ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="E.g., near the bus stop, inside the mall, etc."
                />
                {errors.locationDetails && <p className="mt-1 text-sm text-red-600">{errors.locationDetails}</p>}
                <p className="mt-1 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Provide specific details about the location to help authorities find the person
                </p>
              </div>

              {/* Photo Upload */}
              <div className="mb-6">
                <label className="block font-poppins text-sm font-medium text-gray-700 mb-3">
                  Photo of Sighting <span className="text-red-500">*</span>
                </label>

                <CloudinaryUpload
                  label="Upload Photo"
                  onUploadSuccess={(url) => {
                    setFormData((prev) => ({
                      ...prev,
                      reporterPhoto: url,
                    }))
                    // Clear error when user uploads a file
                    if (errors.reporterPhoto) {
                      setErrors({
                        ...errors,
                        reporterPhoto: "",
                      })
                    }
                  }}
                  acceptedFileTypes="image/*"
                  className="mb-4"
                />

                {/* Show uploaded image preview */}
                {formData.reporterPhoto && (
                  <div className="flex flex-col items-center mt-2">
                    <div className="w-32 h-32 relative mb-3 rounded-md overflow-hidden">
                      <img
                        src={formData.reporterPhoto || "/placeholder.svg"}
                        alt="Uploaded photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, reporterPhoto: "" }))}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {errors.reporterPhoto && <p className="mt-1 text-sm text-red-600">{errors.reporterPhoto}</p>}

                <p className="mt-1 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Upload a photo of the person from your sighting if possible
                </p>
              </div>

              {/* Appearance Notes */}
              <div className="mb-6">
                <label htmlFor="appearanceNotes" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Appearance Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="appearanceNotes"
                  name="appearanceNotes"
                  value={formData.appearanceNotes}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-2 border ${errors.appearanceNotes ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="Describe how the person looked (clothing, physical condition, etc.)"
                />
                {errors.appearanceNotes && <p className="mt-1 text-sm text-red-600">{errors.appearanceNotes}</p>}
              </div>

              {/* Behavior Notes */}
              <div className="mb-6">
                <label htmlFor="behaviorNotes" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Behavior Notes <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="behaviorNotes"
                  name="behaviorNotes"
                  value={formData.behaviorNotes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Describe how the person was behaving (confused, distressed, calm, etc.)"
                />
              </div>

              {/* Identifying Marks */}
              <div className="mb-6">
                <label htmlFor="identifyingMarks" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Identifying Marks <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="identifyingMarks"
                  name="identifyingMarks"
                  value={formData.identifyingMarks}
                  onChange={handleChange}
                  rows={2}
                  className={`w-full px-4 py-2 border ${errors.identifyingMarks ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors`}
                  placeholder="Any visible scars, tattoos, birthmarks, etc."
                />
                {errors.identifyingMarks && <p className="mt-1 text-sm text-red-600">{errors.identifyingMarks}</p>}
              </div>

              {/* Seen With */}
              <div className="mb-6">
                <label htmlFor="seenWith" className="block font-poppins text-sm font-medium text-gray-700 mb-1">
                  Seen With <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="seenWith"
                    name="seenWith"
                    value={formData.seenWith}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Was the person with someone? Describe them."
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h4 className="font-poppins font-medium text-gray-800 mb-2 flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  Important Information
                </h4>
                <p className="text-sm text-gray-600 mb-2">By submitting this report:</p>
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  <li>You confirm that all information provided is accurate to the best of your knowledge</li>
                  <li>You understand that filing a false report may lead to legal consequences</li>
                  <li>Your report will be shared with authorities and the missing person's family</li>
                </ul>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start mb-6">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="terms" className="ml-3 text-sm font-montserrat text-gray-600">
                  I confirm that all information provided is accurate to the best of my knowledge. I understand that
                  filing a false report may lead to legal consequences. I agree to the{" "}
                  <a href="#" className="text-red-600 hover:text-red-800">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-red-600 hover:text-red-800">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || submitSuccess}
                  className={`bg-red-600 hover:bg-red-700 text-white font-poppins font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center ${isSubmitting || submitSuccess ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : submitSuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Report Submitted
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Sighting Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start">
            <div className="bg-red-100 p-2 rounded-full mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg text-gray-800 mb-2">Need Help?</h3>
              <p className="font-montserrat text-gray-600 mb-4">
                If you need assistance filling out this form or have questions about the reporting process, our support
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

