/**
 * API: Generate 1099 Forms
 * POST /api/tax-compliance/1099/generate
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate1099FormsForYear, generate1099Form } from '@/lib/tax-compliance-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, taxYear, formData } = body;

    if (action === 'auto-generate') {
      // Generar automáticamente para todos los contractors
      const result = await generate1099FormsForYear(session.user.id, taxYear);
      return NextResponse.json(result);
    } else if (action === 'manual') {
      // Generar manualmente un formulario específico
      const form = await generate1099Form(session.user.id, formData);
      return NextResponse.json({ form });
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error generating 1099:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
