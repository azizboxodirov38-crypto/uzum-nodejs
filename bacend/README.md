# Uzum Market Clone Backend

Node.js + Express backend for the Uzum Market Clone project.

## Features

- JWT authentication
- bcrypt password hashing
- Role-based admin access
- MongoDB with Mongoose models
- Product, Order, User, Category APIs
- CORS enabled
- Centralized error handling

## Setup

1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI`, `JWT_SECRET`, and `PORT`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/orders` (user)
- `GET /api/orders/my` (user)
- `GET /api/orders` (admin)
- `GET /api/users` (admin)
- `PUT /api/users/:id/role` (admin)
