@echo off
chcp 65001 >nul
echo ========================================
echo 启动前端服务
echo ========================================
cd /d %~dp0
start "前端服务" cmd /k "npm run dev"
timeout /t 3 >nul
echo 前端服务已启动
echo ========================================
echo.



