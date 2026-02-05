# Ghana Commerce Platform - Backend API

Production-grade NestJS backend for multi-merchant commerce platform with direct-to-merchant payments and universal order tracking.

## Architecture

### Core Principles
- **Security First**: RBAC, rate limiting, audit logging, webhook verification
- **Multi-tenant**: Complete data isolation per merchant
- **API-First**: RESTful design with OpenAPI documentation
- **Scalable**: Stateless services, horizontal scaling ready
- **Accountable**: Immutable audit logs for all critical operations

### Technology Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL 14+
- **Cache/Queue**: Redis (for rate limiting & background jobs)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Seed data
├── src/
│   ├── common/               # Shared utilities
│   │   ├── constants/        # System-wide constants
│   │   ├── decorators/       # Custom decorators
│   │   ├── dto/              # Base DTOs
│   │   ├── filters/          # Exception filters
│   │   ├── guards/           # Auth & RBAC guards
│   │   ├── interceptors/     # Logging & transformation
│   │   ├── services/         # Core services (Prisma, Logger, Audit)
│   │   └── utils/            # Helper functions
│   ├── modules/              # Feature modules
│   │   ├── auth/             # Authentication
│   │   ├── merchants/        # Merchant management
│   │   ├── stores/           # Store management
│   │   ├── products/         # Product & inventory
│   │   ├── orders/           # Order processing
│   │   ├── payments/         # Paystack integration
│   │   ├── subscriptions/    # Billing
│   │   ├── disputes/         # Dispute resolution
│   │   └── admin/            # Admin controls
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application entry point
├── test/                     # E2E tests
├── logs/                     # Application logs
├── .env.example              # Environment template
├── Dockerfile                # Multi-stage Docker build
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Paystack account
- Hubtel account (for SMS)
- AWS account (for S3)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials
# Edit DATABASE_URL, PAYSTACK keys, HUBTEL keys, AWS keys, etc.
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed

# Open Prisma Studio to view data
npm run prisma:studio
```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

### Docker Development

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

## API Documentation

When running in development mode, Swagger documentation is available at:

```
http://localhost:3001/api/docs
```

## Security

### Authentication
- JWT-based authentication
- Refresh token rotation
- Session management with device tracking
- OTP verification for critical actions

### Rate Limiting
- Global: 100 requests/minute
- Auth endpoints: 5 requests/minute
- Payment endpoints: 5 requests/minute
- Configurable per endpoint

### Audit Logging
All critical operations are logged immutably:
- User authentication
- Payment transactions
- Merchant verification
- Admin overrides
- Enforcement actions

### RBAC (Role-Based Access Control)
- **ADMIN**: Full system access, overrides
- **MERCHANT**: Store & order management
- **CUSTOMER**: Order placement & tracking
- **SUPPORT**: Dispute resolution

## Environment Variables

See `.env.example` for full configuration options.

### Critical Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/commerce"

# Security
JWT_SECRET="your-super-secret-key"
BCRYPT_SALT_ROUNDS=12

# Paystack (PRODUCTION KEYS IN PRODUCTION ONLY)
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_WEBHOOK_SECRET="..."

# Hubtel
HUBTEL_CLIENT_ID="..."
HUBTEL_CLIENT_SECRET="..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="ghana-commerce-uploads"
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## Deployment

### AWS Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure ALB/CloudFront
- [ ] Set strong JWT secrets
- [ ] Use production Paystack keys
- [ ] Enable CloudWatch logging
- [ ] Configure auto-scaling
- [ ] Set up database backups
- [ ] Configure Redis cluster

### Environment-specific Builds
```bash
# Production build
NODE_ENV=production npm run build

# Deploy with Docker
docker build -t commerce-backend --target production .
docker run -p 3001:3001 commerce-backend
```

## Monitoring

### Logs
- Application logs: `./logs/YYYY-MM-DD.log`
- Audit logs: `./logs/audit-YYYY-MM-DD.log`
- Error logs: Console + file

### Health Check
```bash
GET /health
```

### Metrics (Future)
- Order volume
- Payment success rate
- API response times
- Error rates

## Common Issues

### Migration Errors
```bash
# Reset Prisma client
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL format
- Check firewall/security groups

### Rate Limiting
- Adjust THROTTLE_LIMIT in .env
- Use X-Forwarded-For for proxy setups

## Support

For technical issues or questions:
- Email: dev@commercegh.com
- Docs: [Link to internal docs]

---

**Security Notice**: This system handles financial transactions and personal data. Follow all security protocols. Never commit secrets to version control.
