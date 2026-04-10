import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// pdf-parse is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export const dynamic = 'force-dynamic';
// Allow larger payloads for PDF uploads (up to 10 MB)
export const dynamic = 'force-dynamic'

function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY no configurado');
  return new OpenAI({ apiKey: key });
}

const EXTRACTION_SYSTEM_PROMPT = `You are a tax document specialist. Your job is to read a US tax document package (Form 1040, Schedule A, Schedule C, Schedule SE, Schedule 2, Schedule 3, Form 5329, Form 8995, Form 8962, Form 8396, Form 4562, Form 8879, or any combination thereof) and extract ALL relevant fields into a strict JSON object.

Return ONLY valid JSON with no additional text, no markdown fences, no explanation. The JSON schema is:
{
  "filingStatus": "SINGLE | MARRIED_FILING_JOINTLY | MARRIED_FILING_SEPARATELY | HEAD_OF_HOUSEHOLD | QUALIFYING_SURVIVING_SPOUSE",
  "firstName": "string",
  "middleInitial": "string or null",
  "lastName": "string",
  "ssn": "string (XXX-XX-XXXX format)",
  "spouseFirstName": "string or null",
  "spouseMiddleInitial": "string or null",
  "spouseLastName": "string or null",
  "spouseSsn": "string or null",
  "homeAddress": "string",
  "aptNo": "string or null",
  "city": "string",
  "state": "string (2-letter code)",
  "zipCode": "string",
  "youBornBefore1960": "boolean",
  "youBlind": "boolean",
  "spouseBornBefore1960": "boolean",
  "spouseBlind": "boolean",
  "dependents": [
    {
      "firstName": "string",
      "lastName": "string",
      "ssn": "string or null",
      "relationship": "string",
      "childTaxCredit": "boolean",
      "creditOtherDependents": "boolean"
    }
  ],

  // ── Form 1040 Core Lines ──────────────────────────────────────────────
  "wages": "number (Line 1a — Wages, salaries, tips)",
  "taxableInterest": "number (Line 2b)",
  "ordinaryDividends": "number (Line 3b)",
  "qualifiedDividends": "number (Line 3a)",
  "iraDistributions": "number (Line 4a)",
  "taxableIRA": "number (Line 4b)",
  "pensionsAnnuities": "number (Line 5a)",
  "taxablePensions": "number (Line 5b)",
  "socialSecurity": "number (Line 6a)",
  "taxableSocialSecurity": "number (Line 6b)",
  "capitalGainLoss": "number (Line 7)",
  "otherIncome": "number (Line 8)",
  "totalIncome": "number (Line 9 — Total Income)",
  "adjustmentsToIncome": "number (Line 10 — Adjustments)",
  "agi": "number (Line 11 — Adjusted Gross Income)",
  "standardDeduction": "number (Line 12a — Standard or Itemized Deduction)",
  "qbiDeduction": "number (Line 13 — QBI Deduction)",
  "taxableIncome": "number (Line 15)",
  "incomeTax": "number (Line 16 — Tax from tax table)",
  "childTaxCredit": "number (Line 19 — Child Tax Credit)",
  "totalTax": "number (Line 24 — Total Tax)",
  "withholding": "number (Line 25a — Federal withholding from W-2)",
  "estimatedPayments": "number (Line 26)",
  "refundAmount": "number (Line 35a — Refund)",
  "amountOwed": "number (Line 37 — Amount You Owe)",

  // ── Schedule C (Profit or Loss from Business) ─────────────────────────
  "scheduleC_grossReceipts": "number (Part I Line 1)",
  "scheduleC_expenses": "number (Part II Total Expenses)",
  "scheduleC_netProfit": "number (Line 31 — Net profit or loss)",
  "scheduleC_costOfGoods": "number (Line 4 — Cost of goods sold)",
  "scheduleC_advertising": "number",
  "scheduleC_carExpenses": "number",
  "scheduleC_depreciation": "number",
  "scheduleC_insurance": "number",
  "scheduleC_legalProfessional": "number",
  "scheduleC_officeExpenses": "number",
  "scheduleC_rentLease": "number",
  "scheduleC_repairsMaintenance": "number",
  "scheduleC_supplies": "number",
  "scheduleC_taxesLicenses": "number",
  "scheduleC_travel": "number",
  "scheduleC_utilities": "number",
  "scheduleC_wages": "number",
  "scheduleC_otherExpenses": "number",

  // ── Schedule SE (Self-Employment Tax) ─────────────────────────────────
  "scheduleSE_netEarnings": "number (Line 3 — Net earnings subject to SE tax)",
  "scheduleSE_selfEmploymentTax": "number (Line 12 — Self-employment tax)",
  "scheduleSE_deductiblePortion": "number (Line 13 — Deductible portion of SE tax)",

  // ── Schedule A (Itemized Deductions) ──────────────────────────────────
  "scheduleA_medicalExpenses": "number (Line 1)",
  "scheduleA_stateLocalTax": "number (Line 5 — SALT, capped at $10,000)",
  "scheduleA_mortgageInterest": "number (Line 8a)",
  "scheduleA_charitableContributions": "number (Line 11)",
  "scheduleA_total": "number (Line 17 — Total Itemized Deductions)",

  // ── Schedule 2 (Additional Taxes) ────────────────────────────────────
  "schedule2_selfEmploymentTax": "number (Line 4)",
  "schedule2_additionalMedicareTax": "number (Line 11 — Form 8959)",
  "schedule2_form5329Tax": "number",
  "schedule2_totalAdditionalTaxes": "number (Line 10)",

  // ── Schedule 3 (Additional Credits and Payments) ──────────────────────
  "schedule3_foreignTaxCredit": "number",
  "schedule3_mortgageInterestCredit": "number (Form 8396)",
  "schedule3_premiumTaxCredit": "number (Form 8962)",
  "schedule3_totalAdditionalCredits": "number (Line 8)",

  // ── Form 5329 (Additional Taxes on Qualified Plans) ───────────────────
  "form5329_iraDistributions": "number",
  "form5329_earlyWithdrawalPenalty": "number (10% penalty)",
  "form5329_totalAdditionalTax": "number",

  // ── Form 8995 (QBI Deduction) ─────────────────────────────────────────
  "form8995_qualifiedBusinessIncome": "number (Line 1 or sum of activities)",
  "form8995_qbiDeduction": "number (Line 15 — 20% QBI deduction)",
  "form8995_netOperatingLoss": "number",

  // ── Form 8962 (Premium Tax Credit) ───────────────────────────────────
  "form8962_agi": "number",
  "form8962_annualContribution": "number",
  "form8962_taxCredit": "number (Line 24 — Net premium tax credit)",

  // ── Form 8396 (Mortgage Interest Credit) ─────────────────────────────
  "form8396_mortgageInterest": "number (Line 1)",
  "form8396_creditRate": "number (as decimal, e.g. 0.20 for 20%)",
  "form8396_credit": "number (Line 3 — Current year credit)",

  // ── Form 4562 (Depreciation and Amortization) ─────────────────────────
  "form4562_section179Deduction": "number (Line 12)",
  "form4562_bonusDepreciation": "number (Line 14 — Special depreciation)",
  "form4562_macrsDepreciation": "number (Part III — MACRS total)",
  "form4562_totalDepreciation": "number (Line 22 — Total depreciation)",
  "form4562_businessAssets": "number (total cost of business assets placed in service)"
}

Rules:
- All monetary values must be plain numbers (no commas, no dollar signs). If a field is missing or blank, use 0 for numbers and null for strings.
- For booleans, default to false if not specified.
- For dependents default to empty array if none.
- If the filing status is written as "Married filing jointly" → MARRIED_FILING_JOINTLY, "Head of household" → HEAD_OF_HOUSEHOLD, etc.
- Extract SSN exactly as shown but remove spaces. Format as XXX-XX-XXXX.
- Extract data from ALL forms/schedules present in the document. If a schedule is not present, use 0 for its numeric fields.
- For creditRate in Form 8396, if shown as a percentage (e.g. "20%") convert to decimal (0.20).
`;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  return parsed.text as string;
}

