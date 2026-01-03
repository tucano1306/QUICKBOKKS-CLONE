import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Revalidar cada 30 segundos - las empresas cambian poco frecuentemente
export const revalidate = 30

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Primero intentar obtener empresas donde el usuario está asociado
    let companies = await prisma.company.findMany({
      where: {
        isActive: true,
        users: { some: { userId: session.user.id } }
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        logo: true,
        industry: true,
        subscription: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Si no hay empresas asociadas, crear una empresa por defecto para el usuario
    if (companies.length === 0) {
      // Buscar o crear un rol por defecto
      let defaultRole = await prisma.companyRole.findFirst({
        where: { name: 'Owner' }
      })

      if (!defaultRole) {
        // Crear una empresa primero para poder crear el rol
        const newCompany = await prisma.company.create({
          data: {
            name: `Empresa de ${session.user.name || session.user.email}`,
            legalName: session.user.name || 'Mi Empresa',
            email: session.user.email,
          }
        })

        // Crear rol owner
        defaultRole = await prisma.companyRole.create({
          data: {
            companyId: newCompany.id,
            name: 'Owner',
            description: 'Propietario con acceso completo',
            permissions: {
              all: true,
              manage_company: true,
              manage_users: true,
              manage_billing: true,
              view_reports: true,
              manage_invoices: true,
              manage_expenses: true,
              manage_customers: true,
              manage_products: true,
            }
          }
        })

        // Asociar usuario a la empresa
        await prisma.companyUser.create({
          data: {
            companyId: newCompany.id,
            userId: session.user.id,
            roleId: defaultRole.id,
            isOwner: true,
          }
        })

        companies = [{
          id: newCompany.id,
          name: newCompany.name,
          legalName: newCompany.legalName,
          taxId: newCompany.taxId,
          logo: newCompany.logo,
          industry: newCompany.industry,
          subscription: newCompany.subscription,
        }]
      }
    }

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Error al cargar empresas' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()

    // Crear empresa y asociar al usuario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear la empresa
      const company = await tx.company.create({
        data: {
          name: data.name,
          legalName: data.legalName,
          taxId: data.taxId,
          industry: data.industry,
          website: data.website,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country || 'US',
          phone: data.phone,
          email: data.email || session.user.email,
          subscription: 'PROFESSIONAL',
          isActive: true,
        },
      })

      // Crear rol Owner para esta empresa
      const ownerRole = await tx.companyRole.create({
        data: {
          companyId: company.id,
          name: 'Owner',
          description: 'Propietario con acceso completo',
          permissions: {
            all: true,
            manage_company: true,
            manage_users: true,
            manage_billing: true,
            view_reports: true,
            manage_invoices: true,
            manage_expenses: true,
            manage_customers: true,
            manage_products: true,
          }
        }
      })

      // Asociar usuario como propietario
      await tx.companyUser.create({
        data: {
          companyId: company.id,
          userId: session.user.id,
          roleId: ownerRole.id,
          isOwner: true,
        }
      })

      return company
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Error al crear empresa' },
      { status: 500 }
    )
  }
}
