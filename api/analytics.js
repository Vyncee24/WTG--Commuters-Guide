/**
 * api/analytics.js — OLAP Analytics Queries
 *
 * All queries hit commuter_olap (OLAP database) via JOIN to get dimension details.
 * Admin-protected except where noted.
 *
 * Endpoints:
 *   GET /api/analytics/summary          — total/today/month search counts
 *   GET /api/analytics/most-searched    — top searched routes
 *   GET /api/analytics/destinations     — most popular destinations
 *   GET /api/analytics/most-saved       — most saved routes
 *   GET /api/analytics/top-rated        — top rated routes
 *   GET /api/analytics/trend            — search count by day (last 30 days)
 *   GET /api/analytics/rollup           — roll-up: day→month→year
 *   GET /api/analytics/drilldown        — drill-down: year→month→day
 *   GET /api/analytics/slice            — slice by destination
 *   GET /api/analytics/dice             — dice: destination+month+min_rating
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

/* ------------------------------------------------------- ADMIN-ONLY MIDDLEWARE --------------------------------------------------------------------------------------- */
function verifyAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

/* ------------------------------------------------------- ANALYTICS DASHBOARD WIDGETS --------------------------------------------------------------------------------------- */

/* GET /api/analytics/summary — total / today / this month searches */
router.get('/summary', verifyAdmin, async (req, res) => {
  try {
    const [[{ total }]]    = await pool.query(
      'SELECT COALESCE(SUM(search_count),0) AS total FROM commuter_olap.fact_route_usage'
    );
    const todayKey = todayDateKey();
    const [[{ today }]]   = await pool.query(
      'SELECT COALESCE(SUM(search_count),0) AS today FROM commuter_olap.fact_route_usage WHERE date_key = ?',
      [todayKey]
    );
    const { y, m } = currentYearMonth();
    const [[{ thisMonth }]] = await pool.query(
      `SELECT COALESCE(SUM(f.search_count),0) AS thisMonth
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_date d ON d.date_key = f.date_key
       WHERE d.year = ? AND d.month = ?`,
      [y, m]
    );
    res.json({ total, today, thisMonth });
  } catch (err) {
    console.error('[analytics/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/most-searched?limit=10 — top routes by search count */
router.get('/most-searched', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await pool.query(
      `SELECT r.route_id, r.origin, r.destination,
              SUM(f.search_count) AS total_searches
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       GROUP BY r.route_key
       ORDER BY total_searches DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics/most-searched]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/destinations?limit=10 — most popular destinations */
router.get('/destinations', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await pool.query(
      `SELECT r.destination,
              SUM(f.search_count) AS total_searches
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       GROUP BY r.destination
       ORDER BY total_searches DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics/destinations]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/most-saved?limit=10 — most saved routes */
router.get('/most-saved', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await pool.query(
      `SELECT r.route_id, r.origin, r.destination,
              SUM(f.save_count) AS total_saves
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       GROUP BY r.route_key
       ORDER BY total_saves DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics/most-saved]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/top-rated?limit=10 — highest average rating */
router.get('/top-rated', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await pool.query(
      `SELECT r.route_id, r.origin, r.destination,
              ROUND(AVG(f.average_rating), 2) AS avg_rating,
              SUM(f.search_count) AS total_searches
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       WHERE f.average_rating IS NOT NULL
       GROUP BY r.route_key
       ORDER BY avg_rating DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics/top-rated]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/trend?days=30 — daily search count trend */
router.get('/trend', verifyAdmin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT d.full_date, SUM(f.search_count) AS searches
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_date d ON d.date_key = f.date_key
       WHERE d.full_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY d.full_date
       ORDER BY d.full_date`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics/trend]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ------------------------------------------------------- OLAP QUERIES --------------------------------------------------------------------------------------- */

/* GET /api/analytics/rollup?route_id=...&destination=... — roll-up day→month→year */
router.get('/rollup', verifyAdmin, async (req, res) => {
  try {
    const { route_id, destination } = req.query;
    let whereClause = '1=1';
    const params = [];
    if (route_id)    { whereClause += ' AND r.route_id = ?';    params.push(route_id); }
    if (destination) { whereClause += ' AND r.destination = ?'; params.push(destination); }

    /* MySQL WITH ROLLUP groups: (year,month,day), (year,month,NULL), (year,NULL,NULL), (NULL,NULL,NULL) */
    const [rows] = await pool.query(
      `SELECT d.year, d.month, d.day,
              SUM(f.search_count) AS total_searches,
              SUM(f.save_count)   AS total_saves,
              ROUND(AVG(f.average_rating),2) AS avg_rating
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       WHERE ${whereClause}
       GROUP BY d.year, d.month, d.day WITH ROLLUP
       ORDER BY d.year, d.month, d.day`,
      params
    );

    /* Label the rollup levels */
    const labeled = rows.map(row => ({
      ...row,
      level: row.day != null ? 'day' : row.month != null ? 'month' : row.year != null ? 'year' : 'grand_total'
    }));

    res.json(labeled);
  } catch (err) {
    console.error('[analytics/rollup]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/drilldown?year=2025&month=6&destination=... — drill-down year→month→day */
router.get('/drilldown', verifyAdmin, async (req, res) => {
  try {
    const { year, month, day, destination } = req.query;

    /* Granularity: if day provided → show per-route breakdown for that specific day,
       if month provided → show daily, if year provided → show monthly */
    let groupBy, selectFields;
    if (day) {
      groupBy      = 'r.route_id, r.origin, r.destination';
      selectFields = `r.origin, r.destination, ? AS year, ? AS month, ? AS day`;
    } else if (month) {
      groupBy      = 'd.year, d.month, d.day';
      selectFields = 'd.year, d.month, d.day, NULL AS origin, NULL AS destination';
    } else {
      groupBy      = 'd.year, d.month';
      selectFields = 'd.year, d.month, NULL AS day, NULL AS origin, NULL AS destination';
    }

    const whereConditions = ['1=1'];
    const params = [];

    if (day) { params.push(year, month, day); }

    if (year)        { whereConditions.push('d.year = ?');        params.push(year); }
    if (month)       { whereConditions.push('d.month = ?');       params.push(month); }
    if (day)         { whereConditions.push('d.day = ?');         params.push(day); }
    if (destination) { whereConditions.push('r.destination = ?'); params.push(destination); }

    const [rows] = await pool.query(
      `SELECT ${selectFields},
              SUM(f.search_count) AS total_searches,
              SUM(f.save_count)   AS total_saves,
              ROUND(AVG(f.average_rating),2) AS avg_rating
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY ${groupBy}
       ORDER BY ${day ? 'total_searches DESC' : groupBy}`,
      params
    );

    res.json({
      level: day ? 'route' : month ? 'day' : 'month',
      filters: { year, month, day, destination },
      rows
    });
  } catch (err) {
    console.error('[analytics/drilldown]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/slice?destination=SM%20Tanza — slice by destination */
router.get('/slice', verifyAdmin, async (req, res) => {
  try {
    const { destination } = req.query;
    if (!destination) return res.status(400).json({ error: 'destination query param required' });

    const [rows] = await pool.query(
      `SELECT r.origin, r.destination, d.full_date,
              f.search_count, f.save_count, f.average_rating
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
       WHERE r.destination = ?
       ORDER BY d.full_date DESC
       LIMIT 200`,
      [destination]
    );

    res.json({ slice: { destination }, rows });
  } catch (err) {
    console.error('[analytics/slice]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/analytics/dice?destination=SM%20Tanza&month=6&min_rating=4 — dice */
router.get('/dice', verifyAdmin, async (req, res) => {
  try {
    const { destination, month, min_rating } = req.query;
    const conditions = ['1=1'];
    const params = [];

    if (destination) { conditions.push('r.destination = ?');       params.push(destination); }
    if (month)       { conditions.push('d.month = ?');             params.push(parseInt(month)); }
    if (min_rating)  { conditions.push('f.average_rating >= ?');   params.push(parseFloat(min_rating)); }

    const [rows] = await pool.query(
      `SELECT r.origin, r.destination, d.year, d.month,
              SUM(f.search_count)            AS total_searches,
              SUM(f.save_count)              AS total_saves,
              ROUND(AVG(f.average_rating),2) AS avg_rating
       FROM commuter_olap.fact_route_usage f
       JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
       JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
       WHERE ${conditions.join(' AND ')}
       GROUP BY r.route_key, d.year, d.month
       ORDER BY avg_rating DESC, total_searches DESC`,
      params
    );

    res.json({ dice: { destination, month, min_rating }, rows });
  } catch (err) {
    console.error('[analytics/dice]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ------------------------------------------------------- HELPERS --------------------------------------------------------------------------------------- */
function todayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return parseInt(`${y}${m}${day}`, 10);
}

function currentYearMonth() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

module.exports = router;
