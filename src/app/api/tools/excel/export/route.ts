import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// POST - Exportar datos a Excel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, fileName = 'export', sheetName = 'Datos', sheets } = body

    let workbook: XLSX.WorkBook

    if (sheets && Array.isArray(sheets)) {
      // Múltiples hojas
      workbook = XLSX.utils.book_new()
      sheets.forEach((sheet: { name: string; data: Record<string, unknown>[] }) => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
      })
    } else if (data && Array.isArray(data)) {
      // Una sola hoja
      workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    } else {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error exporting Excel:', error)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
