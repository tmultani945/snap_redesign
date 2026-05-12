/* ============================================================
   SuggestedRoutesLanding
   Predefined drive-test routes for the SNAP / Qube remote-test
   landing page. Cards on the left, details + Leaflet map on right.

   ─── TypeScript types (the production code is TS; this preview
       is JSX/Babel so types are kept in JSDoc + a sibling .d.ts) ──

   export type RouteType = "urban" | "suburban" | "highway";

   export interface RoutePoint { lat: number; lng: number; }

   export interface Route {
     id: string;
     name: string;
     description: string;
     distanceKm: number;
     estimatedMinutes: number;
     routeType: RouteType;
     kpis: string[];
     polyline: RoutePoint[];
   }

   export interface SuggestedRoutesLandingProps {
     onUseRoute: (routeId: string) => void;
     // Optional override for tests / storybook. Defaults to fetch('/api/routes')
     fetchRoutes?: () => Promise<Route[]>;
   }
   ============================================================ */

const { useState: rS, useEffect: rE, useRef: rR, useMemo: rM } = React;

/* ---------- helpers ---------- */
const ROUTE_TYPE_META = {
  urban:    { label: "Urban",    tone: "var(--accent)",          icon: "cpu"  },
  suburban: { label: "Suburban", tone: "var(--status-pass)",     icon: "grid" },
  highway:  { label: "Highway",  tone: "var(--status-finalizing)", icon: "arrow" }
};

const RouteTypeChip = ({ type }) => {
  const m = ROUTE_TYPE_META[type] || ROUTE_TYPE_META.urban;
  return (
    <span className="rt-typechip" style={{ "--chip": m.tone }}>
      <span className="chip-dot" />
      {m.label.toUpperCase()}
    </span>
  );
};

const fmtKm  = n => `${n.toFixed(1)} km`;
const fmtMin = n => n >= 60 ? `${Math.floor(n/60)}h ${n%60}m` : `${n} min`;

/* ============================================================
   ROUTE CARD (selectable)
   ============================================================ */
const RouteCard = ({ route, selected, onClick }) => (
  <button
    className={`rt-card ${selected ? "rt-card-on" : ""}`}
    onClick={() => onClick(route.id)}
    aria-pressed={selected}
  >
    <div className="rt-card-head">
      <RouteTypeChip type={route.routeType} />
      <span className="rt-id mono">{route.id}</span>
    </div>
    <div className="rt-card-name">{route.name}</div>
    <div className="rt-card-desc">{route.description}</div>
    <div className="rt-card-meta">
      <div className="rt-meta-item">
        <Icon name="map" size={13} />
        <span className="mono">{fmtKm(route.distanceKm)}</span>
      </div>
      <div className="rt-meta-item">
        <Icon name="clock" size={13} />
        <span className="mono">{fmtMin(route.estimatedMinutes)}</span>
      </div>
      <div className="rt-meta-item">
        <Icon name="bar" size={13} />
        <span className="mono">{route.kpis.length} KPIs</span>
      </div>
    </div>
    <div className="rt-card-kpis">
      {route.kpis.slice(0, 4).map(k => <Tag key={k} mono>{k}</Tag>)}
      {route.kpis.length > 4 && <span className="rt-card-more">+{route.kpis.length - 4}</span>}
    </div>
  </button>
);

/* ============================================================
   LEAFLET MAP — receives polyline, draws + fits bounds
   ============================================================ */
