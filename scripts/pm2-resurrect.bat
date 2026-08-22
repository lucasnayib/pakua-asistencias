@echo off
REM Invocado por la tarea programada "PakuaServidorInicio" al arrancar Windows.
REM Levanta el daemon de PM2 (si no está corriendo) y restaura los procesos
REM guardados con "pm2 save" (ver configurar-servidor-24-7.bat / OPERACIONES.md).
set PM2_HOME=C:\Users\Admin\.pm2
"C:\Program Files\nodejs\node.exe" "C:\Users\Admin\AppData\Roaming\npm\node_modules\pm2\bin\pm2" resurrect
