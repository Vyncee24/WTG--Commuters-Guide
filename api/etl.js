/**
 * api/etl.js — ETL Pipeline
 *
 * EXTRACT  → Read from OLTP: search_history, saved_routes, comments
 * TRANSFORM → Aggregate per (date, route, user): search_count, save_count, avg_rating
 * LOAD     → Full-refresh: DELETE + INSERT into commuter_olap.fact_route_usage
 *
 * Endpoints (admin-only):
 *   POST /api/etl/run     — run the full ETL pipeline
 *   GET  /api/etl/status  — return last run status
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

let lastEtlStatus = null;

/* ------------------------------------------------------- UTILITY: GET OR INSERT DIM_ROUTE --------------------------------------------------------------------------------------- */
async function upsertDimRoute(conn, routeId, origin, destination) {
  await conn.query(
    `INSERT IGNORE INTO commuter_olap.dim_route (route_id, origin, destination)
     VALUES (?, ?, ?)`,
    [routeId, origin, destination]
  );
  const [[row]] = await conn.query(
    'SELECT route_key FROM commuter_olap.dim_route WHERE route_id = ?',
    [routeId]
  );
  return row.route_key;
}

/* ------------------------------------------------------- UTILITY: GET OR INSERT DIM_USER --------------------------------------------------------------------------------------- */
async function upsertDimUser(conn, userId, role) {
  await conn.query(
    `INSERT IGNORE INTO commuter_olap.dim_user (user_id, role) VALUES (?, ?)`,
    [userId, role || 'user']
  );
  const [[row]] = await conn.query(
    'SELECT user_key FROM commuter_olap.dim_user WHERE user_id = ?',
    [userId]
  );
  return row.user_key;
}

/* ------------------------------------------------------- DATE STRING TO YYYYMMDD INTEGER --------------------------------------------------------------------------------------- */
function toDateKey(dateVal) {
  const d   = new Date(dateVal);
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return parseInt(`${y}${m}${day}`, 10);
}

