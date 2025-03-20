"use client"
import type React from "react"
import { useEffect, useRef } from "react"
import { Shield, MapPin, Users, Lock } from "lucide-react"
import { Montserrat, Poppins } from "next/font/google"

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

const ServiceCards: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-red-500" />,
      title: "Aadhaar-Based Secure Identification",
      description: "Verify identities securely using Aadhaar authentication.",
    },
    {
      icon: <MapPin className="h-8 w-8 text-red-500" />,
      title: "Live GPS Tracking of Sightings",
      description: "Real-time location tracking of reported sightings.",
    },
    {
      icon: <Users className="h-8 w-8 text-red-500" />,
      title: "Collaboration with Police & NGOs",
      description: "Seamless information sharing with authorities.",
    },
    {
      icon: <Lock className="h-8 w-8 text-red-500" />,
      title: "End-to-End Encrypted Data Protection",
      description: "Your sensitive information is fully encrypted.",
    },
  ]

  // Update the SVG lines when the window resizes
  useEffect(() => {
    const updateLines = () => {
      if (!svgRef.current) return

      // Target the actual animated pin rather than just the landing spot
      const animatedPin = document.getElementById("main-location-pin")
      const cards = document.querySelectorAll(".feature-card")

      if (!animatedPin || cards.length !== 4) return

      const pinRect = animatedPin.getBoundingClientRect()
      const svgRect = svgRef.current.getBoundingClientRect()

      // Calculate pin center position relative to SVG
      const pinCenterX = pinRect.left + pinRect.width / 2 - svgRect.left
      const pinCenterY = pinRect.top + pinRect.height / 2 - svgRect.top

      // Update each line
      const lines = svgRef.current.querySelectorAll("line")

      cards.forEach((card, index) => {
        if (index >= lines.length) return

        const cardRect = card.getBoundingClientRect()
        // Connect lines to the TOP of the cards instead of center
        const cardTopX = cardRect.left + cardRect.width / 2 - svgRect.left
        const cardTopY = cardRect.top - svgRect.top + 6 // Adding small offset from the very top

        // Update line coordinates
        const line = lines[index] as SVGLineElement
        line.setAttribute("x1", cardTopX.toString())
        line.setAttribute("y1", cardTopY.toString())
        line.setAttribute("x2", pinCenterX.toString())
        line.setAttribute("y2", pinCenterY.toString())
      })
    }

    // Set up an observer to detect when the pin position changes during animation
    const setupPinObserver = () => {
      const animatedPin = document.getElementById("main-location-pin")
      if (!animatedPin) return

      // Update lines initially
      setTimeout(updateLines, 500)

      // Use MutationObserver to detect style changes on the pin (from GSAP)
      const observer = new MutationObserver((mutations) => {
        updateLines()
      })

      // Watch for style attribute changes which happen during GSAP animation
      observer.observe(animatedPin, {
        attributes: true,
        attributeFilter: ["style"],
      })

      return observer
    }

    // Set up the observer and add scroll/resize listeners
    const observer = setupPinObserver()
    window.addEventListener("resize", updateLines)
    window.addEventListener("scroll", updateLines)

    // Keep updating lines periodically to ensure they're correct
    const intervalId = setInterval(updateLines, 100)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateLines)
      window.removeEventListener("scroll", updateLines)
      clearInterval(intervalId)
    }
  }, [])

  return (
    <div className={`relative w-full ${montserrat.variable} ${poppins.variable}`}>
      <h3 className="text-center font-poppins text-2xl font-bold text-red-600 mb-16 tracking-tight">
        <span className="text-black relative inline-block after:content-[''] after:absolute after:w-12 after:h-1 after:bg-red-500 after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2">
          Key Features
        </span>
      </h3>

      <div className="relative flex justify-center items-center w-full">
        {/* Center section with pin landing spot */}
        <div className="relative mx-8 flex flex-col items-center justify-center">
          {/* Pin landing spot */}
          <div id="pin-landing-spot" className="relative h-16 w-16 z-20">
            {/* Empty div as target for the animated pin */}
          </div>

          {/* Webname text below the pin */}
          <div className="z-10">
            <span className="text-red-600 font-poppins font-bold text-xl tracking-wide">FindMate</span>
          </div>
        </div>
      </div>

      {/* SVG for connecting lines - CHANGED Z-INDEX to be behind cards */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <line stroke="#ff3a3a" strokeWidth="1" strokeDasharray="5,5" />
        <line stroke="#ff3a3a" strokeWidth="1" strokeDasharray="5,5" />
        <line stroke="#ff3a3a" strokeWidth="1" strokeDasharray="5,5" />
        <line stroke="#ff3a3a" strokeWidth="1" strokeDasharray="5,5" />
      </svg>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-16">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card bg-white rounded-lg shadow-lg p-6 transform transition-all hover:scale-105 z-20 border-t-4 border-red-500"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-100 rounded-full shadow-md">{feature.icon}</div>
              <div>
                <h3 className="text-red-600 font-poppins font-bold text-lg mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-gray-700 font-montserrat leading-relaxed text-[15px]">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServiceCards

