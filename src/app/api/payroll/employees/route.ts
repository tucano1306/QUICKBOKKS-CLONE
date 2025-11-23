import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const employees = await prisma.employee.findMany({
      where: {
        userId: session.user.id,
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
        salary: parseFloat(salary),
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
