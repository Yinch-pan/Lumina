#!/bin/bash

# 启动 Vite 开发服务器
npm run dev &
VITE_PID=$!
# 等待 Vite 启动
sleep 3

# 构建并启动 Electron
npm run dev:electron

# 清理
kill $VITE_PID
