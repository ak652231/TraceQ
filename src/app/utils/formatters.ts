export const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-IN", options)
  }
  
  export const formatTime = (timeString: string) => {
    return timeString
  }
  
  export const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "notified_family":
        return "bg-blue-100 text-blue-800"
      case "sent_team":
        return "bg-purple-100 text-purple-800"
      case "solved":
        return "bg-green-100 text-green-800"
      case "reject":
        return "bg-red-100 text-red-800"
      case "verified":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "denied":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  
  export const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Pending"
      case "notified_family":
        return "Awaiting Verification"
      case "sent_team":
        return "Under Investigation"
      case "solved":
        return "Solved"
      case "reject":
        return "Rejected"
      case "verified":
        return "Verified"
      case "rejected":
        return "Rejected"
      case "confirmed":
        return "Verified"
      case "denied":
        return "Rejected"
      default:
        return status
    }
  }
  
  export const isAwaitingVerification = (status: string) => {
    return status.toLowerCase() === "notified_family"
  }
  
  