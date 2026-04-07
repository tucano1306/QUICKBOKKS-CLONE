import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');

    // Requerir companyId para aislamiento de datos
    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere companyId' }, { status: 400 });
    }

    // Verificar acceso a la empresa
    const hasAccess = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId }
    });
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        payrolls: {
          where: {
            status: 'PAID',
          },
          orderBy: {
            paymentDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      hireDate,
      salary,
      salaryType,
      taxId,
    } = body;

    if (!firstName || !lastName || !email || !position || !salary || !salaryType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        userId: session.user.id,
        employeeNumber: employeeNumber || `EMP${Date.now()}`,
        firstName,
        lastName,
        email,
        phone,
        position,
        department,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        salary: Number.parseFloat(salary),
        salaryType,
        taxId,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
