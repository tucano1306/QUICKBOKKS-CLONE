'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, TrendingUp, PieChart } from 'lucide-react'

export default function ExpenseReportsPage() {
  const router = useRouter()

  const reports = [
    {
      title: 'Gastos por Categoría',
      description: 'Análisis de gastos por categoría',
      icon: PieChart,
      color: 'bg-blue-500'
    },
    {
      title: 'Tendencias Mensuales',
      description: 'Evolución de gastos en el tiempo',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Gastos por Empleado',
      description: 'Resumen de gastos por usuario',
      icon: BarChart3,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de Gastos</h1>
          <p className="text-gray-600 text-sm">Análisis y estadísticas de tus gastos</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`${report.color} p-4 rounded-full text-white`}>
                <report.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{report.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{report.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Placeholder */}
      <Card className="mt-8 p-12 text-center">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Reportes en Desarrollo
        </h3>
        <p className="text-gray-600">
          Los reportes visuales estarán disponibles próximamente
        </p>
      </Card>
    </div>
  )
}