/* ------------------------------------------------------- MAIN ETL --------------------------------------------------------------------------------------- */
async function runETL() {
  const conn = await pool.getConnection();
  const log  = [];

  try {
    log.push({ step: 'START', ts: new Date().toISOString() });

    /* ------------------------------------------------------- EXTRACT --------------------------------------------------------------------------------------- */
    log.push({ step: 'EXTRACT', detail: 'reading search_history, saved_routes, comments' });

    const [searches] = await conn.query(
      `SELECT sh.id, sh.user_id, sh.route_id, sh.origin, sh.destination,
              DATE(sh.searched_at) AS search_date, u.role
       FROM wtg_commuters_guide.search_history sh
       LEFT JOIN wtg_commuters_guide.users u ON u.id = sh.user_id`
    );

    const [saves] = await conn.query(
      `SELECT sr.user_id, sr.route_id,
              sr.from_location AS origin, sr.to_location AS destination,
              DATE(sr.saved_at) AS save_date, u.role
       FROM wtg_commuters_guide.saved_routes sr
       LEFT JOIN wtg_commuters_guide.users u ON u.id = sr.user_id`
    );

    const [ratings] = await conn.query(
      `SELECT c.route_id,
              r.from_location AS origin, r.to_location AS destination,
              DATE(c.created_at) AS rating_date,
              AVG(c.rating)      AS avg_rating
       FROM wtg_commuters_guide.comments c
       JOIN wtg_commuters_guide.routes r ON r.route_id = c.route_id
       WHERE c.rating IS NOT NULL
       GROUP BY c.route_id, r.from_location, r.to_location, DATE(c.created_at)`
    );

    log.push({ step: 'EXTRACT_DONE', searches: searches.length, saves: saves.length, ratingRows: ratings.length });

    /* ------------------------------------------------------- TRANSFORM --------------------------------------------------------------------------------------- */
    log.push({ step: 'TRANSFORM', detail: 'aggregating into buckets' });

    const buckets = {};

    function bucketKey(dateKey, routeId, userId) {
      return `${dateKey}|${routeId}|${userId ?? 'anon'}`;
    }

    function ensureBucket(dateKey, routeId, origin, dest, userId, role) {
      const k = bucketKey(dateKey, routeId, userId);
      if (!buckets[k]) {
        buckets[k] = { dateKey, routeId, origin, dest, userId, role, searches: 0, saves: 0, ratings: [] };
      }
      return buckets[k];
    }

    for (const row of searches) {
      const dk  = toDateKey(row.search_date);
      const rid = row.route_id || `${row.origin}_${row.destination}`;
      ensureBucket(dk, rid, row.origin, row.destination, row.user_id, row.role).searches += 1;
    }

    for (const row of saves) {
      const dk  = toDateKey(row.save_date);
      const rid = row.route_id || `${row.origin}_${row.destination}`;
      ensureBucket(dk, rid, row.origin, row.destination, row.user_id, row.role).saves += 1;
    }

    for (const row of ratings) {
      const dk  = toDateKey(row.rating_date);
      ensureBucket(dk, row.route_id, row.origin, row.destination, null, 'user')
        .ratings.push(parseFloat(row.avg_rating));
    }

    const bucketList = Object.values(buckets);
    log.push({ step: 'TRANSFORM_DONE', buckets: bucketList.length });

    /* ------------------------------------------------------- LOAD --------------------------------------------------------------------------------------- */
    log.push({ step: 'LOAD', detail: 'DELETE existing facts then INSERT fresh data' });

    await conn.beginTransaction();

    try {
      /* Step 1: full-refresh — DELETE all existing facts.
         Using DELETE instead of TRUNCATE because:
           • DELETE only requires the DELETE privilege
           • TRUNCATE requires DROP privilege (often absent for non-root users)
           • DELETE is safe inside a transaction; TRUNCATE is DDL and auto-commits */
      const [delResult] = await conn.query('DELETE FROM commuter_olap.fact_route_usage');
      log.push({ step: 'DELETE_DONE', rowsDeleted: delResult.affectedRows });

      /* Step 2: insert fresh aggregated data */
      let loaded = 0;

      for (const b of bucketList) {
        const routeKey = await upsertDimRoute(conn, b.routeId, b.origin, b.dest);

        let userKey = null;
        if (b.userId != null) {
          userKey = await upsertDimUser(conn, b.userId, b.role);
        }

        const avgRating = b.ratings.length > 0
          ? (b.ratings.reduce((s, v) => s + v, 0) / b.ratings.length).toFixed(2)
          : null;

        await conn.query(
          `INSERT INTO commuter_olap.fact_route_usage
             (date_key, route_key, user_key, search_count, save_count, average_rating)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             search_count   = VALUES(search_count),
             save_count     = VALUES(save_count),
             average_rating = VALUES(average_rating)`,
          [b.dateKey, routeKey, userKey, b.searches, b.saves, avgRating]
        );
        loaded++;
      }

      await conn.commit();
      log.push({ step: 'LOAD_DONE', rowsInserted: loaded });

    } catch (loadErr) {
      await conn.rollback();
      throw loadErr;
    }

    log.push({ step: 'END', ts: new Date().toISOString(), success: true });

    lastEtlStatus = {
      success: true,
      ranAt: new Date().toISOString(),
      searches: searches.length,
      saves: saves.length,
      bucketsProcessed: bucketList.length,
      rowsInserted: bucketList.length,
      log
    };

    return lastEtlStatus;

  } catch (err) {
    console.error('[ETL] Pipeline error:', err);
    log.push({ step: 'ERROR', message: err.message });
    lastEtlStatus = { success: false, ranAt: new Date().toISOString(), error: err.message, log };
    throw err;
  } finally {
    conn.release();
  }
}

/* ------------------------------------------------------- POST /API/ETL/RUN --------------------------------------------------------------------------------------- */
router.post('/run', verifyAdmin, async (req, res) => {
  try {
    const result = await runETL();
    res.json({ message: 'ETL completed successfully', result });
  } catch (err) {
    res.status(500).json({ error: 'ETL pipeline failed', detail: err.message, log: lastEtlStatus?.log });
  }
});

/* ------------------------------------------------------- GET /API/ETL/STATUS --------------------------------------------------------------------------------------- */
router.get('/status', verifyAdmin, async (req, res) => {
  if (!lastEtlStatus) {
    return res.json({ message: 'No ETL run yet this session. Use POST /api/etl/run.' });
  }
  res.json(lastEtlStatus);
});

module.exports = router;
