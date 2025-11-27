@echo off
echo ========================================
echo   ABRIENDO PAGINA DE CLIENTES
echo   VERSION NUEVA CON 12 BOTONES
echo ========================================
echo.
echo Limpiando cache del navegador...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Abriendo Chrome en modo incognito...
start chrome --incognito --new-window "http://localhost:3000/customers"
echo.
echo ========================================
echo   INSTRUCCIONES:
echo ========================================
echo.
echo 1. Deberas ver una BARRA VERDE en la parte superior
echo    que dice: "VERSION NUEVA CARGADA"
echo.
echo 2. Si NO ves la barra verde:
echo    - Presiona F12 para abrir DevTools
echo    - Ve a la pestana Console
echo    - Busca: "CUSTOMERS PAGE - NUEVA VERSION"
echo.
echo 3. Si ves la barra verde, entonces los 12 botones
echo    estan en la columna ACCIONES de la tabla
echo.
echo 4. Los botones son:
echo    - Ver (azul)
echo    - Editar (verde)
echo    - Invitar (azul)
echo    - Config (morado)
echo    - Actividad (verde)
echo    - Docs (naranja)
echo    - Trans (indigo)
echo    - Facturas (teal)
echo    - Notas (amarillo)
echo    - CRM (rosa)
echo    - Borrar (rojo)
echo.
echo ========================================
pause
