@echo off
title Contact Management System
echo ===================================================
echo     Compiling Contact Management System...
echo ===================================================
if not exist bin mkdir bin
javac -cp ".;lib/*" -d bin src/*.java
if %ERRORLEVEL% NEQ 0 (
    echo Compilation failed! Please check Java errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo  Choose Interface to Launch:
echo ===================================================
echo  [1] Web Browser Interface (HTML, CSS & REST API)
echo  [2] Command-Line Console Interface (Classic)
echo ===================================================
set /p choice="Enter choice (1 or 2, default is 1): "

if "%choice%"=="2" (
    echo.
    echo Launching Console Application...
    java -cp "bin;lib/*" Main
) else (
    echo.
    echo Launching Web Server on http://localhost:8080 ...
    start http://localhost:8080
    java -cp "bin;lib/*" WebServer
)
pause
