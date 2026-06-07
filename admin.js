const ADMIN = (() => {

  let currentSection   = 'dashboard';
  let editingUserId    = null;
  let allUsers         = [];
  let currentReport    = 'route-usage';
  let _addRouteStepCount = 0;
  let _editRouteStepCount = 0;
  let _pendingDeleteRouteId = null;

  const API_URL = (window.location.protocol === 'file:')
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

  function _authHeader() {
    return { 'Authorization': `Bearer ${AUTH.getToken()}`, 'Content-Type': 'application/json' };
  }

  function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
  }

  /* ------------------------------------------------------- NAVIGATION --------------------------------------------------------------------------------------- */
  function navigate(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
    const sec = document.getElementById('section-' + section);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    currentSection = section;
    renderSection(section);
  }

  function renderSection(section) {
    if (section === 'dashboard') renderDashboard();
    if (section === 'users')     renderUsers();
    if (section === 'comments')  renderAllComments();
    if (section === 'routes')    renderRoutes();
    if (section === 'analytics') renderAnalytics();
    if (section === 'reports')   { currentReport = 'route-usage'; loadReport(); }
    if (section === 'etl')       checkETLStatus();
  }

  /* ------------------------------------------------------- DASHBOARD --------------------------------------------------------------------------------------- */
  const STAT_IDS = ['stat-users','stat-active','stat-restricted','stat-comments','stat-routes'];
  function _setStats(value) {
    STAT_IDS.forEach(id => { const el=document.getElementById(id); if(el) el.textContent=value; });
  }

  async function renderDashboard() {
    _setStats('…');
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: _authHeader() });
      if (!res.ok) { _setStats('—'); return; }
      const data = await res.json();
      const el = id => document.getElementById(id);
      if (el('stat-users'))      el('stat-users').textContent      = data.total      ?? 0;
      if (el('stat-active'))     el('stat-active').textContent     = data.active     ?? 0;
      if (el('stat-restricted')) el('stat-restricted').textContent = data.restricted ?? 0;
      if (el('stat-comments'))   el('stat-comments').textContent   = data.comments   ?? 0;
      if (el('stat-routes'))     el('stat-routes').textContent     = data.routes     ?? 0;
    } catch (err) { _setStats('—'); }
    /* Render the route usage bar chart in parallel */
    renderRouteChart();
  }

  /* ------------------------------------------------------- DASHBOARD ROUTE BAR CHART --------------------------------------------------------------------------------------- */
  async function renderRouteChart() {
    const container = document.getElementById('dashboard-route-chart');
    if (!container) return;

    try {
      const res = await fetch(`${API_URL}/routes`);
      if (!res.ok) { container.innerHTML = '<p style="color:var(--text3);font-size:13px;">Could not load route data.</p>'; return; }
      const routes = await res.json();

      /* Sort by search_count descending, take top 10 */
      const top = routes
        .filter(r => (r.search_count ?? 0) >= 0)
        .sort((a, b) => (b.search_count ?? 0) - (a.search_count ?? 0))
        .slice(0, 10);

      if (!top.length) {
        container.innerHTML = '<p style="color:var(--text3);font-size:13px;">No routes yet. Add routes to see the chart.</p>';
        return;
      }

      const maxCount = Math.max(...top.map(r => r.search_count ?? 0), 1);

      /* If everything is 0, show a gentle message */
      if (maxCount === 0) {
        container.innerHTML = '<p style="color:var(--text3);font-size:13px;">No searches recorded yet. Users will appear here after searching for routes.</p>';
        return;
      }

      container.innerHTML = top.map((r, i) => {
        const count   = r.search_count ?? 0;
        const pct     = Math.max(4, Math.round((count / maxCount) * 100));
        const label   = `${escHtml(r.from_location)} → ${escHtml(r.to_location)}`;
        /* Gradient from accent blue → lighter on lower bars */
        const opacity = 0.45 + (count / maxCount) * 0.55;
        const color   = `rgba(37, 99, 235, ${opacity.toFixed(2)})`;

        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:500;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${label}">
                <span style="color:var(--text3);font-size:11px;font-weight:400;margin-right:6px;">#${i + 1}</span>${label}
              </span>
              <span style="font-size:13px;font-weight:700;color:var(--accent);margin-left:12px;flex-shrink:0;">
                ${count} ${count === 1 ? 'search' : 'searches'}
              </span>
            </div>
            <div style="background:var(--border);border-radius:4px;height:10px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width .4s ease;"></div>
            </div>
          </div>`;
      }).join('');

    } catch (err) {
      container.innerHTML = '<p style="color:var(--text3);font-size:13px;">Could not load chart. Is the server running?</p>';
    }
  }

  /* ------------------------------------------------------- USERS --------------------------------------------------------------------------------------- */
  async function renderUsers(filter = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Loading…</td></tr>`;
    try {
      if (!allUsers.length || !filter) {
        const res = await fetch(`${API_URL}/admin/users`, { headers: _authHeader() });
        if (!res.ok) { tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed (${res.status})</td></tr>`; return; }
        allUsers = await res.json();
      }
      let users = allUsers;
      if (filter) { const q=filter.toLowerCase(); users=users.filter(u=>u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)); }
      if (!users.length) { tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">No users found.</td></tr>`; return; }
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;flex-shrink:0;">${u.name.charAt(0).toUpperCase()}</div><span style="font-weight:500;">${escHtml(u.name)}</span></div></td>
          <td style="color:var(--text2);">${escHtml(u.email)}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>${u.saved_count??0} saved · ${u.comment_count??0} comments</td>
          <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status==='active'?'● Active':'⊘ Restricted'}</span></td>
          <td><div class="user-actions">
            <button class="btn btn-sm btn-secondary" onclick="ADMIN.openEditModal(${u.id})">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="ADMIN.toggleStatus(${u.id},'${u.status}')">${u.status==='active'?'Restrict':'Activate'}</button>
            <button class="btn btn-sm btn-danger" onclick="ADMIN.confirmDelete(${u.id},'${escHtml(u.name)}')">Delete</button>
          </div></td>
        </tr>`).join('');
    } catch (err) {
      tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed to load users. Is the server running?</td></tr>`;
    }
  }

  /* ------------------------------------------------------- COMMENTS --------------------------------------------------------------------------------------- */
  async function renderAllComments() {
    const container = document.getElementById('all-comments-container');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>`;
    try {
      const res = await fetch(`${API_URL}/admin/comments`, { headers: _authHeader() });
      if (!res.ok) { container.innerHTML=`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed (${res.status})</p></div>`; return; }
      const comments = await res.json();
      if (!comments.length) { container.innerHTML=`<div class="empty-state"><div class="empty-icon">💬</div><p>No comments yet.</p></div>`; return; }
      const grouped = {};
      comments.forEach(c => { if(!grouped[c.route_id]) grouped[c.route_id]=[]; grouped[c.route_id].push(c); });
      container.innerHTML = Object.entries(grouped).map(([routeId, list]) => `
        <div style="margin-bottom:24px;">
          <h4 style="color:var(--text2);font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Route: ${routeId.replace(/_/g,' ')}</h4>
          ${list.map(c=>`
            <div class="comment-item" style="margin-bottom:8px;">
              <div class="comment-meta">
                <div class="comment-avatar">${c.user_name.charAt(0).toUpperCase()}</div>
                <div><div class="comment-author">${escHtml(c.user_name)}</div><div class="comment-time">${formatDate(c.created_at)}</div></div>
                <button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="ADMIN.deleteComment(${c.id})">Delete</button>
              </div>
              <div class="comment-text">${escHtml(c.comment)}</div>
            </div>`).join('')}
        </div>`).join('');
    } catch (err) {
      container.innerHTML=`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load comments.</p></div>`;
    }
  }

  /* ------------------------------------------------------- ROUTES --------------------------------------------------------------------------------------- */
  async function renderRoutes() {
    const container = document.getElementById('routes-tbody');
    if (!container) return;
    container.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Loading…</td></tr>`;
    try {
      const res = await fetch(`${API_URL}/routes`);
      if (!res.ok) { container.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed (${res.status})</td></tr>`; return; }
      const routes = await res.json();
      if (!routes.length) { container.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">No routes.</td></tr>`; return; }
      container.innerHTML = routes.map(r=>`
        <tr>
          <td style="font-size:12px;color:var(--text3);">${escHtml(r.route_id)}</td>
          <td style="font-weight:500;">${escHtml(r.from_location)}</td>
          <td style="font-weight:500;">${escHtml(r.to_location)}</td>
          <td>${escHtml(r.duration||'—')} · ${escHtml(r.fare||'—')}</td>
          <td style="color:var(--text2);">${r.search_count ?? 0}</td>
          <td><div class="user-actions">
            <button class="btn btn-sm btn-secondary" onclick="ADMIN.openEditRouteModal('${escHtml(r.route_id)}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="ADMIN.confirmDeleteRoute('${r.route_id}','${escHtml(r.from_location)}','${escHtml(r.to_location)}')">Delete</button>
          </div></td>
        </tr>`).join('');
    } catch (err) {
      container.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed. Server running?</td></tr>`;
    }
  }

  /* ------------------------------------------------------- ANALYTICS --------------------------------------------------------------------------------------- */
  async function renderAnalytics() {
    /* Summary cards */
    try {
      const res = await fetch(`${API_URL}/analytics/summary`, { headers: _authHeader() });
      if (res.ok) {
        const d = await res.json();
        const el = id => document.getElementById(id);
        if (el('an-total')) el('an-total').textContent = d.total ?? 0;
        if (el('an-today')) el('an-today').textContent = d.today ?? 0;
        if (el('an-month')) el('an-month').textContent = d.thisMonth ?? 0;
      }
    } catch (_) {}
    /* Default tab */
    analyticsTab('most-searched', document.querySelector('.tab-btn'));
  }

  async function analyticsTab(tab, btn) {
    document.querySelectorAll('.analytics-tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('#section-analytics .tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(`atab-${tab}`);
    if (panel) panel.classList.remove('hidden');
    if (btn) btn.classList.add('active');

    if (tab === 'most-searched') await loadAnalyticsTable('most-searched', 'an-most-searched-container',
      ['Route ID','From','To','Searches'], r=>[r.route_id, r.origin, r.destination, r.total_searches]);
    if (tab === 'destinations')  await loadAnalyticsTable('destinations',  'an-destinations-container',
      ['Destination','Total Searches'], r=>[r.destination, r.total_searches]);
    if (tab === 'most-saved')    await loadAnalyticsTable('most-saved',    'an-most-saved-container',
      ['Route ID','From','To','Total Saves'], r=>[r.route_id, r.origin, r.destination, r.total_saves]);
    if (tab === 'top-rated')     await loadAnalyticsTable('top-rated',     'an-top-rated-container',
      ['Route ID','From','To','Avg Rating','Searches'], r=>[r.route_id, r.origin, r.destination, r.avg_rating, r.total_searches]);
    if (tab === 'trend')         await loadTrend();
  }

  async function loadAnalyticsTable(endpoint, containerId, headers, rowFn) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
    try {
      const res = await fetch(`${API_URL}/analytics/${endpoint}`, { headers: _authHeader() });
      if (!res.ok) { c.innerHTML = `<p style="color:var(--red)">Error ${res.status}. Run ETL first if OLAP is empty.</p>`; return; }
      const rows = await res.json();
      if (!rows.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>No data yet. Run ETL first.</p></div>'; return; }
      c.innerHTML = `
        <div style="overflow-x:auto;">
          <table class="report-table">
            <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r=>`<tr>${rowFn(r).map(v=>`<td>${escHtml(v??'—')}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`;
    } catch (err) {
      c.innerHTML = `<p style="color:var(--red)">Failed: ${escHtml(err.message)}</p>`;
    }
  }

  async function loadTrend() {
    const c = document.getElementById('an-trend-container');
    if (!c) return;
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
    try {
      const res = await fetch(`${API_URL}/analytics/trend?days=30`, { headers: _authHeader() });
      if (!res.ok) { c.innerHTML = `<p style="color:var(--red)">Error ${res.status}</p>`; return; }
      const rows = await res.json();
      if (!rows.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📈</div><p>No trend data. Run ETL first.</p></div>'; return; }

      const max = Math.max(...rows.map(r => r.searches));
      c.innerHTML = `
        <p class="text-sm" style="color:var(--text3);margin-bottom:12px;">Daily searches — last 30 days</p>
        <div style="display:flex;align-items:flex-end;gap:4px;height:120px;overflow-x:auto;padding-bottom:4px;">
          ${rows.map(r => {
            const h = max > 0 ? Math.max(4, Math.round((r.searches / max) * 110)) : 4;
            const d = new Date(r.full_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'});
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:28px;" title="${d}: ${r.searches}">
              <span style="font-size:9px;color:var(--text3);">${r.searches}</span>
              <div style="width:20px;height:${h}px;background:var(--accent);border-radius:3px 3px 0 0;"></div>
              <span style="font-size:8px;color:var(--text3);transform:rotate(-45deg);white-space:nowrap;">${d}</span>
            </div>`;
          }).join('')}
        </div>`;
    } catch (err) {
      c.innerHTML = `<p style="color:var(--red)">Failed: ${escHtml(err.message)}</p>`;
    }
  }

  async function runRollup() {
    const dest = document.getElementById('olap-rollup-dest')?.value.trim();
    const params = dest ? `?destination=${encodeURIComponent(dest)}` : '';
    const c = document.getElementById('olap-rollup-result');
    c.innerHTML = '<p style="color:var(--text3);">Running…</p>';
    try {
      const res = await fetch(`${API_URL}/analytics/rollup${params}`, { headers: _authHeader() });
      const rows = await res.json();
      if (!rows.length) { c.innerHTML = '<p style="color:var(--text3)">No data.</p>'; return; }
      c.innerHTML = `<div style="overflow-x:auto;"><table class="report-table">
        <thead><tr><th>Level</th><th>Year</th><th>Month</th><th>Day</th><th>Searches</th><th>Saves</th><th>Avg Rating</th></tr></thead>
        <tbody>${rows.map(r=>`<tr style="${r.level==='grand_total'?'font-weight:700;background:var(--bg2);':r.level==='year'?'font-weight:600;':r.level==='month'?'font-style:italic;':''}">
          <td><span class="badge badge-${r.level==='grand_total'?'blue':r.level==='year'?'green':r.level==='month'?'gray':''}">${r.level}</span></td>
          <td>${r.year??'—'}</td><td>${r.month??'—'}</td><td>${r.day??'—'}</td>
          <td>${r.total_searches??0}</td><td>${r.total_saves??0}</td><td>${r.avg_rating??'—'}</td>
        </tr>`).join('')}</tbody></table></div>`;
    } catch (err) { c.innerHTML = `<p style="color:var(--red)">${escHtml(err.message)}</p>`; }
  }

  async function runDrilldown() {
    const year  = document.getElementById('olap-dd-year')?.value.trim();
    const month = document.getElementById('olap-dd-month')?.value.trim();
    const day   = document.getElementById('olap-dd-day')?.value.trim();
    const dest  = document.getElementById('olap-dd-dest')?.value.trim();
    const params = new URLSearchParams();
    if (year)  params.append('year', year);
    if (month) params.append('month', month);
    if (day)   params.append('day', day);
    if (dest)  params.append('destination', dest);
    const c = document.getElementById('olap-drilldown-result');
    c.innerHTML = '<p style="color:var(--text3);">Running…</p>';
    try {
      const res  = await fetch(`${API_URL}/analytics/drilldown?${params}`, { headers: _authHeader() });
      const data = await res.json();
      const rows = data.rows || [];
      if (!rows.length) { c.innerHTML = '<p style="color:var(--text3)">No data for these filters.</p>'; return; }
      const headers = Object.keys(rows[0]);
      c.innerHTML = `<p class="text-sm" style="color:var(--text3);margin-bottom:8px;">Level: <strong>${data.level}</strong></p>
        <div style="overflow-x:auto;"><table class="report-table">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${headers.map(h=>`<td>${escHtml(r[h]??'—')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
    } catch (err) { c.innerHTML = `<p style="color:var(--red)">${escHtml(err.message)}</p>`; }
  }

  async function runSlice() {
    const dest = document.getElementById('olap-slice-dest')?.value.trim();
    if (!dest) { TOAST.show('Enter a destination to slice.','error'); return; }
    const c = document.getElementById('olap-slice-result');
    c.innerHTML = '<p style="color:var(--text3);">Running…</p>';
    try {
      const res  = await fetch(`${API_URL}/analytics/slice?destination=${encodeURIComponent(dest)}`, { headers: _authHeader() });
      const data = await res.json();
      const rows = data.rows || [];
      if (!rows.length) { c.innerHTML = `<p style="color:var(--text3)">No data for destination "${escHtml(dest)}".</p>`; return; }
      c.innerHTML = `<div style="overflow-x:auto;"><table class="report-table">
        <thead><tr><th>Origin</th><th>Destination</th><th>Date</th><th>Searches</th><th>Saves</th><th>Avg Rating</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td>${escHtml(r.origin)}</td><td>${escHtml(r.destination)}</td><td>${r.full_date?new Date(r.full_date).toLocaleDateString():'—'}</td><td>${r.search_count??0}</td><td>${r.save_count??0}</td><td>${r.average_rating??'—'}</td></tr>`).join('')}</tbody>
        </table></div>`;
    } catch (err) { c.innerHTML = `<p style="color:var(--red)">${escHtml(err.message)}</p>`; }
  }

  async function runDice() {
    const dest   = document.getElementById('olap-dice-dest')?.value.trim();
    const month  = document.getElementById('olap-dice-month')?.value.trim();
    const rating = document.getElementById('olap-dice-rating')?.value.trim();
    const params = new URLSearchParams();
    if (dest)   params.append('destination', dest);
    if (month)  params.append('month', month);
    if (rating) params.append('min_rating', rating);
    const c = document.getElementById('olap-dice-result');
    c.innerHTML = '<p style="color:var(--text3);">Running…</p>';
    try {
      const res  = await fetch(`${API_URL}/analytics/dice?${params}`, { headers: _authHeader() });
      const data = await res.json();
      const rows = data.rows || [];
      if (!rows.length) { c.innerHTML = '<p style="color:var(--text3)">No data matches these dice filters.</p>'; return; }
      c.innerHTML = `<div style="overflow-x:auto;"><table class="report-table">
        <thead><tr><th>Origin</th><th>Destination</th><th>Year</th><th>Month</th><th>Searches</th><th>Saves</th><th>Avg Rating</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td>${escHtml(r.origin)}</td><td>${escHtml(r.destination)}</td><td>${r.year??'—'}</td><td>${r.month??'—'}</td><td>${r.total_searches??0}</td><td>${r.total_saves??0}</td><td>${r.avg_rating??'—'}</td></tr>`).join('')}</tbody>
        </table></div>`;
    } catch (err) { c.innerHTML = `<p style="color:var(--red)">${escHtml(err.message)}</p>`; }
  }

  /* ------------------------------------------------------- REPORTS --------------------------------------------------------------------------------------- */
  function reportTab(report, btn) {
    currentReport = report;
    document.querySelectorAll('#section-reports .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadReport();
  }

  async function loadReport() {
    const c = document.getElementById('report-container');
    if (!c) return;
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

    const params = new URLSearchParams();
    const fromDate = document.getElementById('rpt-from-date')?.value;
    const toDate   = document.getElementById('rpt-to-date')?.value;
    const dest     = document.getElementById('rpt-destination')?.value.trim();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate)   params.append('to_date', toDate);
    if (dest)     params.append('destination', dest);

    try {
      const res  = await fetch(`${API_URL}/reports/${currentReport}?${params}`, { headers: _authHeader() });
      if (!res.ok) { c.innerHTML = `<p style="color:var(--red)">Error ${res.status}. Run ETL first if OLAP is empty.</p>`; return; }
      const rows = await res.json();
      if (!rows.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>No data found. Run ETL first.</p></div>'; return; }
      const headers = Object.keys(rows[0]);
      c.innerHTML = `<div style="overflow-x:auto;"><table class="report-table">
        <thead><tr>${headers.map(h=>`<th>${h.replace(/_/g,' ')}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${headers.map(h=>`<td>${escHtml(r[h]??'—')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <p class="text-sm" style="color:var(--text3);margin-top:8px;">${rows.length} row(s)</p>`;
    } catch (err) {
      c.innerHTML = `<p style="color:var(--red)">Failed: ${escHtml(err.message)}</p>`;
    }
  }

  function exportReport(format) {
    const params = new URLSearchParams();
    params.append('report', currentReport);
    const fromDate = document.getElementById('rpt-from-date')?.value;
    const toDate   = document.getElementById('rpt-to-date')?.value;
    const dest     = document.getElementById('rpt-destination')?.value.trim();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate)   params.append('to_date', toDate);
    if (dest)     params.append('destination', dest);

    const token = AUTH.getToken();
    const base = (window.location.protocol === 'file:') ? 'http://localhost:5000' : window.location.origin;
    window.open(`${base}/api/reports/export/${format}?${params}&_token=${token}`, '_blank');
  }

  /* ------------------------------------------------------- ETL --------------------------------------------------------------------------------------- */
  async function runETL() {
    const btn     = document.getElementById('etl-run-btn');
    const spinner = document.getElementById('etl-spinner');
    const status  = document.getElementById('etl-status-display');
    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = '';
    if (status)  status.textContent = 'ETL running… please wait.';

    try {
      const res  = await fetch(`${API_URL}/etl/run`, { method:'POST', headers: _authHeader() });
      const data = await res.json();
      if (res.ok) {
        TOAST.show('ETL completed successfully!', 'success');
        if (status) status.textContent = JSON.stringify(data.result, null, 2);
      } else {
        TOAST.show('ETL failed: ' + (data.error || res.status), 'error');
        if (status) status.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      TOAST.show('ETL error: ' + err.message, 'error');
      if (status) status.textContent = 'Network error: ' + err.message;
    } finally {
      if (btn) btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  }

  async function checkETLStatus() {
    const status = document.getElementById('etl-status-display');
    if (!status) return;
    try {
      const res  = await fetch(`${API_URL}/etl/status`, { headers: _authHeader() });
      const data = await res.json();
      status.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      status.textContent = 'Could not fetch ETL status: ' + err.message;
    }
  }

  /* ------------------------------------------------------- USER STATUS / DELETE / EDIT --------------------------------------------------------------------------------------- */
  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, { method:'PUT', headers:_authHeader(), body:JSON.stringify({status:newStatus}) });
      if (!res.ok) { const d=await res.json().catch(()=>({})); TOAST.show(d.error||'Could not update status.','error'); return; }
      allUsers=[]; TOAST.show(`Account ${newStatus}.`,newStatus==='active'?'success':''); renderUsers(); renderDashboard();
    } catch(err) { TOAST.show('Could not update status.','error'); }
  }

  function confirmDelete(userId, userName) {
    document.getElementById('delete-confirm-name').textContent = userName;
    document.getElementById('delete-confirm-id').value = userId;
    document.querySelector('#delete-modal .btn-danger').onclick = doDelete;
    document.getElementById('delete-modal').classList.remove('hidden');
  }
  function closeDeleteModal() { document.getElementById('delete-modal').classList.add('hidden'); }

  async function doDelete() {
    const userId = document.getElementById('delete-confirm-id').value;
    try {
      await fetch(`${API_URL}/admin/users/${userId}`,{method:'DELETE',headers:_authHeader()});
      allUsers=[]; closeDeleteModal(); TOAST.show('User deleted.','error'); renderUsers(); renderDashboard();
    } catch(err) { TOAST.show('Could not delete user.','error'); }
  }

  function openEditModal(userId) {
    const user = allUsers.find(u=>u.id===userId);
    if(!user) return;
    editingUserId=userId;
    document.getElementById('edit-name').value=user.name;
    document.getElementById('edit-email').value=user.email;
    document.getElementById('edit-password').value='';
    document.getElementById('edit-modal').classList.remove('hidden');
  }
  function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); editingUserId=null; }

  async function saveEdit() {
    if(!editingUserId) return;
    const name=document.getElementById('edit-name').value.trim();
    const email=document.getElementById('edit-email').value.trim();
    const password=document.getElementById('edit-password').value.trim();
    if(!name||!email){TOAST.show('Name and email are required.','error');return;}
    try {
      const res=await fetch(`${API_URL}/admin/users/${editingUserId}`,{method:'PUT',headers:_authHeader(),body:JSON.stringify({name,email,...(password?{password}:{})})});
      if(!res.ok){const d=await res.json();TOAST.show(d.error||'Update failed.','error');return;}
      allUsers=[]; closeEditModal(); TOAST.show('User updated.','success'); renderUsers();
    } catch(err){TOAST.show('Could not save.','error');}
  }

  async function deleteComment(commentId) {
    try {
      await fetch(`${API_URL}/admin/comments/${commentId}`,{method:'DELETE',headers:_authHeader()});
      TOAST.show('Comment deleted.'); renderAllComments(); renderDashboard();
    } catch(err){TOAST.show('Could not delete comment.','error');}
  }

  /* ------------------------------------------------------- DELETE ROUTE --------------------------------------------------------------------------------------- */
  function confirmDeleteRoute(routeId, from, to) {
    _pendingDeleteRouteId=routeId;
    document.getElementById('delete-confirm-name').textContent=`route "${from} → ${to}"`;
    document.getElementById('delete-confirm-id').value=routeId;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.querySelector('#delete-modal .btn-danger').onclick=doDeleteRoute;
  }
  async function doDeleteRoute() {
    const routeId=_pendingDeleteRouteId||document.getElementById('delete-confirm-id').value;
    try {
      await fetch(`${API_URL}/routes/${encodeURIComponent(routeId)}`,{method:'DELETE',headers:_authHeader()});
      closeDeleteModal(); document.querySelector('#delete-modal .btn-danger').onclick=doDelete;
      TOAST.show('Route deleted.','error'); renderRoutes(); renderDashboard();
    } catch(err){TOAST.show('Could not delete route.','error');}
  }

  /* ------------------------------------------------------- ADD ROUTE --------------------------------------------------------------------------------------- */
  function openAddRouteModal() {
    _addRouteStepCount=0;
    ['ar-route-id','ar-from','ar-to','ar-duration','ar-fare','ar-tags','ar-map-embed-url'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const t=document.getElementById('ar-transport'); if(t)t.value='jeep';
    const list=document.getElementById('ar-steps-list'); if(list)list.innerHTML='';
    const hint=document.getElementById('ar-no-steps-hint'); if(hint)hint.style.display='';
    document.getElementById('add-route-modal').classList.remove('hidden');
  }
  function closeAddRouteModal(){document.getElementById('add-route-modal').classList.add('hidden');}

  function autoRouteId() {
    const from=document.getElementById('ar-from')?.value.trim();
    const to=document.getElementById('ar-to')?.value.trim();
    const rid=document.getElementById('ar-route-id');
    if(from&&to&&rid) rid.value=(from+'_'+to).toLowerCase().replace(/[^a-z0-9_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  }

  function _stepBlockHtml(n, pfx) {
    return `<div class="${pfx}-step-block" id="${pfx}-step-${n}" style="border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-weight:600;font-size:13px;">Step ${n}</span>
        <button type="button" class="btn btn-sm btn-ghost" onclick="ADMIN.removeRouteStep(this,'${pfx}')" style="color:var(--red);">✕ Remove</button>
      </div>
      <div class="form-group"><label class="form-label">Title <span style="color:var(--red);">*</span></label><input class="form-control" name="step-title" type="text" placeholder="e.g. Ride a Jeepney"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label class="form-label">Transport <span style="color:var(--red);">*</span></label><select class="form-control" name="step-transport"><option value="jeep">Jeep</option><option value="bus">Bus</option><option value="tricycle">Tricycle</option><option value="walk">Walk</option><option value="fx">FX</option><option value="uv">UV Express</option></select></div>
        <div class="form-group"><label class="form-label">Fare</label><input class="form-control" name="step-fare" type="text" onblur="ADMIN.formatFare(this)"/></div>
      </div>
      <div class="form-group"><label class="form-label">Instruction <span style="color:var(--red);">*</span></label><textarea class="form-control" name="step-instruction" rows="2"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label class="form-label">Signboard</label><input class="form-control" name="step-signboard" type="text"/></div>
        <div class="form-group"><label class="form-label">Alight At</label><input class="form-control" name="step-alight" type="text"/></div>
      </div>
      <div class="form-group"><label class="form-label">Google Maps Embed URL</label><input class="form-control" name="step-map-embed" type="url"/></div>
    </div>`;
  }

  function addRouteStep() {
    _addRouteStepCount++;
    const list=document.getElementById('ar-steps-list');
    const hint=document.getElementById('ar-no-steps-hint');
    if(hint)hint.style.display='none';
    const div=document.createElement('div'); div.innerHTML=_stepBlockHtml(_addRouteStepCount,'ar'); list.appendChild(div.firstElementChild);
  }

  function removeRouteStep(btn, pfx) {
    btn.closest(`.${pfx||'ar'}-step-block`).remove();
    const list=document.getElementById(`${pfx||'ar'}-steps-list`);
    const hint=document.getElementById(`${pfx||'ar'}-no-steps-hint`);
    if(hint)hint.style.display=list&&list.children.length===0?'':'none';
  }

  function _collectSteps(pfx) {
    const blocks=document.querySelectorAll(`#${pfx}-steps-list .${pfx}-step-block`);
    const steps=[]; let n=1;
    for(const block of blocks){
      const title=block.querySelector('[name="step-title"]').value.trim();
      const instruction=block.querySelector('[name="step-instruction"]').value.trim();
      if(!title||!instruction){TOAST.show(`Step ${n}: Title and Instruction required.`,'error');return null;}
      steps.push({num:n++,title,transport:block.querySelector('[name="step-transport"]').value,instruction,signboard:block.querySelector('[name="step-signboard"]').value.trim()||null,alightAt:block.querySelector('[name="step-alight"]').value.trim()||null,fare:block.querySelector('[name="step-fare"]').value.trim()||null,mapEmbed:block.querySelector('[name="step-map-embed"]').value.trim()||null});
    }
    return steps;
  }

  async function submitNewRoute() {
    const routeId=document.getElementById('ar-route-id').value.trim();
    const fromLocation=document.getElementById('ar-from').value.trim();
    const toLocation=document.getElementById('ar-to').value.trim();
    const duration=document.getElementById('ar-duration').value.trim();
    const fare=document.getElementById('ar-fare').value.trim();
    const transportType=document.getElementById('ar-transport').value;
    const tagsRaw=document.getElementById('ar-tags').value.trim();
    const mapEmbedUrl=document.getElementById('ar-map-embed-url').value.trim();
    if(!fromLocation){TOAST.show('From location required.','error');return;}
    if(!toLocation){TOAST.show('To location required.','error');return;}
    if(!routeId){TOAST.show('Route ID required.','error');return;}
    const tags=tagsRaw?tagsRaw.split(',').map(t=>t.trim()).filter(Boolean):[];
    const steps=_collectSteps('ar');
    if(steps===null)return;
    try {
      const res=await fetch(`${API_URL}/routes`,{method:'POST',headers:_authHeader(),body:JSON.stringify({route_id:routeId,from_location:fromLocation,to_location:toLocation,duration:duration||null,fare:fare||null,transport_type:transportType||null,tags,steps,map_embed_url:mapEmbedUrl||null})});
      if(!res.ok){const d=await res.json();TOAST.show(d.error||'Could not save route.','error');return;}
      closeAddRouteModal(); TOAST.show('Route created!','success'); renderRoutes();
    } catch(err){TOAST.show('Could not save route.','error');}
  }

  /* ------------------------------------------------------- EDIT ROUTE --------------------------------------------------------------------------------------- */
  let _editingRoute=null;

  async function openEditRouteModal(routeId) {
    try {
      const res=await fetch(`${API_URL}/routes/${encodeURIComponent(routeId)}`);
      if(!res.ok){TOAST.show('Could not load route.','error');return;}
      const r=await res.json();
      _editingRoute=r;
      document.getElementById('er-route-id').value=r.route_id||'';
      document.getElementById('er-from').value=r.from_location||'';
      document.getElementById('er-to').value=r.to_location||'';
      document.getElementById('er-duration').value=r.duration||'';
      document.getElementById('er-fare').value=r.fare||'';
      document.getElementById('er-transport').value=r.transport_type||'jeep';
      document.getElementById('er-tags').value=(r.tags||[]).join(', ');
      document.getElementById('er-map-embed-url').value=r.map_embed_url||'';
      const list=document.getElementById('er-steps-list'); list.innerHTML='';
      _editRouteStepCount=0;
      (r.steps||[]).forEach(()=>{_editRouteStepCount++;const div=document.createElement('div');div.innerHTML=_stepBlockHtml(_editRouteStepCount,'er');list.appendChild(div.firstElementChild);});
      (r.steps||[]).forEach((s,i)=>{
        const block=list.children[i];
        if(!block)return;
        block.querySelector('[name="step-title"]').value=s.title||'';
        block.querySelector('[name="step-transport"]').value=s.transport||'jeep';
        block.querySelector('[name="step-instruction"]').value=s.instruction||'';
        block.querySelector('[name="step-signboard"]').value=s.signboard||'';
        block.querySelector('[name="step-alight"]').value=s.alightAt||'';
        block.querySelector('[name="step-fare"]').value=s.fare||'';
        block.querySelector('[name="step-map-embed"]').value=s.mapEmbed||'';
      });
      const hint=document.getElementById('er-no-steps-hint');
      if(hint)hint.style.display=list.children.length===0?'':'none';
      document.getElementById('edit-route-modal').classList.remove('hidden');
    } catch(err){TOAST.show('Could not load route.','error');}
  }

  function addEditRouteStep() {
    _editRouteStepCount++;
    const list=document.getElementById('er-steps-list');
    const hint=document.getElementById('er-no-steps-hint');
    if(hint)hint.style.display='none';
    const div=document.createElement('div'); div.innerHTML=_stepBlockHtml(_editRouteStepCount,'er'); list.appendChild(div.firstElementChild);
  }

  function closeEditRouteModal(){document.getElementById('edit-route-modal').classList.add('hidden');_editingRoute=null;}

  async function submitEditRoute() {
    if(!_editingRoute){return;}
    const fromLocation=document.getElementById('er-from').value.trim();
    const toLocation=document.getElementById('er-to').value.trim();
    const duration=document.getElementById('er-duration').value.trim();
    const fare=document.getElementById('er-fare').value.trim();
    const transportType=document.getElementById('er-transport').value;
    const tagsRaw=document.getElementById('er-tags').value.trim();
    const mapEmbedUrl=document.getElementById('er-map-embed-url').value.trim();
    if(!fromLocation||!toLocation){TOAST.show('From and To are required.','error');return;}
    const tags=tagsRaw?tagsRaw.split(',').map(t=>t.trim()).filter(Boolean):[];
    const steps=_collectSteps('er');
    if(steps===null)return;
    try {
      const res=await fetch(`${API_URL}/routes/${encodeURIComponent(_editingRoute.route_id)}`,{method:'PUT',headers:_authHeader(),body:JSON.stringify({from_location:fromLocation,to_location:toLocation,duration:duration||null,fare:fare||null,transport_type:transportType||null,tags,steps,map_embed_url:mapEmbedUrl||null})});
      if(!res.ok){const d=await res.json();TOAST.show(d.error||'Update failed.','error');return;}
      closeEditRouteModal(); TOAST.show('Route updated!','success'); renderRoutes();
    } catch(err){TOAST.show('Could not update route.','error');}
  }

  function formatFare(input) {
    let v=input.value.trim();
    if(!v)return;
    v=v.replace(/₱/g,'').trim();
    if(v&&!v.startsWith('₱'))input.value='₱'+v;
  }

  return {
    navigate, renderDashboard, renderUsers, renderAllComments, renderRoutes,
    renderAnalytics, analyticsTab, runRollup, runDrilldown, runSlice, runDice,
    loadReport, reportTab, exportReport,
    runETL, checkETLStatus,
    toggleStatus, confirmDelete, closeDeleteModal, doDelete,
    openEditModal, closeEditModal, saveEdit,
    deleteComment,
    confirmDeleteRoute, doDeleteRoute,
    openAddRouteModal, closeAddRouteModal, autoRouteId, addRouteStep, removeRouteStep, submitNewRoute,
    openEditRouteModal, addEditRouteStep, closeEditRouteModal, submitEditRoute,
    formatFare
  };
})();
