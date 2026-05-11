/* SNAP Remote Portal — Interactive Hi-Fi Prototype */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   ICON SET (inline SVG, lucide-style)
   ============================================================ */
const Icon = ({ name, size = 16, className = "", style = {} }) => {
  const stroke = "currentColor";
  const sw = 1.6;
  const common = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round",
    className, style,
  };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></>,
    play: <polygon points="6 4 20 12 6 20 6 4"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></>,
    cog: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    chevron: <polyline points="9 18 15 12 9 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    check: <><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></>,
    x: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    loader: <><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    sms: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    video: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
    voip: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    swap: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    bar: <><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/></>,
    network: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76A6 6 0 0 1 17 12c0 1.5-.5 2.9-1.4 4M7.76 16.24A6 6 0 0 1 7 12c0-1.5.5-2.9 1.4-4M20.49 3.51A12 12 0 0 1 23 12c0 3-1.1 5.7-3 7.8M3.51 20.49A12 12 0 0 1 1 12c0-3 1.1-5.7 3-7.8"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    cancel: <><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    repeat: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
};

/* ============================================================
   STATUS UTILITIES
   ============================================================ */
const STATUS_META = {
  IDLE:        { label: "IDLE",        color: "var(--status-idle)",       icon: "clock" },
  SCHEDULED:   { label: "SCHEDULED",   color: "var(--status-idle)",       icon: "clock" },
  PROGRESS:    { label: "PROGRESS",    color: "var(--status-progress)",   icon: "loader" },
  EXECUTING:   { label: "EXECUTING",   color: "var(--status-progress)",   icon: "loader" },
  FINALIZING:  { label: "FINALIZING",  color: "var(--status-finalizing)", icon: "upload" },
  COMPLETED:   { label: "COMPLETED",   color: "var(--status-pass)",       icon: "check" },
  PASS:        { label: "PASS",        color: "var(--status-pass)",       icon: "check" },
  FAILED:      { label: "FAILED",      color: "var(--status-fail)",       icon: "x" },
  CANCELED:    { label: "CANCELED",    color: "var(--status-cancel)",     icon: "cancel" },
  CANCELLING:  { label: "CANCELLING",  color: "var(--status-cancel)",     icon: "cancel" },
};

const StatusChip = ({ status, size = "md" }) => {
  const m = STATUS_META[status] || STATUS_META.IDLE;
  const isProg = status === "PROGRESS" || status === "EXECUTING";
  const isFinal = status === "FINALIZING";
  return (
    <span className={`chip chip-${size}`} style={{ "--chip": m.color }}>
      <span className="chip-dot" />
      <Icon name={m.icon} size={size === "sm" ? 12 : 13}
            className={isProg ? "spin" : isFinal ? "pulse" : ""} />
      {m.label}
    </span>
  );
};

const Tag = ({ children, mono = false, tone = "default" }) =>
  <span className={`tag tag-${tone} ${mono ? "mono" : ""}`}>{children}</span>;

/* ============================================================
   MOCK DATA
   ============================================================ */
const TEST_TYPES = {
  VOIP_MO_MT: { label: "Remote VoIP",                desc: "External device dials AWS Connect DID",       devices: ["EXTERNAL_MO", "VOIP_MT"], icon: "voip", dur: "~45s/iter" },
  MO_SMS:     { label: "Remote SMS (no validation)", desc: "Send SMS from MO to any phone number",        devices: ["MO"],                     icon: "sms",  dur: "~5s/iter" },
  MO_MT_SMS:  { label: "Remote SMS (validated)",     desc: "MO sends SMS, validate receipt on MT",        devices: ["MO", "MT"],               icon: "sms",  dur: "~12s/iter" },
  EXT_MO_MT:  { label: "Remote-to-Remote Voice",     desc: "External MO dials lab MT, verify call state", devices: ["EXTERNAL_MO", "MT"],      icon: "phone", dur: "~40s/iter" },
  VIDEO:      { label: "Video & Artifacts",          desc: "Attach video recording to any test above",    devices: ["any"],                    icon: "video", dur: "—" },
};

