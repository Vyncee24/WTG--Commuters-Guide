# ✅ Integration Verification Checklist

Use this checklist to verify everything is connected properly.

---

## Pre-Flight Checks

### ✓ MySQL/XAMPP Ready
- [ ] XAMPP Control Panel open
- [ ] MySQL shows **Running** (green)
- [ ] Port: 3306

```
Verify in browser: http://localhost/phpmyadmin
Should see login page ✅
```

### ✓ Database Created
- [ ] Database `wtg_commuters_guide` exists
- [ ] Tables: users, routes, saved_routes, comments

```powershell
# Run this to create/verify
node setup-database.js
```

Should see:
```
✓ Database 'wtg_commuters_guide' created/verified
✓ Users table created/verified
✓ Routes table created/verified
✓ Saved Routes table created/verified
✓ Comments table created/verified
```

---

## Backend Connection Checks

### ✓ Backend Server Running
```powershell
npm start
```

Should show:
```
✓ MySQL Database connected successfully!
🚀 WTG Commuters Guide server running on http://localhost:5000
📝 API available at http://localhost:5000/api
```

### ✓ Health Check (API is Working)
**In Browser:**
```
http://localhost:5000/api/health
```

Should show:
```json
{"status":"Server is running"}
```

**Or in PowerShell:**
```powershell
curl http://localhost:5000/api/health
```

---

## Frontend Connection Checks

### ✓ Frontend Loads
**In Browser:**
```
http://localhost:5000
```

Should see: WTG Commuters Guide home page ✅

### ✓ Sign Up Works
1. Click **Sign Up**
2. Enter:
   - Name: `Test User`
   - Email: `test123@gmail.com`
   - Password: `password123`
3. Click **Sign In**
4. Should redirect to home page ✅
5. Top-right should show your name ✅

### ✓ Check Database
1. Go to http://localhost/phpmyadmin
2. Click `wtg_commuters_guide` → `users` table
3. Should see your test user ✅
4. Email: `test123@gmail.com`

### ✓ Login Works
1. Click **Logout** (or refresh page)
2. Click **Sign In** (Login)
3. Enter:
   - Email: `test123@gmail.com`
   - Password: `password123`
4. Click **Sign In**
5. Should redirect to home page ✅
6. Top-right should show your name ✅

### ✓ Save Routes Works
1. Logged in
2. Find a route on home page
3. Click **Save** button
4. Should show "Route saved" message ✅
5. Click **Profile**
6. Go to **Saved Routes** section
7. Should see your saved route ✅

### ✓ Check Saved Routes in Database
1. Go to http://localhost/phpmyadmin
2. Click `wtg_commuters_guide` → `saved_routes` table
3. Should see your saved route ✅

---

## API Endpoint Checks

### POST /api/auth/signup
```powershell
curl -X POST http://localhost:5000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{"message":"User registered successfully"}
```

### POST /api/auth/login
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

Save the token for next steps.

### GET /api/user/profile
```powershell
# Replace TOKEN with the token from login response
$TOKEN = "eyJhbGc..."
curl -X GET http://localhost:5000/api/user/profile `
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "status": "active"
}
```

### POST /api/user/save-route
```powershell
$TOKEN = "eyJhbGc..."
curl -X POST http://localhost:5000/api/user/save-route `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "routeId": "test-route-1",
    "from": "Central Station",
    "to": "Airport"
  }'
```

Expected response:
```json
{"message":"Route saved successfully"}
```

### GET /api/user/saved-routes
```powershell
$TOKEN = "eyJhbGc..."
curl -X GET http://localhost:5000/api/user/saved-routes `
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "route_id": "test-route-1",
    "from_location": "Central Station",
    "to_location": "Airport",
    "saved_at": "2026-05-28T10:30:00.000Z"
  }
]
```

---

## Debugging Console

### Browser Console (F12)
Should see **no errors** (red ✕)
- Should see some info messages ℹ️
- Should see successful API calls

### Backend Server Console (PowerShell)
Should see requests like:
```
GET /api/health
POST /api/auth/login
GET /api/user/profile
POST /api/user/save-route
```

### Check .env File
Open `.env` and verify:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wtg_commuters_guide
DB_PORT=3306
SERVER_PORT=5000
```

No typos! ✅

---

## Success Checklist

- [ ] XAMPP MySQL running
- [ ] Database created (setup-database.js ran successfully)
- [ ] Backend server running (http://localhost:5000 works)
- [ ] Frontend loads (http://localhost:5000 shows home page)
- [ ] Sign up creates user in database
- [ ] Login authenticates from database
- [ ] User info shows on page
- [ ] Save route saves to database
- [ ] Saved routes show in profile
- [ ] Saved routes appear in database
- [ ] No errors in browser console
- [ ] No errors in server console

**If all ✅, you're fully integrated!** 🎉

---

## If Something Fails

1. **Read the error message carefully**
2. **Check the appropriate section above**
3. **Look at browser console (F12 → Console)**
4. **Look at server console (PowerShell terminal)**
5. **Check `.env` file for typos**
6. **Restart MySQL + Backend**
7. **Run setup script again**

Still stuck? Check these files:
- `INTEGRATION_GUIDE.md`
- `MYSQL_STEP_BY_STEP.md`
- Server logs in PowerShell

Good luck! 🚀
