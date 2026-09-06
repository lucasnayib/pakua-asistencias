@echo off
REM Registra una tarea programada de Windows que corre el backup automático
REM todos los días a las 3:00 AM. Ejecutar UNA sola vez, como Administrador
REM (clic derecho -> "Ejecutar como administrador"), en la máquina donde
REM corre el servidor.

set PROJECT_DIR=%~dp0
set TASK_NAME=PakuaBackupDiario

echo ============================================
echo   Programando backup automatico diario
echo ============================================
echo Carpeta del proyecto: %PROJECT_DIR%
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "\"%PROJECT_DIR%scripts\backup-run.bat\"" /SC DAILY /ST 03:00 /RL HIGHEST /F

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Tarea "%TASK_NAME%" creada: corre todos los dias a las 3:00 AM.
  echo Podes probarla ahora mismo desde el Programador de tareas de Windows
  echo ^(buscar "%TASK_NAME%" -^> boton derecho -^> "Ejecutar"^).
) else (
  echo.
  echo No se pudo crear la tarea. Confirma que abriste esta ventana como Administrador.
)

echo.
pause
