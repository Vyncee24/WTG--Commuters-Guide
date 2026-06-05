const ADMIN = (() => {

  let currentSection = 'dashboard';
  let editingUserId  = null;
  let allUsers       = [];

  /* ------------------------------------------------------- AUTH HEADER --------------------------------------------------------------------------------------- */
  function _authHeader() {
    return { 'Authorization': `Bearer ${AUTH.getToken()}`, 'Content-Type': 'application/json' };
  }

  const STAT_IDS = ['stat-users', 'stat-active', 'stat-restricted', 'stat-comments', 'stat-routes'];

  function _setStats(value) {
    STAT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
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
  }

  /* ------------------------------------------------------- DASHBOARD --------------------------------------------------------------------------------------- */
  async function renderDashboard() {
    _setStats('…');
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: _authHeader() });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          errMsg += ` — ${errBody.error || JSON.stringify(errBody)}`;
        } catch (_) {}
        console.error(`[Admin] /stats fetch failed: ${errMsg}`);
        _setStats('—');
        return;
      }
      const data = await res.json();
      const el = (id) => document.getElementById(id);
      if (el('stat-users'))      el('stat-users').textContent      = data.total      ?? 0;
      if (el('stat-active'))     el('stat-active').textContent     = data.active     ?? 0;
      if (el('stat-restricted')) el('stat-restricted').textContent = data.restricted ?? 0;
      if (el('stat-comments'))   el('stat-comments').textContent   = data.comments   ?? 0;
      if (el('stat-routes'))     el('stat-routes').textContent     = data.routes     ?? 0;
    } catch (err) {
      console.error('[Admin] renderDashboard network error:', err.message);
      _setStats('—');
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
        if (!res.ok) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed to load users (${res.status}).</td></tr>`;
          return;
        }
        allUsers = await res.json();
      }

      let users = allUsers;
      if (filter) {
        const q = filter.toLowerCase();
        users = users.filter(u =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
      }

      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">No users found.</td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;flex-shrink:0;">${u.name.charAt(0).toUpperCase()}</div>
              <span style="font-weight:500;">${escHtml(u.name)}</span>
            </div>
          </td>
          <td style="color:var(--text2);">${escHtml(u.email)}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>${u.saved_count ?? 0} saved · ${u.comment_count ?? 0} comments</td>
          <td>
            <span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}">
              ${u.status === 'active' ? '● Active' : '⊘ Restricted'}
            </span>
          </td>
          <td>
            <div class="user-actions">
              <button class="btn btn-sm btn-secondary" onclick="ADMIN.openEditModal(${u.id})">Edit</button>
              <button class="btn btn-sm btn-secondary" onclick="ADMIN.toggleStatus(${u.id}, '${u.status}')">
                ${u.status === 'active' ? 'Restrict' : 'Activate'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="ADMIN.confirmDelete(${u.id}, '${escHtml(u.name)}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Render users error:', err);
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Failed to load users. Is the server running?</td></tr>`;
    }
  }

  /* ------------------------------------------------------- COMMENTS --------------------------------------------------------------------------------------- */
  async function renderAllComments() {
    const container = document.getElementById('all-comments-container');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading comments…</p></div>`;

    try {
      const res = await fetch(`${API_URL}/admin/comments`, { headers: _authHeader() });
      if (!res.ok) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load comments (${res.status}).</p></div>`;
        return;
      }
      const comments = await res.json();

      if (!comments.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No comments yet.</p></div>`;
        return;
      }

      // Group by route_id
      const grouped = {};
      comments.forEach(c => {
        if (!grouped[c.route_id]) grouped[c.route_id] = [];
        grouped[c.route_id].push(c);
      });

      container.innerHTML = Object.entries(grouped).map(([routeId, list]) => `
        <div style="margin-bottom:24px;">
          <h4 style="color:var(--text2);font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
            Route: ${routeId.replace(/_/g,' ')}
          </h4>
          ${list.map(c => `
            <div class="comment-item" style="margin-bottom:8px;">
              <div class="comment-meta">
                <div class="comment-avatar">${c.user_name.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="comment-author">${escHtml(c.user_name)}</div>
                  <div class="comment-time">${formatDate(c.created_at)}</div>
                </div>
                <button class="btn btn-sm btn-danger" style="margin-left:auto;"
                  onclick="ADMIN.deleteComment(${c.id})">Delete</button>
              </div>
              <div class="comment-text">${escHtml(c.comment)}</div>
            </div>
          `).join('')}
        </div>
      `).join('');
    } catch (err) {
      console.error('Render comments error:', err);
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load comments.</p></div>`;
    }
  }

  /* ------------------------------------------------------- ROUTES --------------------------------------------------------------------------------------- */
  async function renderRoutes() {
    const container = document.getElementById('routes-tbody');
    if (!container) return;
    container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">Loading…</td></tr>`;

    try {
      const res = await fetch(`${API_URL}/routes`);
      if (!res.ok) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:32px;">Failed to load routes (${res.status}).</td></tr>`;
        return;
      }
      const routes = await res.json();

      if (!routes.length) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">No routes found.</td></tr>`;
        return;
      }

      container.innerHTML = routes.map(r => `
        <tr>
          <td style="font-size:12px;color:var(--text3);">${escHtml(r.route_id)}</td>
          <td style="font-weight:500;">${escHtml(r.from_location)}</td>
          <td style="font-weight:500;">${escHtml(r.to_location)}</td>
          <td>${escHtml(r.duration || '—')} · ${escHtml(r.fare || '—')}</td>
          <td>
            <div class="user-actions">
              <button class="btn btn-sm btn-danger" onclick="ADMIN.confirmDeleteRoute('${r.route_id}','${escHtml(r.from_location)}','${escHtml(r.to_location)}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Render routes error:', err);
      container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:32px;">Failed to load routes.</td></tr>`;
    }
  }

  /* ------------------------------------------------------- USER STATUS --------------------------------------------------------------------------------------- */
  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method:  'PUT',
        headers: _authHeader(),
        body:    JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        TOAST.show(d.error || 'Could not update status.', 'error');
        return;
      }
      allUsers = [];
      TOAST.show(`Account ${newStatus === 'active' ? 'activated' : 'restricted'}.`, newStatus === 'active' ? 'success' : '');
      renderUsers();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not update status.', 'error');
    }
  }

  /* ------------------------------------------------------- DELETE USER --------------------------------------------------------------------------------------- */
  function confirmDelete(userId, userName) {
    document.getElementById('delete-confirm-name').textContent = userName;
    document.getElementById('delete-confirm-id').value = userId;
    document.querySelector('#delete-modal .btn-danger').onclick = doDelete;
    document.getElementById('delete-modal').classList.remove('hidden');
  }

  function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
  }

  async function doDelete() {
    const userId = document.getElementById('delete-confirm-id').value;
    try {
      await fetch(`${API_URL}/admin/users/${userId}`, {
        method:  'DELETE',
        headers: _authHeader()
      });
      allUsers = [];
      closeDeleteModal();
      TOAST.show('User deleted.', 'error');
      renderUsers();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not delete user.', 'error');
    }
  }

  /* ------------------------------------------------------- EDIT USER --------------------------------------------------------------------------------------- */
  function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    editingUserId = userId;
    document.getElementById('edit-name').value     = user.name;
    document.getElementById('edit-email').value    = user.email;
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-modal').classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    editingUserId = null;
  }

  async function saveEdit() {
    if (!editingUserId) return;
    const name     = document.getElementById('edit-name').value.trim();
    const email    = document.getElementById('edit-email').value.trim();
    const password = document.getElementById('edit-password').value.trim();
    if (!name || !email) { TOAST.show('Name and email are required.', 'error'); return; }

    try {
      const res = await fetch(`${API_URL}/admin/users/${editingUserId}`, {
        method:  'PUT',
        headers: _authHeader(),
        body:    JSON.stringify({ name, email, ...(password ? { password } : {}) })
      });
      if (!res.ok) {
        const data = await res.json();
        TOAST.show(data.error || 'Update failed.', 'error');
        return;
      }
      allUsers = [];
      closeEditModal();
      TOAST.show('User updated.', 'success');
      renderUsers();
    } catch (err) {
      TOAST.show('Could not save changes.', 'error');
    }
  }

  /* ------------------------------------------------------- DELETE COMMENT --------------------------------------------------------------------------------------- */
  async function deleteComment(commentId) {
    try {
      await fetch(`${API_URL}/admin/comments/${commentId}`, {
        method:  'DELETE',
        headers: _authHeader()
      });
      TOAST.show('Comment deleted.');
      renderAllComments();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not delete comment.', 'error');
    }
  }

  /* ------------------------------------------------------- DELETE ROUTE --------------------------------------------------------------------------------------- */
  let _pendingDeleteRouteId = null;

  function confirmDeleteRoute(routeId, from, to) {
    _pendingDeleteRouteId = routeId;
    document.getElementById('delete-confirm-name').textContent = `route "${from} → ${to}"`;
    document.getElementById('delete-confirm-id').value = routeId;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.querySelector('#delete-modal .btn-danger').onclick = doDeleteRoute;
  }

  async function doDeleteRoute() {
    const routeId = _pendingDeleteRouteId || document.getElementById('delete-confirm-id').value;
    try {
      await fetch(`${API_URL}/routes/${encodeURIComponent(routeId)}`, {
        method:  'DELETE',
        headers: _authHeader()
      });
      closeDeleteModal();
      document.querySelector('#delete-modal .btn-danger').onclick = doDelete;
      TOAST.show('Route deleted.', 'error');
      renderRoutes();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not delete route.', 'error');
    }
  }

  /* ------------------------------------------------------- ADD ROUTE --------------------------------------------------------------------------------------- */
  let _addRouteStepCount = 0;

  function openAddRouteModal() {
    _addRouteStepCount = 0;
    document.getElementById('ar-route-id').value      = '';
    document.getElementById('ar-from').value           = '';
    document.getElementById('ar-to').value             = '';
    document.getElementById('ar-duration').value       = '';
    document.getElementById('ar-fare').value           = '';
    document.getElementById('ar-transport').value      = 'jeep';
    document.getElementById('ar-tags').value           = '';
    document.getElementById('ar-map-embed-url').value  = '';
    document.getElementById('ar-steps-list').innerHTML = '';
    const hint = document.getElementById('ar-no-steps-hint');
    if (hint) hint.style.display = '';
    document.getElementById('add-route-modal').classList.remove('hidden');
  }

  function closeAddRouteModal() {
    document.getElementById('add-route-modal').classList.add('hidden');
  }

  function autoRouteId() {
    const from = document.getElementById('ar-from').value.trim();
    const to   = document.getElementById('ar-to').value.trim();
    const rid  = document.getElementById('ar-route-id');
    if (from && to) {
      rid.value = (from + '_' + to)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  function addRouteStep() {
    _addRouteStepCount++;
    const n    = _addRouteStepCount;
    const list = document.getElementById('ar-steps-list');
    const hint = document.getElementById('ar-no-steps-hint');
    if (hint) hint.style.display = 'none';

    const div = document.createElement('div');
    div.className = 'ar-step-block';
    div.id        = `ar-step-${n}`;
    div.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-weight:600;font-size:13px;">Step ${n}</span>
        <button type="button" class="btn btn-sm btn-ghost" onclick="ADMIN.removeRouteStep(this)" style="color:var(--red);">✕ Remove</button>
      </div>
      <div class="form-group">
        <label class="form-label">Title <span style="color:var(--red);">*</span></label>
        <input class="form-control" name="step-title" type="text" placeholder="e.g. Ride a Jeepney from CVSU CCAT"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group">
          <label class="form-label">Transport <span style="color:var(--red);">*</span></label>
          <select class="form-control" name="step-transport">
            <option value="jeep">Jeep</option>
            <option value="bus">Bus</option>
            <option value="tricycle">Tricycle</option>
            <option value="walk">Walk</option>
            <option value="fx">FX</option>
            <option value="uv">UV Express</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fare</label>
          <input class="form-control" name="step-fare" type="text" placeholder="e.g. 15–20" onblur="ADMIN.formatFare(this)"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Instruction <span style="color:var(--red);">*</span></label>
        <textarea class="form-control" name="step-instruction" rows="2" placeholder="Describe what to do on this step…"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group">
          <label class="form-label">Signboard <span style="color:var(--text3);font-weight:400;">(optional)</span></label>
          <input class="form-control" name="step-signboard" type="text" placeholder='e.g. Look for: "Tanza"'/>
        </div>
        <div class="form-group">
          <label class="form-label">Alight At <span style="color:var(--text3);font-weight:400;">(optional)</span></label>
          <input class="form-control" name="step-alight" type="text" placeholder="e.g. SM Tanza Terminal"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Google Maps Embed URL <span style="color:var(--text3);font-weight:400;">(optional — shows a live map inside this step)</span></label>
        <input class="form-control" name="step-map-embed" type="url" placeholder="https://www.google.com/maps/embed?pb=..."/>
        <p style="font-size:12px;color:var(--text3);margin-top:4px;">Google Maps → find the spot → <strong>Share → Embed a map</strong> → copy only the URL inside <code>src="..."</code>.</p>
      </div>`;
    list.appendChild(div);
  }

  function removeRouteStep(btn) {
    btn.closest('.ar-step-block').remove();
    const list = document.getElementById('ar-steps-list');
    const hint = document.getElementById('ar-no-steps-hint');
    if (hint) hint.style.display = list.children.length === 0 ? '' : 'none';
  }

  async function submitNewRoute() {
    const routeId       = document.getElementById('ar-route-id').value.trim();
    const fromLocation  = document.getElementById('ar-from').value.trim();
    const toLocation    = document.getElementById('ar-to').value.trim();
    const duration      = document.getElementById('ar-duration').value.trim();
    const fare          = document.getElementById('ar-fare').value.trim();
    const transportType = document.getElementById('ar-transport').value;
    const tagsRaw       = document.getElementById('ar-tags').value.trim();
    const mapEmbedUrl   = document.getElementById('ar-map-embed-url').value.trim();

    if (!fromLocation) { TOAST.show('From location is required.', 'error'); return; }
    if (!toLocation)   { TOAST.show('To location is required.', 'error'); return; }
    if (!routeId)      { TOAST.show('Route ID is required.', 'error'); return; }

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const stepBlocks = document.querySelectorAll('#ar-steps-list .ar-step-block');
    const steps      = [];
    let   stepNum    = 1;

    for (const block of stepBlocks) {
      const title       = block.querySelector('[name="step-title"]').value.trim();
      const transport   = block.querySelector('[name="step-transport"]').value;
      const instruction = block.querySelector('[name="step-instruction"]').value.trim();
      const signboard   = block.querySelector('[name="step-signboard"]').value.trim();
      const alightAt    = block.querySelector('[name="step-alight"]').value.trim();
      const stepFare    = block.querySelector('[name="step-fare"]').value.trim();
      const mapEmbed    = block.querySelector('[name="step-map-embed"]').value.trim();

      if (!title || !instruction) {
        TOAST.show(`Step ${stepNum}: Title and Instruction are required.`, 'error');
        return;
      }
      steps.push({
        num:       stepNum++,
        title,
        transport,
        instruction,
        signboard: signboard || null,
        alightAt:  alightAt  || null,
        fare:      stepFare  || null,
        mapEmbed:  mapEmbed  || null
      });
    }

    try {
      const res = await fetch(`${API_URL}/routes`, {
        method:  'POST',
        headers: _authHeader(),
        body:    JSON.stringify({
          route_id:       routeId,
          from_location:  fromLocation,
          to_location:    toLocation,
          duration:       duration       || null,
          fare:           fare           || null,
          transport_type: transportType  || null,
          tags,
          steps,
          map_embed_url:  mapEmbedUrl    || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        TOAST.show(data.error || 'Failed to create route.', 'error');
        return;
      }
      closeAddRouteModal();
      TOAST.show('Route added successfully! 🗺', 'success');
      renderRoutes();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not create route. Is the server running?', 'error');
    }
  }

  /* ------------------------------------------------------- FARE FORMAT --------------------------------------------------------------------------------------- */
  function formatFare(input) {
    let val = input.value.replace(/₱/g, '').trim();
    if (!val) return;
    const parts = val.split(/\s*[-–~]\s*/);
    if (parts.length === 2 && parts[0] && parts[1]) {
      input.value = `₱${parts[0].trim()}–₱${parts[1].trim()}`;
    } else {
      input.value = `₱${val}`;
    }
  }

  /* ------------------------------------------------------- HELPERS --------------------------------------------------------------------------------------- */
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return {
    navigate, renderDashboard, renderUsers, renderAllComments, renderRoutes,
    toggleStatus, confirmDelete, closeDeleteModal, doDelete,
    openEditModal, closeEditModal, saveEdit, deleteComment,
    confirmDeleteRoute, doDeleteRoute,
    openAddRouteModal, closeAddRouteModal, autoRouteId,
    addRouteStep, removeRouteStep, submitNewRoute, formatFare
  };
})();
