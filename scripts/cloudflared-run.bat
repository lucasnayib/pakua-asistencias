@echo off
REM Invocado por la tarea programada "PakuaCloudflaredInicio" al arrancar Windows.
REM Levanta el túnel nombrado de Cloudflare (attendio.lat -> localhost:3000). Corre en primer
REM plano de forma indefinida (no es una tarea que termina como el backup o el check de
REM suscripciones) — si el túnel se cae sin motivo aparente, este log es lo único que puede
REM explicar por qué.
cd /d "%~dp0.."
"C:\Program Files (x86)\cloudflared\cloudflared.exe" --config "C:\Users\Admin\.cloudflared\config.yml" tunnel run >> "storage\cloudflared.log" 2>&1
