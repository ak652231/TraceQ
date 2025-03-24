import type { LucideIcon } from "lucide-react"

interface TimelineItemProps {
  date: string
  title: string
  description: string
  icon: LucideIcon
  color: string
}

export default function TimelineItem({ date, title, description, icon: Icon, color }: TimelineItemProps) {
  return (
    <div className="flex mb-6 last:mb-0">
      <div className="flex flex-col items-center mr-4">
        <div className={`p-2 rounded-full ${color} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-gray-200 my-2"></div>
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{date}</p>
        <h4 className="font-medium text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

