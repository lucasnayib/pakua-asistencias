@echo off
REM Invocado por la tarea programada "PakuaBajaPorInactividad" una vez por dia.
REM Da de baja sola a los alumnos que dejaron de venir (ver Admin.inactivityDeactivationDays).
cd /d "%~dp0.."
npm run deactivate-inactive-students >> "storage\deactivate-inactive-students-task.log" 2>&1
