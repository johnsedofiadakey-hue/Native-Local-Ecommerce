# Ghana-First Multi-Merchant Commerce Platform

A trust-backed commerce operating system enabling Ghanaian sellers to turn social traffic into real orders through independent, verified online shops.

## System Architecture

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 (App Router, SSR)
- **Payments**: Paystack (direct-to-merchant)
- **SMS**: Hubtel
- **Deployment**: AWS + Docker
- **Security**: Production-grade (RBAC, rate limiting, audit logging)

## Core Principles

1. Platform does NOT hold merchant funds
2. Payments go directly to merchant Paystack accounts
3. Platform enforces behavior, not money control
4. Every order must be trackable
5. Every merchant must be identifiable
6. Admin has absolute override authority

## Project Structure

```
/backend          - NestJS API
/frontend         - Next.js storefront & admin
/shared           - Shared types & utilities
/infrastructure   - Docker, AWS configs
/docs             - Technical documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- AWS CLI configured
- Paystack account
- Hubtel account

### Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run database migrations
cd backend && npx prisma migrate dev

# Start development
docker-compose up
```

## Development Phases

- [x] Phase 0: Foundation & Control
- [ ] Phase 1: Authentication & User Management
- [ ] Phase 2: Merchant Onboarding & Verification
- [ ] Phase 3: Paystack Integration
- [ ] Phase 4: Storefront Engine
- [ ] Phase 5: Product & Inventory Management
- [ ] Phase 6: Universal Order & Tracking System
- [ ] Phase 7: Delivery Management
- [ ] Phase 8: Subscription & Billing Engine
- [ ] Phase 9: Disputes & Enforcement System
- [ ] Phase 10: Admin Control Panel

## Security

This system handles money and identity. All security requirements are non-negotiable:

- RBAC everywhere
- Strict API validation
- Rate limiting
- Webhook signature verification
- Encrypted sensitive data
- Immutable audit logs
- IP/device tracking
- Admin action logging

## License

Proprietary - All Rights Reserved
