/**
 * routes.js — Route generation logic for WTG: Commuters Guide
 * Contains preloaded routes and route finder functionality
 */

const ROUTES = (() => {

  /* ── Transport icon helper ── */
  const TRANSPORT_ICONS = {
    jeep: '🚐',
    bus: '🚌',
    tricycle: '🛺',
    walk: '🚶',
    fx: '🚙',
    uv: '🚐'
  };

  const TRANSPORT_CLASS = {
    jeep: 'transport-jeep',
    bus: 'transport-bus',
    tricycle: 'transport-tricycle',
    walk: 'transport-walk',
    fx: 'transport-jeep',
    uv: 'transport-jeep'
  };

  /* ── Preloaded Route Database ── */
  const ROUTE_DB = [
    {
      id: 'cvsu-ccat_sm-tanza',
      from: 'CVSU CCAT',
      to: 'SM Tanza',
      duration: '45–60 mins',
      fare: '₱30–₱50',
      tags: ['Cavite', 'Student Route'],
      steps: [
        {
          num: 1,
          title: 'Ride a Jeepney from CVSU CCAT',
          transport: 'jeep',
          instruction: 'Board a jeepney with the signboard "Naic / Tanza / SM Tanza" in front of CVSU CCAT Gate.',
          signboard: 'Look for: "Naic", "Tanza", or "SM Tanza"',
          alightAt: 'Ride until SM Tanza (Terminal)',
          fare: '₱15–₱20',
          mapQuery: 'CVSU+CCAT+Naic+Cavite'
        },
        {
          num: 2,
          title: 'Arrive at SM Tanza',
          transport: 'walk',
          instruction: 'Get off at the SM Tanza terminal. SM Tanza mall entrance is just a short walk from the terminal.',
          signboard: null,
          alightAt: null,
          fare: null,
          mapQuery: 'SM+Tanza+Cavite'
        }
      ]
    },
    {
      id: 'cvsu-ccat_cvsu-main',
      from: 'CVSU CCAT',
      to: 'CVSU Main',
      duration: '30–45 mins',
      fare: '₱20–₱35',
      tags: ['Cavite', 'Student Route'],
      steps: [
        {
          num: 1,
          title: 'Ride a Jeepney towards Indang',
          transport: 'jeep',
          instruction: 'From CVSU CCAT gate, board a jeepney heading towards Indang or Trece Martires. Tell the driver you are going to CVSU Main Campus in Indang.',
          signboard: 'Look for: "Indang", "Trece" or "CVSU"',
          alightAt: 'Alight at Indang town center or CVSU Main gate',
          fare: '₱15–₱25',
          mapQuery: 'CVSU+CCAT+Naic+Cavite'
        },
        {
          num: 2,
          title: 'Tricycle to CVSU Main Campus',
          transport: 'tricycle',
          instruction: 'From Indang town center, ride a tricycle going to CVSU Main Campus. You can also walk if you are close to the campus gate.',
          signboard: null,
          alightAt: 'CVSU Main Campus Gate',
          fare: '₱10–₱15',
          mapQuery: 'Cavite+State+University+Indang'
        }
      ]
    },
    {
      id: 'naic-main_sm-molino',
      from: 'Naic (Poblacion)',
      to: 'SM Molino',
      duration: '60–90 mins',
      fare: '₱40–₱60',
      tags: ['Cavite', 'Bacoor'],
      steps: [
        {
          num: 1,
          title: 'Jeepney from Naic to Bacoor',
          transport: 'jeep',
          instruction: 'From Naic Poblacion, board a jeepney with signboard "Bacoor" or "Imus". Ride until Bacoor Rotonda.',
          signboard: 'Look for: "Bacoor", "Imus / Bacoor"',
          alightAt: 'Alight at Bacoor Rotonda',
          fare: '₱20–₱30',
          mapQuery: 'Naic+Poblacion+Cavite'
        },
        {
          num: 2,
          title: 'Transfer: Jeep or Multicab to SM Molino',
          transport: 'jeep',
          instruction: 'At Bacoor Rotonda, transfer to a jeepney or multicab heading to SM Molino. Look for signboards "Molino" or "SM Molino".',
          signboard: 'Look for: "Molino", "SM City Bacoor"',
          alightAt: 'SM Molino / SM City Bacoor',
          fare: '₱15–₱20',
          mapQuery: 'SM+Molino+Bacoor+Cavite'
        }
      ]
    },
    {
      id: 'imus-central_sm-dasma',
      from: 'Imus Central',
      to: 'SM Dasmarinas',
      duration: '25–40 mins',
      fare: '₱20–₱35',
      tags: ['Cavite', 'Dasmarinas'],
      steps: [
        {
          num: 1,
          title: 'Jeepney from Imus to Dasmarinas',
          transport: 'jeep',
          instruction: 'From Imus Central Market terminal, board a jeepney with signboard "Dasmarinas" or "Sampaloc". Ride until the SM Dasmarinas terminal.',
          signboard: 'Look for: "Dasmarinas", "Sampaloc Dasma"',
          alightAt: 'SM Dasmarinas Terminal',
          fare: '₱15–₱25',
          mapQuery: 'Imus+Central+Market+Cavite'
        },
        {
          num: 2,
          title: 'Walk to SM Dasmarinas',
          transport: 'walk',
          instruction: 'SM Dasmarinas is right at the terminal. Walk through the main entrance.',
          signboard: null,
          alightAt: null,
          fare: null,
          mapQuery: 'SM+Dasmarinas+City'
        }
      ]
    },
    {
      id: 'tagaytay-rotonda_sm-sta-rosa',
      from: 'Tagaytay Rotonda',
      to: 'SM Santa Rosa',
      duration: '50–70 mins',
      fare: '₱40–₱60',
      tags: ['Tagaytay', 'Laguna'],
      steps: [
        {
          num: 1,
          title: 'Bus from Tagaytay to Sta. Rosa',
          transport: 'bus',
          instruction: 'At Tagaytay Rotonda, board a bus or UV Express going to Sta. Rosa or Alabang. Tell the driver you are heading to SM Sta. Rosa.',
          signboard: 'Look for: "Sta. Rosa", "Alabang", "Laguna"',
          alightAt: 'Sta. Rosa exit / SM Sta. Rosa area',
          fare: '₱30–₱45',
          mapQuery: 'Tagaytay+Rotonda+Cavite'
        },
        {
          num: 2,
          title: 'Tricycle to SM Sta. Rosa',
          transport: 'tricycle',
          instruction: 'From the Sta. Rosa highway drop-off, ride a tricycle going to SM Santa Rosa.',
          signboard: null,
          alightAt: 'SM Santa Rosa Laguna',
          fare: '₱10–₱15',
          mapQuery: 'SM+Santa+Rosa+Laguna'
        }
      ]
    },
    {
      id: 'cvsu-main_trece-palengke',
      from: 'CVSU Main',
      to: 'Trece Martires Palengke',
      duration: '20–35 mins',
      fare: '₱15–₱25',
      tags: ['Cavite', 'Student Route'],
      steps: [
        {
          num: 1,
          title: 'Tricycle or Jeep to Indang Proper',
          transport: 'tricycle',
          instruction: 'From CVSU Main Campus, ride a tricycle or walk to Indang town center terminal.',
          signboard: 'Look for tricycles near the campus gate',
          alightAt: 'Indang Terminal',
          fare: '₱10',
          mapQuery: 'Cavite+State+University+Indang'
        },
        {
          num: 2,
          title: 'Jeepney to Trece Martires',
          transport: 'jeep',
          instruction: 'From Indang terminal, board a jeepney with "Trece Martires" on the signboard. Ride until Trece Palengke (market).',
          signboard: 'Look for: "Trece Martires"',
          alightAt: 'Trece Martires Palengke / City Hall area',
          fare: '₱10–₱15',
          mapQuery: 'Trece+Martires+City+Hall+Cavite'
        }
      ]
    },
    {
      id: 'cvsu-main_trece-palengke',
      from: 'McDonalds Maple Grove',
      to: 'Freedom Park',
      duration: '1hr 30mins - 2hrs',
      fare: '₱15–₱25',
      tags: ['Cavite', 'Student Route'],
      steps: [
        {
          num: 1,
          title: 'Jepp to Freedom Park Kawit Cavite',
          transport: 'Jeep',
          instruction: 'From McDonalds Maple Grove ride a jeepney with "potol kawit" and "Binakayan" on the signboard',
          signboard: 'Look for: "Potol kawit" and "Binakayan"',
          alightAt: 'Freedom Park, kawit, Cavite',
          fare: '₱20',
          mapQuery: 'Aguinaldo+Freedom+Park'
        }
      ]
    }
    
    
  ];

  /* ── Normalize string for comparison ── */
  function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  }

  /* ── Score match between query and route location ── */
  function score(query, target) {
    const q = normalize(query);
    const t = normalize(target);
    if (t === q) return 100;
    if (t.includes(q) || q.includes(t)) return 80;
    const words = q.split(' ');
    const matched = words.filter(w => w.length > 2 && t.includes(w));
    return (matched.length / words.length) * 60;
  }

  /* ── Find route ── */
  function findRoute(from, to) {
    if (!from.trim() || !to.trim()) return [];
    let best = null;
    let bestScore = 0;

    for (const route of ROUTE_DB) {
      const s = (score(from, route.from) + score(to, route.to)) / 2;
      if (s > bestScore) { bestScore = s; best = route; }

      // also try reversed
      const sr = (score(from, route.to) + score(to, route.from)) / 2;
      if (sr > bestScore) { bestScore = sr; best = reverseRoute(route); }
    }

    if (bestScore < 25) return [];
    return [best];
  }

  /* ── Reverse a route ── */
  function reverseRoute(route) {
    return {
      ...route,
      id: route.id + '_rev',
      from: route.to,
      to: route.from,
      steps: route.steps.map((s, i) => ({ ...s, num: route.steps.length - i })).reverse()
    };
  }

  /* ── Get all route locations for autocomplete ── */
  function getAllLocations() {
    const locs = new Set();
    ROUTE_DB.forEach(r => { locs.add(r.from); locs.add(r.to); });
    return [...locs].sort();
  }

  /* ── Get route by ID ── */
  function getRouteById(id) {
    return ROUTE_DB.find(r => r.id === id) || null;
  }

  /* ── Popular routes (just first 4) ── */
  function getPopular() {
    return ROUTE_DB.slice(0, 4);
  }

  /* ── Render a step card ── */
  function renderStep(step, total, isLast) {
    const icon = TRANSPORT_ICONS[step.transport] || '🚌';
    const tClass = TRANSPORT_CLASS[step.transport] || 'transport-jeep';
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFmBBE&q=${step.mapQuery}`;
    // Note: embed API key is demo-only; will show fallback
    const signboardHtml = step.signboard
      ? `<div class="step-signboard">⚠️ ${step.signboard}</div>`
      : '';
    const fareHtml = step.fare
      ? `<span class="badge badge-green">Fare: ${step.fare}</span>`
      : '';
    const alightHtml = step.alightAt
      ? `<div class="mt-12 text-sm" style="color:var(--text2);">📍 Arrive at: <strong style="color:var(--text)">${step.alightAt}</strong></div>`
      : '';

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
                  <span class="badge badge-blue">${step.transport.toUpperCase()}</span>
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
                <img src="visuals/maps.png" alt="Map Icon" style="width: 64px; height: auto;">
                <span style="font-size:13px;">Map: ${decodeURIComponent(step.mapQuery.replace(/\+/g, ' '))}</span>
                <a href="https://www.google.com/maps/search/?api=1&query=${step.mapQuery}" target="_blank"
                   class="btn btn-sm btn-secondary" style="margin-top:4px;">Open in Google Maps ↗</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Render full route result ── */
  function renderRoute(route) {
    const stepsHtml = route.steps.map((s, i) =>
      renderStep(s, route.steps.length, i === route.steps.length - 1)
    ).join('');

    return `
      <div class="route-header">
        <div class="route-meta">
          ${route.tags.map(t => `<span class="badge badge-gray">${t}</span>`).join('')}
          <span class="badge badge-blue">⏱ ${route.duration}</span>
          <span class="badge badge-green">💵 ${route.fare}</span>
        </div>
        <h2 style="font-size:1.4rem;">${route.from} → ${route.to}</h2>
        <p class="mt-8" style="font-size:14px;">${route.steps.length} step${route.steps.length > 1 ? 's' : ''} · Estimated ${route.duration}</p>
      </div>
      <div class="steps-list">${stepsHtml}</div>
    `;
  }

  return {
    findRoute,
    getAllLocations,
    getRouteById,
    getPopular,
    renderRoute,
    ROUTE_DB
  };
})();
