'use client'

import { LucideIcon, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface QuickActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose'
  className?: string
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    icon: 'bg-blue-500 text-white',
    text: 'text-blue-700',
    arrow: 'text-blue-500'
  },
  green: {
    bg: 'bg-green-50 hover:bg-green-100',
    icon: 'bg-green-500 text-white',
    text: 'text-green-700',
    arrow: 'text-green-500'
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    icon: 'bg-purple-500 text-white',
    text: 'text-purple-700',
    arrow: 'text-purple-500'
  },
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-700',
    arrow: 'text-amber-500'
  },
  rose: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    icon: 'bg-rose-500 text-white',
    text: 'text-rose-700',
    arrow: 'text-rose-500'
  }
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color = 'blue',
  className
}: QuickActionCardProps) {
  const router = useRouter()
  const styles = colorStyles[color]

  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "w-full p-4 sm:p-5 rounded-xl border border-gray-200/80 transition-all duration-200 text-left group",
        styles.bg,
        className
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          styles.icon
        )}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-sm sm:text-base",
            styles.text
          )}>
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
        <ArrowRight className={cn(
          "w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
          styles.arrow
        )} />
      </div>
    </button>
  )
}
