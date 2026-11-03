@echo off
setlocal enabledelayedexpansion
REM Startup script for low-memory environments (Windows)
REM Based on: https://www.tomspencer.dev/blog/2016/10/01/running-a-node-dot-js-app-in-a-low-memory-environment/

REM Default Node.js entry point (production build outputs dist/start.js)
if "%NODE_ENTRY_POINT%"=="" set NODE_ENTRY_POINT=dist\start.js

REM The --color flag ensures that any log output is correctly colorised
set NODE_ARGS=%NODE_ENTRY_POINT% --color

REM If WEB_MEMORY environment variable is set, calculate max_old_space_size
REM as 4/5 (80%) of available memory
if defined WEB_MEMORY (
    set /a MEM_NODE_OLD_SPACE=WEB_MEMORY * 4 / 5
    set NODE_ARGS=--max_old_space_size=!MEM_NODE_OLD_SPACE! %NODE_ARGS%
    echo [startup] WEB_MEMORY=%WEB_MEMORY%MB ^> max_old_space_size=!MEM_NODE_OLD_SPACE!MB
)

REM Pass any additional V8 arguments from NODEJS_V8_ARGS env var
if defined NODEJS_V8_ARGS (
    set NODE_ARGS=%NODEJS_V8_ARGS% %NODE_ARGS%
)

echo [startup] Starting: node %NODE_ARGS%

REM Use cmd /c to ensure proper exit code propagation
cmd /c node %NODE_ARGS%