'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bell,
  Save,
  X,
  Mail,
  MessageSquare,
  Calendar,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewReminderPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(false)
  const [reminderName, setReminderName] = useState('')
  const [reminderType, setReminderType] = useState<'overdue' | 'upcoming' | 'thank-you'>('upcoming')
  const [schedule, setSchedule] = useState<'before_due' | 'after_due' | 'on_due'>('before_due')
  const [days, setDays] = useState(3)
  const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [autoSend, setAutoSend] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    // Set default templates based on type
    switch (reminderType) {
      case 'upcoming':
        setReminderName('Recordatorio de Vencimiento')
        setEmailSubject('Recordatorio: Su factura vence pronto')
        setEmailBody('Estimado cliente,\n\nLe recordamos que su factura {invoice_number} por ${amount} vence el {due_date}.\n\nGracias por su preferencia.')
        break
      case 'overdue':
        setReminderName('Factura Vencida')
        setEmailSubject('Aviso: Factura vencida')
        setEmailBody('Estimado cliente,\n\nSu factura {invoice_number} por ${amount} venció el {due_date}.\n\nPor favor, realice su pago a la brevedad.')
        break
      case 'thank-you':
        setReminderName('Agradecimiento por Pago')
        setEmailSubject('¡Gracias por su pago!')
        setEmailBody('Estimado cliente,\n\n¡Gracias por su pago de ${amount}!\n\nHemos recibido su pago correspondiente a la factura {invoice_number}.')
        break
    }
  }, [reminderType])

  const handleSave = async () => {
    if (!reminderName || !emailSubject || !emailBody) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      const reminderData = {
        name: reminderName,
        type: reminderType,
        schedule,
        days,
        channel,
        emailSubject,
        emailBody,
        autoSend,
        status: 'active',
        companyId: activeCompany?.id
      }

      // Aquí iría la llamada a tu API
      // const response = await fetch('/api/reminders', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reminderData)
      // })

      toast.success('✅ Recordatorio creado exitosamente')
      router.push('/company/invoicing/reminders')
    } catch (error) {
      console.error('Error creating reminder:', error)
      toast.error('Error al crear recordatorio')
    } finally {
      setLoading(false)
    }
  }

  const reminderActions = [
    {
      label: 'Guardar',
      icon: Save,
      onClick: handleSave,
      variant: 'primary' as const,
      disabled: loading
    },
    {
      label: 'Cancelar',
      icon: X,
      onClick: () => router.push('/company/invoicing/reminders'),
      variant: 'danger' as const
    }
  ]

  if (status === 'loading') {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-8 h-8 text-blue-600" />
            Nuevo Recordatorio de Pago
          </h1>
          <p className="text-gray-600 mt-1">
            Configura recordatorios automáticos para tus clientes
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={reminderActions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Recordatorio *
              </label>
              <Input
                value={reminderName}
                onChange={(e) => setReminderName(e.target.value)}
                placeholder="Ej: Recordatorio de Vencimiento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Recordatorio *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setReminderType('upcoming')}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    reminderType === 'upcoming' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium">Próximo Vencimiento</div>
                  <div className="text-xs text-gray-600 mt-1">Antes de vencer</div>
                </button>
                
                <button
                  onClick={() => setReminderType('overdue')}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    reminderType === 'overdue' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <Bell className="w-6 h-6 mx-auto mb-2 text-red-600" />
                  <div className="font-medium">Factura Vencida</div>
                  <div className="text-xs text-gray-600 mt-1">Después de vencer</div>
                </button>

                <button
                  onClick={() => setReminderType('thank-you')}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    reminderType === 'thank-you' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <Mail className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <div className="font-medium">Agradecimiento</div>
                  <div className="text-xs text-gray-600 mt-1">Al recibir pago</div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Programación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Cuándo enviar?
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="before_due">Antes de la fecha de vencimiento</option>
                <option value="on_due">El día de vencimiento</option>
                <option value="after_due">Después de la fecha de vencimiento</option>
              </select>
            </div>

            {schedule !== 'on_due' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días {schedule === 'before_due' ? 'antes' : 'después'}
                </label>
                <Input
                  type="text"
                  className="amount-input"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se enviará {days} {days === 1 ? 'día' : 'días'} {schedule === 'before_due' ? 'antes' : 'después'} del vencimiento
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canal de envío
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setChannel('email')}
                  className={`flex-1 p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    channel === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => setChannel('sms')}
                  className={`flex-1 p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    channel === 'sms' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>SMS</span>
                </button>
                <button
                  onClick={() => setChannel('both')}
                  className={`flex-1 p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    channel === 'both' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <span>Ambos</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(channel === 'email' || channel === 'both') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Plantilla de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto del email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-32"
                  placeholder="Cuerpo del mensaje"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variables disponibles: {'{invoice_number}'}, {'{amount}'}, {'{due_date}'}, {'{customer_name}'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuración Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSend"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="autoSend" className="text-sm font-medium text-gray-700">
                Activar envío automático
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Los recordatorios se enviarán automáticamente según la configuración establecida
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || !reminderName || !emailSubject || !emailBody}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Recordatorio
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/company/invoicing/reminders')}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}
