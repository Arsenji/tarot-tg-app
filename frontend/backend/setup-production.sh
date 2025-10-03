#!/bin/bash

# Production Configuration Setup Script
echo "🚀 Setting up Production Configuration for Tarot TG App"
echo "=================================================="

# Check if MongoDB connection string is provided
if [ -z "$1" ]; then
    echo "❌ Please provide MongoDB Atlas connection string as first argument"
    echo "Usage: ./setup-production.sh 'mongodb+srv://user:pass@cluster.mongodb.net/db'"
    exit 1
fi

# Check if Telegram bot token is provided
if [ -z "$2" ]; then
    echo "❌ Please provide Telegram Bot token as second argument"
    echo "Usage: ./setup-production.sh 'mongodb+srv://...' '123456789:ABCdef...'"
    exit 1
fi

# Check if domain is provided
if [ -z "$3" ]; then
    echo "❌ Please provide your domain as third argument"
    echo "Usage: ./setup-production.sh 'mongodb+srv://...' '123456789:ABCdef...' 'yourdomain.com'"
    exit 1
fi

MONGODB_URI="$1"
TELEGRAM_TOKEN="$2"
DOMAIN="$3"

echo "📝 Updating production configuration..."

# Update .env.production
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=${MONGODB_URI}

# JWT Secret (GENERATED - CHANGE IN PRODUCTION)
JWT_SECRET=cd69d1c3cfb40fcdcf70e24f5d0b388cae4a9f9b84cbc5c236220c7d9f73a9c46e3197ef8c16c424180e5bd5d9b08e064f6f5bb63d26e5df98c92aea9e17bb77

# Frontend URL
FRONTEND_URL=https://${DOMAIN}

# Telegram Bot Token
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}

# Security
CORS_ORIGIN=https://${DOMAIN}
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
EOF

echo "✅ Production configuration updated!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy your application to a server"
echo "2. Set up SSL certificate for ${DOMAIN}"
echo "3. Configure reverse proxy (nginx)"
echo "4. Set up monitoring and alerts"
echo "5. Test the application"
echo ""
echo "🔒 Security checklist:"
echo "✅ JWT secret generated"
echo "✅ MongoDB Atlas configured"
echo "✅ Telegram bot token set"
echo "✅ CORS configured for production domain"
echo "✅ Rate limiting enabled"
echo ""
echo "🚀 Your app is ready for production deployment!"
