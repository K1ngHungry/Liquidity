#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Liquidity Platform - System Check   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

errors=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    version=$(node --version)
    echo -e "${GREEN}✓ Found $version${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo -e "${YELLOW}  Please install Node.js 18+ from https://nodejs.org/${NC}"
    ((errors++))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    version=$(npm --version)
    echo -e "${GREEN}✓ Found v$version${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    ((errors++))
fi

# Check Python
echo -n "Checking Python... "
if command -v python3 &> /dev/null; then
    version=$(python3 --version)
    echo -e "${GREEN}✓ Found $version${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo -e "${YELLOW}  Please install Python 3.8+ from https://python.org/${NC}"
    ((errors++))
fi

# Check pip
echo -n "Checking pip... "
if command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
    if command -v pip3 &> /dev/null; then
        version=$(pip3 --version | cut -d ' ' -f 2)
    else
        version=$(pip --version | cut -d ' ' -f 2)
    fi
    echo -e "${GREEN}✓ Found v$version${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    ((errors++))
fi

echo ""

# Check if backend is set up
echo -n "Checking backend setup... "
if [ -d "backend/venv" ]; then
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
else
    echo -e "${YELLOW}✗ Not set up yet${NC}"
    echo -e "${YELLOW}  Run: cd backend && ./setup.sh${NC}"
fi

# Check if frontend dependencies are installed
echo -n "Checking frontend setup... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}✗ Not set up yet${NC}"
    echo -e "${YELLOW}  Run: cd frontend && npm install${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ All prerequisites met!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Setup backend:  ${YELLOW}cd backend && ./setup.sh${NC}"
    echo -e "  2. Setup frontend: ${YELLOW}cd frontend && npm install${NC}"
    echo -e "  3. Start servers:  ${YELLOW}./start-all.sh${NC}"
else
    echo -e "${RED}✗ Please install missing prerequisites${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""
