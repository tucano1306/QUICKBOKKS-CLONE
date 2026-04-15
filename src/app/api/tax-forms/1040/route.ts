import { authOptions } from '@/lib/auth';
import {
    autoPopulateForm1040FromCompany,
    calculateStandardDeduction,
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
  const existing = await prisma.taxForm1040.findUnique({
    where: { userId_taxYear: { userId, taxYear: year } }
  });
  if (!existing) {
    return NextResponse.json({ error: 'No existe un borrador para este año. Primero cree el formulario con su información personal.' }, { status: 404 });
  }
  const hasScheduleC = (autoData.scheduleC?.netProfit ?? 0) !== 0 || (autoData.scheduleC?.grossReceipts ?? 0) !== 0;
  const netProfit = (autoData.scheduleC?.grossReceipts ?? 0) - (autoData.scheduleC?.expenses ?? 0);
  const selfEmployTaxable = Math.max(0, netProfit) * 0.9235;
  const selfEmployTax = selfEmployTaxable * 0.153;
  const deductSeTax = selfEmployTax / 2;
  const totalIncome = (autoData.income?.wages ?? 0)
    + (autoData.income?.taxableInterest ?? 0)
    + (autoData.income?.ordinaryDividends ?? 0)
    + (autoData.income?.otherIncome ?? 0);

  await prisma.taxForm1040.update({
    where: { userId_taxYear: { userId, taxYear: year } },
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
    }
  });
}

/**
 * GET /api/tax-forms/1040?year=2024&companyId=xxx
 * Obtiene el Form 1040 o auto-genera uno basado en datos de la empresa
 */
async function handleCopyFromPreviousYear(userId: string, year: number): Promise<NextResponse> {
  const previousYear = year - 1;
  const previousForm = await getForm1040(userId, previousYear);
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

    // Auto-populate Y guardar campos financieros en el draft existente
    if (action === 'auto-populate-and-save' && companyId) {
      return handleAutoPopulateAndSave(session.user.id, companyId, year);
    }

    // Si se solicita sugerencias de AI
    if (action === 'ai-suggestions') {
      const form1040 = await getForm1040(session.user.id, year);
      if (!form1040) {
        return NextResponse.json({ error: 'No se encontró el Form 1040 para este año' }, { status: 404 });
      }
      const suggestions = await getAITaxSuggestions(form1040);
      return NextResponse.json({ suggestions });
    }

    // Si se solicita resumen
    if (action === 'summary') {
      const form1040 = await getForm1040(session.user.id, year);
      if (!form1040) {
        return NextResponse.json({ error: 'No se encontró el Form 1040 para este año' }, { status: 404 });
      }
      const summary = generateForm1040Summary(form1040);
      return NextResponse.json({ summary });
    }

    // Copiar datos del año anterior para llenar el formulario actual
    if (action === 'copy-from-previous-year') {
      return handleCopyFromPreviousYear(session.user.id, year);
    }

    // Obtener Form 1040 existente
    const form1040 = await getForm1040(session.user.id, year);

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

    await prisma.taxForm1040.delete({
      where: {
        userId_taxYear: {
          userId: session.user.id,
          taxYear: year
        }
      }
    });

    return NextResponse.json({ message: 'Form 1040 eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando Form 1040:', error);
    return NextResponse.json({ error: error.message || 'Error eliminando formulario' }, { status: 500 });
  }
}
