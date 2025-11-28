'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, FileText, ArrowRight, Calendar, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import Link from 'next/link'

interface TaxForm {
  id: string
  name: string
  description: string
  frequency: string
  deadline: string
  status: 'pending' | 'filed' | 'upcoming'
  href: string
}

export default function TaxFilingsPage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  const taxForms: TaxForm[] = [
    {
      id: 'w2',
      name: 'Form W-2',
      description: 'Wage and Tax Statement - Declaración de salarios e impuestos para cada empleado',
      frequency: 'Anual',
      deadline: 'Enero 31',
      status: 'upcoming',
      href: '/payroll/tax-filings/w2'
    },
    {
      id: 'w3',
      name: 'Form W-3',
      description: 'Transmittal of Wage and Tax Statements - Resumen de todos los W-2',
      frequency: 'Anual',
      deadline: 'Enero 31',
      status: 'upcoming',
      href: '/payroll/tax-filings/w3'
    },
    {
      id: '941',
      name: 'Form 941',
      description: 'Employer\'s Quarterly Federal Tax Return - Reporte trimestral de impuestos federales',
      frequency: 'Trimestral',
      deadline: 'Último día del mes siguiente al trimestre',
      status: 'pending',
      href: '/payroll/tax-filings/941'
    },
    {
      id: '940',
      name: 'Form 940',
      description: 'Employer\'s Annual Federal Unemployment (FUTA) Tax Return',
      frequency: 'Anual',
      deadline: 'Enero 31',
      status: 'upcoming',
      href: '/payroll/tax-filings/940'
    },
    {
      id: '1099',
      name: 'Form 1099-NEC',
      description: 'Nonemployee Compensation - Para contratistas independientes',
      frequency: 'Anual',
      deadline: 'Enero 31',
      status: 'upcoming',
      href: '/payroll/tax-filings/1099'
    },
    {
      id: 'rt6',
      name: 'Form RT-6',
      description: 'Florida Employer\'s Quarterly Report - Reporte trimestral de desempleo de Florida',
      frequency: 'Trimestral',
      deadline: 'Último día del mes siguiente al trimestre',
      status: 'pending',
      href: '/payroll/tax-filings/rt6'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Presentado</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700"><Calendar className="w-3 h-3 mr-1" /> Próximo</Badge>
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-8 h-8 text-red-600" />
                Formularios de Impuestos - {currentYear}
              </h1>
              <p className="text-gray-600">Gestiona y presenta tus declaraciones de impuestos de nómina</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <div>
                <div className="font-semibold text-orange-900">Próximas fechas límite</div>
                <div className="text-sm text-orange-700">
                  Form 941 Q4 {currentYear - 1}: Enero 31, {currentYear} | Form W-2: Enero 31, {currentYear}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxForms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                  {getStatusBadge(form.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{form.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>📅 {form.frequency}</span>
                  <span>⏰ {form.deadline}</span>
                </div>
                <Link href={form.href}>
                  <Button className="w-full">
                    Ver Formulario
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Información sobre Formularios de Impuestos</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Form 941:</strong> Presenta trimestralmente los impuestos federales retenidos y FICA</li>
                  <li>• <strong>Form 940:</strong> Reporta anualmente los impuestos FUTA (desempleo federal)</li>
                  <li>• <strong>Form W-2:</strong> Entrega a cada empleado antes del 31 de enero</li>
                  <li>• <strong>Form W-3:</strong> Resume todos los W-2 y se envía a la SSA</li>
                  <li>• <strong>Form 1099-NEC:</strong> Para contratistas que recibieron $600 o más</li>
                  <li>• <strong>Form RT-6:</strong> Reporte de desempleo de Florida (si aplica)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
