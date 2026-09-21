/**
 * UNIFICAR CATEGORIAS QUE SIGNIFICAN LO MISMO
 *
 * Distinto de merge-duplicate-categories.ts: aquel unia variantes de escritura
 * ("Compras internet" / "compras internet"), que el codigo ya normaliza solo.
 * Esto une nombres GENUINAMENTE distintos que designan la misma categoria
 * ("Compras en Linea", "Compras on line", "Compras internet"), cosa que ninguna
 * regla automatica puede decidir: hace falta que alguien diga que son lo mismo.
 *
 * Solo toca `Transaction.category`. No borra ninguna transaccion ni ningun
 * gasto: unicamente reescribe el texto de la categoria. Los importes, fechas y
 * descripciones quedan intactos.
 *
 *   npx tsx scripts/merge-category-aliases.ts           # simulacro, no escribe
 *   npx tsx scripts/merge-category-aliases.ts --apply   # aplica
 */

import { PrismaClient } from '@prisma/client';
import { categoryKey } from '../src/lib/category-name';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/**
 * destino -> nombres de origen que se funden en el.
 *
 * El emparejado es por `categoryKey`, asi que no hace falta listar las
 * variantes de mayusculas, acentos ni espacios dobles: "Compras  on line" con
 * dos espacios cae sola con "Compras on line".
 */
const GRUPOS: Record<string, string[]> = {
  'Compras en internet': ['Compras on line', 'Compras en Linea', 'Compras internet'],
  'Restaurante': ['Restaurant', 'Restaurante'],
  'Otros gastos': ['Otros Gastos', 'General Expenses', 'General Expense'],
  'Celular': ['Celular', 'Celular y Internet'],
  'Supermercado': ['Supermercado', 'supermercados'],
  'Seguro Geico': ['Seguros', 'Seguro Geico'],
};

/**
 * Renombrados en la tabla ExpenseCategory.
 *
 * Se renombra la fila en vez de repuntar los gastos a otra: asi los gastos
 * siguen colgando de la misma categoria y no se mueve ni se borra nada.
 *
 * Nota sobre "Seguro" -> "Seguro Geico": son 37 gastos y $38.663 de seguros
 * generales. Se advirtio que etiquetarlos todos como Geico solo es correcto si
 * de verdad son todos de esa aseguradora; el usuario lo confirmo.
 */
const RENOMBRADOS: Array<[string, string]> = [
  ['Seguro', 'Seguro Geico'],
];

async function renombrarCategorias() {
  console.log('=== ExpenseCategory: renombrados ===\n');

  for (const [desde, hasta] of RENOMBRADOS) {
    const filas = await prisma.expenseCategory.findMany({ select: { id: true, name: true, companyId: true } });
    const objetivo = filas.filter((c) => categoryKey(c.name) === categoryKey(desde));

    if (objetivo.length === 0) {
      console.log(`"${desde}": no existe, nada que hacer\n`);
      continue;
    }

    for (const c of objetivo) {
      const n = await prisma.expense.count({ where: { categoryId: c.id } });
      const suma = await prisma.expense.aggregate({ where: { categoryId: c.id }, _sum: { amount: true } });
      console.log(`"${c.name}" -> "${hasta}"   ${n} gasto(s), $${(suma._sum.amount || 0).toFixed(2)}`);

      // Si ya existe una categoria con el nombre destino en la misma empresa,
      // renombrar crearia justo el duplicado que todo esto viene a evitar.
      const choque = filas.find(
        (o) => o.id !== c.id && o.companyId === c.companyId && categoryKey(o.name) === categoryKey(hasta)
      );
      if (choque) {
        console.log(`     !! ya existe "${choque.name}" en esa empresa: se omite para no duplicar`);
        continue;
      }

      if (APPLY) {
        await prisma.expenseCategory.update({ where: { id: c.id }, data: { name: hasta } });
        console.log(`     -> renombrada (los ${n} gastos siguen colgando de ella)`);
      }
    }
    console.log();
  }
}

async function main() {
  console.log(APPLY ? '>> MODO APLICAR: se escriben cambios\n' : '>> SIMULACRO: no se escribe nada (usa --apply)\n');

  await renombrarCategorias();
  console.log('=== Transaction.category: fusiones ===\n');

  const actuales = await prisma.transaction.groupBy({
    by: ['category'],
    _count: { _all: true },
    _sum: { amount: true },
  });

  let totalMovs = 0;
  let totalImporte = 0;

  for (const [destino, origenes] of Object.entries(GRUPOS)) {
    const claves = new Set(origenes.map(categoryKey));
    const coincidencias = actuales.filter((r) => r.category && claves.has(categoryKey(r.category)));

    if (coincidencias.length === 0) {
      console.log(`"${destino}": sin coincidencias, nada que hacer\n`);
      continue;
    }

    const movs = coincidencias.reduce((s, r) => s + r._count._all, 0);
    const importe = coincidencias.reduce((s, r) => s + (r._sum.amount || 0), 0);

    console.log(`"${destino}"  <-  ${movs} movimiento(s), $${importe.toFixed(2)}`);
    for (const c of coincidencias) {
      const marca = c.category === destino ? ' (ya es el destino)' : '';
      console.log(`     "${c.category}"  n=${c._count._all}  $${(c._sum.amount || 0).toFixed(2)}${marca}`);
    }

    if (APPLY) {
      const aCambiar = coincidencias.map((c) => c.category!).filter((c) => c !== destino);
      if (aCambiar.length > 0) {
        const res = await prisma.transaction.updateMany({
          where: { category: { in: aCambiar } },
          data: { category: destino },
        });
        console.log(`     -> ${res.count} transaccion(es) reescritas`);
      }
    }

    console.log();
    totalMovs += movs;
    totalImporte += importe;
  }

  console.log('-'.repeat(60));
  console.log(`Grupos: ${Object.keys(GRUPOS).length}`);
  console.log(`Movimientos ${APPLY ? 'afectados' : 'que se afectarian'}: ${totalMovs}`);
  console.log(`Importe agrupado: $${totalImporte.toFixed(2)}`);
  console.log('\nNo se ha borrado ninguna transaccion ni ningun gasto.');
  if (!APPLY) console.log('Simulacro: no se ha escrito nada. Repite con --apply.');
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
