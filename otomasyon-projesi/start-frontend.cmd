@echo off
cd /d "%~dp0"
npm.cmd run dev:frontend > frontend.log 2>&1
