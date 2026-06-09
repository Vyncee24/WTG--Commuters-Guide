const ROUTES = (() => {

  const API_BASE = (window.location.protocol === 'file:')
    ? 'http://localhost:5000/api/routes'
    : `${window.location.origin}/api/routes`;

  const TRANSPORT_ICONS = {
    jeep: '🚐', bus: '🚌', baby_bus: '🚌', tricycle: '🛺',
    walk: '🚶', fx: '🚙', uv: '🚐'
  };

  const TRANSPORT_CLASS = {
    jeep: 'transport-jeep', bus: 'transport-bus', baby_bus: 'transport-bus',
    tricycle: 'transport-tricycle', walk: 'transport-walk',
    fx: 'transport-jeep', uv: 'transport-jeep'
  };

  /* ------------------------------------------------------- ROUTE LOOKUP --------------------------------------------------------------------------------------- */
  async function findRoute(from, to) {
    if (!from.trim() || !to.trim()) return [];
    try {
      const params = new URLSearchParams({ from, to });

      /* Send JWT so the server can record who searched (user_id).
         AUTH may not be loaded on every page, so we guard defensively. */
      const headers = {};
      try {
        const token = (typeof AUTH !== 'undefined' && AUTH.getToken) ? AUTH.getToken() : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch (_) {}

      const res = await fetch(`${API_BASE}/search/smart?${params}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const routes = await res.json();
      return routes.map(r => ({
        ...r,
        id:   r.route_id,
        from: r.from_location,
        to:   r.to_location
      }));
    } catch (err) {
      console.error('ROUTES.findRoute error:', err);
      return [];
    }
  }

  async function getAllLocations() {
    try {
      const res = await fetch(`${API_BASE}/locations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('ROUTES.getAllLocations error:', err);
      return [];
    }
  }

  async function getRouteById(id) {
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = await res.json();
      return { ...r, id: r.route_id, from: r.from_location, to: r.to_location };
    } catch (err) {
      console.error('ROUTES.getRouteById error:', err);
      return null;
    }
  }

  async function getPopular() {
    try {
      const res = await fetch(`${API_BASE}/popular`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const routes = await res.json();
      return routes.map(r => ({
        ...r,
        id:   r.route_id,
        from: r.from_location,
        to:   r.to_location
      }));
    } catch (err) {
      console.error('ROUTES.getPopular error:', err);
      return [];
    }
  }

  /* ------------------------------------------------------- STEP RENDER --------------------------------------------------------------------------------------- */
  function renderStepMap(step) {
    if (step.mapEmbed && step.mapEmbed.startsWith('https://www.google.com/maps/embed')) {
      return `
        <div class="step-map" style="padding:0;overflow:hidden;border-radius:0 0 var(--radius) var(--radius);">
          <iframe
            src="${step.mapEmbed}"
            width="100%"
            height="260"
            style="border:0;display:block;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>`;
    }
    if (step.mapQuery) {
      return `
        <div class="step-map">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text3);">
            <img src="visuals/maps.png" alt="Map Icon" style="width:64px;height:auto;">
            <span style="font-size:13px;">Map: ${decodeURIComponent((step.mapQuery||'').replace(/\+/g,' '))}</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${step.mapQuery}"
               target="_blank" class="btn btn-sm btn-secondary" style="margin-top:4px;">
              Open in Google Maps ↗
            </a>
          </div>
        </div>`;
    }
    return '';
  }

  function renderStep(step, total, isLast) {
    /* Support comma-separated transport values (e.g. "jeep,bus") */
    const transports = (step.transport || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
    const primary    = transports[0] || '';
    const tClass     = TRANSPORT_CLASS[primary] || 'transport-jeep';
    const signboardHtml = step.signboard
      ? `<div class="step-signboard">⚠️ ${step.signboard}</div>` : '';
    const fareHtml = step.fare
      ? `<span class="badge badge-green">Fare: ${step.fare}</span>` : '';
    const alightHtml = step.alightAt
      ? `<div class="mt-12 text-sm" style="color:var(--text2);">📍 Arrive at: <strong style="color:var(--text)">${step.alightAt}</strong></div>` : '';
    /* Build one icon+badge per transport type */
    const transportBadgesHtml = transports.map(t => {
      const icon = TRANSPORT_ICONS[t] || '🚌';
      const tc   = TRANSPORT_CLASS[t]  || 'transport-jeep';
      return `<span class="transport-icon ${tc}">${icon}</span><span class="badge badge-blue">${t.replace('_',' ').toUpperCase()}</span>`;
    }).join('');

    return `
      <div class="step-item fade-in">
        <div class="step-connector">
          <div class="step-dot ${step.num === 1 ? 'active' : (isLast ? 'done' : '')}">${step.num}</div>
          ${!isLast ? '<div class="step-line"></div>' : ''}
        </div>
        <div class="step-content">
          <div class="step-card">
            <div class="step-card-header">
              <div>
                <div class="d-flex align-center gap-8 mb-8">
                  ${transportBadgesHtml}
                  ${fareHtml}
                </div>
                <div class="step-title">${step.title}</div>
                <div class="step-desc mt-8">${step.instruction}</div>
                ${alightHtml}
                ${signboardHtml}
              </div>
            </div>
            ${renderStepMap(step)}
          </div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------- ROUTE RENDER --------------------------------------------------------------------------------------- */
  function renderMapEmbed(mapEmbedUrl) {
    if (!mapEmbedUrl) return '';
    const safeUrl = mapEmbedUrl.startsWith('https://www.google.com/maps/embed')
      ? mapEmbedUrl
      : '';
    if (!safeUrl) return '';
    return `
      <div style="margin:20px 0;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border);background:var(--bg2);">
        <div style="padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);">
          <span style="font-size:14px;font-weight:600;color:var(--text2);">📍 Location Preview</span>
          <a href="${safeUrl.replace('embed?', '?').replace('/embed', '')}" target="_blank"
             style="margin-left:auto;font-size:12px;color:var(--accent);text-decoration:none;">
            Open in Google Maps ↗
          </a>
        </div>
        <iframe
          src="${safeUrl}"
          width="100%"
          height="320"
          style="border:0;display:block;"
          allowfullscreen=""
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>`;
  }

  function renderRoute(route) {
    const steps = route.steps || [];
    const stepsHtml = steps.map((s, i) =>
      renderStep(s, steps.length, i === steps.length - 1)
    ).join('');
    return `
      <div class="route-header">
        <div class="route-meta">
          ${(route.tags || []).map(t => `<span class="badge badge-gray">${t}</span>`).join('')}
          <span class="badge badge-blue">⏱ ${route.duration || ''}</span>
          <span class="badge badge-green">💵 ${route.fare || ''}</span>
        </div>
        <div class="route-title-row">
          <h2 style="font-size:1.4rem;">${route.from} → ${route.to}</h2>
          <div id="action-bar" class="hidden" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button class="btn btn-secondary" id="save-btn" onclick="toggleSave()">🔖 Save Route</button>
            <a href="index.html" class="btn btn-ghost">← New Search</a>
          </div>
        </div>
        <p class="mt-8" style="font-size:14px;">${steps.length} step${steps.length !== 1 ? 's' : ''} · Estimated ${route.duration || ''}</p>
      </div>
      ${renderMapEmbed(route.map_embed_url)}
      <div class="steps-list">${stepsHtml}</div>`;
  }

  return { findRoute, getAllLocations, getRouteById, getPopular, renderRoute };
})();
