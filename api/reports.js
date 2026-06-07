/**
 * api/reports.js — Reporting & Export
 *
 * Reports pull from commuter_olap star schema.
 * Exports: CSV (built-in), Excel (exceljs), PDF (pdfkit)
 *
 * Endpoints (admin-only):
 *   GET /api/reports/route-usage       — route usage data
 *   GET /api/reports/route-popularity  — popularity ranking
 *   GET /api/reports/route-ratings     — ratings report
 *   GET /api/reports/export/csv?report=route-usage|route-popularity|route-ratings
 *   GET /api/reports/export/excel?report=...
 *   GET /api/reports/export/pdf?report=...
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

/* ------------------------------------------------------- REPORT DATA FETCHERS --------------------------------------------------------------------------------------- */

async function fetchRouteUsage(filters = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (filters.from_date)   { conditions.push('d.full_date >= ?');    params.push(filters.from_date); }
  if (filters.to_date)     { conditions.push('d.full_date <= ?');    params.push(filters.to_date); }
  if (filters.route_id)    { conditions.push('r.route_id = ?');      params.push(filters.route_id); }
  if (filters.destination) { conditions.push('r.destination = ?');   params.push(filters.destination); }

  const [rows] = await pool.query(
    `SELECT r.route_id, r.origin, r.destination,
            d.full_date,
            SUM(f.search_count) AS searches,
            SUM(f.save_count)   AS saves,
            ROUND(AVG(f.average_rating),2) AS avg_rating
     FROM commuter_olap.fact_route_usage f
     JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
     JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
     WHERE ${conditions.join(' AND ')}
     GROUP BY r.route_key, d.full_date
     ORDER BY d.full_date DESC, searches DESC
     LIMIT 1000`,
    params
  );
  return rows;
}

async function fetchRoutePopularity(filters = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (filters.destination) { conditions.push('r.destination = ?'); params.push(filters.destination); }

  const [rows] = await pool.query(
    `SELECT r.route_id, r.origin, r.destination,
            SUM(f.search_count) AS total_searches,
            SUM(f.save_count)   AS total_saves,
            ROUND(AVG(f.average_rating),2) AS avg_rating,
            RANK() OVER (ORDER BY SUM(f.search_count) DESC) AS popularity_rank
     FROM commuter_olap.fact_route_usage f
     JOIN commuter_olap.dim_route r ON r.route_key = f.route_key
     JOIN commuter_olap.dim_date  d ON d.date_key  = f.date_key
     WHERE ${conditions.join(' AND ')}
     GROUP BY r.route_key
     ORDER BY total_searches DESC
     LIMIT 100`,
    params
  );
  return rows;
}

async function fetchRouteRatings(filters = {}) {
  const conditions = ["c.rating IS NOT NULL"];
  const params = [];
  if (filters.route_id)    { conditions.push('c.route_id = ?');      params.push(filters.route_id); }
  if (filters.destination) { conditions.push('r.to_location = ?');   params.push(filters.destination); }

  const [rows] = await pool.query(
    `SELECT c.route_id, r.from_location AS origin, r.to_location AS destination,
            COUNT(c.id)          AS total_ratings,
            ROUND(AVG(c.rating),2) AS avg_rating,
            MIN(c.rating)        AS min_rating,
            MAX(c.rating)        AS max_rating,
            SUM(CASE WHEN c.rating = 5 THEN 1 ELSE 0 END) AS five_star,
            SUM(CASE WHEN c.rating = 4 THEN 1 ELSE 0 END) AS four_star,
            SUM(CASE WHEN c.rating = 3 THEN 1 ELSE 0 END) AS three_star,
            SUM(CASE WHEN c.rating = 2 THEN 1 ELSE 0 END) AS two_star,
            SUM(CASE WHEN c.rating = 1 THEN 1 ELSE 0 END) AS one_star
     FROM wtg_commuters_guide.comments c
     JOIN wtg_commuters_guide.routes r ON r.route_id = c.route_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY c.route_id, r.from_location, r.to_location
     ORDER BY avg_rating DESC`,
    params
  );
  return rows;
}

const REPORT_MAP = {
  'route-usage':       { fetch: fetchRouteUsage,       title: 'Route Usage Report' },
  'route-popularity':  { fetch: fetchRoutePopularity,  title: 'Route Popularity Report' },
  'route-ratings':     { fetch: fetchRouteRatings,     title: 'Route Ratings Report' }
};

