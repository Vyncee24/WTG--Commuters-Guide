# MySQL Database Setup Guide

## Overview
This project has been configured to connect to a MySQL database. Here's how to set it up:

## Prerequisites
- **MySQL Server** installed and running
- **Node.js** (v14 or higher) installed
- **npm** for package management

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database Connection
Edit the `.env` file with your MySQL credentials:

```env
# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wtg_commuters_guide
DB_PORT=3306

# Server Configuration
SERVER_PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
```

**Important:** Change `JWT_SECRET` to a secure random string in production.

### 3. Create Database & Tables
Run the database setup script:

```bash
node setup-database.js
```

This will:
- Create the `wtg_commuters_guide` database
- Create necessary tables (users, routes, saved_routes, comments)
- Insert default admin user (if not exists)

### 4. Start the Server

**Development mode (with hot-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## Database Schema

### Users Table
- `id` - Auto-increment primary key
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed password (bcrypt)
- `role` - 'user' or 'admin'
- `status` - 'active' or 'inactive'
- `created_at` - Registration timestamp
- `updated_at` - Last update timestamp

### Routes Table
- `id` - Auto-increment primary key
- `route_id` - Unique route identifier
- `from_location` - Starting location
- `to_location` - Destination location
- `duration` - Estimated travel time
- `fare` - Fare amount
- `transport_type` - Type of transport
- `tags` - JSON array of tags

### Saved Routes Table
- Links users to their saved routes
- Prevents duplicate saves (unique constraint)

### Comments Table
- User comments and ratings on routes

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile (requires token)
- `POST /api/user/save-route` - Save a route (requires token)
- `GET /api/user/saved-routes` - Get saved routes (requires token)
- `DELETE /api/user/saved-routes/:routeId` - Delete saved route (requires token)

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/search?from=X&to=Y` - Search routes

## Default Admin Account
- **Email:** janvincentreyel24@gmail.com
- **Password:** janvincentreyel2406

## Troubleshooting

### Connection Error
If you get "Cannot connect to MySQL":
1. Verify MySQL server is running: `mysql -u root -p`
2. Check credentials in `.env`
3. Ensure database name in `.env` matches expected database

### Table Error
If tables don't exist:
1. Run: `node setup-database.js` again
2. Check MySQL server logs for errors

### JWT Token Error
- Ensure `JWT_SECRET` is set in `.env`
- Token expires after 24 hours - user needs to login again

## Frontend Integration

To integrate the frontend with the backend API, update your JavaScript files to use the new endpoints:

```javascript
// Example: Login with backend
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
}

// Example: Save route
async function saveRoute(routeId, from, to) {
  const token = localStorage.getItem('token');
  await fetch('/api/user/save-route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ routeId, from, to })
  });
}
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| DB_HOST | MySQL host | localhost |
| DB_USER | MySQL username | root |
| DB_PASSWORD | MySQL password | (empty) |
| DB_NAME | Database name | wtg_commuters_guide |
| DB_PORT | MySQL port | 3306 |
| SERVER_PORT | Node.js server port | 5000 |
| JWT_SECRET | Token signing key | (required) |
| NODE_ENV | Environment | development |

## Security Notes
- Never commit `.env` file to version control
- Use strong `JWT_SECRET` in production
- Hash passwords with bcryptjs (already implemented)
- Validate all user inputs on both frontend and backend
- Use HTTPS in production

## Support
For issues or questions, check the server logs or MySQL error messages.
