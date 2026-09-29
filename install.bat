@echo off
title Cai dat Thu vien - Safety Portal
color 0A

echo =======================================================
echo     CHUONG TRINH CAI DAT TU DONG THU VIEN CHO WEB
echo =======================================================
echo.

echo [1/3] Kiem tra khoi tao package.json...
if not exist package.json (
    call npm init -y
    echo - Da tao file package.json.
) else (
    echo - package.json da ton tai.
)
echo.

echo [2/3] Dang cai dat thu vien cho Server (express, cors, multer)...
call npm install express cors multer
echo - Cai dat thu vien Server hoan tat!
echo.

echo [3/3] Dang cai dat cong cu Ngrok de mo link Public...
call npm install -g ngrok
echo - Cai dat Ngrok hoan tat!
echo.

echo =======================================================
echo CAI DAT THANH CONG TOAN BO HE THONG!
echo =======================================================
echo.
echo Cach chay he thong tren may nay:
echo 1. Go lenh "node server.js" de bat Server.
echo 2. Mo 1 cua so CMD khac go "ngrok http 5000" de lay link Public.
echo.
pause