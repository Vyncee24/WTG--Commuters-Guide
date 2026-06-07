/**
 * api/admin.js — Admin-only API routes for WTG: Commuters Guide
 * Requires a valid JWT with role === 'admin'
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

/* ------------------------------------------------------- AUTH MIDDLEWARE --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- GET /API/ADMIN/STATS --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- GET /API/ADMIN/USERS --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- PUT /API/ADMIN/USERS/:ID --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- PUT /API/ADMIN/USERS/:ID/STATUS --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- DELETE /API/ADMIN/USERS/:ID --------------------------------------------------------------------------------------- */
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=? AND role!=?', [req.params.id, 'admin']);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

/* ------------------------------------------------------- GET /API/ADMIN/COMMENTS --------------------------------------------------------------------------------------- */
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

/* ------------------------------------------------------- DELETE /API/ADMIN/COMMENTS/:ID --------------------------------------------------------------------------------------- */
router.delete('/comments/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM comments WHERE id=?', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Admin delete comment error:', err);
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});


/* ------------------------------------------------------- GET /API/ADMIN/EXPORT-SQL --------------------------------------------------------------------------------------- */
/* Generates a .sql dump of wtg_commuters_guide using pure Node/MySQL queries (no mysqldump needed) */
router.get('/export-sql', verifyAdmin, async (req, res) => {
  try {
    const TABLES = ['users', 'routes', 'saved_routes', 'comments', 'search_history'];
    const lines = [];

    lines.push('-- =============================================================================');
    lines.push('-- WTG: Commuters Guide — Live Database Export');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- Import: mysql -u root -p < database.sql');
    lines.push('-- =============================================================================');
    lines.push('');
    lines.push('SET NAMES utf8mb4;');
    lines.push('SET FOREIGN_KEY_CHECKS = 0;');
    lines.push('');

    for (const table of TABLES) {
      // Get CREATE TABLE statement
      let createSql = '';
      try {
        const [[showRow]] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
        createSql = showRow['Create Table'];
      } catch {
        continue; // table may not exist yet (e.g. search_history)
      }

      lines.push(`-- -----------------------------------------------------------------------------`);
      lines.push(`-- TABLE: ${table}`);
      lines.push(`-- -----------------------------------------------------------------------------`);
      lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      lines.push(createSql + ';');
      lines.push('');

      // Get rows
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => `\`${c}\``).join(', ');

      const escapeVal = (v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'bigint') return String(v);
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
      };

      // Batch inserts of 50 rows each
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const values = batch.map(row =>
          '(' + cols.map(c => escapeVal(row[c])).join(', ') + ')'
        ).join(',\n  ');
        lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES`);
        lines.push(`  ${values};`);
        lines.push('');
      }
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    lines.push('');
    lines.push(`-- Export complete: ${new Date().toISOString()}`);

    const sql = lines.join('\n');
    const fname = `wtg_commuters_guide_${new Date().toISOString().slice(0, 10)}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(sql);

  } catch (err) {
    console.error('Export SQL error:', err);
    res.status(500).json({ error: 'Failed to generate SQL export: ' + err.message });
  }
});

module.exports = router;
