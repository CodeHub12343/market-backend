# System Architecture Documentation

## Overview

The Student Marketplace is a Node.js based application following the MVC (Model-View-Controller) pattern with a RESTful API architecture. The system is designed to be scalable, maintainable, and secure.

## System Components

### 1. Core Components

```
+---------------+     +---------------+     +---------------+
|   Client      |     |   API Layer   |     |   Database   |
|  Applications |<--->|   (Express)   |<--->|  (MongoDB)   |
+---------------+     +---------------+     +---------------+
                            ^
                            |
                     +---------------+
                     |   Services    |
                     |  (Business    |
                     |   Logic)      |
                     +---------------+
```

### 2. Key Services

1. **Authentication Service**
   - JWT-based authentication
   - Password encryption/hashing
   - Session management
   - Role-based access control

2. **File Storage Service**
   - Cloudinary integration
   - Image processing
   - File validation
   - Upload management

3. **Payment Service**
   - Paystack integration
   - Transaction processing
   - Payment verification
   - Refund handling

4. **Notification Service**
   - Email notifications
   - In-app notifications
   - Real-time updates
   - Push notifications

5. **Chat Service**
   - Real-time messaging
   - Socket.io implementation
   - Message persistence
   - Online status tracking

## Data Flow

### Authentication Flow

```
+--------+    +--------+    +--------+    +--------+
| Client |    | Route  |    | Auth   |    |  DB    |
|        |--->| Handler|--->| Service|--->|        |
+--------+    +--------+    +--------+    +--------+
     ^                          |
     |                         v
     |                    +---------+
     +--------------------| JWT Gen |
                         +---------+
```

### File Upload Flow

```
+--------+    +----------+    +------------+
| Client |    | Upload   |    | Cloudinary |
|        |--->| Middleware|-->|            |
+--------+    +----------+    +------------+
                   |               |
                   v               v
              +--------+    +-----------+
              |  DB    |<---| Response  |
              |        |    | Handler   |
              +--------+    +-----------+
```

## Security Architecture

1. **Authentication Layer**
   - JWT tokens
   - Password hashing (bcrypt)
   - Rate limiting
   - Session management

2. **Authorization Layer**
   - Role-based access control
   - Resource ownership validation
   - Permission middleware

3. **Data Security**
   - Input validation
   - Data sanitization
   - XSS protection
   - CSRF protection

## Database Schema

### Core Collections

1. **Users Collection**
   ```javascript
   {
     firstName: String,
     lastName: String,
     email: String,
     password: String,
     role: String,
     campus: ObjectId,
     // ... other fields
   }
   ```

2. **Products Collection**
   ```javascript
   {
     name: String,
     description: String,
     price: Number,
     seller: ObjectId,
     category: ObjectId,
     // ... other fields
   }
   ```

3. **Orders Collection**
   ```javascript
   {
     buyer: ObjectId,
     products: Array,
     total: Number,
     status: String,
     // ... other fields
   }
   ```

## API Architecture

### REST API Structure

1. **Resource-based URLs**
   - /api/v1/users
   - /api/v1/products
   - /api/v1/orders

2. **HTTP Methods**
   - GET: Retrieve
   - POST: Create
   - PATCH: Update
   - DELETE: Remove

3. **Response Format**
   ```javascript
   {
     status: 'success|error',
     data: { ... },
     message: '...',
     // ... other fields
   }
   ```

## Error Handling

1. **Global Error Handler**
   - Operational errors
   - Programming errors
   - Validation errors
   - Third-party service errors

2. **Error Response Format**
   ```javascript
   {
     status: 'error',
     error: {
       statusCode: 400,
       status: 'fail',
       message: '...'
     }
   }
   ```

## Caching Strategy

1. **Database Caching**
   - Query results caching
   - Aggregate results caching
   - Frequently accessed data

2. **API Response Caching**
   - Static content
   - Rate-limited endpoints
   - Heavy computation results

## Monitoring and Logging

1. **Application Logs**
   - Access logs
   - Error logs
   - Debug logs
   - Performance metrics

2. **Monitoring Metrics**
   - Response times
   - Error rates
   - System resources
   - API usage

## Scalability Considerations

1. **Horizontal Scaling**
   - Load balancing
   - Multiple instances
   - Session management
   - Cache synchronization

2. **Vertical Scaling**
   - Resource optimization
   - Query optimization
   - Connection pooling
   - Memory management

## Dependencies

1. **Core Dependencies**
   - Express.js
   - Mongoose
   - JWT
   - Socket.io

2. **Service Dependencies**
   - Cloudinary
   - Paystack
   - Nodemailer
   - Redis (optional)

## Development Environment

1. **Local Setup**
   - Node.js
   - MongoDB
   - Environment variables
   - Development tools

2. **Testing Environment**
   - Jest
   - Supertest
   - MongoDB memory server
   - Mock services