/**
 * Payroll Service
 * Main service for processing payroll, calculating pay, and managing payroll runs
 */

import { prisma } from './prisma';
import { calculatePayrollTaxes, calculateOvertimePay, calculateEmployerTaxes } from './payroll-tax-service';
import type { PayrollStatus, SalaryType } from '@prisma/client';

export interface PayrollCalculationInput {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  regularHours?: number;
  overtimeHours?: number;
  doubleTimeHours?: number;
  bonuses?: number;
  commissions?: number;
  reimbursements?: number;
}

export interface PayrollCalculationResult {
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  commissions: number;
  totalGross: number;
  federalIncomeTax: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  stateTax: number;
  localTax: number;
  totalTaxes: number;
  deductions: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  totalDeductions: number;
  netPay: number;
  employerTaxes: {
    socialSecurity: number;
    medicare: number;
    futa: number;
    suta: number;
    total: number;
  };
}

export interface PayrollRunInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  paymentDate: Date;
  employeeIds?: string[];
}

/**
 * Calculate pay for a single employee for a pay period
 */
export async function calculateEmployeePay(
  input: PayrollCalculationInput
): Promise<PayrollCalculationResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: {
      payrolls: {
        where: {
          paymentDate: {
            gte: new Date(new Date().getFullYear(), 0, 1), // YTD
          },
          status: 'PAID',
        },
        include: {
          deductionItems: true,
        },
        orderBy: {
          paymentDate: 'asc',
        },
      },
    },
  });

  if (!employee || employee.status !== 'ACTIVE') {
    throw new Error('Employee not found or not active');
  }

  // Calculate YTD amounts for tax calculations
  const ytdGross = employee.payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
  const ytdSocialSecurity = employee.payrolls.reduce((sum, p) => {
    const ss = p.deductionItems.find((d) => d.type === 'SOCIAL_SECURITY');
    return sum + (ss?.amount || 0);
  }, 0);
  const ytdMedicare = employee.payrolls.reduce((sum, p) => {
    const medicare = p.deductionItems.find((d) => d.type === 'MEDICARE');
    return sum + (medicare?.amount || 0);
  }, 0);

  let regularPay = 0;
  let overtimePay = 0;
  let grossPay = 0;

  // Calculate gross pay based on salary type
  if (employee.salaryType === 'HOURLY') {
    const regularHours = input.regularHours || 0;
    const overtimeHours = input.overtimeHours || 0;
    const doubleTimeHours = input.doubleTimeHours || 0;

    const hourlyRate = employee.salary;
    regularPay = hourlyRate * regularHours;
    
    if (overtimeHours > 0 || doubleTimeHours > 0) {
      const otPay = calculateOvertimePay(hourlyRate, 0, overtimeHours, doubleTimeHours);
      overtimePay = otPay.overtimePay + otPay.doubleTimePay;
    }

    grossPay = regularPay + overtimePay;
  } else if (employee.salaryType === 'WEEKLY') {
    grossPay = employee.salary;
    regularPay = grossPay;
  } else if (employee.salaryType === 'BIWEEKLY') {
    grossPay = employee.salary;
    regularPay = grossPay;
  } else if (employee.salaryType === 'MONTHLY') {
    grossPay = employee.salary;
    regularPay = grossPay;
  } else if (employee.salaryType === 'YEARLY') {
    // Convert annual to pay period
    const daysInPeriod = Math.ceil(
      (input.periodEnd.getTime() - input.periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysInPeriod <= 7) {
      grossPay = employee.salary / 52; // Weekly
    } else if (daysInPeriod <= 14) {
      grossPay = employee.salary / 26; // Bi-weekly
    } else if (daysInPeriod <= 16) {
      grossPay = employee.salary / 24; // Semi-monthly
    } else {
      grossPay = employee.salary / 12; // Monthly
    }
    regularPay = grossPay;
  }

  // Add bonuses, commissions
  const bonuses = input.bonuses || 0;
  const commissions = input.commissions || 0;
  const totalGross = grossPay + bonuses + commissions;

  // Determine pay period type for tax calculation
  let payPeriodType: 'WEEKLY' | 'BI_WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY' = 'BI_WEEKLY';
  const daysInPeriod = Math.ceil(
    (input.periodEnd.getTime() - input.periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysInPeriod <= 7) {
    payPeriodType = 'WEEKLY';
  } else if (daysInPeriod <= 14) {
    payPeriodType = 'BI_WEEKLY';
  } else if (daysInPeriod <= 16) {
    payPeriodType = 'SEMI_MONTHLY';
  } else {
    payPeriodType = 'MONTHLY';
  }

  // Calculate taxes
  const taxes = calculatePayrollTaxes({
    grossPay: totalGross,
    payPeriodType,
    federalFilingStatus: 'SINGLE', // Should be from employee record
    federalAllowances: 0, // Should be from employee record
    additionalWithholding: 0,
    exemptFederal: false,
    exemptFICA: false,
    ytdGross,
    ytdSocialSecurity,
    ytdMedicare,
  });

  // Get deductions (benefits, 401k, etc.)
  const deductions: Array<{ type: string; description: string; amount: number }> = [];
  
  // Add tax deductions
  deductions.push({
    type: 'FEDERAL_TAX',
    description: 'Federal Income Tax',
    amount: taxes.federalIncomeTax,
  });
  
  deductions.push({
    type: 'SOCIAL_SECURITY',
    description: 'Social Security',
    amount: taxes.socialSecurity,
  });
  
  deductions.push({
    type: 'MEDICARE',
    description: 'Medicare',
    amount: taxes.medicare + taxes.additionalMedicare,
  });

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netPay = totalGross - totalDeductions;

  // Calculate employer taxes
  const employerTaxes = calculateEmployerTaxes(totalGross, ytdGross);

  return {
    grossPay,
    regularPay,
    overtimePay,
    bonuses,
    commissions,
    totalGross,
    federalIncomeTax: taxes.federalIncomeTax,
    socialSecurity: taxes.socialSecurity,
    medicare: taxes.medicare,
    additionalMedicare: taxes.additionalMedicare,
    stateTax: taxes.stateIncomeTax,
    localTax: 0,
    totalTaxes: taxes.totalTaxes,
    deductions,
    totalDeductions,
    netPay,
    employerTaxes: {
      socialSecurity: employerTaxes.employerSocialSecurity,
      medicare: employerTaxes.employerMedicare,
      futa: employerTaxes.federalUnemployment,
      suta: employerTaxes.stateUnemployment,
      total: employerTaxes.totalEmployerTax,
    },
  };
}

/**
 * Create a new payroll run for all active employees or specified employees
 */
export async function createPayrollRun(input: PayrollRunInput) {
  const { userId, periodStart, periodEnd, paymentDate, employeeIds } = input;

  // Get employees
  const employees = await prisma.employee.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      ...(employeeIds && employeeIds.length > 0 ? { id: { in: employeeIds } } : {}),
    },
  });

  if (employees.length === 0) {
    throw new Error('No active employees found');
  }

  // Check for overlapping payroll runs
  const existingPayroll = await prisma.payroll.findFirst({
    where: {
      employee: {
        userId,
      },
      OR: [
        {
          periodStart: {
            lte: periodEnd,
          },
          periodEnd: {
            gte: periodStart,
          },
        },
      ],
      status: {
        in: ['DRAFT', 'APPROVED'],
      },
    },
  });

  if (existingPayroll) {
    throw new Error('Overlapping payroll run already exists');
  }

  // Create payroll records for each employee
  const payrollRecords = await Promise.all(
    employees.map(async (employee) => {
      try {
        // Calculate pay based on salary type
        let regularHours = 0;
        if (employee.salaryType === 'HOURLY') {
          // For hourly employees, get hours from time entries
          // This is a simplified version - in production, integrate with time tracking
          regularHours = 80; // Default to 80 hours for bi-weekly
        }

        const calculation = await calculateEmployeePay({
          employeeId: employee.id,
          periodStart,
          periodEnd,
          regularHours: employee.salaryType === 'HOURLY' ? regularHours : undefined,
        });

        // Create payroll record
        const payroll = await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            periodStart,
            periodEnd,
            grossSalary: calculation.totalGross,
            deductions: calculation.totalDeductions,
            bonuses: calculation.bonuses + calculation.commissions,
            netSalary: calculation.netPay,
            paymentDate,
            status: 'DRAFT',
            notes: `Payroll for ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
          },
        });

        // Create deduction records
        await Promise.all(
          calculation.deductions.map((deduction) =>
            prisma.payrollDeduction.create({
              data: {
                payrollId: payroll.id,
                type: deduction.type,
                description: deduction.description,
                amount: deduction.amount,
              },
            })
          )
        );

        return payroll;
      } catch (error) {
        console.error(`Error creating payroll for employee ${employee.id}:`, error);
        return null;
      }
    })
  );

  const successfulPayrolls = payrollRecords.filter((p) => p !== null);

  return {
    success: true,
    payrollCount: successfulPayrolls.length,
    failedCount: employees.length - successfulPayrolls.length,
    payrolls: successfulPayrolls,
  };
}

/**
 * Approve a payroll run (change status from DRAFT to APPROVED)
 */
export async function approvePayroll(payrollId: string, userId: string) {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: true,
    },
  });

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  if (payroll.employee.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (payroll.status !== 'DRAFT') {
    throw new Error('Payroll is not in draft status');
  }

  const updated = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: 'APPROVED',
    },
  });

  return updated;
}

/**
 * Finalize payroll (mark as PAID)
 */
export async function finalizePayroll(payrollId: string, userId: string) {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: true,
    },
  });

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  if (payroll.employee.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (payroll.status !== 'APPROVED') {
    throw new Error('Payroll must be approved before finalizing');
  }

  const updated = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: 'PAID',
    },
  });

  // Here you would integrate with payment processing (ACH, direct deposit, etc.)
  // For now, we just mark it as paid

  return updated;
}

/**
 * Get payroll summary for a period
 */
export async function getPayrollSummary(
  userId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const payrolls = await prisma.payroll.findMany({
    where: {
      employee: {
        userId,
      },
      periodStart: {
        gte: periodStart,
      },
      periodEnd: {
        lte: periodEnd,
      },
    },
    include: {
      employee: true,
      deductionItems: true,
    },
  });

  const totalGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.deductions, 0);

  return {
    periodStart,
    periodEnd,
    employeeCount: payrolls.length,
    totalGross,
    totalNet,
    totalDeductions,
    totalTaxes: totalGross - totalNet,
    payrolls: payrolls.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
      grossPay: p.grossSalary,
      netPay: p.netSalary,
      status: p.status,
      paymentDate: p.paymentDate,
    })),
  };
}

/**
 * Get employee payroll history
 */
export async function getEmployeePayrollHistory(
  employeeId: string,
  year?: number
) {
  const whereClause: any = {
    employeeId,
  };

  if (year) {
    whereClause.periodStart = {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    };
  }

  const payrolls = await prisma.payroll.findMany({
    where: whereClause,
    include: {
      deductionItems: true,
    },
    orderBy: {
      periodStart: 'desc',
    },
  });

  const ytdGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
  const ytdNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const ytdTaxes = payrolls.reduce((sum, p) => {
    const taxes = p.deductionItems
      .filter((d: any) => d.type.includes('TAX') || d.type.includes('SOCIAL') || d.type.includes('MEDICARE'))
      .reduce((tSum: number, d: any) => tSum + d.amount, 0);
    return sum + taxes;
  }, 0);

  return {
    employeeId,
    year: year || new Date().getFullYear(),
    ytdGross,
    ytdNet,
    ytdTaxes,
    payrollCount: payrolls.length,
    payrolls: payrolls.map((p) => ({
      id: p.id,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      grossPay: p.grossSalary,
      netPay: p.netSalary,
      status: p.status,
      paymentDate: p.paymentDate,
      deductions: p.deductionItems,
    })),
  };
}
