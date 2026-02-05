# 🚀 Quick Start Guide - Ghana Commerce Platform

## Prerequisites Installed?
- ✅ Node.js 20+
- ✅ Docker & Docker Compose
- ✅ Git

## Getting Started (5 Minutes)

### 1. Environment Setup
```bash
cd backend
cp .env.example .env
```

**Edit `.env` and set:**
```bash
# Required immediately:
DATABASE_URL="postgresql://commerce_user:your_password@localhost:5432/commerce_platform"
JWT_SECRET="generate-a-random-32-character-secret-key"
JWT_REFRESH_SECRET="generate-another-32-character-secret"

# Will need later (can use test keys for now):
PAYSTACK_SECRET_KEY="sk_test_..."
HUBTEL_CLIENT_ID="..."
AWS_ACCESS_KEY_ID="..."
```

### 2. Start Database with Docker
```bash
cd ..
docker-compose up postgres redis -d
```

This starts PostgreSQL and Redis in the background.

### 3. Install & Setup Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start Backend
```bash
npm run start:dev
```

✅ Backend running at: http://localhost:3001  
📚 API Docs at: http://localhost:3001/api/docs

### 5. Test the API
```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"ok"}
```

---

## Default Test Accounts (Development Only)

### Admin Account
- **Email**: `admin@commercegh.com`
- **Password**: `Admin123!@#`
- **Role**: Admin (full system access)

### Test Merchant Account
- **Email**: `merchant@test.com`
- **Password**: `Merchant123!`
- **Role**: Merchant
- **Store**: "ElegantWear Ghana" (Fashion)

---

## Common Commands

### Development
```bash
npm run start:dev          # Start with hot reload
npm run prisma:studio      # Open database GUI
npm run lint               # Check code quality
npm run format             # Format code
```

### Database
```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed test data
npm run prisma:studio      # Visual database editor
```

### Testing
```bash
npm run test               # Unit tests
npm run test:e2e           # End-to-end tests
npm run test:cov           # Coverage report
```

### Docker (Recommended)
```bash
# Start everything
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

---

## Project Structure

```
Native Local Ecommerce/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── common/         # Shared utilities
│   │   ├── modules/        # Feature modules (Auth, Merchants, etc.)
│   │   ├── app.module.ts   # Root module
│   │   └── main.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── .env                # Your secrets (never commit!)
│   └── package.json
├── frontend/                # Next.js (Phase 4)
├── docs/                    # Technical documentation
├── docker-compose.yml       # Container orchestration
└── README.md
```

---

## Troubleshooting

### "Database connection failed"
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check connection string in .env
# Format: postgresql://user:password@host:port/database
```

### "Port 3001 already in use"
```bash
# Find process using port
lsof -ti:3001

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=3002
```

### "Prisma client not generated"
```bash
cd backend
rm -rf node_modules/.prisma
npm run prisma:generate
```

### "Migration failed"
```bash
# Reset database (DEVELOPMENT ONLY)
npm run prisma:migrate reset

# This will:
# 1. Drop database
# 2. Recreate it
# 3. Run all migrations
# 4. Run seed
```

---

## Next Steps

✅ **Phase 0 Complete**: Foundation & Security Infrastructure  

**Now ready for Phase 1: Authentication & User Management**

### What's Next?
1. Implement user registration
2. Add OTP verification (Hubtel)
3. Build login/logout flows
4. Add password reset
5. Implement session management

---

## Need Help?

### Check the Docs
- Technical docs: `docs/TECHNICAL_DOCS.md`
- Backend README: `backend/README.md`
- System specification: Project root (original prompt)

### Common Resources
- NestJS docs: https://docs.nestjs.com
- Prisma docs: https://www.prisma.io/docs
- Paystack API: https://paystack.com/docs
- Hubtel API: https://developers.hubtel.com

---

## Security Reminders

⚠️ **NEVER commit these files:**
- `.env`
- `*.log`
- AWS credentials
- Paystack production keys

✅ **Always use:**
- Strong passwords (12+ characters)
- Environment variables for secrets
- HTTPS in production
- Rate limiting on public endpoints

---

**Status**: Phase 0 Complete ✅  
**Last Updated**: 2026-02-04  
**Next Phase**: Authentication & User Management
