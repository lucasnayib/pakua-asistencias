@echo off
REM Registra una tarea programada de Windows que corre el control de baja automatica
REM por inactividad todos los dias a las 3:15 AM. Ejecutar UNA sola vez, como Administrador
REM (clic derecho -> "Ejecutar como administrador"), en la maquina donde corre el servidor.

set PROJECT_DIR=%~dp0
set TASK_NAME=PakuaBajaPorInactividad

echo ============================================
echo   Programando baja automatica por inactividad
echo ============================================
echo Carpeta del proyecto: %PROJECT_DIR%
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "\"%PROJECT_DIR%scripts\deactivate-inactive-students-run.bat\"" /SC DAILY /ST 03:15 /RL HIGHEST /F

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Tarea "%TASK_NAME%" creada: corre todos los dias a las 3:15 AM.
  echo Podes probarla ahora mismo desde el Programador de tareas de Windows
  echo ^(buscar "%TASK_NAME%" -^> boton derecho -^> "Ejecutar"^).
) else (
  echo.
  echo No se pudo crear la tarea. Confirma que abriste esta ventana como Administrador.
)

echo.
pause
