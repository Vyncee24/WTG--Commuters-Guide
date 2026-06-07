const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

/* ------------------------------------------------------- EXISTING ROUTES --------------------------------------------------------------------------------------- */
const authRoutes  = require('./api/auth');
const userRoutes  = require('./api/user');
const routesAPI   = require('./api/routes');
const adminRoutes = require('./api/admin');

app.use('/api/auth',   authRoutes);
app.use('/api/user',   userRoutes);
app.use('/api/routes', routesAPI);
app.use('/api/admin',  adminRoutes);

/* ------------------------------------------------------- NEW ROUTES --------------------------------------------------------------------------------------- */
const historyRoutes   = require('./api/history');
const etlRoutes       = require('./api/etl');
const analyticsRoutes = require('./api/analytics');
const reportsRoutes   = require('./api/reports');

app.use('/api/history',   historyRoutes);
app.use('/api/etl',       etlRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports',   reportsRoutes);

/* ------------------------------------------------------- HEALTH CHECK --------------------------------------------------------------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

/* ------------------------------------------------------- 404 HANDLER --------------------------------------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/* ------------------------------------------------------- ERROR HANDLER --------------------------------------------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 WTG Commuters Guide server running on http://localhost:${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api\n`);
});
