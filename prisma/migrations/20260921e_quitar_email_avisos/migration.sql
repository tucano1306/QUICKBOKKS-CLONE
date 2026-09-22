-- Los avisos van solo a la campana de la aplicacion; se retira el correo.
-- La columna se creo hoy y nunca llego a tener datos (0 filas), asi que
-- quitarla no pierde nada. Dejarla con nombre de correo en un sistema sin
-- correo solo despistaria a quien lea el esquema mas adelante.
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "emailedAt";
