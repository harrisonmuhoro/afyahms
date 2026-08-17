@echo off
echo Starting Hospital Management System dev environment...
start "Laravel API - :8080" cmd /k "cd /d D:\wamp64\www\hospital\backend && D:\wamp64\bin\php\php8.3.28\php.exe artisan serve --port=8080"
start "React Frontend - :5173" cmd /k "cd /d D:\wamp64\www\hospital\frontend && npm run dev"
echo Both servers launching in separate windows.