/**
 * server.js — Express Backend Server
 * Handles API routes and MySQL database operations
 */

const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static('.'));

// API Routes
const authRoutes  = require('./api/auth');
const userRoutes  = require('./api/user');
const routesAPI   = require('./api/routes');
const adminRoutes = require('./api/admin');

app.use('/api/auth',  authRoutes);
app.use('/api/user',  userRoutes);
app.use('/api/routes', routesAPI);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 WTG Commuters Guide server running on http://localhost:${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api\n`);
});
