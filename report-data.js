/* Sample run data for the redesigned Report */
window.REPORT_RUN = {
  id: "r41",
  name: "R2R_VoiceCall_42",
  type: "EXT_MO_MT",
  typeLabel: "Remote-to-Remote Voice",
  dest: "DFIT",
  status: "COMPLETED",
  started: "05/06/2026 05:21 PM",
  durSec: 209, // 3m 29s
  total: 10,
  passCount: 9,
  failCount: 1,
  notExec: 0,
  mo: { name: "samsung SM-A176U1", os: "Android 16", oem: "Samsung", phone: "+1 555-0119", udid: "abc-123-def-456" },
  mt: { name: "samsung SM-S901U1", os: "Android 13", oem: "Samsung", phone: "+1 214-257-0986", udid: "ip15-007" },
  ratMO: { "5G NR NSA": 7, "LTE": 93, "5G NA SA": 0, "Other": 0 },
  ratMT: { "5G NR NSA": 25, "LTE": 75, "5G NA SA": 0, "Other": 0 },
  /* per-iteration summary */
  iterations: [
    { i: 1, status: "PASS",   setup: 2.3, call: 37, end: "ok",      rsrp: -78, rsrq: -9,  sinr: 16, dl: 142, ul: 38, jitter: 12, loss: 0.1 },
    { i: 2, status: "PASS",   setup: 2.3, call: 37, end: "ok",      rsrp: -79, rsrq: -10, sinr: 15, dl: 138, ul: 36, jitter: 14, loss: 0.2 },
    { i: 3, status: "PASS",   setup: 2.3, call: 37, end: "ok",      rsrp: -81, rsrq: -10, sinr: 14, dl: 130, ul: 34, jitter: 16, loss: 0.4 },
    { i: 4, status: "PASS",   setup: 2.3, call: 38, end: "ok",      rsrp: -83, rsrq: -11, sinr: 13, dl: 122, ul: 32, jitter: 18, loss: 0.5 },
    { i: 5, status: "PASS",   setup: 2.3, call: 38, end: "ok",      rsrp: -85, rsrq: -11, sinr: 12, dl: 118, ul: 30, jitter: 19, loss: 0.6 },
    { i: 6, status: "FAILED", setup: null, call: null, end: "timeout", rsrp: -94, rsrq: -14, sinr: 4, dl: 0,   ul: 0,  jitter: null, loss: null,
      error: { code: 400, msg: "Did not reach DIALING within 15 000 ms", detail: "setExternalMoMtStartTimeout fired — external device returned no callstate" } },
    { i: 7, status: "PASS",   setup: 2.6, call: 40, end: "ok",      rsrp: -84, rsrq: -10, sinr: 13, dl: 120, ul: 31, jitter: 17, loss: 0.4 },
    { i: 8, status: "PASS",   setup: 2.4, call: 38, end: "ok",      rsrp: -82, rsrq: -10, sinr: 14, dl: 126, ul: 33, jitter: 15, loss: 0.3 },
    { i: 9, status: "PASS",   setup: 2.4, call: 38, end: "ok",      rsrp: -80, rsrq: -9,  sinr: 15, dl: 134, ul: 35, jitter: 13, loss: 0.2 },
    { i: 10,status: "PASS",   setup: 2.3, call: 37, end: "ok",      rsrp: -78, rsrq: -9,  sinr: 16, dl: 140, ul: 37, jitter: 12, loss: 0.1 },
  ],
  errors: [
    { cat: "Setup timeout", count: 1 },
    { cat: "Dropped",       count: 0 },
    { cat: "DTMF mismatch", count: 0 },
    { cat: "Audio quality", count: 0 },
    { cat: "Network loss",  count: 0 },
  ],
  /* call setup phase breakdown (avg, ms) */
  waterfall: [
    { phase: "API dispatch",       human: "POST /call/initiate",          ms: 312 },
    { phase: "RMQ publish",        human: "DIAL routing key",             ms: 286 },
    { phase: "MO state → DIALING", human: "External device acknowledges", ms: 691 },
    { phase: "MT state → RINGING", human: "Lab device receives",          ms: 708 },
    { phase: "MO state → CONNECTED", human: "Call audible",               ms: 351 },
  ],
  /* route geometry — ~Somerset/Bridgewater NJ along I-78/I-287 */
  route: { start: [40.5435, -74.564], end:   [40.5805, -74.554] },
};
