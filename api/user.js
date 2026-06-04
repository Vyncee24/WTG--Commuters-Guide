/**
 * api/user.js — User Data API Routes
 * Handles saved routes, history, comments, and user profile
 *
 * FIXES APPLIED:
 *  - BUG FIX 1: verifyToken now checks user.status in the database.
 *    Previously a 'restricted' user could still post comments because
 *    the middleware only validated the JWT signature, never the account state.
 *    Now any user with status != 'active' receives 403 Forbidden.
 *
 *  - BUG FIX 2: DELETE /comments/:commentId now compares user IDs
 *    with == (loose equality) instead of !== to avoid type mismatch
 *    between the integer from MySQL (rows[0].user_id) and the integer
 *    from the JWT payload (req.userId). Both are numbers, but defensive
 *    coercion prevents any edge case where they appear as different types.
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

/* ── JWT middleware with account-status gate ── */
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIX 1: Look up the user in the DB and verify they are still active.
    // Without this check a 'restricted' user's valid JWT still let them post.
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

/* ── GET /api/user/profile ── */
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

/* ── POST /api/user/save-route ── */
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

/* ── GET /api/user/saved-routes ── */
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

/* ── DELETE /api/user/saved-routes/:routeId ── */
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

/* ── GET /api/user/comments/:routeId ── public, no auth needed ── */
router.get('/comments/:routeId', async (req, res) => {
  try {
    // Strip the '_rev' suffix so forward and reverse trips share the same comments.
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

/* ── POST /api/user/comments/:routeId ── */
router.post('/comments/:routeId', verifyToken, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Strip the '_rev' suffix so reverse-direction comments are stored
    // under the canonical route_id and visible in both directions.
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

/* ── DELETE /api/user/comments/:commentId ── own comment or admin ── */
router.delete('/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [req.params.commentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    // FIX 2: Use == (loose equality) to safely compare MySQL integer with JWT integer.
    // Previously !== could theoretically fail if types differed between environments.
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