const NUM_FIELDS = [
  'wages', 'taxableInterest', 'ordinaryDividends', 'qualifiedDividends',
  'iraDistributions', 'taxableIRA', 'pensionsAnnuities', 'taxablePensions',
  'socialSecurity', 'taxableSocialSecurity', 'capitalGainLoss', 'otherIncome',
  'totalIncome', 'adjustmentsToIncome', 'agi', 'standardDeduction', 'qbiDeduction',
  'taxableIncome', 'incomeTax', 'childTaxCredit', 'totalTax',
  'withholding', 'estimatedPayments', 'refundAmount', 'amountOwed',
  'scheduleC_grossReceipts', 'scheduleC_expenses', 'scheduleC_netProfit',
  'scheduleC_costOfGoods', 'scheduleC_advertising', 'scheduleC_carExpenses',
  'scheduleC_depreciation', 'scheduleC_insurance', 'scheduleC_legalProfessional',
  'scheduleC_officeExpenses', 'scheduleC_rentLease', 'scheduleC_repairsMaintenance',
  'scheduleC_supplies', 'scheduleC_taxesLicenses', 'scheduleC_travel',
  'scheduleC_utilities', 'scheduleC_wages', 'scheduleC_otherExpenses',
  'scheduleSE_netEarnings', 'scheduleSE_selfEmploymentTax', 'scheduleSE_deductiblePortion',
  'scheduleA_medicalExpenses', 'scheduleA_stateLocalTax', 'scheduleA_mortgageInterest',
  'scheduleA_charitableContributions', 'scheduleA_total',
  'schedule2_selfEmploymentTax', 'schedule2_additionalMedicareTax',
  'schedule2_form5329Tax', 'schedule2_totalAdditionalTaxes',
  'schedule3_foreignTaxCredit', 'schedule3_mortgageInterestCredit',
  'schedule3_premiumTaxCredit', 'schedule3_totalAdditionalCredits',
  'form5329_iraDistributions', 'form5329_earlyWithdrawalPenalty', 'form5329_totalAdditionalTax',
  'form8995_qualifiedBusinessIncome', 'form8995_qbiDeduction', 'form8995_netOperatingLoss',
  'form8962_agi', 'form8962_annualContribution', 'form8962_taxCredit',
  'form8396_mortgageInterest', 'form8396_creditRate', 'form8396_credit',
  'form4562_section179Deduction', 'form4562_bonusDepreciation',
  'form4562_macrsDepreciation', 'form4562_totalDepreciation', 'form4562_businessAssets',
];

