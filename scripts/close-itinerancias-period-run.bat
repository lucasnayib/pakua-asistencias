@echo off
REM Invocado por la tarea programada "PakuaCierreItinerancias" una vez por dia.
REM Archiva sola las actividades de Itinerancias de meses ya pasados que el admin no cerro a mano.
cd /d "%~dp0.."
npm run close-itinerancias-period >> "storage\close-itinerancias-period-task.log" 2>&1
