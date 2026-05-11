/* SNAP Remote Portal — Screens */
const { useState: uS, useEffect: uE, useMemo: uM } = React;

/* ============================================================
   SHELL CHROME
   ============================================================ */
const Sidebar = ({ route, setRoute, runCount }) => {
  const items = [
    { id: "dashboard", label: "Dashboard",  icon: "grid" },
    { id: "catalog",   label: "Test Cases", icon: "cpu" },
    { id: "runs",      label: "Test Runs",  icon: "play", badge: runCount },
    { id: "reports",   label: "Reports",    icon: "bar" },
    { id: "devices",   label: "Devices",    icon: "phone" },
    { id: "settings",  label: "Settings",   icon: "cog" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="uploads/procaltech_logo2.jpg" alt="Procal" />
        <div className="brand-text">
          <div className="brand-name">SNAP Remote</div>
          <div className="brand-sub">Operations console</div>
        </div>
      </div>
      <nav className="nav">
        {items.map(i => (
          <button key={i.id}
                  className={`nav-item ${route.startsWith(i.id) ? "active" : ""}`}
                  onClick={() => setRoute(i.id)}>
            <Icon name={i.icon} size={18} />
            <span className="nav-label">{i.label}</span>
            {i.badge ? <span className="nav-badge">{i.badge}</span> : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="user-pill">
          <div className="avatar">OP</div>
          <div>
            <div className="user-name">Operator</div>
            <div className="user-meta">lab-east-1 · USER</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ crumbs, theme, setTheme }) => (
  <header className="topbar">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <span key={i} className="crumb">
          {i > 0 && <Icon name="chevron" size={12} className="crumb-sep" />}
          <span>{c}</span>
        </span>
      ))}
    </div>
    <div className="topbar-right">
      <div className="search-pill">
        <Icon name="search" size={14} />
        <span>Search runs, devices…</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" title="Alerts"><Icon name="bell" size={16} /><span className="ping" /></button>
      <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Theme">
        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
      </button>
    </div>
  </header>
);

const ActiveRunsStrip = ({ runs, onView }) => {
  const live = runs.filter(r => r.status === "PROGRESS" || r.status === "FINALIZING");
  if (!live.length) return null;
  return (
    <div className="active-strip">
      <div className="active-strip-label">
        <span className="pulse-dot" />
        ACTIVE · {live.length}
      </div>
      <div className="active-strip-rail">
        {live.slice(0, 3).map(r => (
          <button key={r.id} className="active-strip-item" onClick={() => onView(r.id)}>
            <StatusChip status={r.status} size="sm" />
            <span className="ar-name">{r.name}</span>
            <span className="ar-meta mono">{r.type}</span>
            <span className="ar-meta">iter {r.iter}/{r.total}</span>
            <span className="ar-action">{r.action}</span>
          </button>
        ))}
        {live.length > 3 && <span className="ar-more">+{live.length - 3} more</span>}
      </div>
    </div>
  );
};

/* ============================================================
   PRIMITIVES
   ============================================================ */
const Btn = ({ kind = "secondary", children, onClick, icon, disabled, sz = "md" }) => (
  <button className={`btn btn-${kind} btn-${sz}`} onClick={onClick} disabled={disabled}>
    {icon && <Icon name={icon} size={14} />}
    <span>{children}</span>
  </button>
);

const Card = ({ title, action, children, pad = true, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || action) && (
      <header className="card-head">
        <h3>{title}</h3>
        <div>{action}</div>
      </header>
    )}
    <div className={pad ? "card-body" : ""}>{children}</div>
  </section>
);

const KpiTile = ({ label, value, sub, trend, tone }) => (
  <div className="kpi-tile">
    <div className="kpi-label">{label}</div>
    <div className="kpi-row">
      <div className="kpi-value">{value}</div>
      {trend && <div className={`kpi-trend ${tone || ""}`}>{trend}</div>}
    </div>
    <div className="kpi-spark">
      {/* tiny sparkline */}
      <svg viewBox="0 0 100 24" preserveAspectRatio="none">
        <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5"
          points={Array.from({length: 12}).map((_,i) => `${i*9},${4+Math.abs(Math.sin(i+ (label||"x").length))*16}`).join(" ")} />
      </svg>
    </div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

const IterDots = ({ done, total, fail = [] }) => (
  <div className="iter-dots">
    {Array.from({length: total}).map((_, i) => {
      const cls = fail.includes(i+1) ? "fail" : i < done ? "done" : i === done ? "now" : "todo";
      return <span key={i} className={`iter-dot iter-${cls}`} title={`iter ${i+1}`} />;
    })}
  </div>
);

const ActionTimeline = ({ actions }) => (
  <div className="action-tl">
    {actions.map((a, i) => (
      <React.Fragment key={i}>
        <div className={`tl-node tl-${a.status.toLowerCase()}`}>
          <span className="tl-dot">
            {a.status === "PASS"     && <Icon name="check"  size={12} />}
            {a.status === "FAILED"   && <Icon name="x"      size={12} />}
            {a.status === "PROGRESS" && <Icon name="loader" size={12} className="spin" />}
          </span>
          <div className="tl-label">
            <div className="tl-human">{a.human}</div>
            <div className="tl-enum mono">{a.enum}</div>
          </div>
        </div>
        {i < actions.length - 1 && <div className={`tl-edge tl-edge-${a.status.toLowerCase()}`} />}
      </React.Fragment>
    ))}
  </div>
);

const Empty = ({ title, sub, cta }) => (
  <div className="empty">
    <div className="empty-glyph"><Icon name="grid" size={28} /></div>
    <div className="empty-title">{title}</div>
    <div className="empty-sub">{sub}</div>
    {cta}
  </div>
);

window.Sidebar = Sidebar;
window.TopBar = TopBar;
window.ActiveRunsStrip = ActiveRunsStrip;
window.Btn = Btn;
window.Card = Card;
window.KpiTile = KpiTile;
window.IterDots = IterDots;
window.ActionTimeline = ActionTimeline;
window.Empty = Empty;
