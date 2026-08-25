-- Un Form 1040 por usuario, EMPRESA y año fiscal.
--
-- Antes la llave era (userId, taxYear), así que un usuario con varias empresas
-- solo podía tener UN borrador por año: guardar el 1040 de una empresa
-- sobrescribía el de las demás.
--
-- La llave nueva es estrictamente MÁS LAXA que la anterior (agrega una columna),
-- por lo que ninguna fila existente puede entrar en conflicto: la migración no
-- borra ni modifica datos.

-- DropIndex
DROP INDEX IF EXISTS "tax_form_1040_userId_taxYear_key";

-- CreateIndex
CREATE UNIQUE INDEX "tax_form_1040_userId_companyId_taxYear_key"
  ON "tax_form_1040" ("userId", "companyId", "taxYear");

-- Schedule A: deducciones detalladas en bruto, para poder comparar contra la
-- deducción estándar y usar la mayor. Columnas nuevas con valor por defecto:
-- no afectan a las filas existentes.
ALTER TABLE "tax_form_1040"
  ADD COLUMN IF NOT EXISTS "scheduleA_medicalExpenses"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scheduleA_stateLocalTax"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scheduleA_mortgageInterest"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scheduleA_charitableContributions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "usesItemizedDeductions"            BOOLEAN          NOT NULL DEFAULT false;
