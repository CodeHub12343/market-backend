# Student Marketplace API Routes Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication Routes (`/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register a new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/verify-email` | Verify email address | No |
| POST | `/auth/resend-verification` | Resend verification email | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| PATCH | `/auth/reset-password` | Reset password with token | No |
| PATCH | `/auth/update-password` | Update current password | Yes |
| GET | `/auth/me` | Get current user info | Yes |
| POST | `/auth/logout` | Logout user | Yes |

## User Management Routes (`/users`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/users` | Create user | No |
| GET | `/users` | Get all users | Yes |
| GET | `/users/:id` | Get user by ID | Yes |
| PATCH | `/users/:id` | Update user | Yes |
| DELETE | `/users/:id` | Delete user | Yes |

## Profile Routes (`/profile`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile/users/:id` | Get user profile | No |
| GET | `/profile/me` | Get my profile | Yes |
| PATCH | `/profile/me` | Update my profile | Yes |
| POST | `/profile/me/avatar` | Update profile picture | Yes |
| DELETE | `/profile/me/avatar` | Delete profile picture | Yes |
| PATCH | `/profile/me/preferences` | Update preferences | Yes |

## Product Routes (`/products`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products | No |
| GET | `/products/top-rated` | Get top-rated products | No |
| POST | `/products` | Create product | Yes |
| GET | `/products/:id` | Get product by ID | No |
| PATCH | `/products/:id` | Update product | Yes |
| DELETE | `/products/:id` | Delete product | Yes |
| GET | `/products/:productId/reviews` | Get product reviews | No |
| POST | `/products/:productId/reviews` | Create product review | Yes |

## Shop Routes (`/shops`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/shops` | Get all shops | No |
| GET | `/shops/:id` | Get shop by ID | No |
| POST | `/shops` | Create shop | Yes |
| PATCH | `/shops/:id` | Update shop | Yes |
| DELETE | `/shops/:id` | Delete shop | Yes |
| GET | `/shops/:shopId/reviews` | Get shop reviews | No |
| POST | `/shops/:shopId/reviews` | Create shop review | Yes |

## Category Routes (`/categories`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | Get all categories | No |
| GET | `/categories/:id` | Get category by ID | No |
| POST | `/categories` | Create category | Yes |
| PATCH | `/categories/:id` | Update category | Admin |
| DELETE | `/categories/:id` | Delete category | Admin |

## Service Routes (`/services`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/services` | Get all services | No |
| POST | `/services` | Create service | Yes |
| GET | `/services/:id` | Get service by ID | No |
| PATCH | `/services/:id` | Update service | Yes |
| DELETE | `/services/:id` | Delete service | Yes |

## Service Order Routes (`/service-orders`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/service-orders` | Create service order | Yes |
| GET | `/service-orders/verify-payment` | Verify payment | Yes |
| GET | `/service-orders/my-orders` | Get my service orders | Yes |
| POST | `/service-orders/:id/confirm-delivery` | Confirm delivery | Yes |

## Service Review Routes (`/service-reviews`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/service-reviews` | Get all service reviews | No |
| POST | `/service-reviews` | Create service review | Yes |
| GET | `/service-reviews/:id` | Get service review | No |
| PATCH | `/service-reviews/:id` | Update service review | Yes |
| DELETE | `/service-reviews/:id` | Delete service review | Yes |

## Order Routes (`/orders`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | Get my orders | Yes |
| GET | `/orders/:id` | Get order by ID | Yes |
| PATCH | `/orders/:id/status` | Update order status | Admin/Seller |
| PATCH | `/orders/:id/confirm-delivery` | Confirm delivery | Yes |
| POST | `/orders/:id/initialize-payment` | Initialize payment | Yes |
| GET | `/orders/:id/verify-payment` | Verify payment | Yes |
| POST | `/orders/webhook/paystack` | Paystack webhook | No |

## Request Routes (`/requests`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/requests` | Get all requests | No |
| POST | `/requests` | Create request | Yes |
| GET | `/requests/:id` | Get request by ID | No |
| PATCH | `/requests/:id` | Update request | Yes |
| DELETE | `/requests/:id` | Delete request | Yes |
| POST | `/requests/:id/fulfill` | Mark as fulfilled | Yes |

## Offer Routes (`/offers`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/offers` | Get all offers | Yes |
| POST | `/offers` | Create offer | Yes |
| GET | `/offers/:id` | Get offer by ID | Yes |
| PATCH | `/offers/:id` | Withdraw offer | Yes |
| POST | `/offers/:id/accept` | Accept offer | Yes |
| POST | `/offers/:id/reject` | Reject offer | Yes |

## Review Routes (`/reviews`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reviews` | Get all reviews | Yes |
| POST | `/reviews` | Create review | Buyer/Seller/Service Provider |
| PATCH | `/reviews/:id` | Update review | Yes |
| DELETE | `/reviews/:id` | Delete review | Yes |

