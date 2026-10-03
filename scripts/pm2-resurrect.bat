@echo off
REM Invocado por la tarea programada "PakuaServidorInicio" al arrancar Windows.
REM Levanta el daemon de PM2 (si no esta corriendo) y restaura los procesos
REM guardados con "pm2 save" (ver configurar-servidor-24-7.bat / OPERACIONES.md).
REM
REM Reforzado tras arranques fallidos sin dejar rastro: ahora espera a que el
REM sistema termine de asentarse (justo despues de bootear, el perfil/disco pueden
REM no estar listos todavia y "pm2 resurrect" falla en silencio), deja un log con
REM cada paso, y si tras resucitar la app igual no responde, reintenta con un
REM arranque limpio desde ecosystem.config.js. Si ni asi responde bien (visto una
REM vez: el build de ".next" quedo desincronizado del propio reinicio de Windows,
REM el proceso queda "online" pero cada request tira 500), como ultimo recurso
REM reconstruye con "npm run build" antes de rendirse del todo.
setlocal
set PM2_HOME=C:\Users\Admin\.pm2
set APPDIR=C:\Users\Admin\Desktop\pakua-asistencias
set LOG=%APPDIR%\storage\pm2-resurrect.log
set NODE=C:\Program Files\nodejs\node.exe
set NPM_CLI=C:\Program Files\nodejs\npm.cmd
set PM2_CLI=C:\Users\Admin\AppData\Roaming\npm\node_modules\pm2\bin\pm2
set HEALTHFILE=%TEMP%\pakua-health.txt

echo [%date% %time%] --- Arranque: espero 20s a que el sistema se asiente --- >> "%LOG%"
REM "timeout" necesita una consola interactiva y falla al correr sin una (como esta
REM tarea programada, sin usuario logueado) - "ping" a localhost es el truco clasico
REM de batch para esperar N segundos sin depender de eso.
ping -n 21 127.0.0.1 >nul

echo [%date% %time%] pm2 resurrect (intento 1) >> "%LOG%"
"%NODE%" "%PM2_CLI%" resurrect >> "%LOG%" 2>&1

ping -n 11 127.0.0.1 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > "%HEALTHFILE%" 2>nul
set /p HTTP_CODE=<"%HEALTHFILE%"
echo [%date% %time%] Chequeo de salud: HTTP %HTTP_CODE% >> "%LOG%"

if "%HTTP_CODE%"=="200" (
  echo [%date% %time%] OK, la app responde. Fin. >> "%LOG%"
  goto :eof
)

echo [%date% %time%] No responde. Reintento: delete + start ecosystem.config.js >> "%LOG%"
"%NODE%" "%PM2_CLI%" delete pakua-asistencias >> "%LOG%" 2>&1
"%NODE%" "%PM2_CLI%" start "%APPDIR%\ecosystem.config.js" >> "%LOG%" 2>&1

ping -n 11 127.0.0.1 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > "%HEALTHFILE%" 2>nul
set /p HTTP_CODE2=<"%HEALTHFILE%"
echo [%date% %time%] Chequeo de salud tras reintento: HTTP %HTTP_CODE2% >> "%LOG%"

if "%HTTP_CODE2%"=="200" (
  REM Guarda esta definicion buena para que el proximo arranque resucite esto y
  REM no el estado anterior que fallo.
  "%NODE%" "%PM2_CLI%" save >> "%LOG%" 2>&1
  echo [%date% %time%] OK tras reintento, estado guardado. Fin. >> "%LOG%"
  goto :eof
)

echo [%date% %time%] Sigue sin responder bien. Ultimo recurso: npm run build >> "%LOG%"
pushd "%APPDIR%"
call "%NPM_CLI%" run build >> "%LOG%" 2>&1
popd

"%NODE%" "%PM2_CLI%" delete pakua-asistencias >> "%LOG%" 2>&1
"%NODE%" "%PM2_CLI%" start "%APPDIR%\ecosystem.config.js" >> "%LOG%" 2>&1

ping -n 11 127.0.0.1 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > "%HEALTHFILE%" 2>nul
set /p HTTP_CODE3=<"%HEALTHFILE%"
echo [%date% %time%] Chequeo de salud tras rebuild: HTTP %HTTP_CODE3% >> "%LOG%"

if "%HTTP_CODE3%"=="200" (
  "%NODE%" "%PM2_CLI%" save >> "%LOG%" 2>&1
  echo [%date% %time%] OK tras rebuild, estado guardado. Fin. >> "%LOG%"
) else (
  echo [%date% %time%] SIGUE SIN RESPONDER tras rebuild. Requiere revision manual. >> "%LOG%"
)