const DEVICES = {
  ext1: { id: "ext1", name: "Galaxy S22",  sn: "S22-EXT-001",  udid: "abc-123-def-456", oem: "Samsung", os: "Android 14", role: "EXTERNAL_MO", state: "ONLINE",  phone: "+1 555-0119" },
  ext2: { id: "ext2", name: "Pixel 8 Pro", sn: "PX8-EXT-014",  udid: "fed-987-cba-321", oem: "Google",  os: "Android 14", role: "EXTERNAL_MO", state: "ONLINE",  phone: "+1 555-0271" },
  mt1:  { id: "mt1",  name: "iPhone 15",   sn: "IP15-LAB-007", udid: "ip15-007",        oem: "Apple",   os: "iOS 17.4",   role: "MT",          state: "ONLINE",  phone: "+1 555-0144" },
  mt2:  { id: "mt2",  name: "Galaxy A54",  sn: "A54-LAB-022",  udid: "a54-022",         oem: "Samsung", os: "Android 13", role: "MT",          state: "BUSY",    phone: "+1 555-0188" },
  mo1:  { id: "mo1",  name: "Pixel 7",     sn: "PX7-LAB-033",  udid: "px7-033",         oem: "Google",  os: "Android 14", role: "MO",          state: "ONLINE",  phone: "+1 555-0210" },
};

const VOIP_NUMBERS = [
  { PhoneNumber: "+1 214-257-0986", PhoneNumberCountryCode: "US", PhoneNumberType: "DID" },
  { PhoneNumber: "+1 702-577-0258", PhoneNumberCountryCode: "US", PhoneNumberType: "DID" },
  { PhoneNumber: "+1 702-577-2681", PhoneNumberCountryCode: "US", PhoneNumberType: "DID" },
];

const RUNS = [
  { id: "r42", name: "VoIP_Run_42",      type: "VOIP_MO_MT", status: "PROGRESS",   iter: 3,  total: 10, dest: "DFIT",     action: "MO_DIALING_MT", started: "14:32", pass: null,  durSec: 188, route: { start: [32.7767, -96.7970], end: [32.8120, -96.8620] } },
  { id: "r88", name: "SMS_Validate_88",  type: "MO_MT_SMS",  status: "FINALIZING", iter: 8,  total: 8,  dest: "LAB",      action: "Uploading…",    started: "14:18", pass: "8/8", durSec: 131, route: { start: [32.7900, -96.7800], end: [32.8050, -96.8250] } },
  { id: "r51", name: "R2R_call_test_a",  type: "EXT_MO_MT",  status: "PROGRESS",   iter: 2,  total: 3,  dest: "EXTERNAL", action: "MT_RINGING",    started: "14:39", pass: null,  durSec: 38,  route: { start: [32.7600, -96.7650], end: [32.8200, -96.8500] } },
  { id: "r40", name: "R2R_call_a",       type: "EXT_MO_MT",  status: "FAILED",     iter: 3,  total: 3,  dest: "EXTERNAL", action: "—",             started: "12:01", pass: "0/3", durSec: 41,  route: { start: [32.7600, -96.7650], end: [32.8200, -96.8500] } },
  { id: "r41", name: "SMS_Bulk_03",      type: "MO_MT_SMS",  status: "COMPLETED",  iter: 8,  total: 8,  dest: "LAB",      action: "—",             started: "13:18", pass: "8/8", durSec: 131, route: { start: [32.7900, -96.7800], end: [32.8050, -96.8250] } },
  { id: "r39", name: "VoIP_smoke",       type: "VOIP_MO_MT", status: "COMPLETED",  iter: 5,  total: 5,  dest: "LAB",      action: "—",             started: "11:48", pass: "5/5", durSec: 220, route: { start: [32.7767, -96.7970], end: [32.8120, -96.8620] } },
  { id: "r38", name: "MO_SMS_quick",     type: "MO_SMS",     status: "COMPLETED",  iter: 3,  total: 3,  dest: "LAB",      action: "—",             started: "11:22", pass: "3/3", durSec: 11,  route: { start: [32.7900, -96.7800], end: [32.8050, -96.8250] } },
];

const fmtDur = s => { const m = Math.floor(s/60), r = s%60; return m ? `${m}m ${r}s` : `${r}s`; };

window.STATUS_META = STATUS_META;
window.StatusChip = StatusChip;
window.Tag = Tag;
window.Icon = Icon;
window.TEST_TYPES = TEST_TYPES;
window.DEVICES = DEVICES;
window.VOIP_NUMBERS = VOIP_NUMBERS;
window.RUNS = RUNS;
window.fmtDur = fmtDur;
window.useState = useState; window.useEffect = useEffect; window.useRef = useRef; window.useMemo = useMemo;
window.pS = useState; window.pE = useEffect; window.uR = useRef; window.uM = useMemo;
