# Deploy to Render - Quick Guide

## 🚀 Your Code is Ready!

GitHub Repository: **https://github.com/johnsedofiadakey-hue/Native-Local-Ecommerce**

---

## Deploy Steps (5 Minutes)

### 1. Go to Render
Visit: **https://render.com** and sign up/login with GitHub

### 2. Create New Web Service
- Click **"New +"** → **"Web Service"**
- Connect GitHub account if not already connected
- Select repository: **`johnsedofiadakey-hue/Native-Local-Ecommerce`**
- Click **"Connect"**

### 3. Configure Service

**Basic Settings:**
- **Name**: `commerce-backend`
- **Region**: `Oregon (US West)` (or closest to Ghana)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: 
  ```
  npm install && npx prisma generate && npm run build
  ```
- **Start Command**: 
  ```
  npx prisma migrate deploy && npm run start:prod
  ```

**Instance Type:**
- Select **Free** tier for testing

### 4. Create PostgreSQL Database
Before deploying the web service:
- Click **"New +"** → **"PostgreSQL"**
- **Name**: `commerce-db`
- **Region**: Same as web service
- **Plan**: **Free** tier
- Click **"Create Database"**

### 5. Connect Database to Web Service
In your web service settings:
- Go to **"Environment"** tab
- Add environment variable:
  - **Key**: `DATABASE_URL`
  - **Value**: Click "Add from Database" → Select `commerce-db` → Select `Internal Database URL`

### 6. Add Other Environment Variables

Add these one by one:

```
NODE_ENV=production
PORT=3001

# JWT (click "Generate Value" for each)
JWT_SECRET=<click Generate>
JWT_REFRESH_SECRET=<click Generate>

# SMS (Hubtel - Ghana)
SMS_ENABLED=false
SMS_SENDER_ID=CommerceGH
HUBTEL_CLIENT_ID=your_hubtel_client_id_here
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret_here

# Paystack (Ghana Payments)
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here

# CORS (optional)
CORS_ORIGIN=*
CORS_CREDENTIALS=true
```

### 7. Deploy!
- Click **"Create Web Service"**
- Wait 3-5 minutes for deployment
- You'll get a URL like: `https://commerce-backend.onrender.com`

---

## ✅ Test Deployment

Once deployed, test with:

```bash
# Health check
curl https://your-app.onrender.com/api/v1/health

# Browse products (public endpoint)
curl https://your-app.onrender.com/api/v1/products/browse

# Admin login
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@commercegh.com","password":"Admin123!"}'
```

---

## 🔧 Post-Deployment Setup

### 1. Create Admin User
Connect to database via Render dashboard and run:

```sql
INSERT INTO users (id, email, phone, "passwordHash", role)
VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  '+233240000000',
  -- Generate hash: bcrypt.hash('YourSecurePassword', 10)
  '$2b$10$...',
  'ADMIN'
);
```

### 2. Update Production Credentials
When ready for production:
- Get Hubtel credentials: https://sms.hubtel.com
- Get Paystack keys: https://paystack.com
- Update environment variables in Render
- Set `SMS_ENABLED=true`

### 3. Custom Domain (Optional)
In Render dashboard:
- Go to **Settings** → **Custom Domain**
- Add your domain (e.g., `api.commercegh.com`)
- Update DNS records as instructed

---

## 📊 Monitoring

**Render Dashboard:**
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment history

**Key Logs to Watch:**
- Database connection errors
- Prisma migration status
- SMS/Payment API errors

---

## 🆓 Free Tier Limits

**PostgreSQL:**
- 1GB storage
- 100 max connections
- Expires after 90 days (upgrade to keep)

**Web Service:**
- Spins down after 15 min inactivity
- First request takes ~30s (cold start)
- 750 hours/month free

**Upgrade for Production:**
- Web Service: $7/month (always on)
- PostgreSQL: $7/month (persistent)

---

## 🎉 You're Live!

Your Ghana-First Multi-Merchant Commerce Platform is now deployed and accessible worldwide!

**Next Steps:**
1. Test all endpoints with Postman/Bruno
2. Create admin user
3. Onboard first test merchant
4. Configure Hubtel & Paystack
5. Start accepting orders! 🇬🇭

---

**Need Help?**
- Render Docs: https://render.com/docs
- Platform Repo: https://github.com/johnsedofiadakey-hue/Native-Local-Ecommerce
