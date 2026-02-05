#!/bin/bash

# Ghana Commerce Platform - Installation Verification Script
# Run this after setup to verify everything is configured correctly

echo "🔍 Ghana Commerce Platform - Installation Verification"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check function
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
  fi
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

echo "1. Checking Prerequisites"
echo "-------------------------"

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
  ((PASSED++))
  
  # Check version is 18+
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
  if [ "$NODE_MAJOR" -lt 18 ]; then
    warn "Node.js version should be 18 or higher (current: $NODE_VERSION)"
  fi
else
  echo -e "${RED}✗${NC} Node.js not installed"
  ((FAILED++))
fi

# Docker
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo -e "${GREEN}✓${NC} Docker installed: $DOCKER_VERSION"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Docker not installed"
  ((FAILED++))
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
  COMPOSE_VERSION=$(docker-compose --version)
  echo -e "${GREEN}✓${NC} Docker Compose installed: $COMPOSE_VERSION"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Docker Compose not installed"
  ((FAILED++))
fi

echo ""
echo "2. Checking Project Structure"
echo "-----------------------------"

# Check key directories
[ -d "backend" ] && check "Backend directory exists" || echo -e "${RED}✗${NC} Backend directory missing"
[ -d "backend/src" ] && check "Backend src directory exists" || echo -e "${RED}✗${NC} Backend src missing"
[ -d "backend/prisma" ] && check "Prisma directory exists" || echo -e "${RED}✗${NC} Prisma directory missing"
[ -d "infrastructure" ] && check "Infrastructure directory exists" || echo -e "${RED}✗${NC} Infrastructure missing"
[ -d "docs" ] && check "Docs directory exists" || echo -e "${RED}✗${NC} Docs directory missing"

echo ""
echo "3. Checking Configuration Files"
echo "-------------------------------"

# Backend files
[ -f "backend/package.json" ] && check "package.json exists" || echo -e "${RED}✗${NC} package.json missing"
[ -f "backend/tsconfig.json" ] && check "tsconfig.json exists" || echo -e "${RED}✗${NC} tsconfig.json missing"
[ -f "backend/prisma/schema.prisma" ] && check "Prisma schema exists" || echo -e "${RED}✗${NC} Prisma schema missing"
[ -f "docker-compose.yml" ] && check "docker-compose.yml exists" || echo -e "${RED}✗${NC} docker-compose.yml missing"

# Check .env file
if [ -f "backend/.env" ]; then
  echo -e "${GREEN}✓${NC} .env file exists"
  ((PASSED++))
  
  # Check critical variables
  if grep -q "DATABASE_URL=" "backend/.env"; then
    check ".env has DATABASE_URL"
  else
    warn ".env missing DATABASE_URL"
  fi
  
  if grep -q "JWT_SECRET=" "backend/.env"; then
    check ".env has JWT_SECRET"
  else
    warn ".env missing JWT_SECRET"
  fi
else
  echo -e "${RED}✗${NC} .env file not found (copy from .env.example)"
  ((FAILED++))
fi

echo ""
echo "4. Checking Backend Dependencies"
echo "--------------------------------"

cd backend

if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules exists"
  ((PASSED++))
  
  # Check key packages
  if [ -d "node_modules/@nestjs/core" ]; then
    check "NestJS installed"
  fi
  
  if [ -d "node_modules/@prisma/client" ]; then
    check "Prisma client installed"
  fi
  
  if [ -d "node_modules/bcrypt" ]; then
    check "bcrypt installed"
  fi
else
  echo -e "${RED}✗${NC} node_modules not found (run: npm install)"
  ((FAILED++))
fi

cd ..

echo ""
echo "5. Checking Docker Services"
echo "---------------------------"

# Check if Docker is running
if docker info &> /dev/null; then
  echo -e "${GREEN}✓${NC} Docker daemon is running"
  ((PASSED++))
  
  # Check for running containers
  if docker ps | grep -q "commerce_postgres"; then
    echo -e "${GREEN}✓${NC} PostgreSQL container running"
    ((PASSED++))
  else
    warn "PostgreSQL container not running (run: docker-compose up -d)"
  fi
  
  if docker ps | grep -q "commerce_redis"; then
    echo -e "${GREEN}✓${NC} Redis container running"
    ((PASSED++))
  else
    warn "Redis container not running (run: docker-compose up -d)"
  fi
else
  warn "Docker daemon not running"
fi

echo ""
echo "6. Checking Database"
echo "-------------------"

# Check if Prisma client is generated
if [ -d "backend/node_modules/.prisma" ]; then
  check "Prisma client generated"
else
  warn "Prisma client not generated (run: npm run prisma:generate)"
fi

# Check for migrations
if [ -d "backend/prisma/migrations" ]; then
  MIGRATION_COUNT=$(ls -1 backend/prisma/migrations | wc -l)
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Database migrations exist ($MIGRATION_COUNT migrations)"
    ((PASSED++))
  else
    warn "No migrations found (run: npm run prisma:migrate)"
  fi
else
  warn "Migrations directory not found"
fi

echo ""
echo "7. Security Checks"
echo "------------------"

# Check for exposed secrets
if [ -f "backend/.env" ]; then
  if grep -q "change_me" "backend/.env"; then
    warn "Default passwords/secrets found in .env - CHANGE THEM!"
  else
    check "No default secrets in .env"
  fi
  
  # Check JWT secret length
  JWT_SECRET=$(grep "JWT_SECRET=" backend/.env | cut -d'=' -f2 | tr -d '"')
  JWT_LENGTH=${#JWT_SECRET}
  if [ "$JWT_LENGTH" -ge 32 ]; then
    check "JWT_SECRET is strong (${JWT_LENGTH} characters)"
  else
    warn "JWT_SECRET should be at least 32 characters (current: ${JWT_LENGTH})"
  fi
fi

# Check .gitignore
if grep -q ".env" ".gitignore"; then
  check ".env is gitignored"
else
  warn ".env should be in .gitignore"
fi

echo ""
echo "=================================================="
echo "Summary"
echo "=================================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Installation looks good! You're ready to start development.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Start the backend: cd backend && npm run start:dev"
  echo "2. Open API docs: http://localhost:3001/api/docs"
  echo "3. Start building Phase 1: Authentication module"
  exit 0
elif [ $FAILED -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Installation complete with warnings. Review the warnings above.${NC}"
  exit 0
else
  echo -e "${RED}❌ Installation has issues. Please fix the failed checks above.${NC}"
  exit 1
fi
