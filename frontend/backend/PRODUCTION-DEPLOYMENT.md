# 🎴 Tarot Telegram App - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- MongoDB Atlas account
- Telegram Bot token from @BotFather
- Domain name with SSL certificate
- Server with Docker and Docker Compose

### 1. Setup MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster
3. Create database user with read/write permissions
4. Add your server IP to network access
5. Get connection string

### 2. Create Telegram Bot
1. Message @BotFather in Telegram
2. Send `/newbot`
3. Follow instructions to create bot
4. Save the bot token

### 3. Configure Production
```bash
# Run the setup script
./setup-production.sh "mongodb+srv://user:pass@cluster.mongodb.net/db" "123456789:ABCdef..." "yourdomain.com"
```

### 4. Deploy with Docker
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔧 Manual Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-generated-secret
FRONTEND_URL=https://yourdomain.com
TELEGRAM_BOT_TOKEN=your-bot-token
CORS_ORIGIN=https://yourdomain.com
```

### SSL Certificate Setup
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 📊 Monitoring

### Health Checks
- Backend: `https://yourdomain.com/api/health`
- Frontend: `https://yourdomain.com/`

### Logs
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔒 Security Checklist

- [x] JWT secret generated
- [x] MongoDB Atlas configured
- [x] Telegram bot token set
- [x] CORS configured for production domain
- [x] Rate limiting enabled
- [x] SSL certificate installed
- [x] Security headers configured
- [x] Docker containers running as non-root user

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check network access in MongoDB Atlas
   - Verify connection string format
   - Ensure database user has correct permissions

2. **Telegram Bot Not Responding**
   - Verify bot token is correct
   - Check bot is not blocked
   - Ensure webhook is set correctly

3. **SSL Certificate Issues**
   - Verify domain DNS points to server
   - Check certificate is valid and not expired
   - Ensure nginx configuration is correct

### Debug Commands
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View resource usage
docker stats
```

## 📈 Performance Optimization

### Database
- Enable MongoDB Atlas monitoring
- Set up database indexes
- Configure connection pooling

### Application
- Enable gzip compression
- Configure caching headers
- Monitor memory usage

### Infrastructure
- Use CDN for static assets
- Set up load balancing
- Monitor server resources

## 🔄 CI/CD Pipeline

The application includes GitHub Actions workflow for:
- Automated testing
- Docker image building
- Production deployment
- Health checks

### Required Secrets
- `HOST`: Server IP address
- `USERNAME`: SSH username
- `SSH_KEY`: Private SSH key
- `DOMAIN`: Production domain

## 📞 Support

For issues and questions:
1. Check logs first
2. Verify configuration
3. Test individual components
4. Contact support if needed

---

**🎯 Your Tarot Telegram App is now production-ready!**
