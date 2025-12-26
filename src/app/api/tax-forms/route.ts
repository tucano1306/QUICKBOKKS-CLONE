import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateForm941,
  generateForm940,
  generateRT6,
  generateW2,
  generateW3,
  getQuarterlyForms941,
  getAnnualForm940,
  getQuarterlyRT6,
  getAllW2ForYear,
} from '@/lib/tax-forms-service';

export const dynamic = 'force-dynamic'

/**
 * GET /api/tax-forms?type=941&year=2024&quarter=1
 * Obtiene formularios tributarios generados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : undefined;

    switch (type) {
      case '941':
        if (quarter) {
          const form = await generateForm941(session.user.id, quarter, year);
          return NextResponse.json(form);
        } else {
          const forms = await getQuarterlyForms941(session.user.id, year);
          return NextResponse.json(forms);
        }

      case '940':
        const form940 = await getAnnualForm940(session.user.id, year);
        return NextResponse.json(form940);

      case 'rt6':
        if (quarter) {
          const rt6 = await generateRT6(session.user.id, quarter, year);
          return NextResponse.json(rt6);
        } else {
          const rt6Forms = await getQuarterlyRT6(session.user.id, year);
          return NextResponse.json(rt6Forms);
        }

      case 'w2':
        const w2Forms = await getAllW2ForYear(session.user.id, year);
        return NextResponse.json(w2Forms);

      case 'w3':
        const w3 = await generateW3(session.user.id, year);
        return NextResponse.json(w3);

      default:
        return NextResponse.json({ error: 'Tipo de formulario no válido' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error generando formulario tributario:', error);
    return NextResponse.json({ error: error.message || 'Error generando formulario' }, { status: 500 });
  }
}

/**
 * POST /api/tax-forms
 * Genera un nuevo formulario tributario
 * 
 * Body:
 * {
 *   "type": "941" | "940" | "rt6" | "w2" | "w3",
 *   "year": 2024,
 *   "quarter": 1, // Solo para 941 y RT-6
 *   "employeeId": "xxx" // Solo para W-2
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type, year, quarter, employeeId } = body;

    switch (type) {
      case '941':
        if (!quarter) {
          return NextResponse.json({ error: 'Se requiere el trimestre' }, { status: 400 });
        }
        const form941 = await generateForm941(session.user.id, quarter, year);
        return NextResponse.json(form941, { status: 201 });

      case '940':
        const form940 = await generateForm940(session.user.id, year);
        return NextResponse.json(form940, { status: 201 });

      case 'rt6':
        if (!quarter) {
          return NextResponse.json({ error: 'Se requiere el trimestre' }, { status: 400 });
        }
        const rt6 = await generateRT6(session.user.id, quarter, year);
        return NextResponse.json(rt6, { status: 201 });

      case 'w2':
        if (!employeeId) {
          return NextResponse.json({ error: 'Se requiere el ID del empleado' }, { status: 400 });
        }
        const w2 = await generateW2(session.user.id, employeeId, year);
        return NextResponse.json(w2, { status: 201 });

      case 'w3':
        const w3 = await generateW3(session.user.id, year);
        return NextResponse.json(w3, { status: 201 });

      default:
        return NextResponse.json({ error: 'Tipo de formulario no válido' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error creando formulario tributario:', error);
    return NextResponse.json({ error: error.message || 'Error creando formulario' }, { status: 500 });
  }
}
