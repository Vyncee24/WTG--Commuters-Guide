/**
 * api/routes.js — Routes API
 * Handles route search and retrieval
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all routes
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [routes] = await connection.query(
      'SELECT * FROM routes ORDER BY id'
    );

    connection.release();

    res.json(routes);
  } catch (error) {
    console.error('Get Routes Error:', error);
    res.status(500).json({ error: 'Server error fetching routes' });
  }
});

// Search routes by from/to location
router.get('/search', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Please provide from and to locations' });
    }

    const connection = await pool.getConnection();
    const [routes] = await connection.query(
      'SELECT * FROM routes WHERE from_location LIKE ? OR to_location LIKE ?',
      [`%${from}%`, `%${to}%`]
    );

    connection.release();

    res.json(routes);
  } catch (error) {
    console.error('Search Routes Error:', error);
    res.status(500).json({ error: 'Server error searching routes' });
  }
});

module.exports = router;
