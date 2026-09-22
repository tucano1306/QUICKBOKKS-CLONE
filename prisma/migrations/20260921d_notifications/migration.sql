-- Avisos para el usuario. Aditivo.

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "companyId" TEXT,
  "type"      TEXT NOT NULL,
  "level"     TEXT NOT NULL DEFAULT 'info',
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "link"      TEXT,
  "dedupeKey" TEXT,
  "readAt"    TIMESTAMP(3),
  "emailedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Un aviso por usuario y clave: es lo que impide que el trabajo diario
-- repita el mismo aviso cada dia hasta enterrar la campana.
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_userId_dedupeKey_key"
  ON "notifications" ("userId", "dedupeKey");

CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_idx"
  ON "notifications" ("userId", "readAt");

DO $$ BEGIN
  ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cuantas millas antes del cambio hay que avisar.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "serviceAlertMiles" INTEGER;
