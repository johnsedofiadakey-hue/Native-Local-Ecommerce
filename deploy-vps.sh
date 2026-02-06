#!/bin/bash
# DigitalOcean VPS Deployment Script
# Ghana-First Multi-Merchant Commerce Platform

set -e

echo "🇬🇭 Deploying Ghana Commerce Platform to VPS..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL 16
echo "📦 Installing PostgreSQL 16..."
apt install -y postgresql postgresql-contrib

# Install Redis
echo "📦 Installing Redis..."
apt install -y redis-server

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Create application user
echo "👤 Creating application user..."
useradd -m -s /bin/bash commerce || true
mkdir -p /home/commerce/app
chown -R commerce:commerce /home/commerce

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER commerce_user WITH PASSWORD 'SecurePassword123!';" || true
sudo -u postgres psql -c "CREATE DATABASE commerce_platform OWNER commerce_user;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE commerce_platform TO commerce_user;" || true

# Configure PostgreSQL to accept connections
echo "host    commerce_platform    commerce_user    127.0.0.1/32    md5" >> /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

# Start Redis
echo "📦 Starting Redis..."
systemctl enable redis-server
systemctl start redis-server

# Clone repository
echo "📥 Cloning repository..."
cd /home/commerce
rm -rf app
sudo -u commerce git clone https://github.com/johnsedofiadakey-hue/Native-Local-Ecommerce.git app
cd app/backend

# Install dependencies
echo "📦 Installing dependencies..."
sudo -u commerce npm install

# Create environment file
echo "⚙️ Creating environment file..."
cat > .env << EOF
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://commerce_user:SecurePassword123!@localhost:5432/commerce_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# SMS (Hubtel - Ghana)
SMS_ENABLED=false
SMS_SENDER_ID=CommerceGH
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret

# Paystack (Ghana Payments)
PAYSTACK_SECRET_KEY=sk_test_placeholder
PAYSTACK_PUBLIC_KEY=pk_test_placeholder

# CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Throttling
THROTTLE_TTL=60
THROTTLE_LIMIT=100
EOF

chown commerce:commerce .env

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
sudo -u commerce npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
sudo -u commerce npx prisma migrate deploy

# Build application
echo "🔨 Building application..."
sudo -u commerce npm run build

# Setup PM2
echo "🔧 Setting up PM2..."
sudo -u commerce pm2 delete commerce-backend || true
sudo -u commerce pm2 start npm --name "commerce-backend" -- run start:prod
sudo -u commerce pm2 save

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u commerce --hp /home/commerce

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/commerce << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/commerce /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ Deployment complete!"
echo ""
echo "🎉 Your Ghana Commerce Platform is now running!"
echo ""
echo "📍 Access your API at: http://YOUR_SERVER_IP"
echo "🔍 Health check: http://YOUR_SERVER_IP/api/v1/health"
echo "📚 API Docs: http://YOUR_SERVER_IP/api/v1/products/browse"
echo ""
echo "📊 Manage with PM2:"
echo "  pm2 status"
echo "  pm2 logs commerce-backend"
echo "  pm2 restart commerce-backend"
echo ""
echo "🔐 Next steps:"
echo "1. Update Hubtel credentials in /home/commerce/app/backend/.env"
echo "2. Update Paystack credentials in /home/commerce/app/backend/.env"
echo "3. Setup SSL certificate with: certbot --nginx"
echo "4. Create admin user in database"
echo ""
echo "🇬🇭 Platform ready for Ghana! 🚀"
