# Script para resetear la contraseña de PostgreSQL
Write-Host "=== Reseteo de Contraseña de PostgreSQL ===" -ForegroundColor Green

$pgHbaPath = "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
$backupPath = "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup"

# 1. Hacer backup del archivo original
Write-Host "1. Haciendo backup de pg_hba.conf..." -ForegroundColor Yellow
Copy-Item $pgHbaPath $backupPath -Force

# 2. Leer el contenido y modificarlo
Write-Host "2. Modificando pg_hba.conf para permitir acceso temporal..." -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$newContent = $content -replace 'scram-sha-256', 'trust' -replace 'md5', 'trust'
$newContent | Set-Content $pgHbaPath

# 3. Reiniciar PostgreSQL
Write-Host "3. Reiniciando PostgreSQL..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16

Start-Sleep -Seconds 3

# 4. Cambiar contraseñas
Write-Host "4. Cambiando contraseñas..." -ForegroundColor Yellow
$env:PGPASSWORD = ""
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "ALTER USER postgres WITH PASSWORD 'admin123';"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "ALTER USER usuario WITH PASSWORD 'admin123';"

# 5. Restaurar archivo original
Write-Host "5. Restaurando pg_hba.conf..." -ForegroundColor Yellow
Copy-Item $backupPath $pgHbaPath -Force

# 6. Reiniciar PostgreSQL de nuevo
Write-Host "6. Reiniciando PostgreSQL con la configuración original..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16

Write-Host ""
Write-Host "=== ¡Proceso completado! ===" -ForegroundColor Green
Write-Host "Contraseña cambiada a: admin123" -ForegroundColor Cyan
Write-Host "Ahora actualiza tu archivo .env con la nueva contraseña" -ForegroundColor Cyan