/* ------------------------------------------------------- JSON ENDPOINTS --------------------------------------------------------------------------------------- */

router.get('/route-usage', verifyAdmin, async (req, res) => {
  try { res.json(await fetchRouteUsage(req.query)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/route-popularity', verifyAdmin, async (req, res) => {
  try { res.json(await fetchRoutePopularity(req.query)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/route-ratings', verifyAdmin, async (req, res) => {
  try { res.json(await fetchRouteRatings(req.query)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ------------------------------------------------------- CSV EXPORT --------------------------------------------------------------------------------------- */

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape  = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\r\n');
}

router.get('/export/csv', verifyAdmin, async (req, res) => {
  const report = req.query.report || 'route-usage';
  const def = REPORT_MAP[report];
  if (!def) return res.status(400).json({ error: 'Unknown report. Use: route-usage, route-popularity, route-ratings' });

  try {
    const rows = await def.fetch(req.query);
    const csv  = toCSV(rows);
    const fname = `${report}-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------- EXCEL EXPORT --------------------------------------------------------------------------------------- */

router.get('/export/excel', verifyAdmin, async (req, res) => {
  const report = req.query.report || 'route-usage';
  const def = REPORT_MAP[report];
  if (!def) return res.status(400).json({ error: 'Unknown report' });

  try {
    const ExcelJS = require('exceljs');
    const rows = await def.fetch(req.query);
    const wb   = new ExcelJS.Workbook();
    wb.creator  = 'WTG Commuters Guide';
    wb.created  = new Date();
    const ws    = wb.addWorksheet(def.title);

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      ws.columns = headers.map(h => ({
        header: h.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
        key: h,
        width: Math.max(h.length + 4, 16)
      }));

      /* Style header row */
      ws.getRow(1).eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'thin' } };
      });

      rows.forEach(r => ws.addRow(r));

      /* Auto-filter */
      ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}1` };
    } else {
      ws.addRow(['No data found']);
    }

    const fname = `${report}-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return res.status(500).json({ error: 'exceljs not installed. Run: npm install exceljs' });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------- PDF EXPORT --------------------------------------------------------------------------------------- */

router.get('/export/pdf', verifyAdmin, async (req, res) => {
  const report = req.query.report || 'route-usage';
  const def = REPORT_MAP[report];
  if (!def) return res.status(400).json({ error: 'Unknown report' });

  try {
    const PDFDocument = require('pdfkit');
    const rows = await def.fetch(req.query);
    const fname = `${report}-${new Date().toISOString().slice(0,10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    /* Title */
    doc.fontSize(18).font('Helvetica-Bold').text(def.title, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
       .text(`Generated: ${new Date().toLocaleString()}  |  WTG Commuters Guide`, { align: 'center' });
    doc.moveDown(1);

    if (!rows.length) {
      doc.fontSize(12).fillColor('#333').text('No data found for the selected filters.');
      doc.end();
      return;
    }

    const headers = Object.keys(rows[0]);
    const pageW   = doc.page.width - 80;
    const colW    = Math.floor(pageW / headers.length);
    let   y       = doc.y;

    /* Draw header row */
    doc.rect(40, y, pageW, 20).fill('#2563EB');
    headers.forEach((h, i) => {
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
         .text(h.replace(/_/g,' ').toUpperCase(), 40 + i * colW + 2, y + 5, { width: colW - 4, ellipsis: true });
    });
    y += 22;

    /* Draw data rows */
    rows.slice(0, 200).forEach((row, ri) => {
      if (y + 18 > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }
      if (ri % 2 === 0) doc.rect(40, y - 2, pageW, 18).fill('#F3F4F6');
      headers.forEach((h, i) => {
        const val = row[h] != null ? String(row[h]) : '';
        doc.fillColor('#111').fontSize(7).font('Helvetica')
           .text(val, 40 + i * colW + 2, y + 2, { width: colW - 4, ellipsis: true });
      });
      y += 18;
    });

    if (rows.length > 200) {
      doc.moveDown().fontSize(9).fillColor('#666')
         .text(`Note: Showing first 200 of ${rows.length} rows. Use CSV/Excel export for full data.`);
    }

    doc.end();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return res.status(500).json({ error: 'pdfkit not installed. Run: npm install pdfkit' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
