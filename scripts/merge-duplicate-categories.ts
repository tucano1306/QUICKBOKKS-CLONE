/**
 * UNIFICAR CATEGORIAS DE GASTO DUPLICADAS
 *
 * `ExpenseCategory.name` no tiene restriccion `@unique`, asi que la misma
 * categoria pudo quedar guardada varias veces con distintas mayusculas,
 * acentos o espacios ("Compras internet" / "compras internet"). En los
 * reportes eso salia como dos lineas con el gasto repartido.
 *
 * El codigo ya agrupa por nombre normalizado, asi que los reportes salen bien
 * sin tocar la base. Este script es para dejar tambien la BD ordenada: mueve
 * los gastos de las variantes a una sola categoria canonica.
 *
 * NO BORRA NADA. Ni gastos ni categorias: las categorias que quedan vacias se
 * dejan estar, y se listan al final por si las quieres quitar tu a mano desde
 * la pantalla de categorias.
 *
 *   npx tsx scripts/merge-duplicate-categories.ts            # simulacro, no escribe
 *   npx tsx scripts/merge-duplicate-categories.ts --apply    # aplica los cambios
 */

import { PrismaClient } from '@prisma/client';
import { categoryKey, preferredCategoryName } from '../src/lib/category-name';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? '>> MODO APLICAR: se van a escribir cambios\n' : '>> SIMULACRO: no se escribe nada (usa --apply para aplicar)\n');

  const categories = await prisma.expenseCategory.findMany({
    select: { id: true, name: true, companyId: true },
  });

  // Agrupar por empresa + nombre normalizado. La empresa entra en la clave
  // para no fusionar categorias de companias distintas.
  const groups = new Map<string, typeof categories>();
  for (const c of categories) {
    const key = `${c.companyId ?? 'sin-empresa'}::${categoryKey(c.name)}`;
    const g = groups.get(key) ?? [];
    g.push(c);
    groups.set(key, g);
  }

  const duplicated = [...groups.values()].filter((g) => g.length > 1);

  if (duplicated.length === 0) {
    console.log('No hay categorias duplicadas. Nada que hacer.');
    return;
  }

  let totalMoved = 0;
  const leftEmpty: string[] = [];

  for (const group of duplicated) {
    // La canonica es la mejor escrita, con el mismo criterio que los reportes.
    const canonical = group.reduce((best, c) =>
      preferredCategoryName(best.name, c.name) === best.name ? best : c
    );
    const variants = group.filter((c) => c.id !== canonical.id);

    console.log(`\n"${canonical.name}"  <-  ${variants.map((v) => `"${v.name}"`).join(', ')}`);

    for (const v of variants) {
      const count = await prisma.expense.count({ where: { categoryId: v.id } });
      console.log(`   ${count} gasto(s) desde "${v.name}"`);

      if (count > 0 && APPLY) {
        await prisma.expense.updateMany({
          where: { categoryId: v.id },
          data: { categoryId: canonical.id },
        });
      }
      totalMoved += count;
      leftEmpty.push(`"${v.name}" (id ${v.id})`);
    }
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Grupos duplicados: ${duplicated.length}`);
  console.log(`Gastos ${APPLY ? 'movidos' : 'que se moverian'}: ${totalMoved}`);
  console.log(`\nCategorias que quedan vacias (NO se borran, quitalas tu si quieres):`);
  for (const e of leftEmpty) console.log(`   ${e}`);
  if (!APPLY) console.log('\nSimulacro: no se ha escrito nada. Repite con --apply.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
