#!/bin/bash

echo "========================================"
echo "  Stopping Liquidity Platform Servers   "
echo "========================================"

# Find backend (Python/Uvicorn) on port 8000
BACKEND_PID=$(lsof -t -iTCP:8000 -sTCP:LISTEN)
if [ -n "$BACKEND_PID" ]; then
    echo "Stopping Backend (PID: $BACKEND_PID)..."
    kill -15 $BACKEND_PID 2>/dev/null
    sleep 2
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Backend did not stop gracefully, forcing kill..."
        kill -9 $BACKEND_PID
    fi
else
    echo "Backend not running (port 8000 free)"
fi

# Find frontend (Node/Next.js) on port 3000
FRONTEND_PID=$(lsof -t -iTCP:3000 -sTCP:LISTEN)
if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping Frontend (PID: $FRONTEND_PID)..."
    kill -15 $FRONTEND_PID 2>/dev/null
    sleep 2
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Frontend did not stop gracefully, forcing kill..."
        kill -9 $FRONTEND_PID
    fi
else
    echo "Frontend not running (port 3000 free)"
fi

echo "========================================"
echo "  All servers stopped.                  "
echo "========================================"
