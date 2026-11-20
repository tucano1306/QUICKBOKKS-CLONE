import { authOptions } from '@/lib/auth';
import {
    autoPopulateForm1040FromCompany,
    calculateAdditionalMedicareTax,
    calculateItemizedDeductions,
    calculateQbiDeduction,
    calculateSelfEmploymentTax,
    calculateStandardDeduction,
    calculateTaxFromBrackets,
    chooseDeduction,
    generateForm1040Summary,
    getAITaxSuggestions,
    getForm1040,
    saveForm1040
} from '@/lib/form-1040-service';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleAutoPopulateAndSave(
  userId: string,
  companyId: string,
  year: number
): Promise<NextResponse> {
  const autoData = await autoPopulateForm1040FromCompany(companyId, userId, year);
  // El borrador es por usuario + EMPRESA + año: buscar solo por usuario/año
  // hacía que una empresa sobrescribiera el borrador de otra.
  const existing = await prisma.taxForm1040.findFirst({
    where: { userId, taxYear: year, companyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'No existe un borrador para este año en esta empresa. Primero cree el formulario con su información personal.' }, { status: 404 });
  }
  const hasScheduleC = (autoData.scheduleC?.netProfit ?? 0) !== 0 || (autoData.scheduleC?.grossReceipts ?? 0) !== 0;
  const netProfit = (autoData.scheduleC?.grossReceipts ?? 0) - (autoData.scheduleC?.expenses ?? 0);
  // Mismo helper que el resto de la app: 12.4% de SS hasta el tope + 2.9% de Medicare.
  const se = calculateSelfEmploymentTax(netProfit, year, autoData.w2Detail?.socialSecurityWages ?? 0);
  const selfEmployTax = se.tax;
  const deductSeTax = se.deductiblePortion;
  const totalIncome = (autoData.income?.wages ?? 0)
    + (autoData.income?.taxableInterest ?? 0)
    + (autoData.income?.ordinaryDividends ?? 0)
    + (autoData.income?.otherIncome ?? 0);

  await prisma.taxForm1040.update({
    where: { id: existing.id },
    data: {
      companyId,
      line1a_w2Wages: autoData.income?.wages ?? 0,
      line2b_taxableInterest: autoData.income?.taxableInterest ?? 0,
      line2a_taxExemptInterest: 0,
      line3a_qualifiedDividends: autoData.income?.qualifiedDividends ?? 0,
      line3b_ordinaryDividends: autoData.income?.ordinaryDividends ?? 0,
      line8_otherIncome: autoData.income?.otherIncome ?? 0,
      line9_totalIncome: totalIncome,
      line10_adjustments: deductSeTax,
      line11_adjustedGrossIncome: totalIncome - deductSeTax,
      line25a_w2Withholding: autoData.payments?.withholding ?? 0,
      line26_estimatedPayments: autoData.payments?.estimatedPayments ?? 0,
      scheduleC_grossReceipts: autoData.scheduleC?.grossReceipts ?? 0,
      scheduleC_expenses: autoData.scheduleC?.expenses ?? 0,
      scheduleC_netProfit: netProfit,
      hasScheduleC,
      hasScheduleSE: hasScheduleC,
    }
  });

  return NextResponse.json({
    message: 'Datos financieros guardados automáticamente',
    data: autoData,
    saved: true,
    summary: {
      grossReceipts: autoData.scheduleC?.grossReceipts ?? 0,
      expenses: autoData.scheduleC?.expenses ?? 0,
      netProfit,
      selfEmploymentTax: selfEmployTax,
      deductibleSeTax: deductSeTax,
      totalIncome,
      withholding: autoData.payments?.withholding ?? 0,
    },
    warnings: autoData.warnings ?? [],
  });
}

/**
 * GET /api/tax-forms/1040?year=2024&companyId=xxx
 * Obtiene el Form 1040 o auto-genera uno basado en datos de la empresa
 */
