# Complete MySQL Setup Guide Using XAMPP - Step by Step

## Table of Contents
1. [Install XAMPP](#1-install-xampp)
2. [Start XAMPP Control Panel](#2-start-xampp-control-panel)
3. [Start MySQL Service](#3-start-mysql-service)
4. [Access phpMyAdmin](#4-access-phpmyadmin)
5. [Create Database](#5-create-database)
6. [Create Tables](#6-create-tables)
7. [Insert Sample Data](#7-insert-sample-data)
8. [Test Queries](#8-test-queries)
9. [Connect Node.js to MySQL](#9-connect-nodejs-to-mysql)
10. [Run the Application](#10-run-the-application)

---

## 1. Install XAMPP

### Windows Installation

1. Go to https://www.apachefriends.org/
2. Click **Download** (get XAMPP 8.x or higher)
3. Run the `.exe` installer
4. Accept User Account Control (UAC) prompt
5. Follow installation wizard:
   - Choose installation folder (default: `C:\xampp`)
   - Uncheck unnecessary components (keep: **Apache** and **MySQL**)
   - Click **Next** → **Install**
   - Wait for installation to complete
   - Click **Finish**

### macOS Installation

1. Go to https://www.apachefriends.org/
2. Download XAMPP for macOS
3. Open the DMG file
4. Drag XAMPP folder to Applications
5. Open Applications → XAMPP folder
6. Double-click **manager-osx** to launch XAMPP Manager

### Linux Installation

```bash
cd /opt
sudo tar xvfz ~/Downloads/xampp-linux-*.tar.gz
```

---

## 2. Start XAMPP Control Panel

### Windows

1. Open **C:\xampp\xampp-control.exe**
2. The XAMPP Control Panel window opens

**You should see:**
- Apache
- MySQL
- FileZilla (optional)
- Mercury (optional)

### macOS

1. Open Applications → XAMPP → **manager-osx**

### Linux

```bash
sudo /opt/xampp/manager-linux x64
```

Or for command line:
```bash
sudo /opt/xampp/./xamppfiles/ctl.sh start
```

---

## 3. Start MySQL Service

### In XAMPP Control Panel:

1. Look for the **MySQL** row
2. Click the **Start** button next to MySQL
3. Wait for the status to show **Running** (green indicator)

**You should see:**
- Port: 3306
- PID: (a number)
- Status: Running ✓

If you get a warning, click "Yes" to allow XAMPP to bypass firewall.

### Verify MySQL is running:

In XAMPP Control Panel, MySQL should show:
```
MySQL     [Running] Port: 3306
```

---

## 4. Access phpMyAdmin

### Method 1: From XAMPP Control Panel
1. In XAMPP Control Panel, find MySQL row
2. Click **Admin** button
3. phpMyAdmin opens in your default browser

### Method 2: Direct Browser Access
1. Open browser
2. Go to: **http://localhost/phpmyadmin**
3. You should see the phpMyAdmin login page

### Login to phpMyAdmin
- **Username:** `root`
- **Password:** (leave blank - just click Login)
- Click **Go**

You'll see the phpMyAdmin dashboard with all databases listed.

---

## 5. Create Database

### Method 1: Using phpMyAdmin GUI (Recommended)

1. In phpMyAdmin, look for the left sidebar
2. Click **New** button (top-left)
3. Enter Database Name: **`wtg_commuters_guide`**
4. Collation: select **`
You'll see success message: "Database hautf8mb4_unicode_ci`**
5. Click **Create**
s been created"

### Method 2: Using SQL Query in phpMyAdmin

1. In phpMyAdmin, click the **SQL** tab (top menu)
2. Paste this SQL command:
```sql
CREATE DATABASE wtg_commuters_guide;
```
3. Click **Go** button

### Verify database was created:

The database **`wtg_commuters_guide`** should appear in the left sidebar under databases list.

---

## 6. Create Tables

### Using phpMyAdmin:

1. In left sidebar, click **`wtg_commuters_guide`** database
2. Click the **SQL** tab
3. Paste all the table creation SQL below:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (email)
);

CREATE TABLE routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id VARCHAR(50) UNIQUE NOT NULL,
  from_location VARCHAR(100) NOT NULL,
  to_location VARCHAR(100) NOT NULL,
  duration VARCHAR(50),
  fare VARCHAR(50),
  transport_type VARCHAR(50),
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (from_location, to_location)
);

CREATE TABLE saved_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  route_id VARCHAR(50) NOT NULL,
  from_location VARCHAR(100) NOT NULL,
  to_location VARCHAR(100) NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  UNIQUE KEY unique_save (user_id, route_id)
);

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  route_id VARCHAR(50) NOT NULL,
  comment TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (route_id),
  INDEX (user_id)
);
```

4. Click **Go** button
5. You should see success messages for each table

### Verify tables were created:

In left sidebar under **`wtg_commuters_guide`**, click **Tables** and you should see:
- comments
- routes
- saved_routes
- users

---

## 7. Insert Sample Data

### Using phpMyAdmin:

1. In left sidebar, click **`wtg_commuters_guide`** → **users** table
2. Click **Insert** tab
3. Fill in the form:
   - name: `Test User`
   - email: `test@example.com`
   - password: `test123` (will be hashed by backend)
   - role: `user`
   - status: `active`
4. Click **Go** to insert

**Or use SQL Query:**

1. Click the **SQL** tab
2. Paste:
```sql
INSERT INTO users (name, email, password, role) 
VALUES ('Test User', 'test@example.com', 'hashed_password_here', 'user');

INSERT INTO routes (route_id, from_location, to_location, duration, fare, transport_type)
VALUES (
  'test-route-1',
  'Central Station',
  'Airport Terminal',
  '45 mins',
  '₱100',
  'jeep'
);

INSERT INTO saved_routes (user_id, route_id, from_location, to_location)
VALUES (1, 'test-route-1', 'Central Station', 'Airport Terminal');
```
3. Click **Go**

---

## 8. Test Queries

### In phpMyAdmin SQL Tab:

#### View all users:
```sql
SELECT * FROM users;
```

#### View all routes:
```sql
SELECT * FROM routes;
```

#### View saved routes for user ID 1:
```sql
SELECT * FROM saved_routes WHERE user_id = 1;
```

#### Search for routes by location:
```sql
SELECT * FROM routes WHERE from_location LIKE '%Central%';
```

#### Count total users:
```sql
SELECT COUNT(*) as total_users FROM users;
```

#### Join users with their saved routes:
```sql
SELECT 
  u.name, 
  u.email, 
  sr.from_location, 
  sr.to_location,
  sr.saved_at
FROM users u
LEFT JOIN saved_routes sr ON u.id = sr.user_id
ORDER BY u.id;
```

### How to Run Queries in phpMyAdmin:

1. Click **SQL** tab
2. Paste the query in the text area
3. Click **Go** button
4. Results appear below

---

## 9. Connect Node.js to MySQL

### Step 1: Make Sure XAMPP MySQL is Running

1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Verify it shows **Running** status

### Step 2: Install Node.js Dependencies
In your project folder, open PowerShell and run:
```powershell
npm install
```

This will install:
- `express` - Web framework
- `mysql2` - MySQL driver
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication

### Step 3: Configure `.env` File
Edit `.env` in your project root:

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

# JWT Secret (change this in production!)
JWT_SECRET=my_super_secret_jwt_key_change_in_production
```

**Important Notes:**
- `DB_PASSWORD` is empty (leave blank) - XAMPP MySQL has no password by default
- `DB_HOST` is `localhost` - XAMPP runs MySQL locally
- `DB_PORT` is `3306` - XAMPP's default MySQL port
- `DB_USER` is `root` - XAMPP's default user

### Step 4: Run Database Setup Script
In PowerShell, run:
```powershell
node setup-database.js
```

This will:
- Connect to XAMPP's MySQL
- Create the database (if not exists)
- Create all tables
- Insert default admin user
- Verify everything is working

You should see:
```
📦 Setting up database...

✓ Database 'wtg_commuters_guide' created/verified
✓ Users table created/verified
✓ Routes table created/verified
✓ Saved Routes table created/verified
✓ Comments table created/verified
✓ Admin user created (or already exists)

✅ Database setup completed successfully!

Next steps:
1. npm install ✓ (already done)
2. npm start (or npm run dev for development)
```

---

## 10. Run the Application

### Before Starting:
1. ✅ XAMPP Control Panel is open
2. ✅ MySQL is **Running** (green indicator)
3. ✅ `.env` file is configured
4. ✅ `node setup-database.js` completed successfully

### Option A: Production Mode
Open PowerShell in your project folder and run:
```powershell
npm start
```

### Option B: Development Mode (with auto-reload)
```powershell
npm run dev
```

Wait for output showing:
```
✓ MySQL Database connected successfully!

🚀 WTG Commuters Guide server running on http://localhost:5000
📝 API available at http://localhost:5000/api
```

### Test if server is running:

**Option 1:** Open browser and visit: `http://localhost:5000/api/health`

You should see:
```json
{"status":"Server is running"}
```

**Option 2:** In another PowerShell window, run:
```powershell
curl http://localhost:5000/api/routes
```

### Keep Both Running:

You now have:
- ✅ **XAMPP** - MySQL server (running in background)
- ✅ **Node.js Server** - Your backend API (running in PowerShell)
- ✅ **Frontend** - HTML files (accessible at http://localhost:5000)

**In your browser:**
- Main app: `http://localhost:5000`
- phpMyAdmin: `http://localhost/phpmyadmin`
- API Health: `http://localhost:5000/api/health`

---

## Troubleshooting

### "MySQL in XAMPP won't start"
1. Check if port 3306 is in use by another application
2. In XAMPP Control Panel, click **Config** → **Service and Port Settings**
3. Check MySQL Port: should be **3306**
4. Try restarting XAMPP Control Panel completely
5. Or use different port: change `DB_PORT` in `.env` to **3307** (if another MySQL is using 3306)

### "Can't connect to MySQL from Node.js"
1. Verify XAMPP MySQL is **Running** (green indicator in Control Panel)
2. Check `.env` file credentials:
   - `DB_HOST=localhost`
   - `DB_USER=root`
   - `DB_PASSWORD=` (empty)
   - `DB_PORT=3306`
3. Try connecting via phpMyAdmin first: `http://localhost/phpmyadmin`
4. If phpMyAdmin works but Node.js doesn't, verify your `.env` file has no typos

### "Database 'wtg_commuters_guide' doesn't exist"
1. In phpMyAdmin, left sidebar should show `wtg_commuters_guide` database
2. If not, run: `node setup-database.js` to create it
3. Or manually create via phpMyAdmin SQL tab:
```sql
CREATE DATABASE wtg_commuters_guide;
```

### "Error: connect ECONNREFUSED 127.0.0.1:3306"
This means Node.js can't reach MySQL. Fix:
1. Start XAMPP Control Panel
2. Click **Start** next to MySQL (wait for green status)
3. Then run your Node.js server again
4. Make sure you didn't close XAMPP while the server was running

### "Table already exists error"
If tables exist but you want to recreate them:
1. In phpMyAdmin, select each table and click **Drop**
2. Then run: `node setup-database.js` again

Or use SQL:
```sql
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS saved_routes;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS users;
```

### "Port 5000 already in use"
If Node.js server port 5000 is in use:
1. Change `SERVER_PORT` in `.env` to a different port (e.g., **5001**)
2. Then access app at: `http://localhost:5001`

Or kill the process using the port:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### "phpMyAdmin not loading"
1. Verify Apache is **Running** in XAMPP Control Panel
2. Try: `http://localhost/phpmyadmin`
3. If still not working, restart XAMPP:
   - Stop Apache
   - Stop MySQL
   - Start MySQL
   - Start Apache
   - Wait 10 seconds
   - Try phpMyAdmin again

### "Access denied for user 'root'@'localhost'"
XAMPP's default MySQL has:
- Username: `root`
- Password: (empty - no password)

Make sure in `.env`:
```env
DB_USER=root
DB_PASSWORD=
```
(leave `DB_PASSWORD` empty)

---

## Next Steps

1. ✅ XAMPP installed and MySQL running
2. ✅ Database and tables created via phpMyAdmin
3. ✅ Node.js backend connected
4. ✅ Sample data inserted
5. ⏭️ Test API endpoints in browser
6. ⏭️ Integrate frontend with backend API
7. ⏭️ Deploy to production

---

## XAMPP Quick Reference

### XAMPP Control Panel
- **Windows:** `C:\xampp\xampp-control.exe`
- **macOS:** Applications → XAMPP → manager-osx
- **Linux:** `/opt/xampp/manager-linux`

### Access Services

| Service | Start/Stop | Access Point |
|---------|-----------|---|
| MySQL | XAMPP Control Panel | localhost:3306 |
| Apache | XAMPP Control Panel | http://localhost |
| phpMyAdmin | XAMPP Control Panel (Admin) | http://localhost/phpmyadmin |
| Frontend | Node.js Server | http://localhost:5000 |

### Default Credentials
- phpMyAdmin Username: `root`
- phpMyAdmin Password: (empty)
- Node.js API: `http://localhost:5000/api`

### Important Ports
- MySQL: **3306**
- Apache: **80**
- Node.js: **5000** (configurable in `.env`)

---

## Common phpMyAdmin Tasks

### Run a SQL Query
1. Click **SQL** tab
2. Paste query
3. Click **Go**

### View a Table
1. Click table name in left sidebar
2. See data in main area
3. Click **Browse** tab for more options

### Insert Data
1. Click table name
2. Click **Insert** tab
3. Fill form and click **Go**

### Export Database
1. Click database name
2. Click **Export** tab
3. Click **Go**

### Import SQL File
1. Click **Import** tab
2. Choose `.sql` file
3. Click **Go**

### Delete a Table
1. Click table name
2. Click **Drop** button
3. Confirm deletion