function sanitizeNumericFields(extracted: Record<string, unknown>): void {
  for (const f of NUM_FIELDS) {
    const v = extracted[f];
    const strVal = typeof v === 'string' ? v : '0';
    extracted[f] = typeof v === 'number' ? v : (Number.parseFloat(strVal) || 0);
  }
}

async function callOpenAIExtraction(text: string): Promise<Record<string, unknown>> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `Extract all IRS tax form fields from this tax document package:\n\n${text}` },
    ],
  });
  const rawJson = completion.choices[0]?.message?.content ?? '{}';
  return JSON.parse(rawJson) as Record<string, unknown>;
}

/**
 * POST /api/tax-forms/1040/extract-pdf
 * Accepts a multipart/form-data with a PDF file.
 * Extracts text from the PDF and uses OpenAI to parse all IRS tax form fields.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('pdf');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Se requiere un archivo PDF' }, { status: 400 });
    }

    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF no puede superar 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let pdfText: string;
    try {
      pdfText = await extractPdfText(buffer);
    } catch (pdfErr) {
      console.error('PDF parse error:', pdfErr);
      return NextResponse.json(
        { error: 'No se pudo leer el PDF. Asegúrese de que no esté protegido con contraseña.' },
        { status: 422 }
      );
    }

    if (!pdfText || pdfText.trim().length < 20) {
      return NextResponse.json(
        { error: 'El PDF no contiene texto legible. Si es un PDF escaneado, necesita OCR primero.' },
        { status: 422 }
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = await callOpenAIExtraction(pdfText.slice(0, 20000));
    } catch {
      return NextResponse.json(
        { error: 'La AI no pudo interpretar el PDF. Intente con un PDF más claro.' },
        { status: 422 }
      );
    }

    sanitizeNumericFields(extracted);

    return NextResponse.json({ extracted, rawTextLength: pdfText.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error extracting PDF:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
