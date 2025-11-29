'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, ArrowRight, LucideIcon } from 'lucide-react'

interface QuickAccessLink {
  label: string
  href: string
  icon: LucideIcon
  color: string
}

interface QuickAccessBarProps {
  title?: string
  links: QuickAccessLink[]
  showHome?: boolean
}

export default function QuickAccessBar({ title = 'Acceso Rápido', links, showHome = true }: QuickAccessBarProps) {
  const router = useRouter()

  return (
    <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-blue-200 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          </div>
          {showHome && (
            <Button
              onClick={() => router.push('/company')}
              variant="ghost"
              size="sm"
              className="gap-1 h-8 text-xs"
            >
              <Home className="w-3.5 h-3.5" />
              Inicio
            </Button>
          )}
        </div>
        <div className={`grid gap-2 ${
          links.length === 2 ? 'grid-cols-2' :
          links.length === 3 ? 'grid-cols-3' :
          links.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
          links.length === 5 ? 'grid-cols-2 md:grid-cols-5' :
          'grid-cols-2 md:grid-cols-6'
        }`}>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Button
                key={link.href}
                onClick={() => router.push(link.href)}
                variant="outline"
                className={`h-auto py-2.5 px-3 flex-col gap-1.5 hover:bg-white hover:border-${link.color}-400 hover:shadow-md transition-all bg-white/50`}
              >
                <Icon className={`w-4 h-4 text-${link.color}-600`} />
                <div className="text-xs font-medium text-center leading-tight">
                  {link.label}
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
