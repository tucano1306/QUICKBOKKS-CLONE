'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import Form1040Help from '@/components/taxes/form-1040-help'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import {
  AlertCircle,
  Building2,
  Calculator,
  CheckCircle2,
  DollarSign,
  Eye,
  FileText,
  Lightbulb,
  Plus,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Dependent {
  id: string
  firstName: string
  lastName: string
  ssn: string
  relationship: string
  childTaxCredit: boolean
  creditOtherDependents: boolean
}

// Clave para guardar borrador en localStorage
const FORM_1040_DRAFT_KEY = 'form1040_draft'

export default function Form1040Page() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()

  // Form State
  const currentYear = new Date().getFullYear()
  const [taxYear, setTaxYear] = useState<number>(currentYear - 1)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [filingStatus, setFilingStatus] = useState<string>('SINGLE')
  const [loading, setLoading] = useState(false)
  const [existingForm, setExistingForm] = useState<any>(null)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiSuggestions, setAISuggestions] = useState<any[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<string>('')

  // Personal Info
  const [firstName, setFirstName] = useState('')
  const [middleInitial, setMiddleInitial] = useState('')
  const [lastName, setLastName] = useState('')
  const [ssn, setSsn] = useState('')
  const [spouseFirstName, setSpouseFirstName] = useState('')
  const [spouseMiddleInitial, setSpouseMiddleInitial] = useState('')
  const [spouseLastName, setSpouseLastName] = useState('')
  const [spouseSsn, setSpouseSsn] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  const [aptNo, setAptNo] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('FL')
  const [zipCode, setZipCode] = useState('')

  // Additional Deductions
  const [youBornBefore1960, setYouBornBefore1960] = useState(false)
  const [youBlind, setYouBlind] = useState(false)
  const [spouseBornBefore1960, setSpouseBornBefore1960] = useState(false)
  const [spouseBlind, setSpouseBlind] = useState(false)

  // Income
  const [wages, setWages] = useState<number>(0)
  const [taxableInterest, setTaxableInterest] = useState<number>(0)
  const [ordinaryDividends, setOrdinaryDividends] = useState<number>(0)
  const [qualifiedDividends, setQualifiedDividends] = useState<number>(0)
  const [iraDistributions, setIraDistributions] = useState<number>(0)
  const [taxableIRA, setTaxableIRA] = useState<number>(0)
  const [pensionsAnnuities, setPensionsAnnuities] = useState<number>(0)
  const [taxablePensions, setTaxablePensions] = useState<number>(0)
  const [socialSecurity, setSocialSecurity] = useState<number>(0)
  const [taxableSocialSecurity, setTaxableSocialSecurity] = useState<number>(0)
  const [capitalGainLoss, setCapitalGainLoss] = useState<number>(0)
  const [otherIncome, setOtherIncome] = useState<number>(0)

  // Schedule C (Business Income)
  const [scheduleC_grossReceipts, setScheduleC_grossReceipts] = useState<number>(0)
  const [scheduleC_expenses, setScheduleC_expenses] = useState<number>(0)

  // Payments
  const [withholding, setWithholding] = useState<number>(0)
  const [estimatedPayments, setEstimatedPayments] = useState<number>(0)

  // Dependents
  const [dependents, setDependents] = useState<Dependent[]>([])

  // Calculations
  const totalIncome = wages + taxableInterest + ordinaryDividends + taxableIRA +
                      taxablePensions + taxableSocialSecurity + capitalGainLoss +
                      otherIncome + (scheduleC_grossReceipts - scheduleC_expenses)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Cargar borrador de localStorage al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined' && !draftLoaded) {
      const savedDraft = localStorage.getItem(`${FORM_1040_DRAFT_KEY}_${taxYear}`)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          populateDraftFromData(draft)
          toast.success('Borrador recuperado automáticamente', { icon: '📋' })
        } catch (e) {
          console.error('Error parsing draft:', e)
        }
      }
      setDraftLoaded(true)
    }
  }, [taxYear, draftLoaded])

  // Guardar borrador en localStorage cuando cambien los datos importantes
  useEffect(() => {
    if (typeof window !== 'undefined' && draftLoaded) {
      const draft = {
        taxYear,
        filingStatus,
        firstName, middleInitial, lastName, ssn,
        spouseFirstName, spouseMiddleInitial, spouseLastName, spouseSsn,
        homeAddress, aptNo, city, state, zipCode,
        youBornBefore1960, youBlind, spouseBornBefore1960, spouseBlind,
        wages, taxableInterest, ordinaryDividends, qualifiedDividends,
        iraDistributions, taxableIRA, pensionsAnnuities, taxablePensions,
        socialSecurity, taxableSocialSecurity, capitalGainLoss, otherIncome,
        scheduleC_grossReceipts, scheduleC_expenses,
        withholding, estimatedPayments,
        dependents,
        lastSaved: new Date().toISOString()
      }
      localStorage.setItem(`${FORM_1040_DRAFT_KEY}_${taxYear}`, JSON.stringify(draft))
    }
  }, [
    taxYear, filingStatus, firstName, middleInitial, lastName, ssn,
    spouseFirstName, spouseMiddleInitial, spouseLastName, spouseSsn,
    homeAddress, aptNo, city, state, zipCode,
    youBornBefore1960, youBlind, spouseBornBefore1960, spouseBlind,
    wages, taxableInterest, ordinaryDividends, qualifiedDividends,
    iraDistributions, taxableIRA, pensionsAnnuities, taxablePensions,
    socialSecurity, taxableSocialSecurity, capitalGainLoss, otherIncome,
    scheduleC_grossReceipts, scheduleC_expenses,
    withholding, estimatedPayments, dependents, draftLoaded
  ])

  useEffect(() => {
    if (activeCompany?.id) {
      loadExistingForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxYear, activeCompany?.id])

  const loadExistingForm = async () => {
    try {
      // Load saved form (personal info) and fresh financial data in parallel
      const [savedRes, autoRes] = await Promise.all([
        fetch(`/api/tax-forms/1040?year=${taxYear}${activeCompany?.id ? `&companyId=${activeCompany.id}` : ''}`),
        activeCompany?.id
          ? fetch(`/api/tax-forms/1040?year=${taxYear}&companyId=${activeCompany.id}&action=auto-populate`)
          : Promise.resolve(null)
      ])

      // Personal info from saved record
      if (savedRes.ok) {
        const data = await savedRes.json()
        if (data.exists) {
          setExistingForm(data)
          populateFormFromData(data)
        }
      }

      // Always overwrite financial fields with fresh data from transactions
      if (autoRes && autoRes.ok) {
        const autoResult = await autoRes.json()
        const autoData = autoResult.data || autoResult.autoData
        if (autoData) {
          if (autoData.income) {
            setWages(autoData.income.wages || 0)
            setTaxableInterest(autoData.income.taxableInterest || 0)
            setOrdinaryDividends(autoData.income.ordinaryDividends || 0)
            setQualifiedDividends(autoData.income.qualifiedDividends || 0)
            setOtherIncome(autoData.income.otherIncome || 0)
          }
          if (autoData.scheduleC) {
            setScheduleC_grossReceipts(autoData.scheduleC.grossReceipts || 0)
            setScheduleC_expenses(autoData.scheduleC.expenses || 0)
          }
          if (autoData.payments) {
            setWithholding(autoData.payments.withholding || 0)
            setEstimatedPayments(autoData.payments.estimatedPayments || 0)
          }
        }
      }
    } catch (error) {
      console.error('Error loading form:', error)
    }
  }

  const populateFormFromData = (data: any) => {
    setFilingStatus(data.filingStatus || 'SINGLE')
    setFirstName(data.firstName || '')
    setMiddleInitial(data.middleInitial || '')
    setLastName(data.lastName || '')
    setSsn(data.ssn || '')
    setSpouseFirstName(data.spouseFirstName || '')
    setSpouseMiddleInitial(data.spouseMiddleInitial || '')
    setSpouseLastName(data.spouseLastName || '')
    setSpouseSsn(data.spouseSsn || '')
    setHomeAddress(data.homeAddress || '')
    setAptNo(data.aptNo || '')
    setCity(data.city || '')
    setState(data.state || 'FL')
    setZipCode(data.zipCode || '')

    setYouBornBefore1960(data.youBornBefore1960 || false)
    setYouBlind(data.youBlind || false)
    setSpouseBornBefore1960(data.spouseBornBefore1960 || false)
    setSpouseBlind(data.spouseBlind || false)

    setWages(data.line1a_w2Wages || 0)
    setTaxableInterest(data.line2b_taxableInterest || 0)
    setOrdinaryDividends(data.line3b_ordinaryDividends || 0)
    setQualifiedDividends(data.line3a_qualifiedDividends || 0)
    setIraDistributions(data.line4a_iraDistributions || 0)
    setTaxableIRA(data.line4b_taxableIRA || 0)
    setPensionsAnnuities(data.line5a_pensionsAnnuities || 0)
    setTaxablePensions(data.line5b_taxablePensions || 0)
    setSocialSecurity(data.line6a_socialSecurity || 0)
    setTaxableSocialSecurity(data.line6b_taxableSocialSecurity || 0)
    setCapitalGainLoss(data.line7_capitalGainLoss || 0)
    setOtherIncome(data.line8_otherIncome || 0)

    setScheduleC_grossReceipts(data.scheduleC_grossReceipts || 0)
    setScheduleC_expenses(data.scheduleC_expenses || 0)

    setWithholding(data.line25a_w2Withholding || 0)
    setEstimatedPayments(data.line26_estimatedPayments || 0)

    setDependents(data.dependents || [])
  }

  // Función para cargar datos desde borrador de localStorage
  const populateDraftFromData = (draft: any) => {
    if (draft.filingStatus) setFilingStatus(draft.filingStatus)
    if (draft.firstName) setFirstName(draft.firstName)
    if (draft.middleInitial) setMiddleInitial(draft.middleInitial)
    if (draft.lastName) setLastName(draft.lastName)
    if (draft.ssn) setSsn(draft.ssn)
    if (draft.spouseFirstName) setSpouseFirstName(draft.spouseFirstName)
    if (draft.spouseMiddleInitial) setSpouseMiddleInitial(draft.spouseMiddleInitial)
    if (draft.spouseLastName) setSpouseLastName(draft.spouseLastName)
    if (draft.spouseSsn) setSpouseSsn(draft.spouseSsn)
    if (draft.homeAddress) setHomeAddress(draft.homeAddress)
    if (draft.aptNo) setAptNo(draft.aptNo)
    if (draft.city) setCity(draft.city)
    if (draft.state) setState(draft.state)
    if (draft.zipCode) setZipCode(draft.zipCode)

    setYouBornBefore1960(draft.youBornBefore1960 || false)
    setYouBlind(draft.youBlind || false)
    setSpouseBornBefore1960(draft.spouseBornBefore1960 || false)
    setSpouseBlind(draft.spouseBlind || false)

    if (draft.wages !== undefined) setWages(draft.wages)
    if (draft.taxableInterest !== undefined) setTaxableInterest(draft.taxableInterest)
    if (draft.ordinaryDividends !== undefined) setOrdinaryDividends(draft.ordinaryDividends)
    if (draft.qualifiedDividends !== undefined) setQualifiedDividends(draft.qualifiedDividends)
    if (draft.iraDistributions !== undefined) setIraDistributions(draft.iraDistributions)
    if (draft.taxableIRA !== undefined) setTaxableIRA(draft.taxableIRA)
    if (draft.pensionsAnnuities !== undefined) setPensionsAnnuities(draft.pensionsAnnuities)
    if (draft.taxablePensions !== undefined) setTaxablePensions(draft.taxablePensions)
    if (draft.socialSecurity !== undefined) setSocialSecurity(draft.socialSecurity)
    if (draft.taxableSocialSecurity !== undefined) setTaxableSocialSecurity(draft.taxableSocialSecurity)
    if (draft.capitalGainLoss !== undefined) setCapitalGainLoss(draft.capitalGainLoss)
    if (draft.otherIncome !== undefined) setOtherIncome(draft.otherIncome)

    if (draft.scheduleC_grossReceipts !== undefined) setScheduleC_grossReceipts(draft.scheduleC_grossReceipts)
    if (draft.scheduleC_expenses !== undefined) setScheduleC_expenses(draft.scheduleC_expenses)

    if (draft.withholding !== undefined) setWithholding(draft.withholding)
    if (draft.estimatedPayments !== undefined) setEstimatedPayments(draft.estimatedPayments)

    if (draft.dependents) setDependents(draft.dependents)
  }

  // Limpiar borrador después de guardar exitosamente
  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${FORM_1040_DRAFT_KEY}_${taxYear}`)
    }
  }

  const handleAutoPopulate = async () => {
    if (!activeCompany?.id) {
      toast.error('Seleccione una empresa primero')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tax-forms/1040?year=${taxYear}&companyId=${activeCompany.id}&action=auto-populate`)
      if (response.ok) {
        const result = await response.json()
        const autoData = result.data || result.autoData

        // Variables temporales para actualizar el estado
        let newWages = wages
        let newTaxableInterest = taxableInterest
        let newOrdinaryDividends = ordinaryDividends
        let newQualifiedDividends = qualifiedDividends
        let newOtherIncome = otherIncome
        let newScheduleC_grossReceipts = scheduleC_grossReceipts
        let newScheduleC_expenses = scheduleC_expenses
        let newWithholding = withholding

        if (autoData.income) {
          newWages = autoData.income.wages || 0
          newTaxableInterest = autoData.income.taxableInterest || 0
          newOrdinaryDividends = autoData.income.ordinaryDividends || 0
          newQualifiedDividends = autoData.income.qualifiedDividends || 0
          newOtherIncome = autoData.income.otherIncome || 0

          setWages(newWages)
          setTaxableInterest(newTaxableInterest)
          setOrdinaryDividends(newOrdinaryDividends)
          setQualifiedDividends(newQualifiedDividends)
          setOtherIncome(newOtherIncome)
        }

        if (autoData.scheduleC) {
          newScheduleC_grossReceipts = autoData.scheduleC.grossReceipts || 0
          newScheduleC_expenses = autoData.scheduleC.expenses || 0

          setScheduleC_grossReceipts(newScheduleC_grossReceipts)
          setScheduleC_expenses(newScheduleC_expenses)
        }

        if (autoData.payments) {
          newWithholding = autoData.payments.withholding || 0
          setWithholding(newWithholding)
        }

        // Mostrar resumen de lo que se cargó
        const loadedItems = []
        if (autoData.income) loadedItems.push('Ingresos')
        if (autoData.scheduleC) loadedItems.push('Schedule C')
        if (autoData.payments) loadedItems.push('Pagos/Retenciones')

        toast.success(
          `✅ Datos cargados: ${loadedItems.join(', ')}\n📋 Los datos se guardan automáticamente como borrador`,
          { duration: 4000 }
        )

        // Informar al usuario sobre el guardado automático de borrador
        if (firstName && lastName && ssn && homeAddress && city && state && zipCode) {
          toast.success(
            '💾 Información personal completa detectada. Presione "Guardar Formulario" para guardar en la base de datos.',
            { duration: 5000 }
          )
        } else {
          toast(
            '📝 Complete la información personal (nombre, SSN, dirección) para poder guardar el formulario.',
            { duration: 5000, icon: 'ℹ️' }
          )
        }
      } else {
        throw new Error('Error al cargar datos')
      }
    } catch (error: any) {
      console.error('Error auto-populating:', error)
      toast.error('Error al cargar datos automáticamente')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!firstName || !lastName || !ssn) {
      toast.error('Complete la información personal requerida')
      return
    }

    if (!homeAddress || !city || !state || !zipCode) {
      toast.error('Complete la dirección')
      return
    }

    setLoading(true)
    try {
      const payload = {
        taxYear,
        companyId: activeCompany?.id,
        filingStatus,
        personalInfo: {
          firstName,
          middleInitial,
          lastName,
          ssn,
          spouseFirstName,
          spouseMiddleInitial,
          spouseLastName,
          spouseSsn,
          homeAddress,
          aptNo,
          city,
          state,
          zipCode
        },
        additionalDeductions: {
          youBornBefore1960,
          youBlind,
          spouseBornBefore1960,
          spouseBlind
        },
        dependents,
        income: {
          wages,
          taxableInterest,
          ordinaryDividends,
          qualifiedDividends,
          iraDistributions,
          taxableIRA,
          pensionsAnnuities,
          taxablePensions,
          socialSecurity,
          taxableSocialSecurity,
          capitalGainLoss,
          otherIncome
        },
        scheduleC: {
          grossReceipts: scheduleC_grossReceipts,
          expenses: scheduleC_expenses
        },
        payments: {
          withholding,
          estimatedPayments
        }
      }

      const response = await fetch('/api/tax-forms/1040', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        setExistingForm(result.form1040)
        if (result.aiSuggestions) {
          setAISuggestions(result.aiSuggestions)
        }
        // Limpiar borrador después de guardar exitosamente
        clearDraft()
        toast.success('✅ Form 1040 guardado correctamente en la base de datos')
        loadExistingForm()
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error: any) {
      console.error('Error saving form:', error)
      toast.error('Error al guardar el formulario')
    } finally {
      setLoading(false)
    }
  }

  const handleGetAISuggestions = async () => {
    if (!existingForm) {
      toast.error('Guarde el formulario primero para obtener sugerencias')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tax-forms/1040?year=${taxYear}&action=ai-suggestions`)
      if (response.ok) {
        const result = await response.json()
        setAISuggestions(result.suggestions || [])
        setShowAISuggestions(true)
      } else {
        throw new Error('Error al obtener sugerencias')
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error)
      toast.error('Error al obtener sugerencias de IA')
    } finally {
      setLoading(false)
    }
  }

  const handleViewSummary = async () => {
    if (!existingForm) {
      toast.error('Guarde el formulario primero para ver el resumen')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tax-forms/1040?year=${taxYear}&action=summary`)
      if (response.ok) {
        const result = await response.json()
        setSummary(result.summary || '')
        setShowSummary(true)
      } else {
        throw new Error('Error al obtener resumen')
      }
    } catch (error) {
      console.error('Error getting summary:', error)
      toast.error('Error al obtener resumen')
    } finally {
      setLoading(false)
    }
  }

  const addDependent = () => {
    setDependents([
      ...dependents,
      {
        id: `dep-${Date.now()}`,
        firstName: '',
        lastName: '',
        ssn: '',
        relationship: '',
        childTaxCredit: false,
        creditOtherDependents: false
      }
    ])
  }

  const removeDependent = (id: string) => {
    setDependents(dependents.filter(d => d.id !== id))
  }

  const updateDependent = (id: string, field: string, value: any) => {
    setDependents(dependents.map(d =>
      d.id === id ? { ...d, [field]: value } : d
    ))
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Form 1040 - Individual Income Tax Return
            </h1>
            <p className="text-muted-foreground mt-1">
              U.S. Individual Income Tax Return - Año Fiscal {taxYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Form1040Help />
            <Select value={taxYear.toString()} onValueChange={(v) => setTaxYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Draft Status Card - Mostrar si hay datos sin guardar */}
        {!existingForm && draftLoaded && (firstName || wages > 0 || scheduleC_grossReceipts > 0) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">📋 Borrador en Progreso</p>
                    <p className="text-sm text-amber-700">
                      Sus datos se guardan automáticamente en el navegador. Complete la información personal para guardar en la base de datos.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDraft}
                  className="text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar Borrador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        {existingForm && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold">Formulario Guardado</p>
                    <p className="text-sm text-muted-foreground">
                      {existingForm.line33_overpayment > 0
                        ? `Reembolso esperado: $${existingForm.line34a_refundAmount?.toFixed(2) || '0.00'}`
                        : `Cantidad adeudada: $${existingForm.line36_amountYouOwe?.toFixed(2) || '0.00'}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleViewSummary}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Resumen
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGetAISuggestions}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Sugerencias IA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Button onClick={handleAutoPopulate} disabled={loading || !activeCompany}>
                <Building2 className="w-4 h-4 mr-2" />
                Auto-Llenar desde Empresa
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Formulario
              </Button>
              <Button variant="outline" onClick={handleViewSummary} disabled={!existingForm}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Resumen
              </Button>
              <Button variant="outline" onClick={handleGetAISuggestions} disabled={!existingForm}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Sugerencias de IA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">
              <User className="w-4 h-4 mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="income">
              <DollarSign className="w-4 h-4 mr-2" />
              Ingresos
            </TabsTrigger>
            <TabsTrigger value="business">
              <Building2 className="w-4 h-4 mr-2" />
              Negocio (Sch C)
            </TabsTrigger>
            <TabsTrigger value="dependents">
              <Users className="w-4 h-4 mr-2" />
              Dependientes
            </TabsTrigger>
            <TabsTrigger value="summary">
              <Calculator className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Complete su información personal y estado civil para el año {taxYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filing Status */}
                <div className="space-y-2">
                  <Label>Estado Civil / Filing Status</Label>
                  <Select value={filingStatus} onValueChange={setFilingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single (Soltero)</SelectItem>
                      <SelectItem value="MARRIED_FILING_JOINTLY">Married Filing Jointly (Casado declarando en conjunto)</SelectItem>
                      <SelectItem value="MARRIED_FILING_SEPARATELY">Married Filing Separately (Casado declarando por separado)</SelectItem>
                      <SelectItem value="HEAD_OF_HOUSEHOLD">Head of Household (Jefe de familia)</SelectItem>
                      <SelectItem value="QUALIFYING_SURVIVING_SPOUSE">Qualifying Surviving Spouse (Cónyuge sobreviviente calificado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Taxpayer Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Información del Contribuyente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleInitial">Middle Initial</Label>
                      <Input
                        id="middleInitial"
                        value={middleInitial}
                        onChange={(e) => setMiddleInitial(e.target.value)}
                        placeholder="M"
                        maxLength={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ssn">Social Security Number (SSN) *</Label>
                      <Input
                        id="ssn"
                        value={ssn}
                        onChange={(e) => setSsn(e.target.value)}
                        placeholder="XXX-XX-XXXX"
                        maxLength={11}
                      />
                    </div>
                  </div>
                </div>

                {/* Spouse Info (if married) */}
                {(filingStatus === 'MARRIED_FILING_JOINTLY' || filingStatus === 'MARRIED_FILING_SEPARATELY') && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold">Información del Cónyuge</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="spouseFirstName">First Name</Label>
                        <Input
                          id="spouseFirstName"
                          value={spouseFirstName}
                          onChange={(e) => setSpouseFirstName(e.target.value)}
                          placeholder="Jane"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spouseMiddleInitial">Middle Initial</Label>
                        <Input
                          id="spouseMiddleInitial"
                          value={spouseMiddleInitial}
                          onChange={(e) => setSpouseMiddleInitial(e.target.value)}
                          placeholder="A"
                          maxLength={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spouseLastName">Last Name</Label>
                        <Input
                          id="spouseLastName"
                          value={spouseLastName}
                          onChange={(e) => setSpouseLastName(e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="spouseSsn">Spouse SSN</Label>
                        <Input
                          id="spouseSsn"
                          value={spouseSsn}
                          onChange={(e) => setSpouseSsn(e.target.value)}
                          placeholder="XXX-XX-XXXX"
                          maxLength={11}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="homeAddress">Home Address *</Label>
                      <Input
                        id="homeAddress"
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aptNo">Apt/Unit</Label>
                      <Input
                        id="aptNo"
                        value={aptNo}
                        onChange={(e) => setAptNo(e.target.value)}
                        placeholder="Apt 4B"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Miami"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="FL"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="33101"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Deductions */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Deducciones Adicionales</h3>
                  <p className="text-sm text-muted-foreground">
                    Marque si aplica para deducciones adicionales (edad 65+ o ceguera)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={youBornBefore1960}
                          onChange={(e) => setYouBornBefore1960(e.target.checked)}
                          className="rounded"
                        />
                        <span>Usted nació antes de 1960 (65+ años)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={youBlind}
                          onChange={(e) => setYouBlind(e.target.checked)}
                          className="rounded"
                        />
                        <span>Usted es ciego</span>
                      </label>
                    </div>
                    {(filingStatus === 'MARRIED_FILING_JOINTLY' || filingStatus === 'MARRIED_FILING_SEPARATELY') && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={spouseBornBefore1960}
                            onChange={(e) => setSpouseBornBefore1960(e.target.checked)}
                            className="rounded"
                          />
                          <span>Cónyuge nació antes de 1960 (65+ años)</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={spouseBlind}
                            onChange={(e) => setSpouseBlind(e.target.checked)}
                            className="rounded"
                          />
                          <span>Cónyuge es ciego</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos (Income)</CardTitle>
                <CardDescription>
                  Reporte todos sus ingresos del año fiscal {taxYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wages">
                      Line 1a: Wages, salaries, tips (W-2)
                    </Label>
                    <Input
                      id="wages"
                      type="number"
                      step="0.01"
                      value={wages}
                      onChange={(e) => setWages(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxableInterest">
                      Line 2b: Taxable interest
                    </Label>
                    <Input
                      id="taxableInterest"
                      type="number"
                      step="0.01"
                      value={taxableInterest}
                      onChange={(e) => setTaxableInterest(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ordinaryDividends">
                      Line 3b: Ordinary dividends
                    </Label>
                    <Input
                      id="ordinaryDividends"
                      type="number"
                      step="0.01"
                      value={ordinaryDividends}
                      onChange={(e) => setOrdinaryDividends(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualifiedDividends">
                      Line 3a: Qualified dividends
                    </Label>
                    <Input
                      id="qualifiedDividends"
                      type="number"
                      step="0.01"
                      value={qualifiedDividends}
                      onChange={(e) => setQualifiedDividends(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iraDistributions">
                      Line 4a: IRA distributions
                    </Label>
                    <Input
                      id="iraDistributions"
                      type="number"
                      step="0.01"
                      value={iraDistributions}
                      onChange={(e) => setIraDistributions(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxableIRA">
                      Line 4b: Taxable IRA
                    </Label>
                    <Input
                      id="taxableIRA"
                      type="number"
                      step="0.01"
                      value={taxableIRA}
                      onChange={(e) => setTaxableIRA(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pensionsAnnuities">
                      Line 5a: Pensions and annuities
                    </Label>
                    <Input
                      id="pensionsAnnuities"
                      type="number"
                      step="0.01"
                      value={pensionsAnnuities}
                      onChange={(e) => setPensionsAnnuities(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxablePensions">
                      Line 5b: Taxable pensions
                    </Label>
                    <Input
                      id="taxablePensions"
                      type="number"
                      step="0.01"
                      value={taxablePensions}
                      onChange={(e) => setTaxablePensions(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="socialSecurity">
                      Line 6a: Social security benefits
                    </Label>
                    <Input
                      id="socialSecurity"
                      type="number"
                      step="0.01"
                      value={socialSecurity}
                      onChange={(e) => setSocialSecurity(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxableSocialSecurity">
                      Line 6b: Taxable social security
                    </Label>
                    <Input
                      id="taxableSocialSecurity"
                      type="number"
                      step="0.01"
                      value={taxableSocialSecurity}
                      onChange={(e) => setTaxableSocialSecurity(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capitalGainLoss">
                      Line 7: Capital gain or (loss)
                    </Label>
                    <Input
                      id="capitalGainLoss"
                      type="number"
                      step="0.01"
                      value={capitalGainLoss}
                      onChange={(e) => setCapitalGainLoss(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otherIncome">
                      Line 8: Other income
                    </Label>
                    <Input
                      id="otherIncome"
                      type="number"
                      step="0.01"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Pagos y Retenciones (Payments)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="withholding">
                        Line 25a: Federal income tax withheld (W-2)
                      </Label>
                      <Input
                        id="withholding"
                        type="number"
                        step="0.01"
                        value={withholding}
                        onChange={(e) => setWithholding(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimatedPayments">
                        Line 26: Estimated tax payments
                      </Label>
                      <Input
                        id="estimatedPayments"
                        type="number"
                        step="0.01"
                        value={estimatedPayments}
                        onChange={(e) => setEstimatedPayments(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Income Tab (Schedule C) */}
          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schedule C - Profit or Loss From Business</CardTitle>
                <CardDescription>
                  Para trabajadores independientes y dueños de negocios ({taxYear})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    💡 Si es trabajador independiente o tiene un negocio, complete esta sección.
                    El ingreso neto se agregará a su ingreso total en la línea 8.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleC_grossReceipts">
                      Gross receipts or sales (Ingresos brutos)
                    </Label>
                    <Input
                      id="scheduleC_grossReceipts"
                      type="number"
                      step="0.01"
                      value={scheduleC_grossReceipts}
                      onChange={(e) => setScheduleC_grossReceipts(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduleC_expenses">
                      Total expenses (Gastos totales)
                    </Label>
                    <Input
                      id="scheduleC_expenses"
                      type="number"
                      step="0.01"
                      value={scheduleC_expenses}
                      onChange={(e) => setScheduleC_expenses(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="font-semibold">Net Profit (Loss):</span>
                    <span className={`text-xl font-bold ${(scheduleC_grossReceipts - scheduleC_expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(scheduleC_grossReceipts - scheduleC_expenses).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Este monto se sumará automáticamente a su ingreso total y se calculará el impuesto de auto-empleo (Self-Employment Tax).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dependents Tab */}
          <TabsContent value="dependents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dependientes</CardTitle>
                <CardDescription>
                  Agregue información de sus dependientes para créditos tributarios ({taxYear})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Child Tax Credit: $2,000 por niño menor de 17 años
                  </p>
                  <Button onClick={addDependent} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Dependiente
                  </Button>
                </div>

                {dependents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay dependientes agregados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dependents.map((dep, index) => (
                      <div key={dep.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Dependiente #{index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDependent(dep.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input
                              value={dep.firstName}
                              onChange={(e) => updateDependent(dep.id, 'firstName', e.target.value)}
                              placeholder="First name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                              value={dep.lastName}
                              onChange={(e) => updateDependent(dep.id, 'lastName', e.target.value)}
                              placeholder="Last name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SSN</Label>
                            <Input
                              value={dep.ssn}
                              onChange={(e) => updateDependent(dep.id, 'ssn', e.target.value)}
                              placeholder="XXX-XX-XXXX"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Relationship</Label>
                            <Input
                              value={dep.relationship}
                              onChange={(e) => updateDependent(dep.id, 'relationship', e.target.value)}
                              placeholder="Son, Daughter, etc."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Créditos</Label>
                            <div className="flex gap-4 pt-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={dep.childTaxCredit}
                                  onChange={(e) => updateDependent(dep.id, 'childTaxCredit', e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-sm">Child Tax Credit ($2,000)</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={dep.creditOtherDependents}
                                  onChange={(e) => updateDependent(dep.id, 'creditOtherDependents', e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-sm">Other Dependent ($500)</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Cálculos</CardTitle>
                <CardDescription>
                  Vista previa de su declaración de impuestos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Ingresos Totales (Line 9):</span>
                    <span className="font-mono">${totalIncome.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Salarios (W-2):</span>
                    <span className="font-mono text-sm">${wages.toFixed(2)}</span>
                  </div>

                  {scheduleC_grossReceipts > 0 && (
                    <>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Ingresos de Negocio (Schedule C):</span>
                        <span className="font-mono text-sm">${scheduleC_grossReceipts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Gastos de Negocio:</span>
                        <span className="font-mono text-sm">-${scheduleC_expenses.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Ganancia Neta de Negocio:</span>
                        <span className="font-mono text-sm">${(scheduleC_grossReceipts - scheduleC_expenses).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {taxableInterest > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Intereses:</span>
                      <span className="font-mono text-sm">${taxableInterest.toFixed(2)}</span>
                    </div>
                  )}

                  {ordinaryDividends > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Dividendos:</span>
                      <span className="font-mono text-sm">${ordinaryDividends.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-3 border-t border-b bg-muted px-2">
                    <span className="font-medium">Retenciones Federales:</span>
                    <span className="font-mono text-green-600">${withholding.toFixed(2)}</span>
                  </div>

                  {estimatedPayments > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Pagos Estimados:</span>
                      <span className="font-mono text-sm text-green-600">${estimatedPayments.toFixed(2)}</span>
                    </div>
                  )}

                  {dependents.length > 0 && (
                    <div className="flex justify-between items-center py-3 border-t">
                      <span className="font-medium">Dependientes:</span>
                      <span className="font-mono">{dependents.length}</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    💡 Haga clic en "Guardar Formulario" para calcular su impuesto final,
                    deducciones estándar, créditos y determinar si recibirá un reembolso o si debe pagar.
                  </p>
                </div>

                {existingForm && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold">Resultado Final (del formulario guardado):</h3>
                    <div className="flex justify-between items-center py-2">
                      <span>Ingreso Bruto Ajustado (AGI):</span>
                      <span className="font-mono">${existingForm.line11_adjustedGrossIncome?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>Deducción Estándar:</span>
                      <span className="font-mono">${existingForm.line12_standardOrItemized?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>Ingreso Gravable:</span>
                      <span className="font-mono">${existingForm.line15_taxableIncome?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>Impuesto Total:</span>
                      <span className="font-mono">${existingForm.line24_totalTax?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t bg-muted px-2">
                      <span className="font-semibold">Pagos Totales:</span>
                      <span className="font-mono font-semibold">${existingForm.line32_totalPayments?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className={`flex justify-between items-center py-4 border-t-2 ${existingForm.line33_overpayment > 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'} px-2 rounded-lg`}>
                      <span className="font-bold text-lg">
                        {existingForm.line33_overpayment > 0 ? 'REEMBOLSO:' : 'CANTIDAD ADEUDADA:'}
                      </span>
                      <span className={`font-mono font-bold text-2xl ${existingForm.line33_overpayment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${existingForm.line33_overpayment > 0
                          ? existingForm.line34a_refundAmount?.toFixed(2) || '0.00'
                          : existingForm.line36_amountYouOwe?.toFixed(2) || '0.00'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Suggestions Dialog */}
        <Dialog open={showAISuggestions} onOpenChange={setShowAISuggestions}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Sugerencias de Optimización Fiscal con IA
              </DialogTitle>
              <DialogDescription>
                Recomendaciones personalizadas para maximizar su beneficio tributario
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {aiSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay sugerencias disponibles</p>
                </div>
              ) : (
                aiSuggestions.map((suggestion, index) => (
                  <Card key={index} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          {suggestion.type}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {suggestion.description}
                          </p>
                          {suggestion.potentialSavings && (
                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                              <TrendingUp className="w-4 h-4" />
                              Ahorro potencial: ${suggestion.potentialSavings.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Summary Dialog */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resumen del Form 1040</DialogTitle>
              <DialogDescription>
                Resumen completo de su declaración de impuestos
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {summary}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CompanyTabsLayout>
  )
}
