import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  getFirmDashboard,
  getClientsOverview,
  getUpcomingDeadlines,
  addClient,
  createEngagement,
  getUserFirms,
  logTimeEntry,
  generateAutoAlerts,
  getClientProfitabilityReport,
  getStaffUtilizationReport,
  getMonthlyDeadlinesSummary
} from '@/lib/accounting-firm-service';

/**
 * GET /api/firm/dashboard - Dashboard consolidado para firmas contables
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';
    let firmId = searchParams.get('firmId');

    // Si no hay firmId, buscar las firmas del usuario
    if (!firmId) {
      const userFirms = await getUserFirms(session.user.id);
      
      if (userFirms.length === 0) {
        return NextResponse.json({ 
          message: 'No perteneces a ninguna firma contable',
          firms: [],
          needsSetup: true
        });
      }
      
      // Usar la primera firma
      firmId = userFirms[0].firmId;
    }

    return handleRequest(view, firmId, searchParams);

  } catch (error: any) {
    console.error('Error in firm dashboard:', error);
    return NextResponse.json({ 
      error: error.message || 'Error interno' 
    }, { status: 500 });
  }
}

async function handleRequest(
  view: string, 
  firmId: string,
  searchParams: URLSearchParams
) {
  switch (view) {
    case 'dashboard': {
      const dashboard = await getFirmDashboard(firmId);
      return NextResponse.json(dashboard);
    }

    case 'clients': {
      const clients = await getClientsOverview(firmId);
      return NextResponse.json({ clients });
    }

    case 'deadlines': {
      const days = parseInt(searchParams.get('days') || '30');
      const deadlines = await getUpcomingDeadlines(firmId, days);
      return NextResponse.json({ deadlines });
    }

    case 'profitability': {
      const startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!)
        : new Date(new Date().getFullYear(), 0, 1);
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date();
      
      const report = await getClientProfitabilityReport(firmId, startDate, endDate);
      return NextResponse.json({ report });
    }

    case 'utilization': {
      const startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date();
      
      const report = await getStaffUtilizationReport(firmId, startDate, endDate);
      return NextResponse.json({ report });
    }

    case 'monthly-deadlines': {
      const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
      const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
      
      const summary = await getMonthlyDeadlinesSummary(firmId, month, year);
      return NextResponse.json({ summary });
    }

    case 'firms': {
      // Obtener firma específica
      const firm = await prisma.accountingFirm.findUnique({
        where: { id: firmId },
        include: {
          staff: { include: { user: true } },
          _count: { select: { clients: true, engagements: true } }
        }
      });
      return NextResponse.json({ firm });
    }

    default:
      return NextResponse.json({ 
        error: 'Vista no válida. Opciones: dashboard, clients, deadlines, profitability, utilization, monthly-deadlines, firms' 
      }, { status: 400 });
  }
}

/**
 * POST /api/firm/dashboard - Crear recursos de la firma
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'addClient':
        return handleAddClient(body);

      case 'createEngagement':
        return handleCreateEngagement(body);

      case 'logTime':
        return handleLogTime(body, session.user.id);

      case 'generateAlerts':
        return handleGenerateAlerts(body);

      case 'createFirm':
        return handleCreateFirm(body, session.user.id);

      default:
        return NextResponse.json({ 
          error: 'Acción no válida. Opciones: addClient, createEngagement, logTime, generateAlerts, createFirm' 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in firm dashboard POST:', error);
    return NextResponse.json({ 
      error: error.message || 'Error interno' 
    }, { status: 500 });
  }
}

async function handleAddClient(body: any) {
  const { firmId, companyId, clientCode, engagementType, primaryAccountantId, monthlyFee, billingType, notes } = body;

  if (!firmId || !companyId || !clientCode) {
    return NextResponse.json({ 
      error: 'firmId, companyId y clientCode son requeridos' 
    }, { status: 400 });
  }

  const client = await addClient(firmId, companyId, {
    clientCode,
    engagementType,
    primaryAccountantId,
    monthlyFee,
    billingType,
    notes
  });

  return NextResponse.json({ 
    success: true, 
    client,
    message: `Cliente ${clientCode} agregado exitosamente`
  }, { status: 201 });
}

async function handleCreateEngagement(body: any) {
  const { firmId, clientId, type, name, description, startDate, endDate, deadline, estimatedHours, budgetAmount, priority, assignedStaff } = body;

  if (!firmId || !clientId || !type || !name || !startDate) {
    return NextResponse.json({ 
      error: 'firmId, clientId, type, name y startDate son requeridos' 
    }, { status: 400 });
  }

  const engagement = await createEngagement(firmId, clientId, {
    type,
    name,
    description,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : undefined,
    deadline: deadline ? new Date(deadline) : undefined,
    estimatedHours,
    budgetAmount,
    priority,
    assignedStaff
  });

  return NextResponse.json({ 
    success: true, 
    engagement,
    message: `Engagement "${name}" creado exitosamente`
  }, { status: 201 });
}

async function handleLogTime(body: any, userId: string) {
  const { firmId, clientId, engagementId, date, hours, description, isBillable, billableRate } = body;

  if (!firmId || !date || !hours) {
    return NextResponse.json({ 
      error: 'firmId, date y hours son requeridos' 
    }, { status: 400 });
  }

  // Buscar el staff del usuario
  const staff = await prisma.firmStaff.findFirst({
    where: { firmId, userId, isActive: true }
  });

  if (!staff) {
    return NextResponse.json({ 
      error: 'No eres staff de esta firma' 
    }, { status: 403 });
  }

  const entry = await logTimeEntry(firmId, staff.id, {
    clientId,
    engagementId,
    date: new Date(date),
    hours,
    description,
    isBillable,
    billableRate
  });

  return NextResponse.json({ 
    success: true, 
    entry,
    message: `${hours} horas registradas`
  }, { status: 201 });
}

async function handleGenerateAlerts(body: any) {
  const { firmId } = body;

  if (!firmId) {
    return NextResponse.json({ 
      error: 'firmId es requerido' 
    }, { status: 400 });
  }

  const alerts = await generateAutoAlerts(firmId);

  return NextResponse.json({ 
    success: true, 
    alertsGenerated: alerts.length,
    alerts
  });
}

async function handleCreateFirm(body: any, userId: string) {
  const { name, legalName, taxId, licenseNumber, email, phone, address, city, state, country } = body;

  if (!name) {
    return NextResponse.json({ 
      error: 'name es requerido' 
    }, { status: 400 });
  }

  // Importar la función
  const { createAccountingFirm, addStaffMember } = await import('@/lib/accounting-firm-service');

  // Crear la firma
  const firm = await createAccountingFirm({
    name,
    legalName,
    taxId,
    licenseNumber,
    email,
    phone,
    address,
    city,
    state,
    country
  });

  // Agregar al usuario como owner
  await addStaffMember(firm.id, userId, {
    role: 'OWNER',
    title: 'Fundador'
  });

  return NextResponse.json({ 
    success: true, 
    firm,
    message: `Firma "${name}" creada exitosamente`
  }, { status: 201 });
}
