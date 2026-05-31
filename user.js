/**
 * user.js — User data module for WTG: Commuters Guide
 * Handles saved routes, history, and comments using MySQL Backend API
 */

const API_URL = 'http://localhost:5000/api';

const USER = (() => {

  /* ── Get auth token ── */
  function _getToken() {
    return AUTH.getToken();
  }

  /* ── Save a route via API ── */
  async function saveRoute(routeId, from, to) {
    const token = _getToken();
    if (!token) {
      alert('Please log in to save routes');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/user/save-route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ routeId, from, to })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          console.warn('Route already saved');
          return false;
        }
        throw new Error(data.error || 'Failed to save route');
      }

      return true;
    } catch (error) {
      console.error('Save route error:', error);
      alert('Could not save route. Please try again.');
      return false;
    }
  }

  /* ── Remove saved route via API ── */
  async function unsaveRoute(routeId) {
    const token = _getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/user/saved-routes/${routeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove saved route');
      }

      return true;
    } catch (error) {
      console.error('Unsave route error:', error);
      return false;
    }
  }

  /* ── Check if route is saved via API ── */
  async function isRouteSaved(routeId) {
    const token = _getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/user/saved-routes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return false;

      const routes = await response.json();
      return routes.some(r => r.route_id === routeId);
    } catch (error) {
      console.error('Check saved route error:', error);
      return false;
    }
  }

  /* ── Get saved routes via API ── */
  async function getSavedRoutes() {
    const token = _getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${API_URL}/user/saved-routes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Get saved routes error:', error);
      return [];
    }
  }

  /* ── Add to local history (client-side) ── */
  function addHistory(routeId, from, to) {
    const history = JSON.parse(localStorage.getItem('wtg_search_history') || '[]');
    // Remove if exists, add to front
    const filtered = history.filter(h => h.routeId !== routeId);
    filtered.unshift({ routeId, from, to, searchedAt: new Date().toISOString() });
    localStorage.setItem('wtg_search_history', JSON.stringify(filtered.slice(0, 30)));
  }

  /* ── Get local history ── */
  function getHistory() {
    return JSON.parse(localStorage.getItem('wtg_search_history') || '[]');
  }

  /* ── Clear local history ── */
  function clearHistory() {
    localStorage.removeItem('wtg_search_history');
  }

  /* ── Get comments (local cache) ── */
  function getComments(routeId) {
    const all = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    return all[routeId] || [];
  }

  /* ── Add comment (local) ── */
  function addComment(routeId, text) {
    const session = AUTH.getSession();
    if (!session) return false;
    if (!text.trim()) return false;

    const all = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    if (!all[routeId]) all[routeId] = [];

    all[routeId].unshift({
      id: Date.now().toString(),
      userId: session.id,
      userName: session.name,
      text: text.trim(),
      postedAt: new Date().toISOString()
    });

    localStorage.setItem('wtg_comments', JSON.stringify(all));
    return true;
  }

  /* ── Delete comment (local) ── */
  function deleteComment(routeId, commentId) {
    const session = AUTH.getSession();
    if (!session) return false;

    const all = JSON.parse(localStorage.getItem('wtg_comments') || '{}');
    if (!all[routeId]) return false;

    all[routeId] = all[routeId].filter(c => {
      if (session.role === 'admin') return c.id !== commentId;
      return !(c.id === commentId && c.userId === session.id);
    });

    localStorage.setItem('wtg_comments', JSON.stringify(all));
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
        <h3>💬 Community Tips & Alternate Routes</h3>
        <p class="text-sm mt-8 mb-16">Know a better route? Share it with fellow commuters!</p>
        ${formHtml}
        <div class="comment-list">${commentsHtml}</div>
      </div>
    `;
  }

  /* ── Submit comment form ── */
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

  /* ── Remove comment ── */
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
    saveRoute,
    unsaveRoute,
    isRouteSaved,
    getSavedRoutes,
    addHistory,
    getHistory,
    clearHistory,
    getComments,
    addComment,
    deleteComment,
    renderComments,
    submitComment,
    removeComment
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
