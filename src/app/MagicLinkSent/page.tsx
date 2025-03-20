"use client"
import { useSearchParams } from "next/navigation"
import MagicLinkSent from "@/components/MagicLinkSent"

export default function MagicLinkSentPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const isSignUp = searchParams.get("signup") === "true"
  
  const handleResendLink = async () => {
    console.log(`Resending magic link to ${email}`)
    
    try {
      console.log("Magic link resent successfully")
    } catch (error) {
      console.error("Error resending magic link:", error)
    }
  }
  
  return (
    <MagicLinkSent 
      email={email} 
      isSignUp={isSignUp}
      onResendLink={handleResendLink}
    />
  )
}
