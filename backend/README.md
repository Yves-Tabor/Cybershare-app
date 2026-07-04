# Cybershare Backend API

Professional Node.js/Express backend with PostgreSQL for the Cybershare platform.

## Tech Stack

- **Runtime**: Node.js 22 LTS
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: bcrypt, jsonwebtoken, cookie-parser
- **Security**: helmet, cors, express-rate-limit
- **Validation**: zod
- **Logging**: morgan
- **Environment**: dotenv

## Project Structure

```
backend/
│
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── controllers/
│   │   └── authController.js    # Auth logic
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT authentication
│   ├── routes/
│   │   └── authRoutes.js        # Auth endpoints
│   ├── validators/
│   │   └── authValidator.js     # Input validation
│   └── app.js                   # Express app setup
│
├── sql/
│   └── schema.sql               # Database schema
│
├── server.js                   # Entry point
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
└── package.json                # Dependencies
```

## Setup Instructions

### 1. Install PostgreSQL

Create the database:

```sql
CREATE DATABASE cybershare;
```

### 2. Run Database Schema

```bash
psql -U postgres -d cybershare -f sql/schema.sql
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment

The `.env` file is already configured with:
- Server port: 5000
- PostgreSQL connection details
- JWT secret
- Frontend URL: http://localhost:5173

### 5. Start the Server

Development mode (with auto-reload):
```bash
pnpm run dev
```

Production mode:
```bash
pnpm start
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "string (3-50 chars)",
  "email": "string (valid email)",
  "password": "string (6-100 chars)",
  "bio": "string (optional, max 500 chars)"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "bio": "string",
    "avatar": null,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "bio": "string",
    "avatar": null,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/auth/me
Get current authenticated user.

**Headers:**
- Cookie: `token=<jwt_token>`

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "bio": "string",
    "avatar": null,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/logout
Logout user (clears cookie).

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Health Check

#### GET /api/health
Check server status.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: 7-day token expiration
- **HTTP-only Cookies**: Prevents XSS attacks
- **Input Validation**: Zod schemas

## Next Steps

Phase 1 (Authentication) is complete. Next phases:

1. Resources CRUD
2. Posts CRUD
3. Comments CRUD
4. Events CRUD
5. Website scan storage
6. Notifications

## Development Notes

- The server runs on port 5000
- Frontend should be on http://localhost:5173
- JWT tokens are stored in HTTP-only cookies
- All passwords are hashed before storage
