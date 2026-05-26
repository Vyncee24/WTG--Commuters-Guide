/**
 * admin.js — Admin panel logic for WTG: Commuters Guide
 * Handles user management: view, delete, restrict, modify
 */

const ADMIN = (() => {

  let currentSection = 'dashboard';
  let editingUserId = null;

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
    if (section === 'users') renderUsers();
    if (section === 'comments') renderAllComments();
  }

  /* ── Dashboard stats ── */
  function renderDashboard() {
    const users = AUTH.getUsers().filter(u => u.role !== 'admin');
    const active = users.filter(u => u.status === 'active').length;
    const restricted = users.filter(u => u.status === 'restricted').length;
    const commentsAll = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    const totalComments = Object.values(commentsAll).reduce((a, c) => a + c.length, 0);

    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-restricted').textContent = restricted;
    document.getElementById('stat-comments').textContent = totalComments;
  }

  /* ── Render users table ── */
  function renderUsers(filter = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    let users = AUTH.getUsers().filter(u => u.role !== 'admin');
    if (filter) {
      const q = filter.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
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
        <td>${formatDate(u.createdAt)}</td>
        <td>${(u.savedRoutes || []).length} saved · ${(u.history || []).length} searches</td>
        <td>
          <span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}">
            ${u.status === 'active' ? '● Active' : '⊘ Restricted'}
          </span>
        </td>
        <td>
          <div class="user-actions">
            <button class="btn btn-sm btn-secondary" onclick="ADMIN.openEditModal('${u.id}')">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="ADMIN.toggleStatus('${u.id}')">
              ${u.status === 'active' ? 'Restrict' : 'Activate'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="ADMIN.confirmDelete('${u.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /* ── Render all comments ── */
  function renderAllComments() {
    const container = document.getElementById('all-comments-container');
    if (!container) return;
    const all = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    const entries = Object.entries(all);

    if (entries.length === 0 || entries.every(([,c]) => c.length === 0)) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No comments yet.</p></div>`;
      return;
    }

    container.innerHTML = entries.map(([routeId, comments]) => {
      if (!comments.length) return '';
      return `
        <div style="margin-bottom:24px;">
          <h4 style="color:var(--text2);font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
            Route: ${routeId.replace(/_/g,' ')}
          </h4>
          ${comments.map(c => `
            <div class="comment-item" style="margin-bottom:8px;">
              <div class="comment-meta">
                <div class="comment-avatar">${c.userName.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="comment-author">${escHtml(c.userName)}</div>
                  <div class="comment-time">${formatDate(c.postedAt)}</div>
                </div>
                <button class="btn btn-sm btn-danger" style="margin-left:auto;"
                  onclick="ADMIN.deleteComment('${routeId}','${c.id}')">Delete</button>
              </div>
              <div class="comment-text">${escHtml(c.text)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }

  /* ── Toggle restrict/active ── */
  function toggleStatus(userId) {
    const users = AUTH.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'restricted' : 'active';
    AUTH.updateUser(userId, { status: newStatus });
    TOAST.show(`Account ${newStatus === 'active' ? 'activated' : 'restricted'}.`, newStatus === 'active' ? 'success' : '');
    renderUsers();
  }

  /* ── Confirm delete ── */
  function confirmDelete(userId) {
    const users = AUTH.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('delete-confirm-name').textContent = user.name;
    document.getElementById('delete-confirm-id').value = userId;
    document.getElementById('delete-modal').classList.remove('hidden');
  }

  function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
  }

  function doDelete() {
    const userId = document.getElementById('delete-confirm-id').value;
    const users = AUTH.getUsers().filter(u => u.id !== userId);
    localStorage.setItem('wtg_users', JSON.stringify(users));
    closeDeleteModal();
    TOAST.show('User deleted.', 'error');
    renderUsers();
    renderDashboard();
  }

  /* ── Edit modal ── */
  function openEditModal(userId) {
    const users = AUTH.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    editingUserId = userId;
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-modal').classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    editingUserId = null;
  }

  function saveEdit() {
    if (!editingUserId) return;
    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const newPass = document.getElementById('edit-password').value.trim();
    if (!name || !email) { TOAST.show('Name and email are required.', 'error'); return; }

    const updates = { name, email };
    if (newPass) updates.password = btoa(newPass);
    AUTH.updateUser(editingUserId, updates);
    closeEditModal();
    TOAST.show('User updated.', 'success');
    renderUsers();
  }

  /* ── Delete comment ── */
  function deleteComment(routeId, commentId) {
    const all = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    if (all[routeId]) all[routeId] = all[routeId].filter(c => c.id !== commentId);
    localStorage.setItem('wtg_comments', JSON.stringify(all));
    TOAST.show('Comment deleted.', 'error');
    renderAllComments();
  }

  /* ── Helpers ── */
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return {
    navigate, renderDashboard, renderUsers, renderAllComments,
    toggleStatus, confirmDelete, closeDeleteModal, doDelete,
    openEditModal, closeEditModal, saveEdit, deleteComment
  };
})();
