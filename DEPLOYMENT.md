# Ghana-First Multi-Merchant Commerce Platform
## Deployment Guide

## Current Status: ✅ Tested & Ready for Deployment

All 10 phases completed and tested locally. Platform is production-ready.

---

## Deployment Options

### Option 1: Railway (Recommended - Easiest)
**Cost**: ~$5-10/month
**Best for**: MVP, quick deployment, PostgreSQL included

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Deploy
railway up
```

**Environment Variables to Set**:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=(auto-set by Railway)

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Hubtel SMS (Ghana)
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
SMS_SENDER_ID=CommerceGH
SMS_ENABLED=true

# Paystack (Ghana)
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

# Redis (optional - Railway addon)
REDIS_URL=(Railway addon or external)
```

---

### Option 2: Render
**Cost**: Free tier available, $7/month for paid
**Best for**: Free testing, PostgreSQL included

1. Connect GitHub repo to Render
2. Select "Web Service"
3. Build Command: `npm install && npx prisma generate && npm run build`
4. Start Command: `npm run start:prod`
5. Add PostgreSQL database (free 90 days)
6. Set environment variables (same as above)

**Database Migration**:
```bash
# After deployment, run migrations
npm run migrate:deploy
```

---

### Option 3: DigitalOcean App Platform
**Cost**: $5/month app + $15/month database
**Best for**: Scalability, Ghana region (Frankfurt closest)

1. Connect GitHub repo
2. Select Node.js
3. Add PostgreSQL cluster
4. Set environment variables
5. Deploy

---

### Option 4: AWS (Most Scalable)
**Cost**: Variable, ~$20-50/month
**Best for**: Enterprise, full control

**Services Needed**:
- EC2/ECS for backend
- RDS PostgreSQL
- ElastiCache Redis (optional)
- S3 for file uploads (Ghana Card, product images)
- CloudFront CDN
- Route 53 for DNS

---

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secrets (32+ chars)
- [ ] Configure Hubtel credentials (Ghana SMS)
- [ ] Configure Paystack credentials (Ghana payments)
- [ ] Set up Redis (for sessions/cache)
- [ ] Configure CORS origins

### 2. Database
- [ ] Run all Prisma migrations: `npx prisma migrate deploy`
- [ ] Create admin user
- [ ] Seed initial data (categories, etc.)

### 3. Security
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS policy
- [ ] Configure rate limiting
- [ ] Enable helmet security headers
- [ ] Set up monitoring (Sentry/LogRocket)

### 4. Ghana-Specific Setup
- [ ] Register Hubtel account (sms.hubtel.com)
- [ ] Set up Paystack merchant account (paystack.com)
- [ ] Verify SMS sender ID with NCA (if needed)
- [ ] Test Ghana phone number formatting (233...)

### 5. Testing in Production
- [ ] Test universal order tracking
- [ ] Test SMS notifications
- [ ] Test Paystack payments
- [ ] Test merchant onboarding
- [ ] Test Ghana Card verification flow

---

## Quick Deploy to Railway (5 Minutes)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. In backend directory
cd backend
railway login
railway init

# 3. Add PostgreSQL
railway add postgresql

# 4. Link to Railway project
railway link

# 5. Set environment variables
railway variables set JWT_SECRET="your-32-char-secret-here"
railway variables set JWT_REFRESH_SECRET="your-32-char-refresh-secret"
railway variables set HUBTEL_CLIENT_ID="your_hubtel_id"
railway variables set HUBTEL_CLIENT_SECRET="your_hubtel_secret"
railway variables set PAYSTACK_SECRET_KEY="sk_test_your_key"
railway variables set SMS_ENABLED="true"

# 6. Deploy
railway up

# 7. Run migrations
railway run npx prisma migrate deploy

# 8. Get deployment URL
railway status
```

**Your API will be live at**: `https://your-app.railway.app`

---

## Post-Deployment Tasks

