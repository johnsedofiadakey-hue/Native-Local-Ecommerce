# GHANA COMMERCE PLATFORM - TECHNICAL DOCUMENTATION

## System Overview

A trust-backed, multi-merchant commerce operating system designed specifically for Ghanaian e-commerce, featuring direct-to-merchant payments, universal order tracking, and strict accountability mechanisms.

---

## PHASE 0 COMPLETION CHECKLIST ✅

### Foundation & Control
- [x] Project structure (monorepo with backend/frontend separation)
- [x] Environment configuration (dev/staging/production)
- [x] Docker containerization (multi-stage builds)
- [x] Database setup (PostgreSQL with Prisma ORM)
- [x] Redis configuration (for rate limiting & caching)

### Security Infrastructure
- [x] Authentication framework (JWT-based)
- [x] Role-based access control (RBAC guards)
- [x] Rate limiting (global + endpoint-specific)
- [x] API input validation (class-validator)
- [x] Centralized error handling (exception filters)
- [x] Audit logging foundation (immutable logs)
- [x] Security middleware (Helmet, CORS)

### Database Schema
- [x] Complete Prisma schema with all entities:
  - Users & Authentication
  - Merchants & Verification
  - Stores & Products
  - Orders & Tracking
  - Payments (Paystack)
  - Subscriptions & Billing
  - Disputes & Enforcement
  - Audit Logs
  - System Configuration

### Core Services
- [x] PrismaService (database connection)
- [x] LoggerService (structured logging)
- [x] AuditService (immutable audit trails)

### Utilities
- [x] Helper functions (order numbers, phone formatting, trust scores)
- [x] System constants (validation patterns, error messages)
- [x] Base DTOs (pagination, validation)

---

## NEXT STEPS: PHASE 1 - AUTHENTICATION & USER MANAGEMENT

### Objectives
Implement secure authentication and user management before any business logic.

### Implementation Tasks

#### 1. Auth Module Structure
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── verify-otp.dto.ts
│   └── reset-password.dto.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
└── guards/
    ├── jwt-auth.guard.ts
    └── local-auth.guard.ts
```

#### 2. Key Features to Implement
- [ ] User registration (email + phone)
- [ ] OTP generation and verification (Hubtel integration)
- [ ] Email verification
- [ ] Secure login (JWT + refresh tokens)
- [ ] Password reset flow
- [ ] Session management (device tracking)
- [ ] Account lockout (brute force protection)
- [ ] Multi-factor authentication (OTP-based)

#### 3. Security Requirements
- [ ] Password hashing (bcrypt, salt rounds: 12)
- [ ] JWT token expiration (7 days access, 30 days refresh)
- [ ] Rate limiting on auth endpoints:
  - Login: 5 attempts/minute
  - OTP request: 3 attempts/minute
  - Password reset: 3 attempts/5 minutes
- [ ] Failed login tracking (lock after 5 attempts)
- [ ] IP & device fingerprinting
- [ ] Session invalidation on logout

#### 4. Hubtel SMS Integration
```typescript
// Required for OTP delivery
- Send OTP via Hubtel SMS API
- Verify phone numbers
- Handle SMS delivery failures
- Implement retry logic
```

#### 5. Database Migrations Needed
- OTP verification table (already in schema)
- Session management table (already in schema)
- Audit logs for auth events (already in schema)

---

## TECHNICAL DECISIONS LOG

### Architecture Decisions
1. **Multi-tenant with shared database**: Single PostgreSQL instance with merchant isolation via foreign keys
2. **JWT over sessions**: Stateless authentication for horizontal scaling
3. **Prisma over TypeORM**: Better TypeScript support, type-safe queries
4. **NestJS over Express**: Built-in structure, DI, and enterprise patterns

### Security Decisions
1. **Direct-to-merchant payments**: Platform never holds funds, reducing PCI compliance scope
2. **Webhook signature verification**: All Paystack webhooks must be cryptographically verified
3. **Immutable audit logs**: No deletion or modification of audit entries
4. **Admin override logging**: Every admin action is tracked with reason

### Business Logic Decisions
1. **No anonymous customers**: Phone number required for order tracking
2. **Mandatory order status updates**: Merchants must update or face penalties
3. **Grace periods over instant suspension**: Give merchants time to resolve issues
4. **Trust scores**: Calculated from completion rate, cancellations, disputes

---

## DEPLOYMENT CHECKLIST (PRODUCTION)

### Pre-deployment
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Use production Paystack keys
- [ ] Configure production database (RDS)
- [ ] Set up Redis cluster (ElastiCache)
- [ ] Configure S3 buckets with proper IAM
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up CloudWatch logging
- [ ] Configure auto-scaling groups
- [ ] Enable database backups (daily)
- [ ] Set up monitoring alerts
- [ ] Configure CDN (CloudFront)

### Post-deployment
- [ ] Verify health check endpoint
- [ ] Test payment webhook reception
- [ ] Verify SMS delivery (Hubtel)
- [ ] Test file uploads (S3)
- [ ] Verify audit logging
- [ ] Check rate limiting
- [ ] Load test API endpoints
- [ ] Verify CORS settings

---

## API DOCUMENTATION STRUCTURE

### Base URL
- Development: `http://localhost:3001/api/v1`
- Production: `https://api.commercegh.com/api/v1`

