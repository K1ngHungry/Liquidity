#!/bin/bash

echo "========================================"
echo "  Stopping Liquidity Platform Servers   "
echo "========================================"

# Find and kill the backend (Python/Uvicorn) on port 8000
BACKEND_PID=$(lsof -t -i :8000)
if [ -n "$BACKEND_PID" ]; then
    echo "Stopping Backend (PID: $BACKEND_PID)..."
    kill -9 $BACKEND_PID
else
    echo "Backend not running (port 8000 free)"
fi

# Find and kill the frontend (Node/Next.js) on port 3000
FRONTEND_PID=$(lsof -t -i :3000)
if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping Frontend (PID: $FRONTEND_PID)..."
    kill -9 $FRONTEND_PID
else
    echo "Frontend not running (port 3000 free)"
fi

echo "========================================"
echo "  All servers stopped.                  "
echo "========================================"
