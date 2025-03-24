import { AlertCircle, CheckCircle, XCircle, Bell, Users, Search } from "lucide-react"

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Verified: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Investigating: "bg-blue-100 text-blue-800",
    NOTIFIED_FAMILY: "bg-blue-100 text-blue-800",
    SENT_TEAM: "bg-purple-100 text-purple-800",
    SOLVED: "bg-green-100 text-green-800",
    REJECT: "bg-red-100 text-red-800",
  }

  const statusIcons: Record<string, JSX.Element> = {
    Pending: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
    Verified: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    Rejected: <XCircle className="h-3.5 w-3.5 mr-1" />,
    Investigating: <Search className="h-3.5 w-3.5 mr-1" />,
    NOTIFIED_FAMILY: <Bell className="h-3.5 w-3.5 mr-1" />,
    SENT_TEAM: <Users className="h-3.5 w-3.5 mr-1" />,
    SOLVED: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    REJECT: <XCircle className="h-3.5 w-3.5 mr-1" />,
  }

  const displayStatus: Record<string, string> = {
    Pending: "Pending",
    Verified: "Verified",
    Rejected: "Rejected",
    Investigating: "Investigating",
    NOTIFIED_FAMILY: "Family Notified",
    SENT_TEAM: "Team Dispatched",
    SOLVED: "Solved",
    REJECT: "Rejected",
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"} ${className}`}
    >
      {statusIcons[status] || <AlertCircle className="h-3.5 w-3.5 mr-1" />}
      {displayStatus[status] || status}
    </span>
  )
}

