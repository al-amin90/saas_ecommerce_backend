# SaaS Ecommerce Backend

A scalable backend for a multi-tenant e-commerce platform built with TypeScript and Express. It supports authentication, product and category management, orders, delivery methods, banners, and tenant-aware database operations.

## Features

- User authentication and authorization
- Multi-tenant architecture support
- Product, category, color, size chart, and banner management
- Order processing and delivery method integration
- File upload support with Cloudinary
- Validation using Zod
- Centralized error handling and API response formatting

## Technology Stack

- Node.js + TypeScript
- Express.js for API routing and middleware
- Mongoose for MongoDB modeling
- Zod for schema validation
- JWT for authentication
- Bcrypt for password hashing
- Multer + Cloudinary for file uploads
- CORS + Cookie Parser for HTTP handling
- tsup for build output
- tsx for development execution

## Project Structure

```text
src/
  app/
    config/
    middlewares/
    modules/
    routes/
    utils/
  server.ts
```

## Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the project root and configure the required variables such as:

```env
PORT=5000
NODE_ENV=development

JWT_ACCESS_TOKEN=your_access_secret
JWT_REFRESH_TOKEN=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

SINGLE_DB_URL=your_mongodb_connection_string
MULTI_DB_URL=your_multi_tenant_mongodb_connection_string
CENTRAL_DB_URL=your_central_mongodb_connection_string

CLOUDINARY_URL=your_cloudinary_url
```

## Available Scripts

```bash
npm run dev
npm run build
npm run start
```

## Run the Server

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

## API Overview

The API is served under:

```text
/api/v1
```

Main routes include:

- `/api/v1/auth`
- `/api/v1/user`
- `/api/v1/category`
- `/api/v1/color`
- `/api/v1/product`
- `/api/v1/order`
- `/api/v1/delivery-method`
- `/api/v1/banner`

## Notes

This project is designed as a modular backend and can be extended with additional services such as payment gateways, email notifications, and analytics.
