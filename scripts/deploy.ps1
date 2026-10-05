$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Invoke-Checked {
    param([string]$Description, [scriptblock]$Command)
    Write-Host "-> $Description"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Falló: $Description (código $LASTEXITCODE)" }
}

Invoke-Checked "Buscando cambios en origin/main" { git fetch origin main }

$pending = @(git diff --name-only HEAD origin/main)
if ($LASTEXITCODE -ne 0) { throw "No se pudo comparar con origin/main" }
if ($pending.Count -eq 0) {
    Write-Host "Ya está actualizado. Nada que hacer."
    exit 0
}

$newMigrations = @($pending | Where-Object { $_ -like "prisma/migrations/*" })
if ($newMigrations.Count -gt 0) {
    Write-Host "Hay migraciones de base nuevas. No se hizo ningún cambio. Aplicalas a mano primero:"
    $newMigrations | ForEach-Object { Write-Host "  $_" }
    exit 2
}

Invoke-Checked "Actualizando código" { git pull --ff-only origin main }
Invoke-Checked "Instalando dependencias" { npm ci }
Invoke-Checked "Generando cliente de Prisma" { npx prisma generate }
Invoke-Checked "Construyendo la app" { npm run build }
Invoke-Checked "Reiniciando la app" { pm2 restart pakua-asistencias }

Start-Sleep -Seconds 5
$response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 15
Write-Host "Listo. La app responde con código $($response.StatusCode)."
