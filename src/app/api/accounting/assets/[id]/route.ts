import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/accounting/assets/[id] - Get a specific asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id
      }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Activo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Error al obtener el activo' },
      { status: 500 }
    )
  }
}

// PUT /api/accounting/assets/[id] - Update an asset
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Verify asset exists
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id
      }
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Activo no encontrado' },
        { status: 404 }
      )
    }

    // Update the asset
    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name: data.name !== undefined ? data.name : existingAsset.name,
        description: data.description !== undefined ? data.description : existingAsset.description,
        currentMileage: data.currentMileage !== undefined ? data.currentMileage : existingAsset.currentMileage,
        salvageValue: data.salvageValue !== undefined ? data.salvageValue : existingAsset.salvageValue,
        usefulLife: data.usefulLife !== undefined ? data.usefulLife : existingAsset.usefulLife,
        status: data.status !== undefined ? data.status : existingAsset.status,
        // Recalculate book value based on current depreciation
        bookValue: calculateBookValue(
          existingAsset.purchasePrice,
          existingAsset.purchaseDate,
          data.usefulLife !== undefined ? data.usefulLife : existingAsset.usefulLife,
          data.salvageValue !== undefined ? data.salvageValue : existingAsset.salvageValue
        ),
        accumulatedDepreciation: calculateAccumulatedDepreciation(
          existingAsset.purchasePrice,
          existingAsset.purchaseDate,
          data.usefulLife !== undefined ? data.usefulLife : existingAsset.usefulLife,
          data.salvageValue !== undefined ? data.salvageValue : existingAsset.salvageValue
        )
      }
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el activo' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounting/assets/[id] - Delete an asset
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify asset exists
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id
      }
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Activo no encontrado' },
        { status: 404 }
      )
    }

    // Delete the asset
    await prisma.asset.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Activo eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el activo' },
      { status: 500 }
    )
  }
}

// Helper function to calculate accumulated depreciation
function calculateAccumulatedDepreciation(
  purchasePrice: number,
  purchaseDate: Date,
  usefulLife: number,
  salvageValue: number
): number {
  const purchase = new Date(purchaseDate)
  const now = new Date()
  const monthsOwned = (now.getFullYear() - purchase.getFullYear()) * 12 + 
                      (now.getMonth() - purchase.getMonth())
  
  const depreciableAmount = purchasePrice - salvageValue
  const totalMonths = usefulLife * 12
  const monthsToDepreciate = Math.min(Math.max(0, monthsOwned), totalMonths)
  
  const accumulatedDep = (depreciableAmount / totalMonths) * monthsToDepreciate
  return Math.min(accumulatedDep, depreciableAmount)
}

// Helper function to calculate book value
function calculateBookValue(
  purchasePrice: number,
  purchaseDate: Date,
  usefulLife: number,
  salvageValue: number
): number {
  const accumulatedDep = calculateAccumulatedDepreciation(
    purchasePrice,
    purchaseDate,
    usefulLife,
    salvageValue
  )
  return Math.max(purchasePrice - accumulatedDep, salvageValue)
}