### 1. Create Admin User
```bash
# Connect to production database
railway connect postgresql

# Run SQL
INSERT INTO users (id, email, phone, "passwordHash", role)
VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  '+233240000000',
  '$2b$10$...',  -- Use bcrypt to hash password
  'ADMIN'
);
```

### 2. Test Critical Flows
```bash
# Test order creation (no login)
curl -X POST https://your-app.railway.app/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"storeId":"...","customerName":"Test","customerPhone":"0244567890",...}'

# Test universal tracking
curl https://your-app.railway.app/api/v1/orders/track/ORD-12345678901

# Test SMS notification
curl -X POST https://your-app.railway.app/api/v1/notifications/sms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"to":"0244567890","message":"Test from production"}'
```

### 3. Monitor Logs
```bash
railway logs
```

---

## Domain Setup

### Option A: Custom Domain (commercegh.com)
1. Buy domain from Namecheap/GoDaddy
2. Add to Railway: `railway domain add commercegh.com`
3. Update DNS records:
   - Add CNAME: `api.commercegh.com` → Railway URL
   - Add CNAME: `www.commercegh.com` → Railway URL

### Option B: Ghana-Specific Domain (.com.gh)
1. Register through Ghana Dot Com: https://www.ghanadotcom.com/
2. Follow same DNS setup as above

---

## Scaling Considerations

### When to Scale
- **100+ orders/day**: Upgrade database to 2GB+ RAM
- **1000+ orders/day**: Add Redis caching, load balancer
- **10,000+ orders/day**: Move to Kubernetes, separate microservices

### Performance Optimizations
```typescript
// Enable database connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"

// Enable Redis caching
REDIS_ENABLED=true
CACHE_TTL=300
```

---

## Cost Estimates (Monthly)

### MVP Launch (0-1000 orders/month)
- **Railway**: $5 (app) + $5 (PostgreSQL) = **$10/month**
- **Hubtel SMS**: GHS 0.12/SMS (~$2-10/month)
- **Paystack**: Free (2.9% + GHS 0.30 per transaction)
- **Total**: ~**$15-25/month**

### Growth (1000-10,000 orders/month)
- **Railway Pro**: $20 (app) + $15 (PostgreSQL) = **$35/month**
- **Redis**: $10/month
- **SMS**: ~$50-100/month
- **Total**: ~**$100-150/month**

### Scale (10,000+ orders/month)
- **AWS/DigitalOcean**: $200-500/month
- **Managed PostgreSQL**: $50-100/month
- **Redis**: $20/month
- **SMS**: $200-500/month
- **Total**: ~**$500-1000/month**

---

## Support & Maintenance

### Monitoring
- Set up Sentry for error tracking
- Configure LogRocket for user sessions
- Enable Railway metrics dashboard

### Backups
```bash
# Automatic daily backups (Railway Pro)
railway backups enable

# Manual backup
railway db backup create
```

### Updates
```bash
# Deploy new version
git push origin main
railway up

# Rollback if needed
railway rollback
```

---

## Ghana-Specific Compliance

### 1. Data Protection
- Comply with Ghana Data Protection Act (Act 843)
- Implement user consent for data collection
- Provide data deletion on request

### 2. NCA SMS Requirements
- Register SMS sender ID with NCA if sending >1000 SMS/day
- Include opt-out mechanism in SMS
- Follow Ghana spam regulations

### 3. Payment Compliance
- Paystack handles PCI compliance
- Keep merchant Paystack accounts isolated
- Enable 2FA for admin accounts

---

## Next Steps

1. ✅ **Local testing complete** - All features working
2. 🚀 **Choose deployment platform** - Railway recommended for MVP
3. 📝 **Register Hubtel account** - For SMS in Ghana
4. 💳 **Set up Paystack** - For merchant payments
5. 🌍 **Deploy to production** - Follow Railway guide above
6. 📱 **Test with real users** - Start with pilot merchants
7. 📈 **Monitor & scale** - Based on usage metrics

**Platform is ready for production deployment!** 🇬🇭🚀
