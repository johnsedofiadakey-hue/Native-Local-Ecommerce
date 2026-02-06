# Security Checklist for Ghana Commerce Platform
# Run before going to production

echo "🔒 Ghana Commerce Platform - Security Audit"
echo "=========================================="
echo ""

# Check SSL/HTTPS
echo "1. SSL Certificate:"
if command -v certbot &> /dev/null; then
    echo "✅ Certbot installed"
    certbot certificates 2>/dev/null || echo "⚠️  No certificates found - run: certbot --nginx"
else
    echo "❌ Certbot not installed - run: apt install certbot python3-certbot-nginx"
fi
echo ""

# Check firewall
echo "2. Firewall (UFW):"
if command -v ufw &> /dev/null; then
    ufw status | grep "Status: active" && echo "✅ Firewall active" || echo "❌ Firewall inactive - run: ufw enable"
else
    echo "⚠️  UFW not installed"
fi
echo ""

# Check environment variables
echo "3. Environment Variables:"
cd /home/commerce/app/backend 2>/dev/null || cd backend
if [ -f .env ]; then
    echo "✅ .env file exists"
    grep -q "sk_test" .env && echo "⚠️  Using TEST Paystack key - update to LIVE key"
    grep -q "SecurePassword" .env && echo "⚠️  Using default database password - change it!"
    grep -q "SMS_ENABLED=true" .env && echo "✅ SMS enabled" || echo "⚠️  SMS disabled"
else
    echo "❌ .env file missing!"
fi
echo ""

# Check database backups
echo "4. Database Backups:"
if [ -d "/var/backups/postgresql" ]; then
    echo "✅ Backup directory exists"
    ls -lh /var/backups/postgresql/*.sql 2>/dev/null | tail -3
else
    echo "❌ No backup directory - set up automated backups!"
fi
echo ""

# Check rate limiting
echo "5. Rate Limiting:"
grep -r "THROTTLE_LIMIT" .env 2>/dev/null && echo "✅ Rate limiting configured" || echo "⚠️  Rate limiting not set"
echo ""

# Check logging
echo "6. Application Logs:"
if command -v pm2 &> /dev/null; then
    pm2 list | grep "commerce-backend" && echo "✅ PM2 running" || echo "❌ PM2 not running"
else
    echo "⚠️  PM2 not installed"
fi
echo ""

# Check Redis
echo "7. Redis Cache:"
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis running"
else
    echo "❌ Redis not running"
fi
echo ""

# Check PostgreSQL
echo "8. PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL running"
    sudo -u postgres psql -c "SELECT version();" 2>/dev/null | grep PostgreSQL && echo "✅ Database accessible"
else
    echo "❌ PostgreSQL not running"
fi
echo ""

# Security recommendations
echo "=========================================="
echo "📋 SECURITY RECOMMENDATIONS:"
echo "=========================================="
echo ""
echo "HIGH PRIORITY:"
echo "  1. Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo "  2. Change database password in .env"
echo "  3. Update Paystack to LIVE keys"
echo "  4. Enable Hubtel SMS with production credentials"
echo "  5. Setup automated database backups"
echo ""
echo "MEDIUM PRIORITY:"
echo "  6. Enable 2FA for admin accounts"
echo "  7. Set up monitoring (Sentry/LogRocket)"
echo "  8. Configure log rotation"
echo "  9. Review CORS_ORIGIN setting"
echo "  10. Set up fail2ban for brute force protection"
echo ""
echo "ONGOING:"
echo "  11. Monitor pm2 logs: pm2 logs commerce-backend"
echo "  12. Review audit logs regularly"
echo "  13. Keep system updated: apt update && apt upgrade"
echo "  14. Monitor disk space: df -h"
echo ""
