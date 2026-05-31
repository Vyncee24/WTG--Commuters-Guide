# 🚀 Start Here - 5 Minute Quick Start

## Keep This Order ⬇️

### 1️⃣ Start XAMPP MySQL (1 minute)
```
Open: C:\xampp\xampp-control.exe
Click: Start (next to MySQL)
Wait for: Green "Running" status
```

### 2️⃣ Install Node Dependencies (2 minutes)
```powershell
npm install
```

### 3️⃣ Setup Database (1 minute)
```powershell
node setup-database.js
```

Wait for ✅ success message

### 4️⃣ Start Backend Server (Keep running)
```powershell
npm start
```

Wait for message:
```
🚀 WTG Commuters Guide server running on http://localhost:5000
```

### 5️⃣ Open Your App
```
http://localhost:5000
```

---

## ✅ Test It Works

1. Click **Sign Up**
2. Create account with any email
3. See your name on top-right ✅
4. Go to **Profile** → **Saved Routes** → (empty)
5. Find a route → Click **Save** ✅
6. Go back to **Profile** → See saved route ✅

**All working? You're done!** 🎉

---

## 🔑 Important Credentials

### XAMPP MySQL
- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: (empty)

### phpMyAdmin
- http://localhost/phpmyadmin
- User: `root`
- Password: (empty)

### Backend API
- http://localhost:5000
- http://localhost:5000/api

---

## 🛑 If Something Breaks

### "Can't connect to localhost:5000"
→ Make sure you ran `npm start` and it says "🚀 running"

### "MySQL connection failed"
→ XAMPP Control Panel → Click Start next to MySQL

### "Signup fails / Database error"
→ Run `node setup-database.js` again

### "Login doesn't work"
→ Check you created account via Sign Up first

---

## 📚 Full Guides Available

- `MYSQL_STEP_BY_STEP.md` - Detailed MySQL setup
- `MYSQL_SETUP.md` - Database & API reference
- `INTEGRATION_GUIDE.md` - Frontend-Backend connection details

---

**Questions? Check the guides or the code comments!**

Happy commuting! 🚐
