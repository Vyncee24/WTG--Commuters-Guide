/**
 * auth.js — Authentication module for WTG: Commuters Guide
 * Handles login, signup, session, and role management using MySQL Backend API
 *
 * FIX APPLIED:
 *  - API_URL is now derived from window.location instead of being hardcoded
 *    to 'http://localhost:5000/api'. The hardcoded URL caused ALL API calls
 *    (including dashboard stats) to fail with a network error when:
 *      a) The server ran on a port other than 5000
 *      b) The site was accessed from a network IP (e.g. 192.168.x.x)
 *      c) The app was deployed to any non-localhost environment
 *    Since server.js serves both static files and the API on the same port,
 *    using window.location.origin + '/api' always resolves correctly.
 *
 *    Fallback: if the page is somehow opened as file:// (not via Express),
 *    the code defaults to localhost:5000 to preserve existing dev behaviour.
 */

// FIX: Derive API_URL from the current page origin so it works on any host/port.
// server.js serves static files AND API routes on the same port, so this is safe.
const API_URL = (window.location.protocol === 'file:')
  ? 'http://localhost:5000/api'                    // fallback for direct file:// access
  : `${window.location.origin}/api`;               // correct for Express-served pages

const TOKEN_KEY   = 'wtg_token';
const SESSION_KEY = 'wtg_session';

const AUTH = (() => {

  /* ── Initialize session from stored token ── */
  function init() {
    const token = getToken();
    if (token) {
      // Token exists; refresh the session from the server in the background.
      loadUserSession();
    }
  }

  /* ── Get stored JWT token ── */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /* ── Store JWT token ── */
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /* ── Clear JWT token ── */
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /* ── Get current session (from localStorage cache) ── */
  function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  /* ── Store session locally ── */
  function setSession(user) {
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  }

  /* ── Clear session ── */
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ── Load user session from API ── */
  async function loadUserSession() {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load profile');
      const user = await response.json();
      setSession(user);
      return user;
    } catch (error) {
      console.error('Session load error:', error);
      clearToken();
      clearSession();
      return null;
    }
  }

  /* ── Login with API ── */
  async function login(email, password) {
    try {
      if (!email.trim() || !password.trim()) {
        return { ok: false, msg: 'Email and password are required.' };
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, msg: data.error || 'Login failed.' };
      }

      setToken(data.token);
      setSession(data.user);

      return { ok: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { ok: false, msg: 'Connection error. Is the server running?' };
    }
  }

  /* ── Signup with API ── */
  async function signup(name, email, password) {
    try {
      if (!name.trim() || !email.trim() || !password.trim()) {
        return { ok: false, msg: 'All fields are required.' };
      }
      if (password.length < 6) {
        return { ok: false, msg: 'Password must be at least 6 characters.' };
      }

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, msg: data.error || 'Signup failed.' };
      }

      setToken(data.token);
      setSession(data.user);
      return { ok: true, user: data.user };
    } catch (error) {
      console.error('Signup error:', error);
      return { ok: false, msg: 'Connection error. Is the server running?' };
    }
  }

  /* ── Logout ── */
  function logout() {
    clearToken();
    clearSession();
    window.location.href = 'login.html';
  }

  /* ── Guard: redirect if not logged in ── */
  function requireAuth(redirectTo = 'login.html') {
    const token = getToken();
    const session = getSession();
    if (!token || !session) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  }

  /* ── Guard: redirect if not admin ── */
  function requireAdmin() {
    const token = getToken();
    const session = getSession();
    if (!token || !session || session.role !== 'admin') {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  /* ── Get current user from session ── */
  function getCurrentUser() {
    return getSession();
  }

  init();

  return {
    login,
    signup,
    logout,
    getSession,
    getCurrentUser,
    requireAuth,
    requireAdmin,
    getToken,
    setToken,
    clearToken
  };
})();
