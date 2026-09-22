-- Control de millas: registro de cambios de aceite y otros servicios.
-- Aditivo: no toca ninguna fila existente.

CREATE TABLE IF NOT EXISTS "vehicle_service_records" (
  "id"        TEXT NOT NULL,
  "assetId"   TEXT NOT NULL,
  "companyId" TEXT,
  "type"      TEXT NOT NULL DEFAULT 'OIL_CHANGE',
  "odometer"  INTEGER NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "cost"      DOUBLE PRECISION,
  "vendor"    TEXT,
  "oilType"   TEXT,
  "photoUrl"  TEXT,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_service_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vehicle_service_records_assetId_odometer_idx"
  ON "vehicle_service_records" ("assetId", "odometer");

DO $$ BEGIN
  ALTER TABLE "vehicle_service_records"
    ADD CONSTRAINT "vehicle_service_records_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Intervalo de servicio propio del vehiculo; null usa el estandar.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "serviceIntervalMiles" INTEGER;