### Authentication Endpoints
```
POST   /auth/register          - Register new user
POST   /auth/login             - Login with credentials
POST   /auth/logout            - Logout current session
POST   /auth/refresh           - Refresh JWT token
POST   /auth/request-otp       - Request OTP code
POST   /auth/verify-otp        - Verify OTP code
POST   /auth/verify-email      - Verify email address
POST   /auth/forgot-password   - Initiate password reset
POST   /auth/reset-password    - Reset password with token
GET    /auth/me                - Get current user info
```

### Merchant Endpoints (Phase 2)
```
POST   /merchants/onboard      - Start onboarding
PUT    /merchants/profile      - Update merchant profile
POST   /merchants/verify       - Submit verification docs
GET    /merchants/status       - Get verification status
```

### Store Endpoints (Phase 4)
```
POST   /stores                 - Create store
GET    /stores/:slug           - Get store by slug
PUT    /stores/:id             - Update store
POST   /stores/:id/publish     - Publish store
```

### Order Endpoints (Phase 6)
```
POST   /orders                 - Create order
GET    /orders/:orderNumber    - Track order
PUT    /orders/:id/status      - Update order status
GET    /orders                 - List orders (merchant)
```

### Payment Endpoints (Phase 3)
```
POST   /payments/initialize    - Initialize Paystack payment
POST   /payments/webhook       - Paystack webhook handler
GET    /payments/:ref/verify   - Verify payment status
```

---

## ERROR HANDLING STRATEGY

### Error Response Format
```json
{
  "statusCode": 400,
  "timestamp": "2026-02-04T12:00:00.000Z",
  "path": "/api/v1/auth/login",
  "method": "POST",
  "message": "Invalid credentials",
  "errors": {
    "email": "User not found"
  }
}
```

### HTTP Status Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `422 Unprocessable Entity` - Business logic error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## TESTING STRATEGY

### Unit Tests
- Service methods (business logic)
- Helper functions
- DTOs and validation

### Integration Tests
- API endpoints
- Database operations
- External service integrations

### E2E Tests
- Complete user flows
- Order lifecycle
- Payment verification
- Dispute resolution

---

## MONITORING & OBSERVABILITY

### Metrics to Track
- API response times (p50, p95, p99)
- Error rates by endpoint
- Payment success rate
- Order completion rate
- Active merchant count
- Daily/monthly order volume

### Alerts to Configure
- Error rate spike (> 5%)
- Payment failure rate (> 10%)
- Database connection failures
- High CPU/memory usage
- Disk space warnings
- SSL certificate expiration

---

## DEVELOPMENT WORKFLOW

### Branch Strategy
- `main` - Production-ready code
- `staging` - Pre-production testing
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Message Format
```
type(scope): subject

body (optional)

BREAKING CHANGE: description (if applicable)
```

Types: feat, fix, docs, style, refactor, test, chore

### Code Review Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] No hardcoded secrets
- [ ] Error handling implemented
- [ ] Audit logging added (if applicable)
- [ ] Performance considered

---

## SUPPORT & MAINTENANCE

### Regular Tasks
- Daily: Monitor error logs
- Weekly: Review audit logs for anomalies
- Monthly: Security updates
- Quarterly: Performance optimization review

### Backup Strategy
- Database: Daily automated backups (30-day retention)
- File storage (S3): Versioning enabled
- Audit logs: Archived monthly to Glacier

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-04  
**Status**: Phase 0 Complete, Phase 1 Ready
