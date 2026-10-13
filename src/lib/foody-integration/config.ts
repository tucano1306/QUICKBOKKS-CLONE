/**
 * La configuracion de la integracion con Foody, de las variables de entorno.
 *
 *   FOODY_SECRET               el secreto compartido con Foody (alli: COMPUTO_SECRET)
 *   FOODY_COMPANY_ID           la empresa de los gastos personales («Leonardo»)
 *   FOODY_BUSINESS_COMPANY_ID  la de los gastos de negocio («Venecoro»), opcional
 *
 * Sin las dos primeras, la integracion esta apagada: la ruta responde 503 y la
 * tarjeta de Integraciones explica que falta. Sin la tercera, lo de negocio no
 * se escribe en ningun sitio (se responde `omitido`): meterlo en la empresa
 * personal seria peor que no meterlo.
 */
export interface ConfigFoody {
  secreto: string
  companyId: string
  companyNegocioId: string | null
}

export function configFoody(): ConfigFoody | null {
  const secreto = process.env.FOODY_SECRET?.trim() ?? ''
  const companyId = process.env.FOODY_COMPANY_ID?.trim() ?? ''
  if (secreto.length < 32 || !companyId) return null
  const negocio = process.env.FOODY_BUSINESS_COMPANY_ID?.trim() || null
  // La misma empresa en las dos no separa nada: se trata como si faltara.
  return { secreto, companyId, companyNegocioId: negocio === companyId ? null : negocio }
}
