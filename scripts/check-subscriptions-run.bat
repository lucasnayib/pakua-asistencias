@echo off
REM Invocado por la tarea programada "PakuaCheckSuscripciones" cada 1 hora.
REM Corre el control de trials/gracia vencidos de las suscripciones.
cd /d "%~dp0.."
npm run check-subscriptions >> "storage\check-subscriptions-task.log" 2>&1
