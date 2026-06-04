const ROUTES = (() => {

  const API_BASE = 'http://localhost:5000/api/routes';

  const TRANSPORT_ICONS = {
    jeep: '🚐', bus: '🚌', tricycle: '🛺',
    walk: '🚶', fx: '🚙', uv: '🚐'
  };

  const TRANSPORT_CLASS = {
    jeep: 'transport-jeep', bus: 'transport-bus',
    tricycle: 'transport-tricycle', walk: 'transport-walk',
    fx: 'transport-jeep', uv: 'transport-jeep'
  };

  async function findRoute(from, to) {
    if (!from.trim() || !to.trim()) return [];
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`${API_BASE}/search/smart?${params}`);
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

  function renderStep(step, total, isLast) {
    const transport = (step.transport || '').toLowerCase();
    const icon  = TRANSPORT_ICONS[transport] || '🚌';
    const tClass = TRANSPORT_CLASS[transport] || 'transport-jeep';
    const signboardHtml = step.signboard
      ? `<div class="step-signboard">⚠️ ${step.signboard}</div>` : '';
    const fareHtml = step.fare
      ? `<span class="badge badge-green">Fare: ${step.fare}</span>` : '';
    const alightHtml = step.alightAt
      ? `<div class="mt-12 text-sm" style="color:var(--text2);">📍 Arrive at: <strong style="color:var(--text)">${step.alightAt}</strong></div>` : '';

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
                  <span class="transport-icon ${tClass}">${icon}</span>
                  <span class="badge badge-blue">${(step.transport || '').toUpperCase()}</span>
                  ${fareHtml}
                </div>
                <div class="step-title">${step.title}</div>
                <div class="step-desc mt-8">${step.instruction}</div>
                ${alightHtml}
                ${signboardHtml}
              </div>
            </div>
            <div class="step-map">
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text3);">
                <img src="visuals/maps.png" alt="Map Icon" style="width:64px;height:auto;">
                <span style="font-size:13px;">Map: ${decodeURIComponent((step.mapQuery||'').replace(/\+/g,' '))}</span>
                <a href="https://www.google.com/maps/search/?api=1&query=${step.mapQuery}"
                   target="_blank" class="btn btn-sm btn-secondary" style="margin-top:4px;">
                  Open in Google Maps ↗
                </a>
              </div>
            </div>
          </div>
        </div>
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
        <h2 style="font-size:1.4rem;">${route.from} → ${route.to}</h2>
        <p class="mt-8" style="font-size:14px;">${steps.length} step${steps.length !== 1 ? 's' : ''} · Estimated ${route.duration || ''}</p>
      </div>
      <div class="steps-list">${stepsHtml}</div>`;
  }

  return { findRoute, getAllLocations, getRouteById, getPopular, renderRoute };
})();