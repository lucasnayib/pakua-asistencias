@echo off
REM Deja esta máquina lista como servidor 24/7:
REM   1) Tarea programada que arranca PM2 (y con él la app) al iniciar Windows,
REM      corre como SYSTEM, funciona aunque nadie haya iniciado sesión.
REM   2) Tarea programada que arranca el túnel de Cloudflare (attendio.lat),
REM      con un poco más de espera que la de PM2 para que la app ya esté arriba.
REM   3) Desactiva la suspensión mientras esté conectada a corriente.
REM   4) Desactiva la hibernación.
REM
REM Ejecutar UNA sola vez, como Administrador (clic derecho -> "Ejecutar como
REM administrador"), en la máquina donde corre el servidor.

set PROJECT_DIR=%~dp0
set TASK_NAME=PakuaServidorInicio
set CF_TASK_NAME=PakuaCloudflaredInicio

echo ============================================
echo   Configurando servidor 24/7
echo ============================================
echo.

echo [1/4] Programando arranque automatico de PM2 al iniciar Windows...
schtasks /Create /TN "%TASK_NAME%" /TR "\"%PROJECT_DIR%scripts\pm2-resurrect.bat\"" /SC ONSTART /DELAY 0000:30 /RU SYSTEM /RL HIGHEST /F
if %ERRORLEVEL% NEQ 0 (
  echo   No se pudo crear la tarea. Confirma que abriste esta ventana como Administrador.
  goto :end
)
echo   Tarea "%TASK_NAME%" creada: corre al iniciar Windows ^(con 30s de espera^).
echo.

echo [2/4] Programando arranque automatico del tunel de Cloudflare al iniciar Windows...
schtasks /Create /TN "%CF_TASK_NAME%" /TR "\"%PROJECT_DIR%scripts\cloudflared-run.bat\"" /SC ONSTART /DELAY 0000:45 /RU SYSTEM /RL HIGHEST /F
if %ERRORLEVEL% NEQ 0 (
  echo   No se pudo crear la tarea del tunel. Confirma que abriste esta ventana como Administrador.
  goto :end
)
echo   Tarea "%CF_TASK_NAME%" creada: corre al iniciar Windows ^(con 45s de espera^).
echo.

echo [3/4] Desactivando la suspension mientras este conectada a corriente...
powercfg /change standby-timeout-ac 0
echo   Listo.
echo.

echo [4/4] Desactivando la hibernacion...
powercfg /hibernate off
echo   Listo.
echo.

echo ============================================
echo   Configuracion completa.
echo   Podes probar la tarea ahora mismo desde el
echo   Programador de tareas de Windows (buscar
echo   "%TASK_NAME%" -^> boton derecho -^> "Ejecutar").
echo ============================================

:end
echo.
pause
