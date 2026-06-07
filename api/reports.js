/**
 * api/reports.js — Reporting & Export
 *
 * Reports pull from commuter_olap star schema.
 * Exports: CSV (built-in), Excel (exceljs), PDF (pdfkit)
 *
 * Endpoints (admin-only):
 *   GET /api/reports/route-usage       — route usage data
 *   GET /api/reports/route-popularity  — popularity ranking
 *   GET /api/reports/export/csv?report=route-usage|route-popularity
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
  const token  = header.startsWith('Bearer ') ? header.slice(7) : (req.query._token || null);
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
            SUM(f.save_count)   AS saves
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


const REPORT_MAP = {
  'route-usage':       { fetch: fetchRouteUsage,       title: 'Route Usage Report' },
  'route-popularity':  { fetch: fetchRoutePopularity,  title: 'Route Popularity Report' }
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


/* ------------------------------------------------------- VALUE FORMATTER --------------------------------------------------------------------------------------- */

  /* Cleans up values before output: formats Date objects, trims null/undefined */
  function formatVal(v) {
    if (v == null) return '';
    if (v instanceof Date) {
      /* Format as YYYY-MM-DD */
      const y  = v.getFullYear();
      const mo = String(v.getMonth() + 1).padStart(2, '0');
      const d  = String(v.getDate()).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    }
    /* MySQL sometimes returns date strings — strip timezone suffix */
    if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(v)) {
      return v.slice(0, 10);
    }
    return v;
  }

  /* Pretty column header: snake_case → Title Case */
  function prettyHeader(h) {
    return h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /* Determine if a column key is numeric (for alignment) */
  function isNumericKey(h) {
    return /count|searches|saves|rating|rank|star|total|avg|min|max/i.test(h);
  }

  /* ------------------------------------------------------- CSV EXPORT --------------------------------------------------------------------------------------- */

  function toCSV(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape  = (v) => {
      const s = String(formatVal(v));
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      headers.map(prettyHeader).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(','))
    ].join('\r\n');
  }

  router.get('/export/csv', verifyAdmin, async (req, res) => {
    const report = req.query.report || 'route-usage';
    const def = REPORT_MAP[report];
    if (!def) return res.status(400).json({ error: 'Unknown report. Use: route-usage or route-popularity' });

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

      /* WTG brand green */
      const BRAND_HEX = 'FF4D5D53';

      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);

        /* Smart column widths: date cols wider, number cols narrower */
        ws.columns = keys.map(h => {
          let width = 16;
          if (/date/i.test(h))        width = 14;
          if (/id|route/i.test(h))    width = 24;
          if (/origin|dest/i.test(h)) width = 20;
          if (isNumericKey(h))        width = 14;
          return { header: prettyHeader(h), key: h, width };
        });

        /* Style header row */
        ws.getRow(1).eachCell(cell => {
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_HEX } };
          cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
          cell.border    = { bottom: { style: 'medium', color: { argb: 'FF2C3A30' } } };
        });
        ws.getRow(1).height = 22;

        /* Freeze header row */
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        /* Add data rows with formatting */
        rows.forEach((r, ri) => {
          const rowData = {};
          keys.forEach(h => { rowData[h] = formatVal(r[h]); });
          const wsRow = ws.addRow(rowData);
          wsRow.height = 18;

          /* Alternating row fill */
          const fillColor = ri % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F3';
          wsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            const key = keys[colNum - 1];
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            cell.alignment = { vertical: 'middle', horizontal: isNumericKey(key) ? 'right' : 'left' };
            cell.border    = {
              top:    { style: 'hair', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
              left:   { style: 'hair', color: { argb: 'FFD1D5DB' } },
              right:  { style: 'hair', color: { argb: 'FFD1D5DB' } }
            };
            cell.font = { size: 9 };
          });
        });

        /* Auto-filter on header */
        ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + keys.length)}1` };

        /* Metadata row at bottom */
        ws.addRow([]);
        const metaRow = ws.addRow([`Generated: ${new Date().toLocaleString('en-PH')}  |  WTG Commuters Guide — ${def.title}`]);
        metaRow.getCell(1).font = { italic: true, size: 8, color: { argb: 'FF9CA3AF' } };

      } else {
        ws.addRow(['No data found for the selected filters.']);
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

      const MARGIN  = 40;
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4', layout: 'landscape' });
      doc.pipe(res);

      const PAGE_W  = doc.page.width;
      const PAGE_H  = doc.page.height;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      /* ── Title block ── */
      doc.rect(0, 0, PAGE_W, 52).fill('#4d5d53');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
         .text(def.title, MARGIN, 14, { width: CONTENT_W, align: 'left' });
      doc.fillColor('rgba(255,255,255,0.7)').fontSize(8).font('Helvetica')
         .text(
           `WTG Commuters Guide  ·  Generated ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}`,
           MARGIN, 34, { width: CONTENT_W, align: 'left' }
         );

      let y = 68;

      if (!rows.length) {
        doc.fillColor('#333').fontSize(11).text('No data found for the selected filters.', MARGIN, y);
        doc.end();
        return;
      }

      const keys    = Object.keys(rows[0]);

      /* Smart column width ratios based on key type */
      const rawWeights = keys.map(h => {
        if (/id|route_id/i.test(h))    return 3.0;
        if (/origin|dest/i.test(h))    return 2.5;
        if (/date/i.test(h))           return 2.0;
        if (isNumericKey(h))           return 1.2;
        return 1.8;
      });
      const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
      const colWidths   = rawWeights.map(w => Math.floor((w / totalWeight) * CONTENT_W));

      const ROW_H   = 20;
      const HDR_H   = 24;
      const FONT_SZ = 7.5;

      /* ── Draw table header ── */
      const drawHeader = (yPos) => {
        doc.rect(MARGIN, yPos, CONTENT_W, HDR_H).fill('#4d5d53');
        let x = MARGIN;
        keys.forEach((h, i) => {
          doc.fillColor('#ffffff').fontSize(FONT_SZ).font('Helvetica-Bold')
             .text(
               prettyHeader(h).toUpperCase(),
               x + 4, yPos + 7,
               { width: colWidths[i] - 8, lineBreak: false, ellipsis: true }
             );
          x += colWidths[i];
        });
        return yPos + HDR_H;
      };

      /* ── Draw a single data row ── */
      const drawRow = (row, ri, yPos) => {
        /* Alternating background */
        if (ri % 2 === 0) {
          doc.rect(MARGIN, yPos, CONTENT_W, ROW_H).fill('#F8F8F8');
        } else {
          doc.rect(MARGIN, yPos, CONTENT_W, ROW_H).fill('#ffffff');
        }
        /* Bottom border */
        doc.moveTo(MARGIN, yPos + ROW_H).lineTo(MARGIN + CONTENT_W, yPos + ROW_H)
           .strokeColor('#E5E7EB').lineWidth(0.4).stroke();

        let x = MARGIN;
        keys.forEach((h, i) => {
          const raw = row[h];
          const val = String(formatVal(raw));
          const align = isNumericKey(h) ? 'right' : 'left';
          const xText = align === 'right' ? x + 4 : x + 4;
          doc.fillColor('#1F2937').fontSize(FONT_SZ).font('Helvetica')
             .text(val, xText, yPos + 6,
               { width: colWidths[i] - 8, lineBreak: false, ellipsis: true, align });
          x += colWidths[i];
        });
      };

      /* ── Render header then rows ── */
      y = drawHeader(y);

      let pageNum = 1;
      rows.slice(0, 500).forEach((row, ri) => {
        /* New page if needed */
        if (y + ROW_H > PAGE_H - 30) {
          /* Footer on current page */
          doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
             .text(`Page ${pageNum}  ·  WTG Commuters Guide`, MARGIN, PAGE_H - 22, { width: CONTENT_W, align: 'center' });
          doc.addPage({ layout: 'landscape' });
          pageNum++;
          y = drawHeader(MARGIN);
        }
        drawRow(row, ri, y);
        y += ROW_H;
      });

      /* ── Left/right table borders ── */
      doc.moveTo(MARGIN, 68).lineTo(MARGIN, y).strokeColor('#D1D5DB').lineWidth(0.5).stroke();
      doc.moveTo(MARGIN + CONTENT_W, 68).lineTo(MARGIN + CONTENT_W, y).stroke();

      /* ── Footer ── */
      if (rows.length > 500) {
        doc.fillColor('#9CA3AF').fontSize(7)
           .text(`Note: Showing first 500 of ${rows.length} rows. Use CSV/Excel for full data.`, MARGIN, y + 6);
      }
      doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
         .text(`Page ${pageNum}  ·  WTG Commuters Guide`, MARGIN, PAGE_H - 22, { width: CONTENT_W, align: 'center' });

      doc.end();
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        return res.status(500).json({ error: 'pdfkit not installed. Run: npm install pdfkit' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  module.exports = router;