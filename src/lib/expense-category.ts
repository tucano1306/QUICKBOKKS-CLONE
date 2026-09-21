import { prisma } from '@/lib/prisma';
import { categoryKey } from '@/lib/category-name';

/**
 * Busca una categoria de gasto por nombre, ignorando mayusculas, acentos y
 * espacios sobrantes.
 *
 * Se trae las categorias de la empresa y compara en JS con `categoryKey` en vez
 * de filtrar en SQL. Es a proposito: `mode: 'insensitive'` de Prisma resuelve
 * las mayusculas pero no los acentos, y lo importante aqui es que la deteccion
 * de duplicados use EXACTAMENTE el mismo criterio con el que los reportes
 * agrupan. Si divergen, se vuelven a colar variantes que el reporte suma juntas
 * pero el alta considera distintas. Una empresa tiene decenas de categorias, no
 * miles, asi que la consulta es barata.
 */
export async function findCategoryByName(
  companyId: string | null | undefined,
  name: string
) {
  const wanted = categoryKey(name);
  if (!wanted) return null;

  const candidates = await prisma.expenseCategory.findMany({
    where: { ...(companyId ? { companyId } : {}) },
  });

  return candidates.find((c) => categoryKey(c.name) === wanted) ?? null;
}
