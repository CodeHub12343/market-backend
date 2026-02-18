# Deployment Guide

This guide provides detailed instructions for deploying the Student Marketplace application in different environments.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- NPM or Yarn package manager
- Cloudinary account
- Paystack account (for payments)
- SMTP server (for emails)

## Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd student-2
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
- Copy `config.env.example` to `config.env`
- Update the following variables:
  ```
  NODE_ENV=production
  PORT=3000
  DATABASE=<your-mongodb-uri>
  DATABASE_PASSWORD=<your-db-password>
  JWT_SECRET=<your-jwt-secret>
  JWT_EXPIRES_IN=90d
  JWT_COOKIE_EXPIRES_IN=90
  CLOUDINARY_CLOUD_NAME=<your-cloud-name>
  CLOUDINARY_API_KEY=<your-api-key>
  CLOUDINARY_API_SECRET=<your-api-secret>
  PAYSTACK_PUBLIC_KEY=<your-public-key>
  PAYSTACK_SECRET_KEY=<your-secret-key>
  EMAIL_HOST=<smtp-host>
  EMAIL_PORT=<smtp-port>
  EMAIL_USERNAME=<smtp-username>
  EMAIL_PASSWORD=<smtp-password>
  ```

## Production Deployment

### Option 1: Traditional Server

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

### Option 2: Docker Deployment

1. Build the Docker image:
```bash
docker build -t student-marketplace .
```

2. Run the container:
```bash
docker run -d -p 3000:3000 --env-file config.env student-marketplace
```

### Option 3: Cloud Platform (Heroku)

1. Install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create student-marketplace
```

4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE=<your-mongodb-uri>
# Set other environment variables...
```

5. Deploy the application:
```bash
git push heroku main
```

## Monitoring and Maintenance

### Logging

- Application logs are stored in the `logs` directory
- Use PM2 or similar process manager for production monitoring
- Configure log rotation to manage log file sizes

### Backup

1. Database backup:
```bash
mongodump --uri="<your-mongodb-uri>" --out=backup
```

2. Restore from backup:
```bash
mongorestore --uri="<your-mongodb-uri>" backup
```

### Health Checks

- Monitor the `/api/v1/health` endpoint for system status
- Set up uptime monitoring using services like UptimeRobot

## Security Considerations

1. Enable rate limiting in production
2. Set secure headers using Helmet
3. Implement CORS policies
4. Use SSL/TLS certification
5. Regular security updates
6. Input validation and sanitization

## Troubleshooting

Common issues and solutions:

1. Connection errors:
   - Check MongoDB connection string
   - Verify network connectivity
   - Check firewall settings

2. Authentication issues:
   - Verify JWT secret
   - Check token expiration
   - Validate user credentials

3. Upload problems:
   - Verify Cloudinary credentials
   - Check file size limits
   - Validate file types

## Performance Optimization

1. Enable compression
2. Implement caching
3. Use connection pooling for MongoDB
4. Optimize database queries
5. Implement proper indexing

## Scaling Considerations

1. Horizontal scaling with load balancer
2. Caching layer (Redis)
3. CDN for static assets
4. Database replication
5. Microservices architecture (future consideration)