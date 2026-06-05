const API_URL = (window.location.protocol === 'file:')
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

const TOKEN_KEY   = 'wtg_token';
const SESSION_KEY = 'wtg_session';

const AUTH = (() => {

  /* ------------------------------------------------------- SESSION INIT --------------------------------------------------------------------------------------- */
  function init() {
    const token = getToken();
    if (token) {
      loadUserSession();
    }
  }

  /* ------------------------------------------------------- TOKEN MANAGEMENT --------------------------------------------------------------------------------------- */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /* ------------------------------------------------------- SESSION MANAGEMENT --------------------------------------------------------------------------------------- */
  function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function setSession(user) {
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

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

  /* ------------------------------------------------------- LOGIN --------------------------------------------------------------------------------------- */
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

  /* ------------------------------------------------------- SIGNUP --------------------------------------------------------------------------------------- */
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

  /* ------------------------------------------------------- LOGOUT --------------------------------------------------------------------------------------- */
  function logout() {
    clearToken();
    clearSession();
    window.location.href = 'login.html';
  }

  /* ------------------------------------------------------- GUARDS --------------------------------------------------------------------------------------- */
  function requireAuth(redirectTo = 'login.html') {
    const token = getToken();
    const session = getSession();
    if (!token || !session) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  }

  function requireAdmin() {
    const token = getToken();
    const session = getSession();
    if (!token || !session || session.role !== 'admin') {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

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
