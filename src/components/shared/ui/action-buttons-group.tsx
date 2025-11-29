'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActionButton {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'outline'
  disabled?: boolean
  loading?: boolean
}

interface ActionButtonsGroupProps {
  buttons: ActionButton[]
  className?: string
}

const getVariantClasses = (variant: ActionButton['variant']) => {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    case 'success':
      return 'bg-green-600 hover:bg-green-700 text-white'
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white'
    case 'outline':
      return 'border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700'
    default:
      return 'bg-gray-600 hover:bg-gray-700 text-white'
  }
}

export default function ActionButtonsGroup({ buttons, className }: ActionButtonsGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {buttons.map((button, index) => {
        const Icon = button.icon
        return (
          <button
            key={index}
            onClick={button.onClick}
            disabled={button.disabled || button.loading}
            className={cn(
              'inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
              getVariantClasses(button.variant)
            )}
          >
            {button.loading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Icon className="mr-2 h-4 w-4" />
            )}
            {button.label}
          </button>
        )
      })}
    </div>
  )
}
