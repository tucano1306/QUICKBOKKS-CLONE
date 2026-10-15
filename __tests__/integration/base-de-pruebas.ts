/**
 * ¿Pueden correr las pruebas que escriben en una base de datos de verdad?
 *
 * Antes usaban `TEST_DATABASE_URL || DATABASE_URL`, y next/jest carga el .env
 * del proyecto, donde DATABASE_URL es la base de PRODUCCION. Cada `jest`
 * creaba y borraba empresas, clientes y usuarios «test-…» en la base real: en
 * octubre de 2026 la tabla de empresas llevaba 232 altas y 229 bajas para 3
 * empresas de verdad. No quedo nada, pero bastaba un fallo a mitad de prueba
 * para dejar basura entre los datos del usuario.
 *
 * Ahora solo corren contra TEST_DATABASE_URL, explicita, y nunca si apunta a
 * la misma base que cualquier otra variable de base de datos del entorno.
 *
 * Modulo PURO. Se prueba en __tests__/unit/lib/base-de-pruebas.test.ts.
 */

/**
 * La misma base aunque llegue por otro camino: Neon da a la misma base una
 * direccion con «-pooler» y otra sin el, y la contraseña o los parametros
 * pueden variar. Lo que la identifica es el servidor (sin «-pooler»), el
 * puerto y el nombre de la base.
 */
export function mismaBase(a: string, b: string): boolean {
  const clave = (url: string): string | null => {
    try {
      const u = new URL(url)
      return `${u.hostname.replace('-pooler', '').toLowerCase()}:${u.port || '5432'}${u.pathname}`
    } catch {
      return null
    }
  }
  const ka = clave(a)
  const kb = clave(b)
  return ka !== null && ka === kb
}

/** Por que se saltan, o `null` si pueden correr. */
export function motivoParaSaltar(env: Record<string, string | undefined>): string | null {
  const prueba = env.TEST_DATABASE_URL?.trim()
  if (!prueba) return 'TEST_DATABASE_URL no esta definida'

  // Todas las variables con pinta de base de datos: DATABASE_URL, la de
  // Prisma, la sin pooler… cualquiera de ellas puede ser la de produccion.
  for (const [nombre, valor] of Object.entries(env)) {
    if (nombre === 'TEST_DATABASE_URL' || !valor || !/DATABASE|POSTGRES/i.test(nombre)) continue
    if (mismaBase(prueba, valor.trim())) return `TEST_DATABASE_URL apunta a la misma base que ${nombre}`
  }
  return null
}
