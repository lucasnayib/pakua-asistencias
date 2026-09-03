@echo off
REM Registra una tarea programada de Windows que corre el control de suscripciones
REM (trial vencido, gracia vencida, avisos de 12hs) cada 1 hora. Ejecutar UNA sola vez,
REM como Administrador (clic derecho -> "Ejecutar como administrador"), en la máquina
REM donde corre el servidor.

set PROJECT_DIR=%~dp0
set TASK_NAME=PakuaCheckSuscripciones

echo ============================================
echo   Programando control de suscripciones (cada hora)
echo ============================================
echo Carpeta del proyecto: %PROJECT_DIR%
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "cmd /c cd /d \"%PROJECT_DIR%\" && npm run check-subscriptions >> \"%PROJECT_DIR%storage\check-subscriptions-task.log\" 2>&1" /SC HOURLY /RL HIGHEST /F

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Tarea "%TASK_NAME%" creada: corre una vez por hora.
  echo Podes probarla ahora mismo desde el Programador de tareas de Windows
  echo ^(buscar "%TASK_NAME%" -^> boton derecho -^> "Ejecutar"^).
) else (
  echo.
  echo No se pudo crear la tarea. Confirma que abriste esta ventana como Administrador.
)

echo.
pause
