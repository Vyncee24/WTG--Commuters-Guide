/**
 * api/admin.js — Admin-only API routes for WTG: Commuters Guide
 * Requires a valid JWT with role === 'admin'
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

/* ── Auth middleware: admin only ── */
function verifyAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

/* ── GET /api/admin/stats ── */
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [[{ total }]]      = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE role != 'admin'`);
    const [[{ active }]]     = await pool.query(`SELECT COUNT(*) AS active FROM users WHERE role != 'admin' AND status = 'active'`);
    const [[{ restricted }]] = await pool.query(`SELECT COUNT(*) AS restricted FROM users WHERE role != 'admin' AND status = 'restricted'`);
    const [[{ comments }]]   = await pool.query('SELECT COUNT(*) AS comments FROM comments');
    const [[{ routes }]]     = await pool.query('SELECT COUNT(*) AS routes FROM routes');
    res.json({ total, active, restricted, comments, routes });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

/* ── GET /api/admin/users ── */
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COUNT(DISTINCT sr.id) AS saved_count,
              COUNT(DISTINCT c.id)  AS comment_count
       FROM users u
       LEFT JOIN saved_routes sr ON sr.user_id = u.id
       LEFT JOIN comments c ON c.user_id = u.id
       WHERE u.role != 'admin'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

/* ── PUT /api/admin/users/:id ── update name/email/password */
router.put('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name=?, email=?, password=? WHERE id=? AND role!=?',
        [name, email, hashed, req.params.id, 'admin']);
    } else {
      await pool.query('UPDATE users SET name=?, email=? WHERE id=? AND role!=?',
        [name, email, req.params.id, 'admin']);
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use' });
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

/* ── PUT /api/admin/users/:id/status ── toggle active/restricted */
router.put('/users/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'restricted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE users SET status=? WHERE id=? AND role!=?',
      [status, req.params.id, 'admin']);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Admin toggle status error:', err);
    res.status(500).json({ error: 'Server error updating status' });
  }
});

/* ── DELETE /api/admin/users/:id ── */
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=? AND role!=?', [req.params.id, 'admin']);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

/* ── GET /api/admin/comments ── all comments with user + route info */
router.get('/comments', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.route_id, c.comment, c.created_at,
              u.name AS user_name, u.id AS user_id
       FROM comments c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin comments error:', err);
    res.status(500).json({ error: 'Server error fetching comments' });
  }
});

/* ── DELETE /api/admin/comments/:id ── */
router.delete('/comments/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM comments WHERE id=?', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Admin delete comment error:', err);
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});

module.exports = router;
