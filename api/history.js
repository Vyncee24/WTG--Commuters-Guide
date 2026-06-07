/**
 * api/history.js — Search History API
 *
 * Endpoints:
 *   GET    /api/history          — get authenticated user's search history
 *   DELETE /api/history/:id      — delete a single history entry
 *   DELETE /api/history          — clear all history for the user
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

/* ------------------------------------------------------- AUTH MIDDLEWARE --------------------------------------------------------------------------------------- */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

/* ------------------------------------------------------- GET /API/HISTORY --------------------------------------------------------------------------------------- */
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const [rows] = await pool.query(
      `SELECT id, route_id, origin, destination, searched_at
       FROM search_history
       WHERE user_id = ?
       ORDER BY searched_at DESC
       LIMIT ?`,
      [req.userId, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/history error:', err);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

/* ------------------------------------------------------- DELETE /API/HISTORY/:ID --------------------------------------------------------------------------------------- */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM search_history WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entry not found or not yours' });
    }
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error('DELETE /api/history/:id error:', err);
    res.status(500).json({ error: 'Server error deleting entry' });
  }
});

/* ------------------------------------------------------- DELETE /API/HISTORY --------------------------------------------------------------------------------------- */
router.delete('/', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM search_history WHERE user_id = ?', [req.userId]);
    res.json({ message: 'History cleared' });
  } catch (err) {
    console.error('DELETE /api/history error:', err);
    res.status(500).json({ error: 'Server error clearing history' });
  }
});

module.exports = router;
