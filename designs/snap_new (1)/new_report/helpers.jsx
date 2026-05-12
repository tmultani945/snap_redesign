/* Helpers — small Icon set, StatusChip, Tag, Btn, hooks */
const { useState, useEffect, useRef, useMemo } = React;
const pS = useState, pE = useEffect, uR = useRef, uM = useMemo;

const Icon = ({ name, size = 16, className = "", style = {} }) => {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round", className, style,
  };
  const paths = {
    chevron:     <polyline points="9 18 15 12 9 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    check:       <><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></>,
    x:           <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    eye:         <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    repeat:      <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    play:        <polygon points="6 4 20 12 6 20 6 4"/>,
    file:        <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>,
    bar:         <><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/></>,
    map:         <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    phone:       <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    clock:       <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    network:     <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76A6 6 0 0 1 17 12c0 1.5-.5 2.9-1.4 4M7.76 16.24A6 6 0 0 1 7 12c0-1.5.5-2.9 1.4-4M20.49 3.51A12 12 0 0 1 23 12c0 3-1.1 5.7-3 7.8M3.51 20.49A12 12 0 0 1 1 12c0-3 1.1-5.7 3-7.8"/></>,
    alert:       <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    filter:      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    info:        <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    devices:     <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    sliders:     <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
};

const Btn = ({ children, icon, kind="default", onClick, className="" }) => (
  <button className={`btn ${kind==="primary" ? "btn-primary" : ""} ${className}`} onClick={onClick}>
    {icon && <Icon name={icon} size={14}/>}
    {children}
  </button>
);

const Tag = ({ children, mono=false }) =>
  <span className={`tag ${mono ? "mono" : ""}`}>{children}</span>;

const STATUS_META = {
  PASS:      { label: "PASS",      color: "#22C55E", icon: "check" },
  COMPLETED: { label: "COMPLETED", color: "#22C55E", icon: "check" },
  FAILED:    { label: "FAILED",    color: "#EF4444", icon: "x" },
  IDLE:      { label: "IDLE",      color: "#94A3B8", icon: "clock" },
};
const StatusChip = ({ status, size="md" }) => {
  const m = STATUS_META[status] || STATUS_META.IDLE;
  return (
    <span className={`chip chip-${size}`} style={{ "--chip": m.color }}>
      <span className="chip-dot"/>
      <Icon name={m.icon} size={size==="sm"?11:13}/>
      {m.label}
    </span>
  );
};

const fmtDur = s => { const m = Math.floor(s/60), r = s%60; return m ? `${m}m ${r}s` : `${r}s`; };

window.pS = pS; window.pE = pE; window.uR = uR; window.uM = uM;
window.Icon = Icon; window.Btn = Btn; window.Tag = Tag;
window.StatusChip = StatusChip; window.STATUS_META = STATUS_META;
window.fmtDur = fmtDur;
