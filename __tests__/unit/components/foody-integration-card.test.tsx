/**
 * La tarjeta de Foody en Integraciones: los ingresos que llegan de Foody se
 * cuentan aparte de los gastos del mes y, entre los recientes, salen marcados
 * y con «+». Importes inventados.
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import FoodyIntegrationCard from '@/components/integrations/foody-integration-card'

const ESTADO = {
  configurada: true,
  acceso: true,
  empresa: { id: 'leonardo', nombre: 'Leonardo' },
  delMes: { cantidad: 7, total: 321.46 },
  ingresosDelMes: { cantidad: 2, total: 1500.5 },
  total: 40,
  ultimo: '2026-11-13T15:00:00.000Z',
  recientes: [
    {
      id: 'ingreso',
      description: 'Obra',
      category: 'Servicios',
      amount: 900,
      date: '2026-11-13T00:00:00.000Z',
      updatedAt: '2026-11-13T15:00:00.000Z',
      ingreso: true,
    },
    {
      id: 'gasto',
      description: 'Publix',
      category: 'Supermercado',
      amount: 20.68,
      date: '2026-11-12T00:00:00.000Z',
      updatedAt: '2026-11-12T15:00:00.000Z',
    },
  ],
  negocio: null,
}

function conEstado(estado: unknown) {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => estado })) as unknown as typeof fetch
}

describe('FoodyIntegrationCard', () => {
  it('cuenta los ingresos del mes aparte de los gastos', async () => {
    conEstado(ESTADO)
    render(<FoodyIntegrationCard />)
    expect(await screen.findByText('7 gastos · $321.46')).toBeInTheDocument()
    expect(screen.getByText('2 ingresos · $1,500.50')).toBeInTheDocument()
  })

  it('entre los recientes, un ingreso lleva su marca y «+»; un gasto, ninguna', async () => {
    conEstado(ESTADO)
    render(<FoodyIntegrationCard />)
    const ingreso = (await screen.findByText('Obra')).closest('li') as HTMLElement
    expect(within(ingreso).getByText('Ingreso')).toBeInTheDocument()
    expect(within(ingreso).getByText('+$900.00')).toBeInTheDocument()

    const gasto = screen.getByText('Publix').closest('li') as HTMLElement
    expect(within(gasto).queryByText('Ingreso')).not.toBeInTheDocument()
    expect(within(gasto).getByText('$20.68')).toBeInTheDocument()
  })

  it('sin ingresos este mes no hay linea de ingresos', async () => {
    conEstado({ ...ESTADO, ingresosDelMes: { cantidad: 0, total: 0 } })
    render(<FoodyIntegrationCard />)
    await screen.findByText('7 gastos · $321.46')
    expect(screen.queryByText(/ingresos? ·/)).not.toBeInTheDocument()
  })
})