const RouteMap = ({ route, theme }) => {
  const ref = rR(null);
  const mapRef = rR(null);
  const layerRef = rR(null);

  // init
  rE(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false
    }).setView([32.85, -96.78], 10);
    L.control.zoom({ position: "topright" }).addTo(map);

    // Tile layer — use Carto for clean light/dark tiles
    const lightUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const darkUrl  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    const tile = L.tileLayer(theme === "dark" ? darkUrl : lightUrl, {
      maxZoom: 19,
      subdomains: "abcd"
    }).addTo(map);
    mapRef.current = { map, tile };
  }, []);

  // theme swap
  rE(() => {
    if (!mapRef.current) return;
    const { map, tile } = mapRef.current;
    map.removeLayer(tile);
    const url = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const newTile = L.tileLayer(url, { maxZoom: 19, subdomains: "abcd" }).addTo(map);
    mapRef.current.tile = newTile;
  }, [theme]);

  // polyline
  rE(() => {
    if (!mapRef.current || !route) return;
    const { map } = mapRef.current;
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }

    const latlngs = route.polyline.map(p => [p.lat, p.lng]);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3F8CFF";

    const group = L.layerGroup();

    // halo + main line
    L.polyline(latlngs, { color: accent, weight: 9, opacity: 0.18 }).addTo(group);
    L.polyline(latlngs, { color: accent, weight: 4, opacity: 1 }).addTo(group);

    // start / end markers
    const startIcon = L.divIcon({
      className: "rt-pin rt-pin-start",
      html: '<span class="rt-pin-inner">A</span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    const endIcon = L.divIcon({
      className: "rt-pin rt-pin-end",
      html: '<span class="rt-pin-inner">B</span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker(latlngs[0], { icon: startIcon }).addTo(group);
    L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(group);

    // sample dots along route
    latlngs.forEach((ll, i) => {
      if (i === 0 || i === latlngs.length - 1) return;
      L.circleMarker(ll, {
        radius: 3, color: accent, weight: 2, fillColor: accent, fillOpacity: 1
      }).addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [28, 28] });
  }, [route, theme]);

  return <div ref={ref} className="rt-map" />;
};

/* ============================================================
   DETAIL PANEL (right side)
   ============================================================ */
const RouteDetail = ({ route, theme, onUse }) => {
  if (!route) {
    return (
      <div className="rt-detail rt-detail-empty">
        <div className="empty-glyph"><Icon name="map" size={26} /></div>
        <div className="empty-title">Select a route to inspect</div>
        <div className="empty-sub">Pick a card on the left to preview its path and KPIs.</div>
      </div>
    );
  }
  return (
    <div className="rt-detail">
      <div className="rt-detail-head">
        <RouteTypeChip type={route.routeType} />
        <span className="rt-id mono">{route.id}</span>
      </div>
      <h2 className="rt-detail-name">{route.name}</h2>
      <p className="rt-detail-desc">{route.description}</p>

      <div className="rt-stats">
        <div className="rt-stat">
          <div className="kpi-label">Distance</div>
          <div className="rt-stat-value">{fmtKm(route.distanceKm)}</div>
        </div>
        <div className="rt-stat">
          <div className="kpi-label">Est. duration</div>
          <div className="rt-stat-value">{fmtMin(route.estimatedMinutes)}</div>
        </div>
        <div className="rt-stat">
          <div className="kpi-label">Waypoints</div>
          <div className="rt-stat-value mono">{route.polyline.length}</div>
        </div>
      </div>

      <div className="rt-section-label">KPIs measured</div>
      <div className="rt-kpi-list">
        {route.kpis.map(k => <Tag key={k} mono>{k}</Tag>)}
      </div>

      <div className="rt-section-label">Route preview</div>
      <RouteMap route={route} theme={theme} />

      <div className="rt-detail-foot">
        <Btn icon="map">View full map</Btn>
        <Btn kind="primary" icon="play" onClick={() => onUse(route.id)}>
          Use this route
        </Btn>
      </div>
    </div>
  );
};

/* ============================================================
   LOADING / ERROR STATES
   ============================================================ */
