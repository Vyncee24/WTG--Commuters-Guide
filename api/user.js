const express = require('express');
const router  = express.Router();
const pool    = require('../db');

/* ------------------------------------------------------- AUTH MIDDLEWARE --------------------------------------------------------------------------------------- */
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query(
      'SELECT id, role, status FROM users WHERE id = ?',
      [decoded.id]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'User account not found' });
    }
    const dbUser = users[0];
    if (dbUser.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been restricted. Please contact support.' });
    }

    req.userId   = dbUser.id;
    req.userRole = dbUser.role;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

/* ------------------------------------------------------- GET PROFILE --------------------------------------------------------------------------------------- */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

/* ------------------------------------------------------- SAVE ROUTE --------------------------------------------------------------------------------------- */
router.post('/save-route', verifyToken, async (req, res) => {
  try {
    const { routeId, from, to } = req.body;
    if (!routeId || !from || !to) return res.status(400).json({ error: 'Missing required fields' });

    const [existing] = await pool.query(
      'SELECT id FROM saved_routes WHERE user_id = ? AND route_id = ?',
      [req.userId, routeId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Route already saved' });

    await pool.query(
      'INSERT INTO saved_routes (user_id, route_id, from_location, to_location, saved_at) VALUES (?, ?, ?, ?, NOW())',
      [req.userId, routeId, from, to]
    );
    res.status(201).json({ message: 'Route saved successfully' });
  } catch (err) {
    console.error('Save Route Error:', err);
    res.status(500).json({ error: 'Server error saving route' });
  }
});

/* ------------------------------------------------------- GET SAVED ROUTES --------------------------------------------------------------------------------------- */
router.get('/saved-routes', verifyToken, async (req, res) => {
  try {
    const [routes] = await pool.query(
      'SELECT * FROM saved_routes WHERE user_id = ? ORDER BY saved_at DESC LIMIT 50',
      [req.userId]
    );
    res.json(routes);
  } catch (err) {
    console.error('Get Saved Routes Error:', err);
    res.status(500).json({ error: 'Server error fetching saved routes' });
  }
});

/* ------------------------------------------------------- DELETE SAVED ROUTE --------------------------------------------------------------------------------------- */
router.delete('/saved-routes/:routeId', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM saved_routes WHERE user_id = ? AND route_id = ?',
      [req.userId, req.params.routeId]
    );
    res.json({ message: 'Route removed from saved' });
  } catch (err) {
    console.error('Delete Route Error:', err);
    res.status(500).json({ error: 'Server error deleting route' });
  }
});

/* ------------------------------------------------------- GET COMMENTS --------------------------------------------------------------------------------------- */
router.get('/comments/:routeId', async (req, res) => {
  try {
    const canonicalRouteId = req.params.routeId.replace(/_rev$/, '');

    const [rows] = await pool.query(
      `SELECT c.id, c.route_id, c.comment, c.created_at,
              u.id AS user_id, u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.route_id = ?
       ORDER BY c.created_at DESC`,
      [canonicalRouteId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get Comments Error:', err);
    res.status(500).json({ error: 'Server error fetching comments' });
  }
});

/* ------------------------------------------------------- POST COMMENT --------------------------------------------------------------------------------------- */
router.post('/comments/:routeId', verifyToken, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const canonicalRouteId = req.params.routeId.replace(/_rev$/, '');

    const [result] = await pool.query(
      'INSERT INTO comments (user_id, route_id, comment) VALUES (?, ?, ?)',
      [req.userId, canonicalRouteId, comment.trim()]
    );
    res.status(201).json({ id: result.insertId, message: 'Comment posted' });
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Server error posting comment' });
  }
});

/* ------------------------------------------------------- DELETE COMMENT --------------------------------------------------------------------------------------- */
router.delete('/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [req.params.commentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    // eslint-disable-next-line eqeqeq
    if (req.userRole !== 'admin' && rows[0].user_id != req.userId) {
      return res.status(403).json({ error: 'Not allowed to delete this comment' });
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete Comment Error:', err);
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});

module.exports = router;
