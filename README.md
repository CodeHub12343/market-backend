# Student Marketplace API

A comprehensive Node.js + Express API for a campus/student marketplace platform that enables students to buy, sell, and exchange products and services within their campus community. The platform features user accounts, marketplace listings, real-time chat, notifications, events, news, and more.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D4.4-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)

## 📚 Documentation

- [API Documentation](docs/api.yaml) - Complete API reference and endpoints
- [Deployment Guide](docs/DEPLOYMENT.md) - Detailed deployment instructions
- [Contributing Guidelines](docs/CONTRIBUTING.md) - How to contribute to the project
- [System Architecture](docs/ARCHITECTURE.md) - Technical architecture and design decisions

## ✨ Features

- **User Management**
  - Authentication with JWT
  - Email verification
  - Password reset functionality
  - Profile management
  - Role-based access control

- **Marketplace**
  - Product listings with images
  - Service offerings
  - Categories and search
  - Reviews and ratings
  - Order management

- **Community Features**
  - Real-time chat
  - News and announcements
  - Events calendar
  - Campus-specific content
  - User notifications

- **File Management**
  - Image upload via Cloudinary
  - Document sharing
  - File validation and processing

- **Security**
  - Input validation
  - Rate limiting
  - Error handling
  - Data sanitization

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- MongoDB >= 4.4
- NPM or Yarn
- Cloudinary account
- Paystack account (for payments)
- SMTP server (for emails)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/student-marketplace.git
cd student-marketplace
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp config.env.example config.env
# Edit config.env with your credentials
```

4. Start development server
```bash
npm run dev
```

5. Run tests
```bash
npm test
```

The application will be available at `http://localhost:5000` by default.

## ⚙️ Configuration

### Environment Variables

Create a `config.env` file in the project root with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE=mongodb+srv://username:<PASSWORD>@cluster.mongodb.net/marketplace
DATABASE_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# File Upload
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Processing
PAYSTACK_PUBLIC_KEY=your_public_key
PAYSTACK_SECRET_KEY=your_secret_key

# Email
EMAIL_FROM=noreply@yourapp.com
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password
```

⚠️ Never commit sensitive credentials to version control. The repository includes a `config.env.example` file for reference.

## 📁 Project Structure

```
student-2/
├── app.js                  # Express application setup
├── server.js              # Server initialization
├── socketManager.js       # WebSocket handling
│
├── config/               # Configuration files
│   ├── cloudinary.js     # Cloudinary setup
│   ├── db.js            # Database connection
│   └── paystack.js      # Payment integration
│
├── controllers/          # Request handlers
│   ├── authController.js     # Authentication logic
│   ├── productController.js  # Product management
│   ├── chatController.js     # Real-time chat
│   └── ...
│
├── models/              # Database schemas
│   ├── userModel.js
│   ├── productModel.js
│   └── ...
│
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── ...
│
├── middlewares/         # Express middlewares
│   ├── authMiddleware.js    # Authentication
│   ├── errorMiddleware.js   # Error handling
│   └── validationMiddleware.js
│
├── utils/              # Helper functions
│   ├── appError.js
│   ├── catchAsync.js
│   └── email.js
│
├── docs/              # Documentation
│   ├── api.yaml
│   ├── DEPLOYMENT.md
│   └── ...
│
├── tests/             # Test suites
│   ├── auth.test.js
│   └── ...
│
└── logs/             # Application logs
    ├── error.log
    └── combined.log
```

## 🛣️ API Routes

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `PATCH /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user

### Marketplace
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get product details
- `PATCH /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Services
- `GET /api/v1/services` - List services
- `POST /api/v1/services` - Offer new service
- `POST /api/v1/services/:id/book` - Book a service

### Communication
- `GET /api/v1/chat` - Get chat history
- `POST /api/v1/chat/message` - Send message
- `GET /api/v1/notifications` - Get notifications

### Community
- `GET /api/v1/news` - Get news articles
- `GET /api/v1/events` - List events
- `POST /api/v1/posts` - Create post

For complete API documentation, see [API Documentation](docs/api.yaml)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- auth.test.js

# Run with coverage
npm run test:coverage
```

### Test Structure
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- Mock external services (Cloudinary, Email)
- Use `mongodb-memory-server` for database tests

## 📤 File Upload

The application uses Cloudinary for file storage and management:

- Image upload for products and profiles
- Document sharing
- Automatic image optimization
- Secure file handling

Configuration:
```javascript
// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
```

Usage:
```javascript
const cloudinary = require('../config/cloudinary');

// Upload file
const result = await cloudinary.uploader.upload(file.path);
```

## 🔧 Development

### Scripts

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Start production server
npm start

# Generate API documentation
npm run docs

# Lint code
npm run lint
```

### Best Practices

1. **Error Handling**
   - Use `catchAsync` wrapper for async functions
   - Throw `AppError` for operational errors
   - Implement proper error logging

2. **Security**
   - Validate all inputs
   - Sanitize data
   - Use proper authentication
   - Implement rate limiting

3. **Code Style**
   - Follow ESLint configuration
   - Add JSDoc comments
   - Use meaningful variable names
   - Keep functions focused and small

## 🔍 Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check if `config.env` exists
   - Verify MongoDB connection
   - Ensure all required env variables are set

2. **Authentication Issues**
   - Verify JWT secret is set
   - Check token expiration
   - Ensure proper route protection

3. **Upload Problems**
   - Verify Cloudinary credentials
   - Check file size limits
   - Validate file types

### Debugging

- Check logs in `logs/` directory
- Use proper error handling
- Enable debug mode if needed

## 🤝 Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on:
- Code of Conduct
- Submission process
- Coding standards
- Development workflow

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- MongoDB team for the robust database
- Cloudinary for file hosting
- All contributors who have helped with code and documentation

---

For detailed documentation on the API endpoints and usage, please refer to our [API Documentation](docs/api.yaml).