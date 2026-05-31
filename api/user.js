/**
 * api/user.js — User Data API Routes
 * Handles saved routes, history, and user profile
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Save a route
router.post('/save-route', verifyToken, async (req, res) => {
  try {
    const { routeId, from, to } = req.body;

    if (!routeId || !from || !to) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();

    // Check if already saved
    const [existing] = await connection.query(
      'SELECT * FROM saved_routes WHERE user_id = ? AND route_id = ?',
      [req.userId, routeId]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Route already saved' });
    }

    // Save route
    await connection.query(
      'INSERT INTO saved_routes (user_id, route_id, from_location, to_location, saved_at) VALUES (?, ?, ?, ?, NOW())',
      [req.userId, routeId, from, to]
    );

    connection.release();

    res.status(201).json({ message: 'Route saved successfully' });
  } catch (error) {
    console.error('Save Route Error:', error);
    res.status(500).json({ error: 'Server error saving route' });
  }
});

// Get saved routes
router.get('/saved-routes', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [routes] = await connection.query(
      'SELECT * FROM saved_routes WHERE user_id = ? ORDER BY saved_at DESC LIMIT 50',
      [req.userId]
    );

    connection.release();

    res.json(routes);
  } catch (error) {
    console.error('Get Saved Routes Error:', error);
    res.status(500).json({ error: 'Server error fetching saved routes' });
  }
});

// Delete saved route
router.delete('/saved-routes/:routeId', verifyToken, async (req, res) => {
  try {
    const { routeId } = req.params;
    const connection = await pool.getConnection();

    await connection.query(
      'DELETE FROM saved_routes WHERE user_id = ? AND route_id = ?',
      [req.userId, routeId]
    );

    connection.release();

    res.json({ message: 'Route removed from saved' });
  } catch (error) {
    console.error('Delete Route Error:', error);
    res.status(500).json({ error: 'Server error deleting route' });
  }
});

module.exports = router;