const RouteCardSkeleton = () => (
  <div className="rt-card rt-card-sk">
    <div className="sk-line sk-w-30" />
    <div className="sk-line sk-w-80" />
    <div className="sk-line sk-w-95" />
    <div className="sk-line sk-w-60" />
    <div className="rt-card-meta">
      <div className="sk-line sk-w-20" />
      <div className="sk-line sk-w-20" />
      <div className="sk-line sk-w-20" />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="rt-error">
    <div className="rt-error-icon"><Icon name="x" size={20} /></div>
    <div className="rt-error-text">
      <b>Couldn’t load routes</b>
      <p>{message}</p>
    </div>
    <Btn kind="primary" icon="repeat" onClick={onRetry}>Retry</Btn>
  </div>
);

/* ============================================================
   MAIN — SuggestedRoutesLanding
   ============================================================ */
const SuggestedRoutesLanding = ({ onUseRoute, fetchRoutes, theme = "dark", forceState, standalone = true }) => {
  const [routes, setRoutes] = rS([]);
  const [selectedId, setSelectedId] = rS(null);
  const [status, setStatus] = rS("loading"); // loading | ready | error
  const [error, setError] = rS(null);

  const load = () => {
    setStatus("loading"); setError(null);
    const fetcher = fetchRoutes
      || (forceState === "error"
        ? () => window.fetchRoutesApi({ fail: true })
        : forceState === "loading"
        ? () => new Promise(() => {}) // never resolves
        : () => window.fetchRoutesApi());
    fetcher()
      .then(rs => {
        setRoutes(rs);
        setSelectedId(rs[0]?.id || null);
        setStatus("ready");
      })
      .catch(e => { setError(e.message || "Unknown error"); setStatus("error"); });
  };

  rE(() => { load(); }, [forceState]);

  const selected = rM(
    () => routes.find(r => r.id === selectedId) || null,
    [routes, selectedId]
  );

  const layout = (
    <div className="rt-layout">
      {/* LEFT — list */}
      <div className="rt-list">
        <div className="rt-list-head">
          <span className="page-eyebrow">{
            status === "ready" ? `${routes.length} routes available` : "Loading routes…"
          }</span>
        </div>

        {status === "loading" && (
          <>
            <RouteCardSkeleton /><RouteCardSkeleton /><RouteCardSkeleton />
          </>
        )}
        {status === "error" && (
          <ErrorState message={error} onRetry={load} />
        )}
        {status === "ready" && routes.length === 0 && (
          <Empty title="No routes yet" sub="Create a custom route to get started." />
        )}
        {status === "ready" && routes.map(r => (
          <RouteCard
            key={r.id}
            route={r}
            selected={r.id === selectedId}
            onClick={setSelectedId}
          />
        ))}
      </div>

      {/* RIGHT — detail */}
      <div className="rt-detail-wrap">
        {status === "loading" && (
          <div className="rt-detail rt-detail-empty">
            <div className="sk-spinner"><Icon name="loader" size={22} className="spin" /></div>
            <div className="empty-title">Loading routes</div>
            <div className="empty-sub">GET /api/routes</div>
          </div>
        )}
        {status === "ready" && (
          <RouteDetail route={selected} theme={theme} onUse={onUseRoute} />
        )}
        {status === "error" && (
          <div className="rt-detail rt-detail-empty">
            <div className="empty-glyph"><Icon name="x" size={22} /></div>
            <div className="empty-title">Map unavailable</div>
            <div className="empty-sub">Resolve the route fetch error to preview the path.</div>
          </div>
        )}
      </div>
    </div>
  );

  if (!standalone) return layout;

  return (
    <div className="page rt-page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Drive Testing</div>
          <h1>Suggested Routes</h1>
          <div className="page-sub">
            Pick a predefined route to seed your next drive-test plan. Routes carry the
            target KPIs, expected duration, and the path your fleet will follow.
          </div>
        </div>
        <div className="page-actions">
          <Btn icon="plus">New custom route</Btn>
        </div>
      </div>
      {layout}
    </div>
  );
};

window.SuggestedRoutesLanding = SuggestedRoutesLanding;
