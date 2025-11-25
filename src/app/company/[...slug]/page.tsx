'use client'

import { usePathname } from 'next/navigation'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction, Sparkles } from 'lucide-react'

export default function ComingSoonPage() {
  const pathname = usePathname()
  
  // Extraer el nombre del módulo de la ruta
  const pathParts = pathname?.split('/').filter(Boolean) || []
  const moduleName = pathParts[pathParts.length - 1]?.replace(/-/g, ' ')
  
  return (
    <CompanyTabsLayout>
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Construction className="w-24 h-24 text-gray-300" />
                <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Módulo en Construcción
            </h2>
            <p className="text-gray-600 mb-2 capitalize">
              {moduleName}
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Esta funcionalidad está siendo desarrollada y estará disponible próximamente.
              Estamos trabajando para brindarte la mejor experiencia contable.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-blue-600 font-semibold mb-1">✓ Diseño Completo</div>
                <div className="text-sm text-gray-600">Arquitectura planificada</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-yellow-600 font-semibold mb-1">⚙ En Desarrollo</div>
                <div className="text-sm text-gray-600">Implementación en proceso</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-gray-600 font-semibold mb-1">⏳ Próximamente</div>
                <div className="text-sm text-gray-600">Disponible pronto</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}
