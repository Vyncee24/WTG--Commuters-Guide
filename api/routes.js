const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function score(query, target) {
  const q = normalize(query);
  const t = normalize(target);
  if (t === q) return 100;
  if (t.includes(q) || q.includes(t)) return 80;
  const words   = q.split(' ');
  const matched = words.filter(w => w.length > 2 && t.includes(w));
  return (matched.length / words.length) * 60;
}

function parseSteps(row) {
  try {
    if (typeof row.steps === 'string') row.steps = JSON.parse(row.steps);
    if (typeof row.tags  === 'string') row.tags  = JSON.parse(row.tags);
  } catch (_) {
    row.steps = [];
    row.tags  = [];
  }
  return row;
}

/* ── Admin-only middleware ── */
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

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routes ORDER BY id');
    res.json(rows.map(parseSteps));
  } catch (err) {
    console.error('GET /api/routes error:', err);
    res.status(500).json({ error: 'Server error fetching routes' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Please provide both from and to query parameters.' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM routes WHERE from_location LIKE ? OR to_location LIKE ? ORDER BY id',
      [`%${from}%`, `%${to}%`]
    );
    res.json(rows.map(parseSteps));
  } catch (err) {
    console.error('GET /api/routes/search error:', err);
    res.status(500).json({ error: 'Server error searching routes' });
  }
});

router.get('/search/smart', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Please provide both from and to query parameters.' });
    }
    const [rows] = await pool.query('SELECT * FROM routes ORDER BY id');
    const routes = rows.map(parseSteps);

    let best      = null;
    let bestScore = 0;
    let reversed  = false;

    for (const route of routes) {
      const fwd = (score(from, route.from_location) + score(to, route.to_location)) / 2;
      if (fwd > bestScore) { bestScore = fwd; best = route; reversed = false; }
      const rev = (score(from, route.to_location) + score(to, route.from_location)) / 2;
      if (rev > bestScore) { bestScore = rev; best = route; reversed = true; }
    }

    if (bestScore < 25 || !best) return res.json([]);

    if (reversed) {
      best = {
        ...best,
        route_id:      best.route_id + '_rev',
        from_location: best.to_location,
        to_location:   best.from_location,
        steps: best.steps.map((s, i) => ({ ...s, num: best.steps.length - i })).reverse()
      };
    }

    res.json([best]);
  } catch (err) {
    console.error('GET /api/routes/search/smart error:', err);
    res.status(500).json({ error: 'Server error during smart search' });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routes ORDER BY id LIMIT 4');
    res.json(rows.map(parseSteps));
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching popular routes' });
  }
});

router.get('/locations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT from_location AS loc FROM routes UNION SELECT DISTINCT to_location AS loc FROM routes ORDER BY loc'
    );
    res.json(rows.map(r => r.loc));
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching locations' });
  }
});

router.get('/:routeId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routes WHERE route_id = ?', [req.params.routeId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(parseSteps(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching route' });
  }
});

router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { route_id, from_location, to_location, duration, fare, transport_type, tags = [], steps = [], map_embed_url } = req.body;
    if (!route_id || !from_location || !to_location) {
      return res.status(400).json({ error: 'route_id, from_location, and to_location are required.' });
    }
    await pool.query(
      'INSERT INTO routes (route_id, from_location, to_location, duration, fare, transport_type, tags, steps, map_embed_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [route_id, from_location, to_location, duration || null, fare || null, transport_type || null, JSON.stringify(tags), JSON.stringify(steps), map_embed_url || null]
    );
    res.status(201).json({ message: 'Route created successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A route with that route_id already exists.' });
    res.status(500).json({ error: 'Server error creating route' });
  }
});

/* ── PUT /api/routes/:routeId — admin update route ── */
router.put('/:routeId', verifyAdmin, async (req, res) => {
  try {
    const { from_location, to_location, duration, fare, transport_type, tags, steps, map_embed_url } = req.body;
    if (!from_location || !to_location) {
      return res.status(400).json({ error: 'from_location and to_location are required.' });
    }
    const [result] = await pool.query(
      `UPDATE routes SET
        from_location=?, to_location=?, duration=?, fare=?,
        transport_type=?, tags=?, steps=?, map_embed_url=?
       WHERE route_id=?`,
      [
        from_location, to_location,
        duration || null, fare || null, transport_type || null,
        JSON.stringify(tags || []),
        JSON.stringify(steps || []),
        map_embed_url || null,
        req.params.routeId
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route updated successfully.' });
  } catch (err) {
    console.error('PUT /api/routes/:routeId error:', err);
    res.status(500).json({ error: 'Server error updating route' });
  }
});

/* ── DELETE /api/routes/:routeId — admin delete route ── */
router.delete('/:routeId', verifyAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM routes WHERE route_id=?', [req.params.routeId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted successfully.' });
  } catch (err) {
    console.error('DELETE /api/routes/:routeId error:', err);
    res.status(500).json({ error: 'Server error deleting route' });
  }
});

module.exports = router;
