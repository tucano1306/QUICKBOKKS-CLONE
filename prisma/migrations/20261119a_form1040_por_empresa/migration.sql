-- Un Form 1040 por EMPRESA, no uno por persona.
--
-- Antes la clave unica era (userId, taxYear): solo cabia un borrador por
-- persona y año, asi que entrar con Leonardo y auto-rellenar, y despues entrar
-- con Venecoro y auto-rellenar, sobrescribia las cifras del primero. El
-- formulario nunca podia "actualizarse segun los datos de cada empresa".

-- 1. Rellenar la empresa en los borradores que la tengan vacia. Se usa la
--    empresa mas antigua del propio usuario, que es la que estaba activa
--    cuando se creo el borrador en una app que solo tenia una.
UPDATE "tax_form_1040" f
SET "companyId" = (
  SELECT cu."companyId"
  FROM "company_users" cu
  JOIN "companies" c ON c."id" = cu."companyId"
  WHERE cu."userId" = f."userId"
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE f."companyId" IS NULL;

-- 2. A partir de aqui la empresa es obligatoria.
--    Si este paso falla es porque queda algun borrador de un usuario que no
--    pertenece a ninguna empresa. No se borra solo: son datos fiscales. Mirar
--    con  SELECT * FROM "tax_form_1040" WHERE "companyId" IS NULL;
--    y asignarle empresa a mano antes de volver a ejecutar.
ALTER TABLE "tax_form_1040" ALTER COLUMN "companyId" SET NOT NULL;

-- 3. Cambiar la clave unica.
DROP INDEX IF EXISTS "tax_form_1040_userId_taxYear_key";

CREATE UNIQUE INDEX "tax_form_1040_userId_companyId_taxYear_key"
  ON "tax_form_1040" ("userId", "companyId", "taxYear");
