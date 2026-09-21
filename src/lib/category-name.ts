/**
 * Normalizacion de nombres de categoria.
 *
 * `ExpenseCategory.name` no tiene restriccion `@unique` y `Transaction.category`
 * es texto libre, asi que la misma categoria puede acabar escrita de varias
 * formas ("Compras internet", "compras internet", "Compras  Internet"). Los
 * reportes agrupaban por el string crudo y cada variante salia como una linea
 * distinta, con el gasto partido entre ellas.
 *
 * Aqui se separan dos conceptos:
 *  - la CLAVE con la que se agrupa o se busca (insensible a mayusculas,
 *    espacios sobrantes y acentos),
 *  - el NOMBRE que se muestra, que conserva la forma escrita por el usuario.
 */

/** Colapsa espacios y recorta, sin tocar mayusculas ni acentos. Para mostrar. */
export function cleanCategoryName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Clave canonica para agrupar y comparar. Minusculas, sin acentos y con los
 * espacios colapsados, de modo que todas las variantes de un mismo nombre
 * caen en la misma clave.
 *
 * Los acentos se pliegan a proposito: en datos en espanol "Telefonia" y
 * "Telefonía" son la misma categoria escrita con y sin tilde, y separarlas
 * reproduce el mismo bug que esto viene a arreglar.
 */
export function categoryKey(name: string): string {
  return cleanCategoryName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** true si el texto tiene letras y todas son mayusculas ("COMPRAS INTERNET"). */
function isShouty(s: string): boolean {
  return s === s.toUpperCase() && s !== s.toLowerCase();
}

/**
 * Elige que variante mostrar cuando varias comparten clave.
 *
 * Por orden: descarta el todo-mayusculas frente a una alternativa, prefiere la
 * que empieza por mayuscula ("Compras internet" sobre "compras internet") y
 * desempata alfabeticamente.
 *
 * Lo del todo-mayusculas no es cosmetico: sin esa regla el desempate
 * alfabetico elegia "COMPRAS INTERNET", porque en ASCII las mayusculas ordenan
 * antes que las minusculas. Solo entra en juego cuando hay variantes que
 * competir, asi que una categoria que siempre se escribe "IVA" no se toca.
 *
 * El desempate final importa: Prisma no garantiza el orden de `findMany`, asi
 * que quedarse con "la primera que llegue" haria que el nombre mostrado bailara
 * entre peticiones.
 */
export function preferredCategoryName(a: string, b: string): string {
  const score = (s: string): [number, number] => [
    isShouty(s) ? 0 : 1,
    /^\p{Lu}/u.test(s) ? 1 : 0,
  ];
  const [sa, ca] = score(a);
  const [sb, cb] = score(b);
  if (sa !== sb) return sa > sb ? a : b;
  if (ca !== cb) return ca > cb ? a : b;
  return a <= b ? a : b;
}
