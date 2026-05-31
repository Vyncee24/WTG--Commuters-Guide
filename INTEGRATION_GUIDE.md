# Frontend-Backend Integration Guide

## ✅ What's Been Updated

Your frontend code has been updated to work with the MySQL backend API:

### `auth.js` - Authentication
- ✅ Now uses Backend API instead of localStorage
- ✅ Stores JWT token for session management
- ✅ Login/Signup sends credentials to backend
- ✅ Same functions work, but now talk to database

### `user.js` - User Data
- ✅ Save/unsave routes use backend API
- ✅ Check saved routes via API
- ✅ Comments still stored locally (can be moved to DB later)
- ✅ Search history stored locally for quick access

---

## 🚀 Quick Start Guide

### Step 1: Ensure MySQL & XAMPP are Running

Before starting anything, make sure:

1. **Open XAMPP Control Panel** (`C:\xampp\xampp-control.exe`)
2. Click **Start** next to **MySQL**
3. Wait for green status showing **Running**

### Step 2: Install Node.js Dependencies

Open PowerShell in your project folder:

```powershell
npm install
```

### Step 3: Configure `.env`

Make sure your `.env` file has these exact settings:

```env
# XAMPP MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wtg_commuters_guide
DB_PORT=3306

# Server Configuration
SERVER_PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=my_super_secret_jwt_key_change_in_production
```

### Step 4: Create Database & Tables

Run the setup script:

```powershell
node setup-database.js
```

Wait for success message confirming all tables are created.

### Step 5: Start the Backend Server

In a PowerShell terminal:

```powershell
npm start
```

Or for development with auto-reload:

```powershell
npm run dev
```

Wait for this message:
```
✓ MySQL Database connected successfully!

🚀 WTG Commuters Guide server running on http://localhost:5000
📝 API available at http://localhost:5000/api
```

### Step 6: Open Your App

In browser, go to:

```
http://localhost:5000
```

---

## 📋 What Works Now

### User Registration & Login
1. Go to **Sign Up** page
2. Create account with email/password
3. Data is **saved to MySQL database** ✅
4. JWT token is **stored in browser** ✅
5. Go to **Login** page
6. Login with your credentials
7. **Fetched from MySQL database** ✅

### Save Routes
1. Find a route
2. Click **Save** button
3. Route is **saved to MySQL database** ✅
4. Go to **Profile**
5. See your **saved routes from database** ✅
6. Click **Unsave** to remove

### Search History
- Still **stored locally** (fast access)
- You can upgrade to database later if needed

### Comments
- Still **stored locally** (for now)
- Works same as before
- Can be moved to database later

---

## 🔌 API Endpoints You're Using

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/signup` - Register new user

### User Data
- `GET /api/user/profile` - Get user profile
- `POST /api/user/save-route` - Save a route
- `GET /api/user/saved-routes` - Get all saved routes
- `DELETE /api/user/saved-routes/:routeId` - Unsave a route

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/search?from=X&to=Y` - Search routes

---

## 🧪 Test It Out

### Test Backend Connection

In browser, visit:
```
http://localhost:5000/api/health
```

You should see:
```json
{"status":"Server is running"}
```

### Test Sign Up & Login

1. Go to `http://localhost:5000/signup.html`
2. Create account
3. Should see success message
4. Redirects to home
5. Click on user profile (top-right)
6. Shows your name and email from database ✅

### Test Save Routes

1. On home page, find a route
2. Click "Save" button
3. Go to Profile
4. See your saved route from database ✅

---

## 📱 Frontend Files (No Changes Needed)

Your HTML files work as-is:
- `index.html` - Home page ✅
- `login.html` - Login page ✅
- `signup.html` - Sign up page ✅
- `profile.html` - User profile ✅
- `admin.html` - Admin panel ✅
- `result.html` - Route results ✅

All forms and buttons still work the same way!

---

## ⚙️ How It Works Under the Hood

### Before (localStorage)
```
User Form → JavaScript → localStorage → Display
```

### After (MySQL Backend)
```
User Form → JavaScript → API Call → Backend Server → MySQL Database → API Response → Display
```

### Authentication Flow
```
1. User enters email/password
2. auth.js sends POST to /api/auth/login
3. Backend hashes password + checks database
4. Backend returns JWT token
5. Token stored in browser localStorage
6. Token sent with every request (Authorization header)
7. Backend verifies token for protected routes
```

---

## 🔒 Security Features

✅ **Password Hashing** - bcryptjs
- Passwords never stored in plain text
- Hashed with salt rounds

✅ **JWT Authentication** - jsonwebtoken
- Token expires after 24 hours
- Token verified on every API call

✅ **Input Validation**
- Both frontend & backend validate
- SQL injection protection via parameterized queries

---

## 🆘 Troubleshooting

### "Can't connect to http://localhost:5000"
- ❌ Backend server not running
- ✅ Check PowerShell terminal for "🚀 server running" message
- ✅ Make sure you ran `npm start` in the correct folder

### "Login fails / Invalid credentials"
- ❌ Check username/password
- ✅ Make sure MySQL is running (XAMPP)
- ✅ Make sure database exists (run setup script again)
- ✅ Check `.env` file is configured correctly

### "Saved routes not showing"
- ❌ Not logged in
- ✅ Login first via login.html
- ✅ Check browser console for errors (F12 → Console)

### "Comments not saving"
- Comments are stored locally (by design)
- Reload page and comments will still be there
- This is normal behavior

### MySQL Connection Error
- ❌ XAMPP MySQL not running
- ✅ Open XAMPP Control Panel
- ✅ Click **Start** next to MySQL
- ✅ Wait for green status

---

## 📊 Database Status

Check your database anytime via phpMyAdmin:

```
http://localhost/phpmyadmin
```

- **Username:** `root`
- **Password:** (leave blank)

### View Your Data
1. Click `wtg_commuters_guide` database
2. Click `users` table
3. See all registered users ✅
4. Click `saved_routes` table
5. See all saved routes ✅

---

## Next Steps

1. ✅ Database connected
2. ✅ Backend server running
3. ✅ Frontend talking to backend
4. ⏭️ **Test all features** (signup, login, save routes)
5. ⏭️ Add more routes to database
6. ⏭️ Upgrade comments to database
7. ⏭️ Deploy to production

---

## Keep Everything Running

While testing, you need to keep running:

**Terminal 1 (Node.js Server):**
```powershell
npm start
```

**Terminal 2 (XAMPP - background):**
- Just leave XAMPP Control Panel open with MySQL running

**Browser:**
- Open `http://localhost:5000`
- Test all features

---

## Questions?

Check these files for more info:
- `MYSQL_STEP_BY_STEP.md` - Database setup
- `MYSQL_SETUP.md` - API configuration
- `server.js` - Backend entry point
- `db.js` - Database connection
- `api/` folder - API routes

