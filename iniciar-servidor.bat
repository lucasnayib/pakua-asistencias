@echo off
cd /d "%~dp0"
echo ============================================
echo   Servidor Pakua Asistencias
echo ============================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    echo   Abre esta direccion en Safari en la iPad:
    echo     http://%%a:3000
    echo.
)
echo   (No cierres esta ventana mientras uses la app)
echo ============================================
echo.
call npm run start
pause
