-- Cifras reales del prestamo y del componente reemplazado.
-- Todo aditivo y anulable: ninguna fila existente cambia de significado.

-- Cuota real del contrato: manda sobre la calculada con la formula.
ALTER TABLE "asset_loans" ADD COLUMN IF NOT EXISTS "contractPayment" DOUBLE PRECISION;

-- Cancelacion anticipada = capital + intereses devengados desde el ultimo pago.
ALTER TABLE "asset_loans" ADD COLUMN IF NOT EXISTS "payoffAmount" DOUBLE PRECISION;
ALTER TABLE "asset_loans" ADD COLUMN IF NOT EXISTS "payoffDate" TIMESTAMP(3);

-- Odometro el dia de la mejora: sin el, la depreciacion prospectiva se desplaza
-- cada vez que se actualiza el odometro.
ALTER TABLE "asset_improvements" ADD COLUMN IF NOT EXISTS "mileageAtImprovement" INTEGER;

-- Millas propias de la pieza instalada (un motor de reemplazo usado).
ALTER TABLE "asset_improvements" ADD COLUMN IF NOT EXISTS "componentMiles" INTEGER;
