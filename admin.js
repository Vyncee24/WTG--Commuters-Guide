/**
 * admin.js — Admin panel logic for WTG: Commuters Guide
 * All data is fetched from the MySQL API (no localStorage).
 */

const ADMIN = (() => {

  let currentSection = 'dashboard';
  let editingUserId  = null;
  let allUsers       = [];   // cached after fetch

  /* ── Auth header helper ── */
  function _authHeader() {
    return { 'Authorization': `Bearer ${AUTH.getToken()}`, 'Content-Type': 'application/json' };
  }

  /* ── Navigate sidebar ── */
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

  /* ── Render section content ── */
  function renderSection(section) {
    if (section === 'dashboard') renderDashboard();
    if (section === 'users')     renderUsers();
    if (section === 'comments')  renderAllComments();
    if (section === 'routes')    renderRoutes();
  }

  /* ── Dashboard stats (from API) ── */
  async function renderDashboard() {
    try {
      const res  = await fetch(`${API_URL}/admin/stats`, { headers: _authHeader() });
      const data = await res.json();
      document.getElementById('stat-users').textContent      = data.total      ?? 0;
      document.getElementById('stat-active').textContent     = data.active     ?? 0;
      document.getElementById('stat-restricted').textContent = data.restricted ?? 0;
      document.getElementById('stat-comments').textContent   = data.comments   ?? 0;
    } catch (err) {
      console.error('Dashboard stats error:', err);
    }
  }

  /* ── Render users table (from API) ── */
  async function renderUsers(filter = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Loading…</td></tr>`;

    try {
      if (!allUsers.length || !filter) {
        const res = await fetch(`${API_URL}/admin/users`, { headers: _authHeader() });
        allUsers  = await res.json();
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
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Failed to load users.</td></tr>`;
    }
  }

  /* ── Render all comments (from API) ── */
  async function renderAllComments() {
    const container = document.getElementById('all-comments-container');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading comments…</p></div>`;

    try {
      const res      = await fetch(`${API_URL}/admin/comments`, { headers: _authHeader() });
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

  /* ── Render routes table (from API) ── */
  async function renderRoutes() {
    const container = document.getElementById('routes-tbody');
    if (!container) return;
    container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">Loading…</td></tr>`;

    try {
      const res    = await fetch(`${API_URL}/routes`);
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
      container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">Failed to load routes.</td></tr>`;
    }
  }

  /* ── Toggle restrict/active (API) ── */
  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
    try {
      await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method:  'PUT',
        headers: _authHeader(),
        body:    JSON.stringify({ status: newStatus })
      });
      allUsers = [];  // clear cache
      TOAST.show(`Account ${newStatus === 'active' ? 'activated' : 'restricted'}.`, newStatus === 'active' ? 'success' : '');
      renderUsers();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not update status.', 'error');
    }
  }

  /* ── Confirm delete user ── */
  function confirmDelete(userId, userName) {
    document.getElementById('delete-confirm-name').textContent = userName;
    document.getElementById('delete-confirm-id').value = userId;
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
      allUsers = [];  // clear cache
      closeDeleteModal();
      TOAST.show('User deleted.', 'error');
      renderUsers();
      renderDashboard();
    } catch (err) {
      TOAST.show('Could not delete user.', 'error');
    }
  }

  /* ── Edit modal ── */
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
      allUsers = [];  // clear cache
      closeEditModal();
      TOAST.show('User updated.', 'success');
      renderUsers();
    } catch (err) {
      TOAST.show('Could not save changes.', 'error');
    }
  }

  /* ── Delete comment (API) ── */
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

  /* ── Confirm delete route ── */
  let _pendingDeleteRouteId = null;
  function confirmDeleteRoute(routeId, from, to) {
    _pendingDeleteRouteId = routeId;
    document.getElementById('delete-confirm-name').textContent = `route "${from} → ${to}"`;
    document.getElementById('delete-confirm-id').value = routeId;
    document.getElementById('delete-modal').classList.remove('hidden');
    // Override doDelete button temporarily
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
      // Restore original delete button handler
      document.querySelector('#delete-modal .btn-danger').onclick = doDelete;
      TOAST.show('Route deleted.', 'error');
      renderRoutes();
    } catch (err) {
      TOAST.show('Could not delete route.', 'error');
    }
  }

  /* ── Helpers ── */
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
    confirmDeleteRoute, doDeleteRoute
  };
})();
