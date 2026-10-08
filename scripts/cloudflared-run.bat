@echo off
REM Invocado por la tarea programada "PakuaCloudflaredInicio" al arrancar Windows.
REM Levanta el tunel nombrado de Cloudflare (attendio.lat -> localhost:3000).
REM
REM cloudflared se cierra solo (por diseno) cuando pierde TODAS sus conexiones a la
REM vez -por ejemplo tras un corte de red breve, visto dos veces (07/10 20:11 y
REM 08/10 12:23)- y no reintenta para siempre por su cuenta. Este script lo
REM relanza automaticamente cada vez que eso pasa, para que un corte de red
REM momentaneo no tumbe el tunel hasta que alguien lo note a mano.
cd /d "%~dp0.."
set LOG=storage\cloudflared.log

:loop
echo [%date% %time%] Arrancando cloudflared >> "%LOG%"
"C:\Program Files (x86)\cloudflared\cloudflared.exe" --config "C:\Users\Admin\.cloudflared\config.yml" tunnel run >> "%LOG%" 2>&1
echo [%date% %time%] cloudflared se cerro (salida %errorlevel%), reintento en 5s >> "%LOG%"
ping -n 6 127.0.0.1 >nul
goto loop