## Favorite Routes (`/favorites`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/favorites/toggle` | Toggle favorite | Yes |
| POST | `/favorites` | Create favorite | Yes |
| GET | `/favorites` | Get all favorites | Yes |
| GET | `/favorites/:id` | Get favorite by ID | Yes |
| DELETE | `/favorites/:id` | Delete favorite | Yes |

## Chat Routes (`/chats`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/chats/one-to-one` | Get or create one-to-one chat | Yes |
| POST | `/chats/group` | Create group chat | Yes |
| GET | `/chats/me` | Get my chats | Yes |
| GET | `/chats/:id` | Get chat with messages | Yes |

## Message Routes (`/messages`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/messages` | Create message | Yes |
| GET | `/messages/:chatId` | Get messages by chat ID | Yes |

## Notification Routes (`/notifications`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get my notifications | Yes |
| POST | `/notifications` | Create notification | Yes |
| PATCH | `/notifications/:id/read` | Mark as read | Yes |

## Post Routes (`/posts`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/posts` | Get all posts | No |
| POST | `/posts` | Create post | Yes |
| GET | `/posts/:id` | Get post by ID | No |
| PATCH | `/posts/:id` | Update post | Yes |
| DELETE | `/posts/:id` | Delete post | Yes |
| PATCH | `/posts/:id/like` | Toggle like | Yes |
| PATCH | `/posts/:id/report` | Report post | Yes |
| GET | `/posts/:postId/comments` | Get comments | No |
| POST | `/posts/:postId/comments` | Create comment | Yes |
| DELETE | `/posts/comments/:id` | Delete comment | Yes |

## Event Routes (`/events`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/events` | Get all events | No |
| GET | `/events/:id` | Get event by ID | No |
| POST | `/events` | Create event | Yes |
| PATCH | `/events/:id` | Update event | Yes |
| DELETE | `/events/:id` | Delete event | Yes |
| POST | `/events/:id/join` | Join event | Yes |
| POST | `/events/:id/leave` | Leave event | Yes |
| GET | `/events/upload/signature` | Get upload signature | Yes |

## News Routes (`/news`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/news` | Get all news | No |
| GET | `/news/:id` | Get news by ID | No |
| POST | `/news` | Create news | Yes |
| PATCH | `/news/:id` | Update news | Admin/Editor |
| DELETE | `/news/:id` | Delete news | Admin/Editor |

## Campus Routes (`/campus`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/campus` | Get all campuses | No |
| GET | `/campus/:id` | Get campus by ID | No |
| POST | `/campus` | Create campus | Admin |
| PATCH | `/campus/:id` | Update campus | Admin |
| DELETE | `/campus/:id` | Delete campus | Admin |

## Search Routes (`/search`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/search/products` | Search products | Yes |
| GET | `/search/services` | Search services | Yes |
| GET | `/search/posts` | Search posts | Yes |
| GET | `/search/users` | Search users | Yes |
| GET | `/search/global` | Global search | Yes |

## Document Routes (`/documents`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/documents` | Get all documents | No |
| POST | `/documents` | Upload document | Yes |
| GET | `/documents/:id` | Get document | No |
| PATCH | `/documents/:id` | Update document | Yes |
| DELETE | `/documents/:id` | Delete document | Yes |

## Report Routes (`/reports`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reports` | Get all reports | Admin |
| POST | `/reports` | Create report | Yes |
| GET | `/reports/my-reports` | Get my reports | Yes |
| GET | `/reports/target/:targetType/:targetId` | Get reports for target | Admin |
| GET | `/reports/:id` | Get report by ID | Yes |
| PATCH | `/reports/:id` | Update report | Admin |
| DELETE | `/reports/:id` | Delete report | Admin |

## Activity Routes (`/activities`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/activities` | Get all activities | No |
| POST | `/activities` | Create activity | Yes |
| GET | `/activities/:id` | Get activity by ID | No |
| PATCH | `/activities/:id` | Update activity | Yes |
| DELETE | `/activities/:id` | Delete activity | Yes |

## Upload Routes (`/upload`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/upload/signature` | Get Cloudinary signature | Yes |

## Cloudinary Routes (`/cloudinary`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/cloudinary/upload` | Upload single file | Yes |
| POST | `/cloudinary/upload-multiple` | Upload multiple files | Yes |
| DELETE | `/cloudinary/files/:publicId` | Delete file | Yes |
| POST | `/cloudinary/cleanup-orphaned` | Cleanup orphaned files | Admin |

## Authentication Levels
- **No Auth**: Public endpoints accessible without authentication
- **Yes**: Requires valid JWT token
- **Admin**: Requires admin role
- **Admin/Editor**: Requires admin or editor role
- **Buyer/Seller/Service Provider**: Requires specific user roles

## Common Query Parameters
- `page`: Page number for pagination
- `limit`: Number of items per page
- `sort`: Sort field and direction (e.g., `-createdAt`)
- `fields`: Select specific fields to return
- `populate`: Populate referenced fields

## Response Format
All responses follow this format:
```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "Optional message",
  "code": 200
}
```

## Error Format
```json
{
  "status": "error",
  "type": "ErrorType",
  "message": "Error message",
  "code": 400,
  "details": [ ... ]
}
```