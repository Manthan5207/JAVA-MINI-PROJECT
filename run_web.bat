@echo off
title ContactVault - Web Application
echo ===================================================
echo     Compiling ContactVault Web Server...
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
echo  Starting Web Server on http://localhost:8080
echo  Press Ctrl+C to stop the server anytime.
echo ===================================================
echo.
start http://localhost:8080
java -cp "bin;lib/*" WebServer
pause
