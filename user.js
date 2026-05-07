/**
 * user.js — User data module for WTG: Commuters Guide
 * Handles saved routes, history, and comments using localStorage
 */

const USER = (() => {

  const COMMENTS_KEY = 'wtg_comments';

  /* ── Update current user's data in storage ── */
  function _updateCurrentUser(fn) {
    const session = AUTH.getSession();
    if (!session) return false;
    const user = AUTH.getCurrentUser();
    if (!user) return false;
    const updated = fn(user);
    AUTH.updateUser(user.id, updated);
    return true;
  }

  /* ── Save a route ── */
  function saveRoute(routeId, from, to) {
    _updateCurrentUser(user => {
      const saved = user.savedRoutes || [];
      if (saved.find(r => r.routeId === routeId)) return user; // already saved
      saved.unshift({ routeId, from, to, savedAt: new Date().toISOString() });
      return { ...user, savedRoutes: saved.slice(0, 50) };
    });
  }

  /* ── Remove saved route ── */
  function unsaveRoute(routeId) {
    _updateCurrentUser(user => {
      const saved = (user.savedRoutes || []).filter(r => r.routeId !== routeId);
      return { ...user, savedRoutes: saved };
    });
  }

  /* ── Check if route is saved ── */
  function isRouteSaved(routeId) {
    const user = AUTH.getCurrentUser();
    if (!user) return false;
    return !!(user.savedRoutes || []).find(r => r.routeId === routeId);
  }

  /* ── Get saved routes ── */
  function getSavedRoutes() {
    const user = AUTH.getCurrentUser();
    return user ? (user.savedRoutes || []) : [];
  }

  /* ── Add to history ── */
  function addHistory(routeId, from, to) {
    _updateCurrentUser(user => {
      const hist = user.history || [];
      // remove duplicate
      const filtered = hist.filter(h => h.routeId !== routeId);
      filtered.unshift({ routeId, from, to, searchedAt: new Date().toISOString() });
      return { ...user, history: filtered.slice(0, 30) };
    });
  }

  /* ── Get history ── */
  function getHistory() {
    const user = AUTH.getCurrentUser();
    return user ? (user.history || []) : [];
  }

  /* ── Clear history ── */
  function clearHistory() {
    _updateCurrentUser(user => ({ ...user, history: [] }));
  }

  /* ── Comments ── */
  function getComments(routeId) {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    return all[routeId] || [];
  }

  function addComment(routeId, text) {
    const session = AUTH.getSession();
    if (!session) return false;
    if (!text.trim()) return false;
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    if (!all[routeId]) all[routeId] = [];
    all[routeId].unshift({
      id: Date.now().toString(),
      userId: session.id,
      userName: session.name,
      text: text.trim(),
      postedAt: new Date().toISOString()
    });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    return true;
  }

  function deleteComment(routeId, commentId) {
    const session = AUTH.getSession();
    if (!session) return false;
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    if (!all[routeId]) return false;
    all[routeId] = all[routeId].filter(c => {
      // user can delete own, admin can delete any
      if (session.role === 'admin') return c.id !== commentId;
      return !(c.id === commentId && c.userId === session.id);
    });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    return true;
  }

  /* ── Render comment section ── */
  function renderComments(routeId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const session = AUTH.getSession();
    const comments = getComments(routeId);

    const formHtml = session ? `
      <div class="comment-form">
        <textarea id="comment-input" class="form-control" rows="3"
          placeholder="Know a better route? Share it here..."></textarea>
        <button class="btn btn-primary btn-sm" onclick="USER.submitComment('${routeId}', '${containerId}')">
          Post Comment
        </button>
      </div>
    ` : `<p class="text-sm text-muted mt-12"><a href="login.html">Log in</a> to leave a comment.</p>`;

    const commentsHtml = comments.length === 0
      ? `<div class="empty-state" style="padding:24px 0;">
           <div class="empty-icon">💬</div>
           <p class="text-sm">No comments yet. Be the first to share a tip!</p>
         </div>`
      : comments.map(c => `
          <div class="comment-item fade-in" id="comment-${c.id}">
            <div class="comment-meta">
              <div class="comment-avatar">${c.userName.charAt(0).toUpperCase()}</div>
              <div>
                <div class="comment-author">${escHtml(c.userName)}</div>
                <div class="comment-time">${timeAgo(c.postedAt)}</div>
              </div>
              ${(session && (session.id === c.userId || session.role === 'admin'))
                ? `<button class="btn btn-sm btn-ghost" style="margin-left:auto;"
                    onclick="USER.removeComment('${routeId}', '${c.id}', '${containerId}')">✕</button>`
                : ''}
            </div>
            <div class="comment-text">${escHtml(c.text)}</div>
          </div>`).join('');

    container.innerHTML = `
      <div class="comment-section">
        <h3>💬 Community Tips & Alternate Routes</h3>
        <p class="text-sm mt-8 mb-16">Know a better route? Share it with fellow commuters!</p>
        ${formHtml}
        <div class="comment-list">${commentsHtml}</div>
      </div>
    `;
  }

  function submitComment(routeId, containerId) {
    const input = document.getElementById('comment-input');
    if (!input) return;
    const ok = addComment(routeId, input.value);
    if (ok) {
      renderComments(routeId, containerId);
      TOAST.show('Comment posted!', 'success');
    } else {
      TOAST.show('Please write something first.', 'error');
    }
  }

  function removeComment(routeId, commentId, containerId) {
    deleteComment(routeId, commentId);
    renderComments(routeId, containerId);
    TOAST.show('Comment removed.');
  }

  /* ── Helpers ── */
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return {
    saveRoute, unsaveRoute, isRouteSaved, getSavedRoutes,
    addHistory, getHistory, clearHistory,
    getComments, addComment, deleteComment,
    renderComments, submitComment, removeComment
  };
})();

/* ── Global toast utility ── */
const TOAST = (() => {
  function show(msg, type = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', '': 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  return { show };
})();
