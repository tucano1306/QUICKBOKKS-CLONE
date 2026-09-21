import { prisma } from '@/lib/prisma';
import { categoryKey, cleanCategoryName, preferredCategoryName } from '@/lib/category-name';

/**
 * Devuelve como debe guardarse una categoria de transaccion.
 *
 * `Transaction.category` es texto libre: no hay tabla ni restriccion detras, asi
 * que cada vez que alguien escribe "compras internet" teniendo ya "Compras
 * internet" nace una variante mas. De ahi salian las lineas repetidas del
 * estado de resultados.
 *
 * En vez de imponer un formato (pasarlo todo a minusculas afearia la pantalla),
 * se reutiliza la forma que ya existe en los datos de la empresa: si hay
 * transacciones guardadas como "Compras internet", una nueva escrita en
 * minusculas se guarda tambien como "Compras internet". Si no hay ninguna
 * previa, se guarda tal cual la escribio el usuario, solo con los espacios
 * recortados.
 *
 * El reporte ya agrupa por nombre normalizado, asi que esto no arregla lo que
 * se ve -- eso ya esta arreglado -- sino que evita que los datos sigan
 * divergiendo.
 */
export async function canonicalTransactionCategory(
  companyId: string | null | undefined,
  name: string
): Promise<string> {
  const clean = cleanCategoryName(name);
  const key = categoryKey(clean);
  if (!key) return clean;

  const existing = await prisma.transaction.findMany({
    where: { ...(companyId ? { companyId } : {}), category: { not: '' } },
    select: { category: true },
    distinct: ['category'],
  });

  // Solo se compara entre las formas YA guardadas, nunca contra lo que acaba de
  // escribir el usuario: si existe una forma previa, gana ella. Meter el texto
  // nuevo en la comparacion dejaba que un "COMPRAS INTERNET" recien tecleado se
  // impusiera a la forma asentada.
  const matches = existing
    .map((row) => row.category)
    .filter((c): c is string => !!c && categoryKey(c) === key)
    .map(cleanCategoryName);

  if (matches.length === 0) return clean;

  return matches.reduce((best, c) => preferredCategoryName(best, c));
}
