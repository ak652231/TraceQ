import { AlertCircle, CheckCircle, Eye, User, XCircle } from "lucide-react"

interface StatusIconProps {
  status: string
  className?: string
}

export default function StatusIcon({ status, className = "h-3.5 w-3.5 mr-1" }: StatusIconProps) {
  switch (status.toLowerCase()) {
    case "pending":
      return <AlertCircle className={className} />
    case "notified_family":
      return <Eye className={className} />
    case "sent_team":
      return <User className={className} />
    case "solved":
      return <CheckCircle className={className} />
    case "reject":
      return <XCircle className={className} />
    case "verified":
      return <CheckCircle className={className} />
    case "rejected":
      return <XCircle className={className} />
    case "confirmed":
      return <CheckCircle className={className} />
    case "denied":
      return <XCircle className={className} />
    default:
      return <AlertCircle className={className} />
  }
}

