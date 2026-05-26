/**
 * auth.js — Authentication module for WTG: Commuters Guide
 * Handles login, signup, session, and role management using localStorage
 */

const AUTH = (() => {
  const USERS_KEY = 'wtg_users';
  const SESSION_KEY = 'wtg_session';

  /* ── Seed default admin & sample user ── */
  function init() {
    if (!localStorage.getItem(USERS_KEY)) {
      const defaults = [
        {
          id: 'ADMINvince',
          name: 'Admin',
          email: 'janvincentreyel24@gmail.com',
          password: btoa('janvincentreyel2406'),
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          savedRoutes: [],
          history: []
        },
        {
          id: 'bins',
          name: 'Jan Vincent Reyel',
          email: 'janvincentreyel2406@gmail.com',
          password: btoa('jvr123'),
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
          savedRoutes: [],
          history: []
        }
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
    }
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function setSession(user) {
    // store safe copy (no password)
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ── Login ── */
  function login(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, msg: 'No account found with that email.' };
    if (user.password !== btoa(password)) return { ok: false, msg: 'Incorrect password.' };
    if (user.status === 'restricted') return { ok: false, msg: 'Your account has been restricted. Contact support.' };
    setSession(user);
    return { ok: true, user };
  }

  /* ── Signup ── */
  function signup(name, email, password) {
    if (!name.trim() || !email.trim() || !password.trim()) return { ok: false, msg: 'All fields are required.' };
    if (password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, msg: 'An account with this email already exists.' };
    }
    const newUser = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: btoa(password),
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      savedRoutes: [],
      history: []
    };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    return { ok: true, user: newUser };
  }

  /* ── Logout ── */
  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  /* ── Guard: redirect if not logged in ── */
  function requireAuth(redirectTo = 'login.html') {
    if (!getSession()) { window.location.href = redirectTo; return null; }
    return getSession();
  }

  /* ── Guard: redirect if not admin ── */
  function requireAdmin() {
    const s = getSession();
    if (!s || s.role !== 'admin') { window.location.href = 'index.html'; return null; }
    return s;
  }

  /* ── Get full user object from session ── */
  function getCurrentUser() {
    const s = getSession();
    if (!s) return null;
    const users = getUsers();
    return users.find(u => u.id === s.id) || null;
  }

  /* ── Update user data ── */
  function updateUser(id, updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    return true;
  }

  init();

  return { login, signup, logout, getSession, requireAuth, requireAdmin, getCurrentUser, getUsers, updateUser };
})();
