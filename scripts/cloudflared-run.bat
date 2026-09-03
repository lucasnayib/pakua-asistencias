@echo off
REM Invocado por la tarea programada "PakuaCloudflaredInicio" al arrancar Windows.
REM Levanta el túnel nombrado de Cloudflare (attendio.lat -> localhost:3000).
"C:\Program Files (x86)\cloudflared\cloudflared.exe" --config "C:\Users\Admin\.cloudflared\config.yml" tunnel run
