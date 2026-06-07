# WTG Commuters Guide

A route-finder web app for commuters. Users can search for commute routes, save favorites, view search history, and leave community tips. Admins can manage routes, users, and view analytics reports.

---

## Requirements

- **Node.js** v18 or higher (v20 LTS recommended)
- **MySQL** 8.0 or higher
- **npm** (comes with Node.js)

---

## 1. Install Node.js

Download and install Node.js from the official site:

> https://nodejs.org/en/download

Choose the **LTS** version. To confirm it installed correctly, open a terminal and run:

```bash
node -v
npm -v
```

---

## 2. Set Up the MySQL Database

### Install MySQL

Download MySQL Community Server:

> https://dev.mysql.com/downloads/mysql/

During setup, note the **root password** you set — you will need it.

### Import the database schema

Open a terminal in the project folder and run:

```bash
mysql -u root -p < database.sql
```

Then run the OLAP migration:

```bash
mysql -u root -p < migrations/add_oltp_olap.sql
```

This creates two databases:
- `wtg_commuters_guide` — main app data (users, routes, comments, saved routes, search history)
- `commuter_olap` — analytics star schema (dim_date, dim_route, dim_user, fact_route_usage)

---

## 3. Configure Environment Variables

Create a file named `.env` in the project root folder. Copy the template below and fill in your values:

```env
# Database connection
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=wtg_commuters_guide
DB_PORT=3306

# JWT secret (any long random string)
JWT_SECRET=your_secret_key_here

# Server port (optional, defaults to 5000)
SERVER_PORT=5000
```

**Important:** Never share or commit your `.env` file.

---

## 4. Install Dependencies

In the project root folder, run:

```bash
npm install
```

This installs all required packages including Express, MySQL2, bcryptjs, jsonwebtoken, exceljs, and pdfkit.

---

## 5. Start the Server

**For development** (auto-restarts when you edit files):

```bash
npm run dev
```

**For production / normal start:**

```bash
npm start
```

The server will start at:

```
http://localhost:5000
```

Open `index.html` in your browser, or navigate directly to `http://localhost:5000`.

---

## 6. Create an Admin Account

There is no admin registration page. To create an admin user, run this SQL query in MySQL after signing up normally:

```sql
USE wtg_commuters_guide;
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then log in with that account. The **Admin Panel** link will appear in the navigation.

---

## 7. Run the ETL (Analytics)

After the app has been used for a while, populate the OLAP analytics data by going to:

**Admin Panel → ETL → Run ETL Now**

Or call the API directly:

```bash
curl -X POST http://localhost:5000/api/etl/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

This moves data from the main database into the analytics database so the Analytics and Reports sections work.

---

## Project Structure

```
project/
├── server.js           — Express server entry point
├── db.js               — MySQL connection pool
├── auth.js             — Client-side authentication module
├── user.js             — Client-side user actions (save routes, comments)
├── routes.js           — Client-side route search and rendering
├── admin.js            — Admin panel JavaScript
├── api/
│   ├── auth.js         — Signup and login endpoints
│   ├── user.js         — Profile, saved routes, comments endpoints
│   ├── routes.js       — Route search and CRUD endpoints
│   ├── admin.js        — Admin user/comment management endpoints
│   ├── history.js      — Search history endpoints
│   ├── etl.js          — ETL pipeline endpoint
│   ├── analytics.js    — OLAP analytics query endpoints
│   └── reports.js      — Report and export endpoints
├── migrations/
│   └── add_oltp_olap.sql — OLAP schema migration
├── database.sql        — Main database schema
├── *.html              — Frontend pages
└── style.css           — Global styles
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Log in |
| GET | `/api/user/profile` | Get current user profile |
| GET | `/api/routes` | List all routes |
| GET | `/api/routes/search/smart?from=&to=` | Smart route search |
| GET | `/api/routes/popular` | Top 4 popular routes |
| GET | `/api/history` | User's search history |
| DELETE | `/api/history` | Clear all history |
| POST | `/api/etl/run` | Run ETL pipeline (admin) |
| GET | `/api/analytics/summary` | Search stats summary (admin) |
| GET | `/api/reports/route-usage` | Route usage report (admin) |
| GET | `/api/reports/export/csv?report=route-usage` | Export as CSV (admin) |
| GET | `/api/reports/export/excel?report=route-usage` | Export as Excel (admin) |
| GET | `/api/reports/export/pdf?report=route-usage` | Export as PDF (admin) |
| GET | `/api/health` | Server health check |

---

## Troubleshooting

**"Cannot connect to MySQL"**
- Make sure MySQL is running on your machine
- Check that `DB_PASSWORD` in `.env` matches your MySQL root password
- Confirm the database exists: `SHOW DATABASES;` in MySQL

**"JWT_SECRET is not defined"**
- Make sure your `.env` file exists in the project root and has `JWT_SECRET` set

**Port already in use**
- Change `SERVER_PORT` in `.env` to another port (e.g. `5001`)

**Analytics shows no data**
- Go to Admin Panel → ETL and click "Run ETL Now" to populate the OLAP database
