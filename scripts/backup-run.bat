@echo off
REM Invocado por la tarea programada "PakuaBackupDiario" todos los días a las 3:00 AM.
cd /d "%~dp0.."
npm run backup >> "storage\backup-task.log" 2>&1