async function handleCopyFromPreviousYear(userId: string, year: number, companyId: string | null): Promise<NextResponse> {
  const previousYear = year - 1;
  const previousForm = await getForm1040(userId, previousYear, companyId);
  if (!previousForm) {
    return NextResponse.json({
      error: `No se encontró un formulario guardado para el año ${previousYear}. Primero debe guardar un Form 1040 del año anterior.`
    }, { status: 404 });
  }
  const copiedFields = {
    personalInfo: !!(previousForm.firstName && previousForm.lastName && previousForm.ssn),
    filingStatus: previousForm.filingStatus,
    dependents: Array.isArray(previousForm.dependents) ? (previousForm.dependents as any[]).length : 0,
    income: {
      wages: previousForm.line1a_w2Wages,
      scheduleC_gross: previousForm.scheduleC_grossReceipts,
      scheduleC_expenses: previousForm.scheduleC_expenses,
      withholding: previousForm.line25a_w2Withholding,
      estimatedPayments: previousForm.line26_estimatedPayments,
    }
  };
  return NextResponse.json({ previousForm, previousYear, copiedFields });
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Computa un Form 1040 COMPLETO automáticamente a partir de los datos reales
 * de la empresa para el año indicado. No requiere un formulario guardado:
 * usa la información personal guardada (si existe) y calcula deducción estándar,
 * QBI, ingreso gravable e impuesto con las tablas del año correspondiente.
 */
async function handleComputeFull(userId: string, companyId: string, year: number): Promise<NextResponse> {
  const autoData = await autoPopulateForm1040FromCompany(companyId, userId, year)
  const saved = await getForm1040(userId, year, companyId)

  const filingStatus = saved?.filingStatus || 'SINGLE'

  const income = {
    wages: autoData.income?.wages ?? 0,
    taxableInterest: autoData.income?.taxableInterest ?? 0,
    ordinaryDividends: autoData.income?.ordinaryDividends ?? 0,
    qualifiedDividends: autoData.income?.qualifiedDividends ?? 0,
    otherIncome: autoData.income?.otherIncome ?? 0,
  }
  const scheduleC = {
    grossReceipts: autoData.scheduleC?.grossReceipts ?? 0,
    expenses: autoData.scheduleC?.expenses ?? 0,
    netProfit: autoData.scheduleC?.netProfit ?? 0,
  }

  // Schedule SE con el tope de Seguro Social, reducido por los salarios W-2 que
  // ya cotizaron. Helper único compartido con el resto de la app.
  const net = scheduleC.netProfit
  const se = calculateSelfEmploymentTax(net, year, autoData.w2Detail?.socialSecurityWages ?? 0)
  const seBase = se.netEarnings
  const seTax = se.tax
  const seDeductible = se.deductiblePortion

  const totalIncome = r2(income.wages + income.taxableInterest + income.ordinaryDividends + income.otherIncome)
  const agi = r2(totalIncome - seDeductible)

  // Deducción: la MAYOR entre la estándar y la detallada del Schedule A.
  const standardDeduction = calculateStandardDeduction(
    filingStatus,
    {
      youBornBefore1960: saved?.youBornBefore1960 ?? false,
      youBlind: saved?.youBlind ?? false,
      spouseBornBefore1960: saved?.spouseBornBefore1960 ?? false,
      spouseBlind: saved?.spouseBlind ?? false,
    },
    year
  )
  const itemized = calculateItemizedDeductions(
    {
      medicalExpenses: saved?.scheduleA_medicalExpenses ?? 0,
      stateLocalTax: saved?.scheduleA_stateLocalTax ?? 0,
      mortgageInterest: saved?.scheduleA_mortgageInterest ?? 0,
      charitableContributions: saved?.scheduleA_charitableContributions ?? 0,
    },
    agi,
    year
  )
  const chosen = chooseDeduction(standardDeduction, itemized.total)

  // QBI reducido por la mitad deducible del SE tax (regla del Form 8995).
  const qbiDeduction = calculateQbiDeduction(net, seDeductible, agi, chosen.amount)
  const taxableIncome = Math.max(0, r2(agi - chosen.amount - qbiDeduction))
  const tax = calculateTaxFromBrackets(taxableIncome, filingStatus, year)

  // Schedule 2: TODOS los impuestos adicionales entran a la línea 24.
  const additionalMedicareTax = calculateAdditionalMedicareTax(
    autoData.w2Detail?.medicareWages ?? 0,
    seBase,
    filingStatus
  )
  const additionalTaxes = r2(seTax + additionalMedicareTax)
  const totalTax = r2(tax + additionalTaxes)

  // Créditos por dependientes guardados en el borrador (Child Tax Credit y
  // crédito por otros dependientes). Antes se enviaba 0 fijo.
  const dependents = Array.isArray(saved?.dependents) ? (saved?.dependents as any[]) : []
  const childTaxCredit = dependents.filter(d => d?.childTaxCredit).length * 2000
  const otherDependentCredit = dependents.filter(d => d?.creditOtherDependents).length * 500
  const totalCredits = childTaxCredit + otherDependentCredit
  const netTax = Math.max(0, r2(totalTax - totalCredits))

  const w2Withholding = autoData.payments?.withholding ?? 0
  const estimatedPayments = autoData.payments?.estimatedPayments ?? 0
  const totalPayments = r2(w2Withholding + estimatedPayments)
  const refund = Math.max(0, r2(totalPayments - netTax))
  const amountOwed = Math.max(0, r2(netTax - totalPayments))

  // Impuesto total del año ANTERIOR, para el safe harbor de pagos estimados.
  const priorForm = await getForm1040(userId, year - 1, companyId)
  const priorYearTax = priorForm?.line24_totalTax ?? null

  return NextResponse.json({
    computed: true,
    hasSavedForm: !!saved,
    taxYear: year,
    filing: {
      status: filingStatus,
      firstName: saved?.firstName || '',
      lastName: saved?.lastName || '',
      ssn: saved?.ssn || '',
    },
    income,
    scheduleC,
    scheduleSE: { netEarnings: seBase, selfEmploymentTax: seTax, deductiblePortion: seDeductible },
    scheduleA: {
      medicalExpenses: itemized.medicalRaw,
      medicalFloor: itemized.medicalFloor,
      medicalDeductible: itemized.medicalDeductible,
      stateLocalTax: itemized.saltRaw,
      saltCap: itemized.saltCap,
      stateLocalTaxDeductible: itemized.saltDeductible,
      mortgageInterest: itemized.mortgageInterest,
      charitableContributions: itemized.charitableContributions,
      total: itemized.total,
      useItemized: chosen.useItemized,
    },
    schedule2: {
      selfEmploymentTax: seTax,
      additionalMedicareTax,
      totalAdditionalTaxes: additionalTaxes,
    },
    priorYearTax,
    warnings: autoData.warnings ?? [],
    totals: {
      totalIncome, adjustments: seDeductible, agi,
      standardDeduction, itemizedDeduction: itemized.total, useItemized: chosen.useItemized,
      deductionTaken: chosen.amount, qbiDeduction,
      totalDeductions: r2(chosen.amount + qbiDeduction), taxableIncome,
      tax, additionalTaxes, totalTax, childTaxCredit, otherDependentCredit, netTax,
      w2Withholding, estimatedPayments, totalPayments, refund, amountOwed,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = Number.parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
    const companyId = searchParams.get('companyId');
    const action = searchParams.get('action');

    // Si se solicita auto-populate desde empresa
    if (action === 'auto-populate' && companyId) {
      const autoData = await autoPopulateForm1040FromCompany(companyId, session.user.id, year);
      return NextResponse.json({
        message: 'Datos generados automáticamente desde la empresa',
        data: autoData
      });
    }

    // Computar Form 1040 COMPLETO automáticamente desde datos reales (no requiere guardar)
    if (action === 'compute' && companyId) {
      return handleComputeFull(session.user.id, companyId, year);
    }

    // Auto-populate Y guardar campos financieros en el draft existente
    if (action === 'auto-populate-and-save' && companyId) {
      return handleAutoPopulateAndSave(session.user.id, companyId, year);
    }

    // Si se solicita sugerencias de AI
    if (action === 'ai-suggestions') {
      const form1040 = await getForm1040(session.user.id, year, companyId);
      if (!form1040) {
        return NextResponse.json({ error: 'No se encontró el Form 1040 para este año' }, { status: 404 });
      }
      const suggestions = await getAITaxSuggestions(form1040);
      return NextResponse.json({ suggestions });
    }

    // Si se solicita resumen
    if (action === 'summary') {
      const form1040 = await getForm1040(session.user.id, year, companyId);
      if (!form1040) {
        return NextResponse.json({ error: 'No se encontró el Form 1040 para este año' }, { status: 404 });
      }
      const summary = generateForm1040Summary(form1040);
      return NextResponse.json({ summary });
    }

    // Copiar datos del año anterior para llenar el formulario actual
    if (action === 'copy-from-previous-year') {
      return handleCopyFromPreviousYear(session.user.id, year, companyId);
    }

    // Retornar todos los años guardados para el usuario (para estadísticas multi-año)
    if (action === 'all-years') {
      const forms = await prisma.taxForm1040.findMany({
        where: { userId: session.user.id },
        select: {
          taxYear: true,
          line9_totalIncome: true,
          scheduleC_grossReceipts: true,
          scheduleC_expenses: true,
          line1a_w2Wages: true,
          line8_otherIncome: true,
        },
        orderBy: { taxYear: 'asc' },
      });
      return NextResponse.json({ forms });
    }

    // Obtener Form 1040 existente
    const form1040 = await getForm1040(session.user.id, year, companyId);

    if (!form1040) {
      // Retornar estructura vacía para nuevo formulario
      return NextResponse.json({
        message: 'No existe Form 1040 para este año. Use POST para crear uno nuevo.',
        taxYear: year,
        exists: false,
        taxBrackets: {
          SINGLE: calculateStandardDeduction('SINGLE'),
          MARRIED_FILING_JOINTLY: calculateStandardDeduction('MARRIED_FILING_JOINTLY'),
          MARRIED_FILING_SEPARATELY: calculateStandardDeduction('MARRIED_FILING_SEPARATELY'),
          HEAD_OF_HOUSEHOLD: calculateStandardDeduction('HEAD_OF_HOUSEHOLD'),
          QUALIFYING_SURVIVING_SPOUSE: calculateStandardDeduction('QUALIFYING_SURVIVING_SPOUSE'),
        }
      });
    }

    return NextResponse.json({
      ...form1040,
      exists: true
    });
  } catch (error: any) {
    console.error('Error obteniendo Form 1040:', error);
    return NextResponse.json({ error: error.message || 'Error obteniendo formulario' }, { status: 500 });
  }
}

/**
 * POST /api/tax-forms/1040
 * Crea o actualiza el Form 1040
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      taxYear,
      companyId,
      filingStatus,
      personalInfo,
      additionalDeductions,
      dependents,
      income,
      adjustments,
      payments,
      scheduleC,
      action
    } = body;

    // Si es auto-populate, obtener datos de la empresa
    if (action === 'auto-populate' && companyId) {
      const autoData = await autoPopulateForm1040FromCompany(companyId, session.user.id, taxYear);

      // Si también hay personalInfo, guardar el formulario
      if (personalInfo?.firstName && personalInfo?.ssn) {
        const form1040 = await saveForm1040(
          {
            userId: session.user.id,
            companyId,
            taxYear,
            filingStatus: filingStatus || 'SINGLE',
            personalInfo,
            additionalDeductions,
            dependents
          },
          autoData
        );

        const suggestions = await getAITaxSuggestions(form1040);

        return NextResponse.json({
          message: 'Form 1040 creado con datos de la empresa',
          form1040,
          aiSuggestions: suggestions
        }, { status: 201 });
      }

      return NextResponse.json({
        message: 'Datos auto-generados. Proporcione información personal para guardar.',
        autoData
      });
    }

    // Validar datos mínimos requeridos
    if (!taxYear || !filingStatus || !personalInfo) {
      return NextResponse.json({
        error: 'Se requiere taxYear, filingStatus y personalInfo'
      }, { status: 400 });
    }

    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.ssn) {
      return NextResponse.json({
        error: 'personalInfo debe incluir firstName, lastName y ssn'
      }, { status: 400 });
    }

    // Calcular datos si no se proporcionan
    let calculatedData: any = {};

    if (income) {
      calculatedData.income = {
        wages: income.wages || 0,
        taxableInterest: income.taxableInterest || 0,
        ordinaryDividends: income.ordinaryDividends || 0,
        qualifiedDividends: income.qualifiedDividends || 0,
        iraDistributions: income.iraDistributions || 0,
        taxableIRA: income.taxableIRA || 0,
        pensionsAnnuities: income.pensionsAnnuities || 0,
        taxablePensions: income.taxablePensions || 0,
        socialSecurity: income.socialSecurity || 0,
        taxableSocialSecurity: income.taxableSocialSecurity || 0,
        capitalGainLoss: income.capitalGainLoss || 0,
        otherIncome: income.otherIncome || 0,
        totalIncome: (income.wages || 0) +
                     (income.taxableInterest || 0) +
                     (income.ordinaryDividends || 0) +
                     (income.taxableIRA || 0) +
                     (income.taxablePensions || 0) +
                     (income.taxableSocialSecurity || 0) +
                     (income.capitalGainLoss || 0) +
                     (income.otherIncome || 0)
      };
    }

    if (adjustments) {
      calculatedData.adjustments = adjustments;
    }

    if (payments) {
      calculatedData.payments = {
        withholding: payments.withholding || 0,
        estimatedPayments: payments.estimatedPayments || 0,
        earnedIncomeCredit: payments.earnedIncomeCredit || 0,
        additionalChildCredit: payments.additionalChildCredit || 0,
        otherPayments: payments.otherPayments || 0,
        totalPayments: (payments.withholding || 0) +
                       (payments.estimatedPayments || 0) +
                       (payments.earnedIncomeCredit || 0) +
                       (payments.additionalChildCredit || 0) +
                       (payments.otherPayments || 0)
      };
    }

    if (scheduleC) {
      calculatedData.scheduleC = {
        grossReceipts: scheduleC.grossReceipts || 0,
        expenses: scheduleC.expenses || 0,
        netProfit: (scheduleC.grossReceipts || 0) - (scheduleC.expenses || 0)
      };
    }

    // Guardar formulario
    const form1040 = await saveForm1040(
      {
        userId: session.user.id,
        companyId,
        taxYear,
        filingStatus,
        personalInfo,
        additionalDeductions,
        dependents
      },
      calculatedData
    );

    // Obtener sugerencias de AI
    const aiSuggestions = await getAITaxSuggestions(form1040);

    return NextResponse.json({
      message: 'Form 1040 guardado correctamente',
      form1040,
      aiSuggestions
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error guardando Form 1040:', error);
    return NextResponse.json({ error: error.message || 'Error guardando formulario' }, { status: 500 });
  }
}

/**
 * DELETE /api/tax-forms/1040?year=2024
 * Elimina el Form 1040 de un año específico
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = Number.parseInt(searchParams.get('year') || '0', 10);

    if (!year) {
      return NextResponse.json({ error: 'Se requiere el año' }, { status: 400 });
    }

    // Borrar solo el borrador de ESTA empresa: sin el filtro se eliminaba el
    // único registro del año, sin importar a qué empresa pertenecía.
    const companyId = searchParams.get('companyId');
    const target = await prisma.taxForm1040.findFirst({
      where: {
        userId: session.user.id,
        taxYear: year,
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'No se encontró un formulario para eliminar' }, { status: 404 });
    }

    await prisma.taxForm1040.delete({ where: { id: target.id } });

    return NextResponse.json({ message: 'Form 1040 eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando Form 1040:', error);
    return NextResponse.json({ error: error.message || 'Error eliminando formulario' }, { status: 500 });
  }
}
