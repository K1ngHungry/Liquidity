#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Liquidity Platform - Starting All   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill 0
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting Backend (FastAPI)...${NC}"
cd backend
if [ ! -d "venv" ]; then
    echo -e "${RED}Backend virtual environment not found!${NC}"
    echo -e "${YELLOW}Please run: cd backend && ./setup.sh${NC}"
    exit 1
fi

source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${RED}Frontend dependencies not found!${NC}"
    echo -e "${YELLOW}Please run: cd frontend && npm install${NC}"
    exit 1
fi
echo -e "${GREEN}Starting Frontend (Next.js)...${NC}"
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Both servers are running!           ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
