const USER = (() => {

  /* ------------------------------------------------------- AUTH HEADER --------------------------------------------------------------------------------------- */
  function _getToken() {
    return AUTH.getToken();
  }

  function _authHeader() {
    return { 'Authorization': `Bearer ${_getToken()}`, 'Content-Type': 'application/json' };
  }

  function _canonicalId(routeId) {
    return String(routeId).replace(/_rev$/, '');
  }

  /* ------------------------------------------------------- SAVE ROUTE --------------------------------------------------------------------------------------- */
  async function saveRoute(routeId, from, to) {
    const token = _getToken();
    if (!token) { alert('Please log in to save routes'); return false; }

    try {
      const response = await fetch(`${API_URL}/user/save-route`, {
        method:  'POST',
        headers: _authHeader(),
        body:    JSON.stringify({ routeId, from, to })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) return false;
        throw new Error(data.error || 'Failed to save route');
      }
      return true;
    } catch (error) {
      console.error('Save route error:', error);
      return false;
    }
  }

  /* ------------------------------------------------------- UNSAVE ROUTE --------------------------------------------------------------------------------------- */
  async function unsaveRoute(routeId) {
    if (!_getToken()) return false;
    try {
      const response = await fetch(`${API_URL}/user/saved-routes/${routeId}`, {
        method:  'DELETE',
        headers: _authHeader()
      });
      return response.ok;
    } catch (error) {
      console.error('Unsave route error:', error);
      return false;
    }
  }

  /* ------------------------------------------------------- CHECK SAVED --------------------------------------------------------------------------------------- */
  async function isRouteSaved(routeId) {
    if (!_getToken()) return false;
    try {
      const response = await fetch(`${API_URL}/user/saved-routes`, { headers: _authHeader() });
      if (!response.ok) return false;
      const routes = await response.json();
      return routes.some(r => r.route_id === routeId);
    } catch (error) {
      return false;
    }
  }

  /* ------------------------------------------------------- GET SAVED ROUTES --------------------------------------------------------------------------------------- */
  async function getSavedRoutes() {
    if (!_getToken()) return [];
    try {
      const response = await fetch(`${API_URL}/user/saved-routes`, { headers: _authHeader() });
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      return [];
    }
  }

  /* ------------------------------------------------------- SEARCH HISTORY --------------------------------------------------------------------------------------- */
  function addHistory(routeId, from, to) {
    const history  = JSON.parse(localStorage.getItem('wtg_search_history') || '[]');
    const filtered = history.filter(h => h.routeId !== routeId);
    filtered.unshift({ routeId, from, to, searchedAt: new Date().toISOString() });
    localStorage.setItem('wtg_search_history', JSON.stringify(filtered.slice(0, 30)));
  }

  function getHistory() {
    return JSON.parse(localStorage.getItem('wtg_search_history') || '[]');
  }

  function clearHistory() {
    localStorage.removeItem('wtg_search_history');
  }

  /* ------------------------------------------------------- COMMENTS --------------------------------------------------------------------------------------- */
  async function getComments(routeId) {
    const id = _canonicalId(routeId);
    try {
      const res = await fetch(`${API_URL}/user/comments/${encodeURIComponent(id)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async function addComment(routeId, text) {
    if (!_getToken()) return false;
    if (!text.trim()) return false;
    const id = _canonicalId(routeId);
    try {
      const res = await fetch(`${API_URL}/user/comments/${encodeURIComponent(id)}`, {
        method:  'POST',
        headers: _authHeader(),
        body:    JSON.stringify({ comment: text.trim() })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('addComment failed:', res.status, data.error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('addComment network error:', err);
      return false;
    }
  }

  async function deleteComment(routeId, commentId) {
    if (!_getToken()) return false;
    try {
      const res = await fetch(`${API_URL}/user/comments/${commentId}`, {
        method:  'DELETE',
        headers: _authHeader()
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------- RENDER COMMENTS --------------------------------------------------------------------------------------- */
  async function renderComments(routeId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const session = AUTH.getSession();

    container.innerHTML = `
      <h3>💬 Community Tips &amp; Alternate Routes</h3>
      <p class="text-sm mt-8 mb-16">Know a better route? Share it with fellow commuters!</p>
      <div style="color:var(--text3);padding:16px 0;">Loading comments…</div>
    `;

    const comments = await getComments(routeId);

    const formHtml = session ? `
      <div class="comment-form">
        <textarea id="comment-input" class="form-control" rows="3"
          placeholder="Know a better route? Share it here…"></textarea>
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
              <div class="comment-avatar">${c.user_name.charAt(0).toUpperCase()}</div>
              <div>
                <div class="comment-author">${escHtml(c.user_name)}</div>
                <div class="comment-time">${timeAgo(c.created_at)}</div>
              </div>
              ${(session && (session.id === c.user_id || session.role === 'admin'))
                ? `<button class="btn btn-sm btn-ghost" style="margin-left:auto;"
                    onclick="USER.removeComment('${routeId}', ${c.id}, '${containerId}')">✕</button>`
                : ''}
            </div>
            <div class="comment-text">${escHtml(c.comment)}</div>
          </div>`).join('');

    container.innerHTML = `
      <h3>💬 Community Tips &amp; Alternate Routes</h3>
      <p class="text-sm mt-8 mb-16">Know a better route? Share it with fellow commuters!</p>
      ${formHtml}
      <div class="comment-list">${commentsHtml}</div>
    `;
  }

  /* ------------------------------------------------------- SUBMIT / REMOVE COMMENT --------------------------------------------------------------------------------------- */
  async function submitComment(routeId, containerId) {
    const input = document.getElementById('comment-input');
    if (!input || !input.value.trim()) {
      TOAST.show('Please write something first.', 'error');
      return;
    }
    const ok = await addComment(routeId, input.value);
    if (ok) {
      await renderComments(routeId, containerId);
      TOAST.show('Comment posted!', 'success');
    } else {
      TOAST.show('Could not post comment. Please try again.', 'error');
    }
  }

  async function removeComment(routeId, commentId, containerId) {
    const ok = await deleteComment(routeId, commentId);
    if (ok) {
      await renderComments(routeId, containerId);
      TOAST.show('Comment removed.');
    } else {
      TOAST.show('Could not remove comment.', 'error');
    }
  }

  /* ------------------------------------------------------- HELPERS --------------------------------------------------------------------------------------- */
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

/* ------------------------------------------------------- TOAST --------------------------------------------------------------------------------------- */
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
