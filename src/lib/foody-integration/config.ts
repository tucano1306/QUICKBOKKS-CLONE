/**
 * La configuracion de la integracion con Foody, de las variables de entorno.
 *
 *   FOODY_SECRET      el secreto compartido con Foody (alli: COMPUTO_SECRET)
 *   FOODY_COMPANY_ID  la empresa donde entran los gastos («Leonardo»)
 *
 * Sin las dos, la integracion esta apagada: la ruta responde 503 y la tarjeta
 * de Integraciones explica que falta.
 */
export function configFoody(): { secreto: string; companyId: string } | null {
  const secreto = process.env.FOODY_SECRET?.trim() ?? ''
  const companyId = process.env.FOODY_COMPANY_ID?.trim() ?? ''
  if (secreto.length < 32 || !companyId) return null
  return { secreto, companyId }
}
