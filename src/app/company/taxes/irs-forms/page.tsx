'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import { downloadTaxPDF } from '@/lib/tax-pdf'
import {
    AlertCircle,
    Calculator,
    Download,
    FileText,
    Printer,
    RefreshCw,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────

interface VehicleAsset {
  assetNumber: string
  name: string
  vin?: string
  yearModel?: number
  purchaseDate: string
  purchasePrice: number
  salvageValue: number
  usefulLife: number
  accumulatedDepreciation: number
  bookValue: number
  depreciationMethod: string
  currentMileage?: number
  estimatedLifetimeMiles?: number
}

interface TaxFormBundle {
  taxYear: number
  filing: {
    status: string
    firstName: string
    lastName: string
    ssn?: string
  }
  // Core 1040 lines
  form1040: {
    // Income
    wages: number
    taxableInterest: number
    ordinaryDividends: number
    qualifiedDividends: number
    iraDistributions: number
    taxableIRA: number
    pensionsAnnuities: number
    taxablePensions: number
    socialSecurity: number
    taxableSocialSecurity: number
    capitalGainLoss: number
    otherIncome: number
    totalIncome: number
    // Adjustments
    adjustments: number
    agi: number
    // Deductions
    standardDeduction: number
    qbiDeduction: number
    totalDeductions: number
    taxableIncome: number
    // Tax
    tax: number
    additionalTaxes: number
    totalTax: number
    childTaxCredit: number
    netTax: number
    // Payments
    w2Withholding: number
    estimatedPayments: number
    totalPayments: number
    // Result
    refund: number
    amountOwed: number
  }
  // Schedule C
  scheduleC: {
    grossReceipts: number
    expenses: number
    netProfit: number
    selfEmploymentTax: number
    deductibleSETax: number
  }
  // Self-Employment (Schedule SE)
  scheduleSE: {
    netEarnings: number
    selfEmploymentTax: number
    deductiblePortion: number
  }
  // Business data from company
  companyData: {
    totalRevenue: number
    totalExpenses: number
    payroll: number
    mortgageInterest: number
    businessAssets: number
    expenseBreakdown: Record<string, number>
    employeeCount: number
    vehicles: VehicleAsset[]
  }
  // Prior year data (for penalty calculation)
  priorYearTax: number
}

interface ComputedForms {
  form8879: { totalIncome: number; agi: number; taxableIncome: number; totalTax: number; refundOrOwed: number }
  scheduleA: { medicalExpenses: number; stateLocalTax: number; mortgageInterest: number; charitableContributions: number; total: number }
  form5329: { iraDistributions: number; earlyWithdrawalPenalty: number; totalAdditionalTax: number }
  form8962: { agi: number; eligibleForCredit: boolean; estimatedCredit: number }
  form8396: { mortgageInterest: number; creditRate: number; credit: number }
  form4562: { businessAssets: number; section179Deduction: number; bonusDepreciation: number; macrsDepreciation: number; totalDepreciation: number; vehicles: VehicleAsset[]; vehicleAnnualDepreciation: number; vehicleTotalAccumulated: number }
  schedule2: { selfEmploymentTax: number; form8959Tax: number; form5329Tax: number; totalAdditionalTaxes: number }
  schedule3: { mortgageInterestCredit: number; premiumTaxCredit: number; totalAdditionalCredits: number }
  form8995: { totalQBI: number; qbiDeduction: number; nol: number; activities: Array<{ name: string; qbi: number; w2Wages: number; qualifiedProperty: number }> }
  summaryBorderClass: string
}

interface IrsFormsPageState {
  bundle: TaxFormBundle | null
  forms: ComputedForms | null
  loading: boolean
  error: string | null
  taxYear: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Año fiscal compartido para las cabeceras de los formularios
const IrsFormYearContext = createContext<number>(new Date().getFullYear())

// Números OMB reales por formulario (la mayoría comparten 1545-0074)
const IRS_OMB: Record<string, string> = {
  '8995': '1545-2294',
  '4562': '1545-0172',
  '5329': '1545-0074',
}

function ombFor(formNumber: string): string {
  const m = formNumber.match(/(\d{3,4})/)
  return (m && IRS_OMB[m[1]]) || '1545-0074'
}

// Divide "Form 8879 — IRS e-file..." en {badgeTop, badgeBig, name}
function parseFormTitle(title: string): { badgeTop: string; badgeBig: string; name: string } {
  const [numberPart, ...rest] = title.split('—')
  const number = numberPart.trim()
  const name = rest.join('—').trim() || number
  const sched = /^Schedule\s+(.+)$/i.exec(number)
  if (sched) return { badgeTop: 'SCHEDULE', badgeBig: sched[1], name }
  const form = /^Form\s+(.+)$/i.exec(number)
  if (form) return { badgeTop: 'FORM', badgeBig: form[1], name }
  return { badgeTop: 'FORM', badgeBig: number || '1040', name }
}

// Encabezado y contenedor con el aspecto oficial de un formulario del IRS
function PrintSection({ id, title, children }: Readonly<{ id: string; title: string; children: React.ReactNode }>) {
  const year = useContext(IrsFormYearContext)
  const { badgeTop, badgeBig, name } = parseFormTitle(title)
  return (
    <div id={id} className="bg-white text-black border-2 border-black rounded-sm shadow-sm overflow-hidden print:shadow-none">
      {/* Cabecera estilo IRS */}
      <div className="flex items-stretch border-b-2 border-black">
        <div className="px-3 py-2 border-r-2 border-black flex flex-col justify-center items-center min-w-[96px]">
          <span className="text-[9px] uppercase tracking-widest text-gray-600 leading-none">{badgeTop}</span>
          <span className="text-2xl font-extrabold leading-tight">{badgeBig}</span>
        </div>
        <div className="flex-1 px-3 py-2 text-center flex flex-col justify-center">
          <h3 className="text-sm sm:text-base font-bold leading-tight">{name}</h3>
          <p className="text-[10px] text-gray-600 leading-tight">Department of the Treasury — Internal Revenue Service</p>
        </div>
        <div className="px-3 py-2 border-l-2 border-black flex flex-col justify-center items-end min-w-[110px]">
          <span className="text-[9px] text-gray-600 leading-none">OMB No. {ombFor(badgeBig)}</span>
          <span className="text-xl font-extrabold leading-tight">{year}</span>
          <span className="text-[8px] text-gray-500 leading-none uppercase">Auto-generado</span>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// Línea de formulario IRS: descripción a la izquierda, monto en casilla a la derecha
function LineRow({ label, value, sub = false, bold = false, indent = false }: Readonly<{
  label: string; value: number | string; sub?: boolean; bold?: boolean; indent?: boolean
}>) {
  const isMoney = typeof value === 'number'
  const val = isMoney ? fmt(value as number) : value
  return (
    <div className={`flex items-stretch border-b border-gray-300 ${bold ? 'bg-gray-100' : ''} ${sub ? '' : ''}`}>
      <span className={`flex-1 text-sm py-1.5 pr-2 ${indent ? 'pl-4' : ''} ${bold ? 'font-bold' : ''}`}>{label}</span>
      <span className={`w-32 sm:w-36 shrink-0 text-right font-mono text-sm py-1.5 px-2 border-l border-gray-400 ${bold ? 'font-bold' : ''}`}>
        {isMoney ? `$ ${val}` : val}
      </span>
    </div>
  )
}
// ── fetchIrsBundle helpers (extracted to reduce cognitive complexity) ──────

function resolveExpenseBreakdown(taxInfo: any): Record<string, number> {
  if (Array.isArray(taxInfo.expensesByCategory)) {
    return Object.fromEntries(
      (taxInfo.expensesByCategory as { name: string; amount: number }[]).map((c) => [c.name, c.amount])
    )
  }
  return taxInfo.expensesByCategory || {}
}

async function fetchIrsBundle(taxYear: number, companyId: string): Promise<TaxFormBundle> {
  const [computeRes, taxInfoRes, vehiclesRes] = await Promise.all([
    fetch(`/api/tax-forms/1040?year=${taxYear}&companyId=${companyId}&action=compute`),
    fetch(`/api/taxes?companyId=${companyId}&year=${taxYear}`),
    fetch(`/api/accounting/assets?companyId=${companyId}&category=VEHICLE&status=ACTIVE`),
  ])

  if (!computeRes.ok) {
    throw new Error('No se pudieron calcular los formularios. Verifique que la empresa tenga datos del año seleccionado.')
  }

  const c = await computeRes.json()
  const taxInfo = taxInfoRes.ok ? await taxInfoRes.json() : {}
  const vehiclesData: VehicleAsset[] = vehiclesRes.ok ? await vehiclesRes.json() : []
  const t = c.totals

  const companyData = {
    totalRevenue:     c.scheduleC.grossReceipts || taxInfo.totalRevenue || 0,
    totalExpenses:    c.scheduleC.expenses || taxInfo.totalExpenses || 0,
    payroll:          taxInfo.totalPayroll || 0,
    mortgageInterest: taxInfo.expensesByCategory?.['Mortgage Interest'] || 0,
    businessAssets:   taxInfo.totalAssets || 0,
    expenseBreakdown: resolveExpenseBreakdown(taxInfo),
    employeeCount:    taxInfo.employeeCount || 0,
    vehicles:         Array.isArray(vehiclesData) ? vehiclesData : [],
  }

  return {
    taxYear,
    filing: {
      status: c.filing?.status || 'SINGLE',
      firstName: c.filing?.firstName || '',
      lastName: c.filing?.lastName || '',
      ssn: c.filing?.ssn || '',
    },
    form1040: {
      wages:                c.income.wages,
      taxableInterest:      c.income.taxableInterest,
      ordinaryDividends:    c.income.ordinaryDividends,
      qualifiedDividends:   c.income.qualifiedDividends,
      iraDistributions:     0,
      taxableIRA:           0,
      pensionsAnnuities:    0,
      taxablePensions:      0,
      socialSecurity:       0,
      taxableSocialSecurity:0,
      capitalGainLoss:      0,
      otherIncome:          c.income.otherIncome,
      totalIncome:          t.totalIncome,
      adjustments:          t.adjustments,
      agi:                  t.agi,
      standardDeduction:    t.standardDeduction,
      qbiDeduction:         t.qbiDeduction,
      totalDeductions:      t.totalDeductions,
      taxableIncome:        t.taxableIncome,
      tax:                  t.tax,
      additionalTaxes:      t.additionalTaxes,
      totalTax:             t.totalTax,
      childTaxCredit:       t.childTaxCredit,
      netTax:               t.netTax,
      w2Withholding:        t.w2Withholding,
      estimatedPayments:    t.estimatedPayments,
      totalPayments:        t.totalPayments,
      refund:               t.refund,
      amountOwed:           t.amountOwed,
    },
    scheduleC: {
      grossReceipts:    c.scheduleC.grossReceipts,
      expenses:         c.scheduleC.expenses,
      netProfit:        c.scheduleC.netProfit,
      selfEmploymentTax:c.scheduleSE.selfEmploymentTax,
      deductibleSETax:  c.scheduleSE.deductiblePortion,
    },
    scheduleSE: {
      netEarnings:      c.scheduleSE.netEarnings,
      selfEmploymentTax:c.scheduleSE.selfEmploymentTax,
      deductiblePortion:c.scheduleSE.deductiblePortion,
    },
    companyData,
    priorYearTax: t.totalTax,
  }
}

function computeIrsForms(bundle: TaxFormBundle, companyName?: string): ComputedForms {
  const medicalExpenses = bundle.companyData.expenseBreakdown['Medical'] || 0
  const stateLocalTax = 10000
  const mortgageInterest = bundle.companyData.mortgageInterest
  const charitableContributions = bundle.companyData.expenseBreakdown['Charitable'] || 0
  const form5329IraAmt = bundle.form1040.taxableIRA * 0.1
  const form5329Total = bundle.form1040.taxableIRA > 0 ? form5329IraAmt : 0
  const form8962Credit = bundle.form1040.agi < 40000
    ? Math.max(0, (40000 - bundle.form1040.agi) * 0.05)
    : 0
  const form8396Credit = Math.min(mortgageInterest * 0.2, 2000)
  const assets = bundle.companyData.businessAssets
  const vehicles = bundle.companyData.vehicles || []
  // Compute annual vehicle depreciation (straight-line) for the tax year
  const vehicleAnnualDepreciation = vehicles.reduce((sum, v) => {
    const annualDep = v.usefulLife > 0 ? (v.purchasePrice - v.salvageValue) / v.usefulLife : 0
    return sum + annualDep
  }, 0)
  const vehicleTotalAccumulated = vehicles.reduce((sum, v) => sum + (v.accumulatedDepreciation || 0), 0)
  const section179Deduction = Math.min(assets, 1_160_000)
  const form8959Tax = bundle.form1040.agi > 200000 ? (bundle.form1040.agi - 200000) * 0.009 : 0
  const seTaxTotal = bundle.scheduleSE.selfEmploymentTax
  const totalAdditionalTaxes = seTaxTotal + form8959Tax + form5329Total
  let summaryBorderClass = 'border-muted'
  if (bundle.form1040.refund > 0) summaryBorderClass = 'border-green-400'
  else if (bundle.form1040.amountOwed > 0) summaryBorderClass = 'border-red-400'

  return {
    form8879: {
      totalIncome: bundle.form1040.totalIncome,
      agi: bundle.form1040.agi,
      taxableIncome: bundle.form1040.taxableIncome,
      totalTax: bundle.form1040.netTax,
      refundOrOwed: bundle.form1040.refund > 0 ? bundle.form1040.refund : -bundle.form1040.amountOwed,
    },
    scheduleA: {
      medicalExpenses,
      stateLocalTax,
      mortgageInterest,
      charitableContributions,
      total: medicalExpenses + stateLocalTax + mortgageInterest + charitableContributions,
    },
    form5329: {
      iraDistributions: bundle.form1040.iraDistributions,
      earlyWithdrawalPenalty: form5329IraAmt,
      totalAdditionalTax: form5329Total,
    },
    form8962: {
      agi: bundle.form1040.agi,
      eligibleForCredit: bundle.form1040.agi < 58320,
      estimatedCredit: form8962Credit,
    },
    form8396: {
      mortgageInterest,
      creditRate: 0.2,
      credit: form8396Credit,
    },
    form4562: {
      businessAssets: assets,
      section179Deduction,
      bonusDepreciation: assets * 0.6,
      macrsDepreciation: vehicleAnnualDepreciation > 0 ? vehicleAnnualDepreciation : assets * 0.2,
      totalDepreciation: section179Deduction + vehicleAnnualDepreciation,
      vehicles,
      vehicleAnnualDepreciation,
      vehicleTotalAccumulated,
    },
    schedule2: {
      selfEmploymentTax: seTaxTotal,
      form8959Tax,
      form5329Tax: form5329Total,
      totalAdditionalTaxes,
    },
    schedule3: {
      mortgageInterestCredit: form8396Credit,
      premiumTaxCredit: form8962Credit,
      totalAdditionalCredits: form8396Credit + form8962Credit,
    },
    form8995: {
      totalQBI: bundle.scheduleC.netProfit,
      qbiDeduction: bundle.form1040.qbiDeduction,
      nol: bundle.scheduleC.netProfit < 0 ? Math.abs(bundle.scheduleC.netProfit) : 0,
      activities: [
        {
          name: companyName || 'Business Activity',
          qbi: bundle.scheduleC.netProfit,
          w2Wages: bundle.form1040.wages,
          qualifiedProperty: bundle.companyData.businessAssets,
        }
      ],
    },
    summaryBorderClass,
  }
}
// ── PDF Extraction Helpers ──────────────────────────────────────────────────

type ExtractedPdf = Record<string, number | string | boolean | null | undefined>

function buildBundleFromPdf(e: ExtractedPdf, taxYear: number): TaxFormBundle {
  const scheduleCGross = (e.scheduleC_grossReceipts as number) ?? 0
  const scheduleCExpenses = (e.scheduleC_expenses as number) ?? 0
  const scheduleCNet = (e.scheduleC_netProfit as number) > 0
    ? (e.scheduleC_netProfit as number)
    : scheduleCGross - scheduleCExpenses
  const seNetEarnings = (e.scheduleSE_netEarnings as number) ?? (Math.max(0, scheduleCNet) * 0.9235)
  const seTax = (e.scheduleSE_selfEmploymentTax as number) ?? (seNetEarnings * 0.153)
  const seDeductible = (e.scheduleSE_deductiblePortion as number) ?? (seTax / 2)
  const wages = (e.wages as number) ?? 0
  const agi = (e.agi as number) ?? 0
  const filingStatus = (e.filingStatus as string) ?? 'SINGLE'
  const defaultStdDed = filingStatus.includes('JOINT') ? 27700 : 13850
  const stdDedRaw = (e.standardDeduction as number) ?? 0
  const standardDed = stdDedRaw > 0 ? stdDedRaw : defaultStdDed
  const qbiRaw = (e.qbiDeduction as number) ?? 0
  const qbiComputed = scheduleCNet > 0
    ? Math.min(scheduleCNet * 0.2, Math.max(0, agi - standardDed) * 0.2)
    : 0
  const qbiDeduction = qbiRaw > 0 ? qbiRaw : qbiComputed
  const tiRaw = (e.taxableIncome as number) ?? 0
  const taxableIncome = tiRaw > 0 ? tiRaw : Math.max(0, agi - standardDed - qbiDeduction)
  const incomeTax = (e.incomeTax as number) ?? 0
  const ttRaw = (e.totalTax as number) ?? 0
  const totalTax = ttRaw > 0 ? ttRaw : incomeTax + seTax
  const w2Withholding = (e.withholding as number) ?? 0
  const estimatedPayments = (e.estimatedPayments as number) ?? 0
  const totalPayments = w2Withholding + estimatedPayments
  const refundRaw = (e.refundAmount as number) ?? 0
  const refund = refundRaw > 0 ? refundRaw : Math.max(0, totalPayments - totalTax)
  const owedRaw = (e.amountOwed as number) ?? 0
  const amountOwed = owedRaw > 0 ? owedRaw : Math.max(0, totalTax - totalPayments)
  const mortgageInterest =
    ((e.scheduleA_mortgageInterest as number) ?? 0) ||
    ((e.form8396_mortgageInterest as number) ?? 0)
  const businessAssets = (e.form4562_businessAssets as number) ?? 0
  const totalIncomeRaw = (e.totalIncome as number) ?? 0
  const totalIncome = totalIncomeRaw > 0 ? totalIncomeRaw : wages + scheduleCNet + ((e.otherIncome as number) ?? 0)
  const adjustmentsRaw = (e.adjustmentsToIncome as number) ?? 0

  return {
    taxYear,
    filing: { status: filingStatus, firstName: (e.firstName as string) ?? '', lastName: (e.lastName as string) ?? '', ssn: (e.ssn as string) ?? '' },
    form1040: {
      wages, taxableInterest: (e.taxableInterest as number) ?? 0, ordinaryDividends: (e.ordinaryDividends as number) ?? 0,
      qualifiedDividends: (e.qualifiedDividends as number) ?? 0, iraDistributions: (e.iraDistributions as number) ?? 0,
      taxableIRA: (e.taxableIRA as number) ?? 0, pensionsAnnuities: (e.pensionsAnnuities as number) ?? 0,
      taxablePensions: (e.taxablePensions as number) ?? 0, socialSecurity: (e.socialSecurity as number) ?? 0,
      taxableSocialSecurity: (e.taxableSocialSecurity as number) ?? 0, capitalGainLoss: (e.capitalGainLoss as number) ?? 0,
      otherIncome: (e.otherIncome as number) ?? 0, totalIncome, adjustments: adjustmentsRaw > 0 ? adjustmentsRaw : seDeductible,
      agi, standardDeduction: standardDed, qbiDeduction, totalDeductions: standardDed + qbiDeduction, taxableIncome,
      tax: incomeTax, additionalTaxes: seTax, totalTax, childTaxCredit: (e.childTaxCredit as number) ?? 0,
      netTax: totalTax, w2Withholding, estimatedPayments, totalPayments, refund, amountOwed,
    },
    scheduleC: { grossReceipts: scheduleCGross, expenses: scheduleCExpenses, netProfit: scheduleCNet, selfEmploymentTax: seTax, deductibleSETax: seDeductible },
    scheduleSE: { netEarnings: seNetEarnings, selfEmploymentTax: seTax, deductiblePortion: seDeductible },
    companyData: {
      totalRevenue: scheduleCGross, totalExpenses: scheduleCExpenses, payroll: wages, mortgageInterest, businessAssets,
      expenseBreakdown: { Medical: (e.scheduleA_medicalExpenses as number) ?? 0, Charitable: (e.scheduleA_charitableContributions as number) ?? 0, 'Mortgage Interest': mortgageInterest },
      employeeCount: 0,
      vehicles: [],
    },
    priorYearTax: totalTax,
  }
}

function patchFormsFromPdf(forms: ComputedForms, e: ExtractedPdf): void {
  if ((e.scheduleA_total as number) > 0) {
    forms.scheduleA.medicalExpenses = (e.scheduleA_medicalExpenses as number) ?? forms.scheduleA.medicalExpenses
    forms.scheduleA.stateLocalTax = (e.scheduleA_stateLocalTax as number) ?? forms.scheduleA.stateLocalTax
    forms.scheduleA.mortgageInterest = (e.scheduleA_mortgageInterest as number) ?? forms.scheduleA.mortgageInterest
    forms.scheduleA.charitableContributions = (e.scheduleA_charitableContributions as number) ?? forms.scheduleA.charitableContributions
    forms.scheduleA.total = e.scheduleA_total as number
  }
  if ((e.form5329_totalAdditionalTax as number) > 0) {
    forms.form5329.iraDistributions = (e.form5329_iraDistributions as number) ?? forms.form5329.iraDistributions
    forms.form5329.earlyWithdrawalPenalty = (e.form5329_earlyWithdrawalPenalty as number) ?? forms.form5329.earlyWithdrawalPenalty
    forms.form5329.totalAdditionalTax = e.form5329_totalAdditionalTax as number
  }
  if ((e.form8995_qbiDeduction as number) > 0) {
    forms.form8995.qbiDeduction = e.form8995_qbiDeduction as number
    forms.form8995.totalQBI = (e.form8995_qualifiedBusinessIncome as number) ?? forms.form8995.totalQBI
    forms.form8995.nol = (e.form8995_netOperatingLoss as number) ?? forms.form8995.nol
  }
  if ((e.form8962_taxCredit as number) > 0) {
    forms.form8962.agi = (e.form8962_agi as number) > 0 ? (e.form8962_agi as number) : forms.form8962.agi
    forms.form8962.estimatedCredit = e.form8962_taxCredit as number
    forms.form8962.eligibleForCredit = true
  }
  if ((e.form8396_credit as number) > 0) {
    forms.form8396.mortgageInterest = (e.form8396_mortgageInterest as number) ?? forms.form8396.mortgageInterest
    forms.form8396.creditRate = (e.form8396_creditRate as number) > 0 ? (e.form8396_creditRate as number) : forms.form8396.creditRate
    forms.form8396.credit = e.form8396_credit as number
  }
  if ((e.form4562_totalDepreciation as number) > 0) {
    forms.form4562.businessAssets = (e.form4562_businessAssets as number) ?? forms.form4562.businessAssets
    forms.form4562.section179Deduction = (e.form4562_section179Deduction as number) ?? forms.form4562.section179Deduction
    forms.form4562.bonusDepreciation = (e.form4562_bonusDepreciation as number) ?? forms.form4562.bonusDepreciation
    forms.form4562.macrsDepreciation = (e.form4562_macrsDepreciation as number) ?? forms.form4562.macrsDepreciation
    forms.form4562.totalDepreciation = e.form4562_totalDepreciation as number
  }
  if ((e.schedule2_totalAdditionalTaxes as number) > 0) {
    forms.schedule2.selfEmploymentTax = (e.schedule2_selfEmploymentTax as number) ?? forms.schedule2.selfEmploymentTax
    forms.schedule2.form8959Tax = (e.schedule2_additionalMedicareTax as number) ?? forms.schedule2.form8959Tax
    forms.schedule2.form5329Tax = (e.schedule2_form5329Tax as number) ?? forms.schedule2.form5329Tax
    forms.schedule2.totalAdditionalTaxes = e.schedule2_totalAdditionalTaxes as number
  }
  if ((e.schedule3_totalAdditionalCredits as number) > 0) {
    forms.schedule3.mortgageInterestCredit = (e.schedule3_mortgageInterestCredit as number) ?? forms.schedule3.mortgageInterestCredit
    forms.schedule3.premiumTaxCredit = (e.schedule3_premiumTaxCredit as number) ?? forms.schedule3.premiumTaxCredit
    forms.schedule3.totalAdditionalCredits = e.schedule3_totalAdditionalCredits as number
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function IrsFormsPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()

  const currentYear = new Date().getFullYear()
  const [state, setState] = useState<IrsFormsPageState>({
    bundle: null,
    forms: null,
    loading: false,
    error: null,
    taxYear: currentYear,
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  const loadBundle = useCallback(async (silent = false) => {
    if (!activeCompany?.id) {
      if (!silent) toast.error('Seleccione una empresa primero')
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const bundle = await fetchIrsBundle(state.taxYear, activeCompany.id)
      const forms = computeIrsForms(bundle, activeCompany.name || undefined)
      setState(s => ({ ...s, bundle, forms, loading: false }))
      if (!silent) toast.success('Paquete de formularios cargado correctamente')
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message || 'Error al cargar datos' }))
      if (!silent) toast.error(err.message || 'Error al cargar datos')
    }
  }, [activeCompany?.id, activeCompany?.name, state.taxYear])

  // Cargar automáticamente al abrir y cuando cambie la empresa o el año
  useEffect(() => {
    if (status === 'authenticated' && activeCompany?.id) {
      loadBundle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeCompany?.id, state.taxYear])

  // Auto-refrescar (silencioso) al volver a la pestaña o ventana: así los
  // formularios reflejan los últimos datos sin tener que presionar "Actualizar".
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && activeCompany?.id) {
        loadBundle(true)
      }
    }
    document.addEventListener('visibilitychange', refresh)
    globalThis.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      globalThis.removeEventListener('focus', refresh)
    }
  }, [status, activeCompany?.id, loadBundle])

  const handleDownloadPDF = () => {
    if (!bundle) return
    const f = bundle.form1040
    const c = bundle.companyData
    downloadTaxPDF({
      title: 'IRS Tax Forms Summary',
      subtitle: 'Form 1040 & Schedules',
      year: bundle.taxYear,
      company: activeCompany?.name ?? undefined,
      fileName: 'irs_forms',
      sections: [
        {
          title: 'Form 1040 – Income',
          columns: ['Line', 'Description', 'Amount'],
          rows: [
            ['1a', 'Wages, Salaries, Tips', f.wages],
            ['2b', 'Taxable Interest', f.taxableInterest],
            ['3b', 'Ordinary Dividends', f.ordinaryDividends],
            ['4b', 'Taxable IRA Distributions', f.taxableIRA],
            ['5b', 'Taxable Pensions & Annuities', f.taxablePensions],
            ['6b', 'Taxable Social Security', f.taxableSocialSecurity],
            ['7',  'Capital Gain or Loss', f.capitalGainLoss],
            ['8',  'Other Income', f.otherIncome],
            ['9',  'Total Income', f.totalIncome],
            ['11', 'Adjusted Gross Income (AGI)', f.agi],
            ['12', 'Standard Deduction', f.standardDeduction],
            ['15', 'Taxable Income', f.taxableIncome],
            ['24', 'Total Tax', f.totalTax],
            ['25a','W-2 Withholding', f.w2Withholding],
            ['26', 'Estimated Tax Payments', f.estimatedPayments],
            ['35', 'Refund', f.refund],
            ['37', 'Amount Owed', f.amountOwed],
          ],
        },
        {
          title: 'Schedule C – Business Income',
          columns: ['Item', 'Amount'],
          rows: [
            ['Gross Receipts', bundle.scheduleC.grossReceipts],
            ['Business Expenses', bundle.scheduleC.expenses],
            ['Net Profit / Loss', bundle.scheduleC.netProfit],
            ['Self-Employment Tax', bundle.scheduleC.selfEmploymentTax],
          ],
        },
        {
          title: 'Company Financial Data',
          columns: ['Item', 'Amount'],
          rows: [
            ['Total Revenue', c.totalRevenue],
            ['Total Expenses', c.totalExpenses],
            ['Payroll', c.payroll],
            ['Mortgage Interest', c.mortgageInterest],
            ['Business Assets', c.businessAssets],
            ['Employees', c.employeeCount],
          ],
        },
      ],
    })
  }

  const handlePrint = () => {
    globalThis.window.print()
  }

  const { bundle, forms, loading, error, taxYear } = state
  const form8879 = forms?.form8879
  const scheduleA = forms?.scheduleA
  const form5329 = forms?.form5329
  const form8962 = forms?.form8962
  const form8396 = forms?.form8396
  const form4562 = forms?.form4562
  const schedule2 = forms?.schedule2
  const schedule3 = forms?.schedule3
  const form8995 = forms?.form8995
  const summaryBorderClass = forms?.summaryBorderClass ?? 'border-muted'

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Paquete Completo de Formularios IRS
            </h1>
            <p className="text-muted-foreground mt-1">
              Formularios 8879, 1040, Schedule A, B, C, SE, Schedule 2 &amp; 3, 5329, 8995, 8962, 8396, 4562
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={taxYear.toString()}
              onValueChange={(v) => setState(s => ({ ...s, taxYear: Number.parseInt(v, 10), bundle: null, error: null }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2027, 2026, 2025, 2024, 2023, 2022, 2021].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => loadBundle()} disabled={loading || !activeCompany} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Calculando...' : 'Actualizar'}
            </Button>
            {bundle && (
              <>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Entity Type Banner */}
        {activeCompany && (
          <Card className={(() => {
            const t = activeCompany.taxEntityType
            if (t === 'SOLE_PROPRIETOR') return 'border-green-300 bg-green-50'
            if (t === 'LLC') return 'border-blue-300 bg-blue-50'
            if (t === 'S_CORP') return 'border-purple-300 bg-purple-50'
            if (t === 'C_CORP') return 'border-orange-300 bg-orange-50'
            return 'border-gray-200 bg-gray-50'
          })()}>
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{activeCompany.name}</span>
                <span className="text-muted-foreground">—</span>
                {(() => {
                  const t = activeCompany.taxEntityType || 'SOLE_PROPRIETOR'
                  const labels: Record<string, string> = {
                    SOLE_PROPRIETOR: 'Sole Proprietor → Form 1040 + Schedule C + Schedule SE',
                    LLC: 'LLC → Form 1040 + Schedule C + Schedule SE (single-member)',
                    S_CORP: 'S Corporation → Form 1120-S (shareholders file K-1)',
                    C_CORP: 'C Corporation → Form 1120',
                    PARTNERSHIP: 'Partnership → Form 1065',
                  }
                  const colors: Record<string, string> = {
                    SOLE_PROPRIETOR: 'bg-green-100 text-green-800',
                    LLC: 'bg-blue-100 text-blue-800',
                    S_CORP: 'bg-purple-100 text-purple-800',
                    C_CORP: 'bg-orange-100 text-orange-800',
                    PARTNERSHIP: 'bg-gray-100 text-gray-800',
                  }
                  return (
                    <Badge className={colors[t] ?? 'bg-gray-100 text-gray-800'}>
                      {labels[t] ?? t}
                    </Badge>
                  )
                })()}
                {(activeCompany.taxEntityType === 'S_CORP' || activeCompany.taxEntityType === 'C_CORP' || activeCompany.taxEntityType === 'PARTNERSHIP') && (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Este tipo de entidad no usa Form 1040 individual. Los formularios a continuación son de referencia.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Banner */}
        {!bundle && !loading && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">Llenado automático</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Los formularios se generan y llenan <strong>automáticamente</strong> con los datos reales
                    del año seleccionado, y <strong>se actualizan solos</strong> cada vez que regresas a esta
                    pestaña (o presiona <strong>&quot;Actualizar&quot;</strong>). Para la información personal
                    (nombre, SSN, estado civil) completa el <strong>Form 1040 (Individual)</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forms */}
        {bundle && (
          <IrsFormYearContext.Provider value={taxYear}>
          <Tabs defaultValue="8879" className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="8879">Form 8879</TabsTrigger>
              <TabsTrigger value="1040">Form 1040</TabsTrigger>
              <TabsTrigger value="schedA">Schedule A</TabsTrigger>
              <TabsTrigger value="schedC">Schedule C</TabsTrigger>
              <TabsTrigger value="schedSE">Schedule SE</TabsTrigger>
              <TabsTrigger value="sched2">Schedule 2</TabsTrigger>
              <TabsTrigger value="sched3">Schedule 3</TabsTrigger>
              <TabsTrigger value="5329">Form 5329</TabsTrigger>
              <TabsTrigger value="8995">Form 8995</TabsTrigger>
              <TabsTrigger value="8962">Form 8962</TabsTrigger>
              <TabsTrigger value="8396">Form 8396</TabsTrigger>
              <TabsTrigger value="4562">Form 4562</TabsTrigger>
            </TabsList>

            {/* ── Form 8879 ─────────────────────────────────────────────── */}
            <TabsContent value="8879">
              <PrintSection id="form-8879" title="Form 8879 — IRS e-file Signature Authorization">
                <p className="text-xs text-muted-foreground mb-4">
                  Authorizes the Electronic Return Originator (ERO) to electronically file your return using your PIN.
                  Tax Year: <strong>{taxYear}</strong>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2">Taxpayer Information</h4>
                    <LineRow label="Name" value={`${bundle.filing.firstName} ${bundle.filing.lastName}`} />
                    <LineRow label="SSN" value={bundle.filing.ssn ? `XXX-XX-${bundle.filing.ssn.slice(-4)}` : 'Not provided'} />
                    <LineRow label="Tax Year" value={taxYear.toString()} />
                    <LineRow label="Filing Status" value={bundle.filing.status.replaceAll('_', ' ')} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2">Return Information (Part I)</h4>
                    <LineRow label="1. Adjusted Gross Income" value={bundle.form1040.agi} />
                    <LineRow label="2. Total Tax" value={bundle.form1040.netTax} />
                    <LineRow label="3. Federal Income Tax Withheld" value={bundle.form1040.w2Withholding} />
                    <LineRow label="4. Refund / Amount Owed" value={
                      (form8879?.refundOrOwed ?? 0) >= 0
                        ? `Refund: $${fmt(form8879?.refundOrOwed ?? 0)}`
                        : `Owes: $${fmt(Math.abs(form8879?.refundOrOwed ?? 0))}`
                    } bold />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <strong>ERO Declaration:</strong> I declare that the information contained in this electronic file is the
                  information furnished to me by the taxpayer. If the taxpayer furnished me with a completed copy of
                  this return, I declare that the information furnished to me by the taxpayer is identical to that
                  contained in this electronic file.
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="border border-dashed rounded p-3 text-center text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Taxpayer PIN Signature</p>
                    <p className="text-xs">Sign digitally or manually</p>
                    <div className="mt-2 border-b border-foreground/30 pb-1 mb-1" />
                    <p className="text-xs">Date: _______________</p>
                  </div>
                  <div className="border border-dashed rounded p-3 text-center text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">ERO Signature &amp; PTIN</p>
                    <p className="text-xs">Preparer information</p>
                    <div className="mt-2 border-b border-foreground/30 pb-1 mb-1" />
                    <p className="text-xs">PTIN: _______________ Date: ___</p>
                  </div>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Form 1040 ─────────────────────────────────────────────── */}
            <TabsContent value="1040">
              <div className="space-y-4">
                <PrintSection id="form-1040-income" title="Form 1040 — Additional Income and Adjustments to Income (Schedule 1)">
                  <p className="text-xs text-muted-foreground mb-3">Tax Year {taxYear} · Filing Status: {bundle.filing.status.replaceAll('_', ' ')}</p>
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Additional Income</h4>
                  <div className="space-y-1">
                    <LineRow label="1. Taxable Refunds of State/Local Taxes" value={0} sub />
                    <LineRow label="2a. Alimony Received" value={0} sub />
                    <LineRow label="3. Business Income (Schedule C)" value={bundle.scheduleC.netProfit} sub />
                    <LineRow label="4. Other Gains or Losses" value={bundle.form1040.capitalGainLoss} sub />
                    <LineRow label="5. Rental Income (Schedule E)" value={0} sub />
                    <LineRow label="6. Farm Income (Schedule F)" value={0} sub />
                    <LineRow label="7. Unemployment Compensation" value={0} sub />
                    <LineRow label="8. Other Income" value={bundle.form1040.otherIncome} sub />
                    <LineRow label="10. Combine Lines 1–8" value={bundle.scheduleC.netProfit + bundle.form1040.otherIncome} bold />
                  </div>
                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Adjustments to Income</h4>
                  <div className="space-y-1">
                    <LineRow label="11. Educator Expenses" value={0} sub />
                    <LineRow label="15. Deductible Part of Self-Employment Tax" value={bundle.scheduleSE.deductiblePortion} sub />
                    <LineRow label="16. Self-Employed SEP/SIMPLE/Qualified Plans" value={0} sub />
                    <LineRow label="17. Self-Employed Health Insurance Deduction" value={0} sub />
                    <LineRow label="20. Student Loan Interest Deduction" value={0} sub />
                    <LineRow label="26. Total Adjustments" value={bundle.form1040.adjustments} bold />
                  </div>
                </PrintSection>

                <PrintSection id="form-1040-additional-taxes" title="Form 1040 — Additional Taxes (Schedule 2 Summary)">
                  <div className="space-y-1">
                    <LineRow label="2. Excess Advance Premium Tax Credit" value={0} sub />
                    <LineRow label="4. Self-Employment Tax (from Schedule SE)" value={bundle.scheduleSE.selfEmploymentTax} sub />
                    <LineRow label="8. Additional Medicare Tax (Form 8959)" value={schedule2?.form8959Tax || 0} sub />
                    <LineRow label="17. Other Additional Taxes" value={schedule2?.form5329Tax || 0} sub />
                    <LineRow label="10. Total Additional Taxes" value={schedule2?.totalAdditionalTaxes || 0} bold />
                  </div>
                </PrintSection>

                <PrintSection id="form-1040-credits" title="Form 1040 — Additional Credits and Payments (Schedule 3)">
                  <div className="space-y-1">
                    <LineRow label="1. Foreign Tax Credit" value={0} sub />
                    <LineRow label="3. Education Credits (Form 8863)" value={0} sub />
                    <LineRow label="4. Retirement Savings Credit (Form 8880)" value={0} sub />
                    <LineRow label="5a. Residential Clean Energy Credit (Form 5695)" value={0} sub />
                    <LineRow label="6d. Mortgage Interest Credit (Form 8396)" value={form8396?.credit || 0} sub />
                    <LineRow label="9. Net Premium Tax Credit (Form 8962)" value={form8962?.estimatedCredit || 0} sub />
                    <LineRow label="Total Additional Credits" value={schedule3?.totalAdditionalCredits || 0} bold />
                  </div>
                </PrintSection>
              </div>
            </TabsContent>

            {/* ── Schedule A ───────────────────────────────────────────── */}
            <TabsContent value="schedA">
              <PrintSection id="schedule-a" title="Schedule A — Itemized Deductions">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Note: Standard deduction for {bundle.filing.status.replaceAll('_', ' ')} is ${fmt(bundle.form1040.standardDeduction)}.
                  Use itemized only if total below exceeds this amount.
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Medical and Dental Expenses</h4>
                  <LineRow label="1. Medical and Dental Expenses" value={scheduleA?.medicalExpenses || 0} sub />
                  <LineRow label="2. AGI × 7.5%" value={(bundle.form1040.agi * 0.075)} sub />
                  <LineRow label="3. Deductible Amount (Line 1 − Line 2)" value={Math.max(0, (scheduleA?.medicalExpenses || 0) - bundle.form1040.agi * 0.075)} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Taxes You Paid (SALT)</h4>
                  <LineRow label="5a. State and Local Income Taxes" value={0} sub />
                  <LineRow label="5b. General Sales Tax" value={0} sub />
                  <LineRow label="5c. Real Estate Taxes" value={scheduleA?.stateLocalTax || 0} sub />
                  <LineRow label="5e. SALT Total (capped at $10,000)" value={Math.min(scheduleA?.stateLocalTax || 0, 10000)} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Interest You Paid</h4>
                  <LineRow label="8a. Home Mortgage Interest (Form 1098)" value={scheduleA?.mortgageInterest || 0} sub />
                  <LineRow label="8b. Home Mortgage Interest (not reported on 1098)" value={0} sub />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Gifts to Charity</h4>
                  <LineRow label="11. Gifts by Cash or Check" value={scheduleA?.charitableContributions || 0} sub />
                  <LineRow label="12. Gifts Other Than Cash or Check" value={0} sub />

                  <div className="mt-4 border-t-2 pt-2">
                    <LineRow label="17. Total Itemized Deductions" value={scheduleA?.total || 0} bold />
                    <div className="mt-2 p-2 rounded bg-muted text-xs">
                      {(scheduleA?.total || 0) > bundle.form1040.standardDeduction
                        ? '✅ Itemized deductions exceed standard deduction. Recommend itemizing.'
                        : `ℹ️ Standard deduction ($${fmt(bundle.form1040.standardDeduction)}) exceeds itemized ($${fmt(scheduleA?.total || 0)}). Standard deduction applies.`}
                    </div>
                  </div>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Schedule C ───────────────────────────────────────────── */}
            <TabsContent value="schedC">
              <PrintSection id="schedule-c" title="Schedule C — Profit or Loss From Business (Sole Proprietorship)">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Principal Business: {activeCompany?.name || 'Business'}
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Income</h4>
                  <LineRow label="1. Gross Receipts or Sales" value={bundle.scheduleC.grossReceipts} sub />
                  <LineRow label="2. Returns and Allowances" value={0} sub />
                  <LineRow label="3. Subtract Line 2 from Line 1" value={bundle.scheduleC.grossReceipts} sub />
                  <LineRow label="4. Cost of Goods Sold (from Part III)" value={0} sub />
                  <LineRow label="5. Gross Profit" value={bundle.scheduleC.grossReceipts} sub />
                  <LineRow label="6. Other Income" value={0} sub />
                  <LineRow label="7. Gross Income (Lines 5 + 6)" value={bundle.scheduleC.grossReceipts} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Expenses</h4>
                  {Object.entries(bundle.companyData.expenseBreakdown).map(([cat, amt]) => (
                    <LineRow key={cat} label={cat} value={amt} sub />
                  ))}
                  <LineRow label="26. Total Expenses" value={bundle.scheduleC.expenses} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Result</h4>
                  <LineRow label="28. Tentative Profit or Loss (Line 7 − Line 26)" value={bundle.scheduleC.netProfit} bold />
                  <LineRow label="29. Expenses for Business Use of Your Home" value={0} sub />
                  <LineRow label="31. Net Profit or Loss" value={bundle.scheduleC.netProfit} bold />
                  <div className={`mt-2 p-2 rounded text-xs ${bundle.scheduleC.netProfit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    {bundle.scheduleC.netProfit >= 0
                      ? `✅ Net Profit $${fmt(bundle.scheduleC.netProfit)} — Enter on Schedule 1, Line 3 and Schedule SE`
                      : `⚠️ Net Loss $${fmt(Math.abs(bundle.scheduleC.netProfit))} — May be limited by at-risk and passive activity rules`}
                  </div>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Schedule SE ──────────────────────────────────────────── */}
            <TabsContent value="schedSE">
              <PrintSection id="schedule-se" title="Schedule SE — Self-Employment Tax">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Self-employment tax rate: 15.3% (SS 12.4% + Medicare 2.9%)
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Section A — Short Schedule SE</h4>
                  <LineRow label="1a. Net Farm Profit or Loss" value={0} sub />
                  <LineRow label="2. Net Profit from Schedule C (Line 31)" value={bundle.scheduleC.netProfit} sub />
                  <LineRow label="3. Combined Net Earnings" value={bundle.scheduleC.netProfit} />
                  <LineRow label="4. Multiply Line 3 × 0.9235 (net earnings subject to SE tax)" value={bundle.scheduleSE.netEarnings} sub />
                  <p className="text-xs text-muted-foreground pl-2">Note: SS wage base 2024 = $168,600</p>
                  <LineRow label="5. Social Security portion (12.4%, up to SS wage base)" value={Math.min(bundle.scheduleSE.netEarnings, 168600) * 0.124} sub />
                  <LineRow label="6. Medicare portion (2.9%)" value={bundle.scheduleSE.netEarnings * 0.029} sub />
                  <LineRow label="12. Self-Employment Tax (Total)" value={bundle.scheduleSE.selfEmploymentTax} bold />
                  <LineRow label="13. Deductible Part (50% of Line 12 → Schedule 1, Line 15)" value={bundle.scheduleSE.deductiblePortion} bold />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CardContent className="pt-4">
                      <p className="text-xs text-green-700 dark:text-green-300 font-semibold">SE Tax Due</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">${fmt(bundle.scheduleSE.selfEmploymentTax)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                    <CardContent className="pt-4">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">AGI Reduction (50% deductible)</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">-${fmt(bundle.scheduleSE.deductiblePortion)}</p>
                    </CardContent>
                  </Card>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Schedule 2 ───────────────────────────────────────────── */}
            <TabsContent value="sched2">
              <PrintSection id="schedule-2" title="Schedule 2 — Additional Taxes">
                <p className="text-xs text-muted-foreground mb-3">Tax Year {taxYear}</p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Alternative Minimum Tax (AMT)</h4>
                  <LineRow label="1. Alternative Minimum Tax (Form 6251)" value={0} sub />
                  <LineRow label="2. Excess Advance PTC Repayment (Form 8962)" value={0} sub />
                  <LineRow label="3. Add Lines 1 and 2" value={0} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Other Taxes</h4>
                  <LineRow label="4. Self-Employment Tax (Schedule SE, Line 12)" value={bundle.scheduleSE.selfEmploymentTax} sub />
                  <LineRow label="8. Additional Medicare Tax (Form 8959)" value={schedule2?.form8959Tax || 0} sub />
                  <LineRow label="11. Net Investment Income Tax (Form 8960)" value={0} sub />
                  <LineRow label="17c. Additional Tax on IRAs (Form 5329)" value={form5329?.totalAdditionalTax || 0} sub />
                  <LineRow label="21. Total Additional Taxes" value={schedule2?.totalAdditionalTaxes || 0} bold />
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Schedule 3 ───────────────────────────────────────────── */}
            <TabsContent value="sched3">
              <PrintSection id="schedule-3" title="Schedule 3 — Additional Credits and Payments">
                <p className="text-xs text-muted-foreground mb-3">Tax Year {taxYear}</p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Nonrefundable Credits</h4>
                  <LineRow label="1. Foreign Tax Credit (Form 1116)" value={0} sub />
                  <LineRow label="2. Child and Dependent Care Expenses (Form 2441)" value={0} sub />
                  <LineRow label="3. Education Credits (Form 8863)" value={0} sub />
                  <LineRow label="4. Retirement Savings Contributions Credit (Form 8880)" value={0} sub />
                  <LineRow label="5a. Residential Clean Energy Credit (Form 5695)" value={0} sub />
                  <LineRow label="6d. Mortgage Interest Credit (Form 8396)" value={form8396?.credit || 0} sub />
                  <LineRow label="7. Total Nonrefundable Credits" value={form8396?.credit || 0} />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Other Payments and Refundable Credits</h4>
                  <LineRow label="9. Net Premium Tax Credit (Form 8962)" value={form8962?.estimatedCredit || 0} sub />
                  <LineRow label="10. Amount Paid with Extension (Form 4868)" value={0} sub />
                  <LineRow label="13. Total Other Payments and Refundable Credits" value={form8962?.estimatedCredit || 0} />

                  <LineRow label="15. Total Additional Credits + Payments" value={schedule3?.totalAdditionalCredits || 0} bold />
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Form 5329 ─────────────────────────────────────────────── */}
            <TabsContent value="5329">
              <PrintSection id="form-5329" title="Form 5329 — Additional Taxes on Qualified Plans (Including IRAs) and Other Tax-Favored Accounts">
                <p className="text-xs text-muted-foreground mb-3">Tax Year {taxYear}</p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Additional Tax on Early Distributions</h4>
                  <LineRow label="1. Amount Distributed from Qualified Retirement Plans" value={bundle.form1040.iraDistributions} sub />
                  <LineRow label="2. Distributions NOT Subject to Additional Tax" value={0} sub />
                  <LineRow label="3. Amount Subject to Additional Tax (Line 1 − Line 2)" value={bundle.form1040.taxableIRA} sub />
                  <LineRow label="4. Additional Tax (10% × Line 3)" value={form5329?.earlyWithdrawalPenalty || 0} bold />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part VIII — Additional Tax on Excess Contributions to IRAs</h4>
                  <LineRow label="15. Excess Contributions to IRAs" value={0} sub />
                  <LineRow label="17. Additional Tax (6% × Excess)" value={0} sub />

                  <LineRow label="Total Additional Tax (Line 4 + Part VIII)" value={form5329?.totalAdditionalTax || 0} bold />
                </div>
                {!form5329?.totalAdditionalTax && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded text-xs text-green-700 dark:text-green-300">
                    ✅ No additional taxes on qualified plans for Tax Year {taxYear}.
                  </div>
                )}
              </PrintSection>
            </TabsContent>

            {/* ── Form 8995 ─────────────────────────────────────────────── */}
            <TabsContent value="8995">
              <PrintSection id="form-8995" title="Form 8995 — Qualified Business Income Deduction (Simplified Computation)">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Use this form if your taxable income is at or below the threshold
                  ($191,950 Single / $383,900 MFJ for 2024).
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Qualified Business Income Activities</h4>
                  {form8995?.activities.map((act) => (
                    <div key={act.name} className="border rounded-lg p-3 mb-2">
                      <p className="font-semibold text-sm mb-1">{act.name}</p>
                      <LineRow label="  QBI from this activity" value={act.qbi} sub />
                      <LineRow label="  W-2 Wages" value={act.w2Wages} sub />
                      <LineRow label="  Qualified Property (UBIA)" value={act.qualifiedProperty} sub />
                    </div>
                  ))}
                  <LineRow label="1. Total Qualified Business Income" value={form8995?.totalQBI || 0} />
                  <LineRow label="2. Qualified Business Net Loss Carryforward" value={form8995?.nol || 0} sub />
                  <LineRow label="3. Qualified Business Income (Line 1 − Line 2)" value={Math.max(0, form8995?.totalQBI || 0)} sub />
                  <LineRow label="4. QBI Component (20% × Line 3)" value={(Math.max(0, form8995?.totalQBI || 0)) * 0.2} sub />
                  <LineRow label="5. REIT/PTP Component" value={0} sub />
                  <LineRow label="6. QBI Deduction Before Limitation (Lines 4 + 5)" value={(Math.max(0, form8995?.totalQBI || 0)) * 0.2} sub />
                  <LineRow label="15. Taxable Income Before QBI Deduction" value={bundle.form1040.taxableIncome + (form8995?.totalQBI || 0) * 0.2} sub />
                  <LineRow label="16. Net Capital Gain" value={bundle.form1040.capitalGainLoss} sub />
                  <LineRow label="17. Ordinary Taxable Income (Line 15 − Line 16)" value={bundle.form1040.taxableIncome} sub />
                  <LineRow label="18. Income Limitation (20% × Line 17)" value={bundle.form1040.taxableIncome * 0.2} sub />
                  <LineRow label="15. QBI Deduction (Lesser of Line 6 or Line 18)" value={form8995?.qbiDeduction || 0} bold />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground font-semibold">Total QBI</p>
                      <p className="text-xl font-bold">${fmt(form8995?.totalQBI || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CardContent className="pt-4">
                      <p className="text-xs text-green-700 dark:text-green-300 font-semibold">QBI Deduction</p>
                      <p className="text-xl font-bold text-green-800 dark:text-green-200">-${fmt(form8995?.qbiDeduction || 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Form 8962 ─────────────────────────────────────────────── */}
            <TabsContent value="8962">
              <PrintSection id="form-8962" title="Form 8962 — Premium Tax Credit (PTC)">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Premium Tax Credit is for individuals who purchase health insurance through the Marketplace.
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Annual and Monthly Contribution Amount</h4>
                  <LineRow label="1. Tax Household Size" value="1" sub />
                  <LineRow label="2a. Household Income (Modified AGI)" value={bundle.form1040.agi} sub />
                  <LineRow label="3. Household Income as % of FPL" value={
                    `${((bundle.form1040.agi / 14580) * 100).toFixed(0)}% of FPL`
                  } sub />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Eligibility</h4>
                  <div className={`p-2 rounded border text-sm ${form8962?.eligibleForCredit ? 'border-green-300 bg-green-50 dark:bg-green-950' : 'border-amber-300 bg-amber-50 dark:bg-amber-950'}`}>
                    {form8962?.eligibleForCredit
                      ? `✅ AGI ($${fmt(bundle.form1040.agi)}) is below 400% FPL (~$58,320). May qualify for PTC.`
                      : `ℹ️ AGI ($${fmt(bundle.form1040.agi)}) may exceed 400% FPL threshold. Credit may be limited or unavailable.`}
                  </div>

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Premium Tax Credit Claim and Reconciliation</h4>
                  <LineRow label="12. Annual Contribution Amount" value={bundle.form1040.agi * 0.0985} sub />
                  <LineRow label="13. Applicable SLCSP Premium" value={0} sub />
                  <LineRow label="Estimated Premium Tax Credit" value={form8962?.estimatedCredit || 0} bold />

                  <p className="text-xs text-muted-foreground mt-3">
                    ⚠️ This is an estimate. Actual credit depends on Marketplace-provided Form 1095-A showing premiums paid and SLCSP amounts.
                    If you received advance payments (APTC), reconcile on Lines 24–26.
                  </p>
                </div>
              </PrintSection>
            </TabsContent>

            {/* ── Form 8396 ─────────────────────────────────────────────── */}
            <TabsContent value="8396">
              <PrintSection id="form-8396" title="Form 8396 — Mortgage Interest Credit">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · For holders of a Mortgage Credit Certificate (MCC) issued by a state or local government.
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Current Year Mortgage Interest Credit</h4>
                  <LineRow label="1. Interest Paid on Certified Mortgage" value={form8396?.mortgageInterest || 0} sub />
                  <LineRow label="2. Certificate Credit Rate" value={`${((form8396?.creditRate || 0.2) * 100).toFixed(0)}%`} sub />
                  <LineRow label="3. Mortgage Interest Credit (Line 1 × Line 2, max $2,000)" value={form8396?.credit || 0} sub />
                  <LineRow label="4. Amount from Prior Year (carryforward)" value={0} sub />
                  <LineRow label="5. Total Credit" value={form8396?.credit || 0} bold />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Carryforward</h4>
                  <LineRow label="16. Credit Used (Line 14 or Line 15)" value={form8396?.credit || 0} sub />
                  <LineRow label="17. Carryforward to Next Year" value={0} sub />
                </div>
                {(bundle.companyData.mortgageInterest === 0) && (
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ No mortgage interest data found. If you have a Mortgage Credit Certificate, enter mortgage interest in your expense records.
                  </div>
                )}
              </PrintSection>
            </TabsContent>

            {/* ── Form 4562 ─────────────────────────────────────────────── */}
            <TabsContent value="4562">
              <PrintSection id="form-4562" title="Form 4562 — Depreciation and Amortization">
                <p className="text-xs text-muted-foreground mb-3">
                  Tax Year {taxYear} · Attach to your tax return. Use to claim depreciation and Section 179 expensing.
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Part I — Election to Expense Certain Property (Section 179)</h4>
                  <LineRow label="1. Maximum Amount (2024: $1,160,000)" value={1160000} sub />
                  <LineRow label="2. Total Cost of Sec. 179 Property Placed in Service" value={form4562?.businessAssets || 0} sub />
                  <LineRow label="3. Threshold Cost (Phase-out begins at $2,890,000)" value={2890000} sub />
                  <LineRow label="7. Listed on Property (Line 29 + 30)" value={0} sub />
                  <LineRow label="12. Section 179 Deduction" value={form4562?.section179Deduction || 0} bold />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part II — Special Depreciation Allowance (Bonus)</h4>
                  <LineRow label="14. Special Depreciation Allowance for Qualified Property (60% for 2024)" value={form4562?.bonusDepreciation || 0} bold />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part III — MACRS Depreciation</h4>
                  <LineRow label="19h. 5-year property (computers, etc.)" value={0} sub />
                  <LineRow label="19i. 7-year property (office furniture, etc.)" value={form4562?.macrsDepreciation || 0} sub />
                  <LineRow label="22. Total MACRS Deduction" value={form4562?.macrsDepreciation || 0} sub />

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Part V — Listed Property (Vehicles &amp; Other)</h4>
                  {form4562?.vehicles && form4562.vehicles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted text-left">
                              <th className="p-2 border font-semibold">Asset #</th>
                              <th className="p-2 border font-semibold">Description / VIN</th>
                              <th className="p-2 border font-semibold">Date in Service</th>
                              <th className="p-2 border font-semibold">Business Use %</th>
                              <th className="p-2 border font-semibold">Cost</th>
                              <th className="p-2 border font-semibold">Prior Depreciation</th>
                              <th className="p-2 border font-semibold">Method / Life</th>
                              <th className="p-2 border font-semibold">Current Year Deduction</th>
                              <th className="p-2 border font-semibold">Book Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form4562.vehicles.map((v) => {
                              const annualDep = v.usefulLife > 0
                                ? (v.purchasePrice - v.salvageValue) / v.usefulLife
                                : 0
                              const businessUsePct = v.currentMileage && v.estimatedLifetimeMiles
                                ? Math.min(100, Math.round((v.currentMileage / v.estimatedLifetimeMiles) * 100))
                                : 100
                              const purchaseDateStr = v.purchaseDate
                                ? new Date(v.purchaseDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                : '—'
                              return (
                                <tr key={v.assetNumber} className="odd:bg-background even:bg-muted/30">
                                  <td className="p-2 border font-mono">{v.assetNumber}</td>
                                  <td className="p-2 border">
                                    <p className="font-semibold">{v.yearModel ? `${v.yearModel} ` : ''}{v.name}</p>
                                    {v.vin && <p className="text-muted-foreground">VIN: {v.vin}</p>}
                                  </td>
                                  <td className="p-2 border font-mono">{purchaseDateStr}</td>
                                  <td className="p-2 border text-center">{businessUsePct}%</td>
                                  <td className="p-2 border font-mono text-right">${fmt(v.purchasePrice)}</td>
                                  <td className="p-2 border font-mono text-right">${fmt(v.accumulatedDepreciation)}</td>
                                  <td className="p-2 border text-center">
                                    {v.depreciationMethod === 'STRAIGHT_LINE' ? 'SL' : v.depreciationMethod} / {v.usefulLife}yr
                                  </td>
                                  <td className="p-2 border font-mono text-right font-semibold">${fmt(annualDep)}</td>
                                  <td className="p-2 border font-mono text-right">${fmt(v.bookValue)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted font-semibold">
                              <td colSpan={7} className="p-2 border text-right">Totals</td>
                              <td className="p-2 border font-mono text-right">${fmt(form4562.vehicleAnnualDepreciation || 0)}</td>
                              <td className="p-2 border font-mono text-right">
                                ${fmt(form4562.vehicles.reduce((s, v) => s + v.bookValue, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs text-amber-700 dark:text-amber-300">
                        ⚠️ Vehicles used {`>`} 50% for business must be reported here. Verify business use percentage with mileage logs.
                        Luxury vehicle limits may apply (IRC §179(b)(5), §280F).
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No hay vehículos activos registrados para esta empresa.</p>
                  )}

                  <h4 className="font-semibold text-sm mb-2 mt-4 text-primary">Summary</h4>
                  <LineRow label="40. Total Depreciation and Section 179 Deduction" value={form4562?.totalDepreciation || 0} bold />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-3">
                      <p className="text-xs text-muted-foreground">Section 179</p>
                      <p className="text-lg font-bold">${fmt(form4562?.section179Deduction || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-3">
                      <p className="text-xs text-muted-foreground">Bonus Depreciation (60%)</p>
                      <p className="text-lg font-bold">${fmt(form4562?.bonusDepreciation || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CardContent className="pt-3">
                      <p className="text-xs text-green-700 dark:text-green-300">Total Deduction</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-200">${fmt(form4562?.totalDepreciation || 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </PrintSection>
            </TabsContent>
          </Tabs>
          </IrsFormYearContext.Provider>
        )}

        {/* Summary Footer when bundle loaded */}
        {bundle && (
          <Card className={`border-2 ${summaryBorderClass}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Resumen Consolidado — Tax Year {taxYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Ingreso Bruto (AGI)</p>
                  <p className="text-xl font-bold">${fmt(bundle.form1040.agi)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Ingreso Gravable</p>
                  <p className="text-xl font-bold">${fmt(bundle.form1040.taxableIncome)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Impuesto Total</p>
                  <p className="text-xl font-bold text-red-600">${fmt(bundle.form1040.netTax + (schedule2?.totalAdditionalTaxes || 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{bundle.form1040.refund > 0 ? 'Reembolso' : 'Cantidad Adeudada'}</p>
                  <p className={`text-2xl font-bold ${bundle.form1040.refund > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {bundle.form1040.refund > 0 ? `+$${fmt(bundle.form1040.refund)}` : `-$${fmt(bundle.form1040.amountOwed)}`}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">Schedule C: ${fmt(bundle.scheduleC.netProfit)}</Badge>
                <Badge variant="outline">SE Tax: ${fmt(bundle.scheduleSE.selfEmploymentTax)}</Badge>
                <Badge variant="outline">QBI Deduction: ${fmt(bundle.form1040.qbiDeduction)}</Badge>
                {(schedule3?.totalAdditionalCredits || 0) > 0 && (
                  <Badge variant="outline" className="text-green-600">Credits: ${fmt(schedule3?.totalAdditionalCredits || 0)}</Badge>
                )}
                {(form4562?.totalDepreciation || 0) > 0 && (
                  <Badge variant="outline">Depreciation: ${fmt(form4562?.totalDepreciation || 0)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyTabsLayout>
  )
}
