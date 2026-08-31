@echo off
title Aggiornamento App Aldissima
color 0A

echo ==============================================
echo   AGGIORNAMENTO AUTOMATICO APP ALDISSIMA
echo ==============================================
echo.

:: 1. Add all changes
echo [1/3] Aggiunta dei file modificati in corso...
git add .
if %errorlevel% neq 0 goto :errore

:: 2. Chiedi un messaggio (opzionale) e fai il Commit
echo.
set "msg="
set /p "msg=-[2/3] Scrivi un riassunto delle modifiche (o premi subito Invio): "
if "%msg%"=="" set "msg=Aggiornamento automatico salvataggi file"

echo.
echo Costruzione del pacchetto di salvataggio...
git commit -m "%msg%"

:: 3. Push su Github!
echo.
echo [3/3] Invio al server cloud (GitHub =^> Vercel) in corso... Attendi la percentuale...
git push
if %errorlevel% neq 0 goto :errore

echo.
echo ==============================================
echo   SUCCESSO COMPLETO! VERCEL STA AGGIORNANDO.
echo ==============================================
echo.
echo Fra 30-40 secondi gli utenti vedranno online la tua nuova versione dell'app.
echo.
pause
exit /b

:errore
color 0C
echo.
echo ==============================================
echo    [!] ATTENZIONE: SI E' VERIFICATO UN ERRORE
echo ==============================================
echo Assicurati di essere connesso a internet o leggi i
echo messaggi di avviso mostrati qua sopra.
echo.
pause
exit /b
