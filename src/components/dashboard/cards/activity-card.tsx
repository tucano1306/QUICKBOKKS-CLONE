'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, MoreVertical } from 'lucide-react'

interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
}

interface ActivityCardProps {
  title: string
  activities: ActivityItem[]
  className?: string
  maxItems?: number
  onViewAll?: () => void
}

export function ActivityCard({
  title,
  activities,
  className,
  maxItems = 5,
  onViewAll
}: ActivityCardProps) {
  const displayedActivities = activities.slice(0, maxItems)

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200/80 shadow-lg shadow-gray-200/50",
      className
    )}>
      <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {onViewAll && (
            <button 
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todo
            </button>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {displayedActivities.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No hay actividad reciente
          </div>
        ) : (
          displayedActivities.map((activity) => {
            const Icon = activity.icon
            return (
              <div 
                key={activity.id}
                className="p-4 sm:p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    activity.iconBgColor || 'bg-blue-100'
                  )}>
                    <Icon className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      activity.iconColor || 'text-blue-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
