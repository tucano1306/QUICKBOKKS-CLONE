import { prisma } from '@/lib/prisma'

/**
 * Control de acceso por empresa.
 *
 * El `companyId` llega del query o del cuerpo de la peticion, asi que no basta
 * con exigir sesion: hay que comprobar que el usuario pertenece a esa empresa.
 * Sin esto cualquiera con cuenta podria leer -o borrar- datos de otra empresa
 * con solo cambiar el id en la URL.
 *
 * Un activo sin empresa (`companyId` null) es compartido por diseno: el esquema
 * declara el campo opcional y esas filas se consideran visibles para todos.
 */
export async function userCanAccessCompany(
  userId: string,
  companyId: string | null
): Promise<boolean> {
  if (!companyId) return true
  const membership = await prisma.companyUser.findFirst({ where: { userId, companyId } })
  return membership !== null
}

export interface AssetAccess {
  /** 200 si pasa; si no, el codigo HTTP con el que responder. */
  status: 200 | 403 | 404
  companyId: string | null
}

/**
 * Resuelve el activo y comprueba de paso el acceso.
 *
 * Distingue "no existe" de "no es tuyo" porque la respuesta no es la misma:
 * 404 frente a 403.
 *
 * Devuelve un `status` plano en vez de una union discriminada a proposito: este
 * proyecto compila con `strict: false`, y sin `strictNullChecks` TypeScript no
 * estrecha `{ ok: true } | { ok: false }` al comprobar la bandera.
 */
export async function resolveAssetAccess(userId: string, assetId: string): Promise<AssetAccess> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { companyId: true },
  })
  if (!asset) return { status: 404, companyId: null }
  if (!(await userCanAccessCompany(userId, asset.companyId))) {
    return { status: 403, companyId: asset.companyId }
  }
  return { status: 200, companyId: asset.companyId }
}
