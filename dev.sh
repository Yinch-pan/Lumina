#!/usr/bin/env bash
set -euo pipefail

# Mercury 开发辅助脚本
# 一键启动 Vite + Electron，适用于 bash 环境（Git Bash / WSL / Linux / macOS）。
# Windows 用户也可以直接在两个终端中分别运行 npm run dev 和 npm run dev:electron。

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VITE_HOST="${VITE_HOST:-127.0.0.1}"
VITE_PORT="${VITE_PORT:-5173}"
VITE_LOG="${VITE_LOG:-/tmp/mercury-vite.log}"

cleanup() {
  if [[ -n "${VITE_PID:-}" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[Mercury] 构建主进程..."
npm run build:main

echo "[Mercury] 启动 Vite（端口 ${VITE_PORT}）..."
: > "$VITE_LOG"
npm run dev -- --host "$VITE_HOST" --port "$VITE_PORT" > "$VITE_LOG" 2>&1 &
VITE_PID=$!

# 等待 Vite 就绪（最多 30 秒）
for _ in $(seq 1 60); do
  if grep -q 'Local:' "$VITE_LOG" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    echo "[Mercury] Vite 启动失败，日志如下："
    cat "$VITE_LOG"
    exit 1
  fi
  sleep 0.5
done

VITE_DEV_SERVER_URL="$(sed -nE 's/.*Local:[[:space:]]+(http:\/\/[^[:space:]]+).*/\1/p' "$VITE_LOG" | tail -n 1)"
if [[ -z "$VITE_DEV_SERVER_URL" ]]; then
  echo "[Mercury] 未能解析 Vite 地址，日志如下："
  cat "$VITE_LOG"
  exit 1
fi
export VITE_DEV_SERVER_URL

echo "[Mercury] Vite 地址: $VITE_DEV_SERVER_URL"
echo "[Mercury] 关闭窗口或按 Ctrl+C 即可退出。"

./node_modules/.bin/electron . --dev "$@"
