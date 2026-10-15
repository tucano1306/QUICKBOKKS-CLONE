/**
 * @jest-environment node
 */
import { mismaBase, motivoParaSaltar } from '../../integration/base-de-pruebas'

const PROD = 'postgresql://app:clave@ep-quiet-mud-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
const PROD_SIN_POOLER = 'postgresql://app:otra@ep-quiet-mud-123.us-east-1.aws.neon.tech/neondb?sslmode=require'
const RAMA_PRUEBAS = 'postgresql://app:clave@ep-rama-pruebas-456.us-east-1.aws.neon.tech/neondb?sslmode=require'

describe('motivoParaSaltar — las pruebas con base real nunca tocan produccion', () => {
  it('sin TEST_DATABASE_URL se saltan, aunque haya DATABASE_URL', () => {
    expect(motivoParaSaltar({ DATABASE_URL: PROD })).toBe('TEST_DATABASE_URL no esta definida')
    expect(motivoParaSaltar({ DATABASE_URL: PROD, TEST_DATABASE_URL: '  ' })).toBe('TEST_DATABASE_URL no esta definida')
  })

  it('si TEST_DATABASE_URL es la de produccion, se saltan', () => {
    expect(motivoParaSaltar({ DATABASE_URL: PROD, TEST_DATABASE_URL: PROD })).toMatch(/misma base que DATABASE_URL/)
  })

  it('tambien si es la misma base por la direccion sin pooler o desde otra variable', () => {
    expect(motivoParaSaltar({ DATABASE_URL: PROD, TEST_DATABASE_URL: PROD_SIN_POOLER })).toMatch(/DATABASE_URL/)
    expect(
      motivoParaSaltar({ DATABASE_POSTGRES_PRISMA_URL: PROD, TEST_DATABASE_URL: PROD_SIN_POOLER })
    ).toMatch(/DATABASE_POSTGRES_PRISMA_URL/)
  })

  it('con una base de pruebas distinta, corren', () => {
    expect(motivoParaSaltar({ DATABASE_URL: PROD, TEST_DATABASE_URL: RAMA_PRUEBAS })).toBeNull()
  })
})

describe('mismaBase', () => {
  it('la identifica el servidor sin «-pooler», el puerto y el nombre de la base', () => {
    expect(mismaBase(PROD, PROD_SIN_POOLER)).toBe(true)
    expect(mismaBase(PROD, RAMA_PRUEBAS)).toBe(false)
    expect(mismaBase(PROD, PROD.replace('/neondb', '/otra'))).toBe(false)
  })

  it('una direccion que no se entiende no es la misma que nada', () => {
    expect(mismaBase('no-es-una-url', 'no-es-una-url')).toBe(false)
  })
})
