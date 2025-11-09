@echo off
chcp 65001 >nul
echo ========================================
echo 启动后端服务
echo ========================================
cd /d %~dp0
start "后端服务" cmd /k "python app.py"
timeout /t 3 >nul
echo 后端服务已启动
echo ========================================
echo.



