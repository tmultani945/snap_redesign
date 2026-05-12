# SNAP Remote Portal Design Specification

> Focused redesign covering only the five remote testing features documented in `SNAP_REMOTE_FEATURES_COMPLETE_KNOWLEDGE.md`:
> Remote VoIP (`VOIP_MO_MT`), Remote SMS without validation (`MO_SMS`), Remote SMS with validation (`MO_MT_SMS`), Remote-to-Remote Voice Call (`EXT_MO_MT`), and Remote Video Playback / artifact viewing (`VIDEO`).
>
> All system behavior, state machines, route names, action enums, status values, and artifact types referenced in this document are taken directly from the source-of-truth knowledge file. Where the knowledge file is silent, an assumption is called out in `> ⚠ Assumption:` callouts.

---

## 1. Product Design Vision

### 1.1 Experience definition

The new SNAP Remote Portal is an **operational console for telecom test operators and analysts**. Its job is not to look impressive on a marketing screenshot — its job is to make a long-running, asynchronous, distributed system feel **legible**, **predictable** and **fast to diagnose** when things go wrong.

The portal exists between three temporal modes the user constantly switches between:

1. **Set up** a test correctly the first time (forms must guide).
2. **Watch** a test run in real time across MO, MT, EXTERNAL_MO and VOIP_MT roles, possibly across multiple iterations and bulk runs.
3. **Investigate** evidence after the fact — Summary → Session → Artifact — moving from outcome to raw evidence in a single, rhythmic motion.

Everything is designed around those three modes.

### 1.2 How it differs from the legacy all-in-one SNAP portal

| Legacy SNAP | New Remote Portal |
|---|---|
| Generic test catalog of 13+ types in one menu | **Five focused entry points**, each with a tailored configuration form |
| Action enums, device-type codes, RabbitMQ routing keys leak into UI labels | All backend nomenclature mapped to **operator-friendly language** (`MO_DIALING_MT` → "MO dials MT") |
| Reports buried beneath multi-tab device pages | **Summary → Session → Artifact** is a first-class three-tab report unit |
| Active runs and history blended | **Active runs are sticky**; history is a separate, filterable surface |
| Bulk runs treated as exotic | Bulk treated as a **first-class run mode** with grouped progress |
| Artifact downloads as an afterthought | Artifacts surfaced inline with **preview-then-download** affordances and bulk ZIP export |

### 1.3 Core design principles

1. **Clarity over decoration.** No gradients, no glassmorphism, no hero sections. Every pixel is operational.
2. **Status is always visible.** Active tests live in a sticky strip at the top of the app shell — operators never lose track of what is running, no matter what page they are on.
3. **Async is honest.** `IDLE → PROGRESS → FINALIZING → COMPLETED` is treated as a real lifecycle, not collapsed into a single spinner. `FINALIZING` in particular is given its own UI affordance because S3 upload latency is real and visible.
4. **Reports are evidence trails.** Summary explains the result; Session shows the steps; Artifact shows the raw evidence. The user moves outward from interpretation to proof in a single motion.
5. **Forms guide correct setup.** Device role slots (MO, MT, EXTERNAL_MO, VOIP_MT) are not generic dropdowns — each slot only accepts compatible devices and explains what role it plays.
6. **Operators repeat themselves.** "Run again with these settings", "duplicate to bulk", and "save as preset" are surfaced everywhere a test exists.

---

## 2. Information Architecture

### 2.1 Sitemap

```
SNAP Remote Portal
│
├── Dashboard                          ← /dashboard
│
├── Test Cases (Launchpad)             ← /catalog
│   ├── Remote VoIP                    ← /catalog/voip-mo-mt
│   ├── Remote SMS (no validation)     ← /catalog/mo-sms
│   ├── Remote SMS (validated)         ← /catalog/mo-mt-sms
│   ├── Remote-to-Remote Voice Call    ← /catalog/ext-mo-mt
│   └── Video & Artifacts              ← /catalog/video
│
├── Test Runs                          ← /runs
│   ├── Active                         ← /runs/active   (default)
│   └── History                        ← /runs/history
│
├── Reports                            ← /runs/:momtId/report
│   ├── Summary tab                    ← /runs/:momtId/report/summary
│   ├── Session tab                    ← /runs/:momtId/report/sessions
│   │   └── /sessions/:playId          (per-iteration drill-down)
│   └── Artifact tab                   ← /runs/:momtId/report/artifacts
│
├── Devices                            ← /devices
│   ├── Lab devices (MO/MT)
│   ├── External devices (EXTERNAL_MO)
│   └── VoIP numbers (AWS Connect DID)
│
└── Settings
    ├── Thresholds (DFIT KPI bands)
    └── Profile / API keys
```

> ⚠ Assumption: **Scheduled Runs is collapsed into History with a `scheduled` status filter** rather than its own nav item. The knowledge file confirms `SCHEDULED` is a real status (`MomtCallTest.status` enum and `/api/test-scheduler/*` endpoints exist) but does not justify a separate top-level page; treating scheduled as a filter avoids navigation bloat.

### 2.2 Primary navigation (left rail, persistent)

| Item | When badged | What the badge shows |
|---|---|---|
| Dashboard | always | – |
| Test Cases | – | – |
| **Test Runs** | when ≥1 test in `PROGRESS` or `FINALIZING` | count of active runs |
| Reports | – | – |
| Devices | when any external device shows `OFFLINE` | "!" |
| Settings | – | – |

### 2.3 Secondary navigation patterns

- **Inside a Run:** sticky context header with `Run name · Type · Status chip · Iteration X/Y · Cancel`. Tabs underneath: `Live` (during PROGRESS), `Summary | Session | Artifact` (post-COMPLETED). The Live tab disappears once the run is COMPLETED/FAILED/CANCELED — the equivalent information lives in Session.
- **Inside a Test Case:** vertical step-rail (`1. Devices → 2. Parameters → 3. Artifacts → 4. Review`) with sticky "Start Test" action.

### 2.4 How users move between phases

```
[Dashboard or Catalog]
          │
          ▼
   Configure test ─────────────────────────┐
          │                                │
          ├─ Save (status: IDLE)            │
          │      └→ Test Runs / History    │
          │                                │
          ├─ Schedule (status: SCHEDULED)  │
          │      └→ Test Runs / History    │
          │                                │
          └─ Start ◄────────────────────────┘
                 │
                 ▼
          Active Run (Live tab)
                 │
          [run finishes]
                 │
                 ▼
        Report (Summary by default)
            │      │       │
            ▼      ▼       ▼
        Summary Session Artifact
```

---

## 3. Core User Roles and Primary Workflows

### 3.1 Roles (inferred from knowledge file)

The knowledge file shows JWT auth via `identityManager(["USER", ...ENTERPRISE_ROLES])` and feature flags `TELEPHONY_TEST` and `BOOKING`. Three operational personas emerge:

| Role | Primary need | Lives in |
|---|---|---|
| **Test Operator** | Configure and start tests, watch them run, cancel quickly when something is wrong | Catalog, Active Runs |
| **Analyst** | Open a completed run, drill from Summary → Session → Artifact, export CSVs and ZIPs | History, Reports |
| **Lab/Tech Manager** | Monitor device health, manage external devices and AWS Connect numbers, manage thresholds | Dashboard, Devices, Settings |

> ⚠ Assumption: roles correspond to the existing `USER` and enterprise roles flag. The portal does not introduce new auth concepts.

### 3.2 Primary workflows

#### W1 — Configure & start Remote VoIP (`VOIP_MO_MT`)

- **Goal:** Verify an external device can dial an AWS Connect DID and complete a call.
- **Screens:** Catalog → VoIP config → Active Run → Report.
- **Decisions UI must support:** picking the EXTERNAL_MO device from the available pool; picking a VOIP_MT phone number from `GET /api/voip/available`; setting `repeatCount` and `iterationDelay`; selecting `artifactSelection` (VIDEO, NETWORK_KPI, CALL_LOG).
- **Failure modes:**
  - AWS Connect call fails (no `AVAILABLE` phones returned) → the form's VoIP picker must show fallback DIDs from the hardcoded list and an inline "AWS Connect unreachable" warning, not a blocking error.
  - External device offline at start (no `xperf-call-states` arriving) → `setExternalMoMtStartTimeout` fires; show "Did not reach DIALING within 15000ms" with a retry CTA.

#### W2 — Configure & start Remote SMS without validation (`MO_SMS`)

- **Goal:** Send an SMS from a single MO device to any phone number; succeed if the SnapBox API call succeeds.
- **Screens:** Catalog → MO_SMS config → Active Run → Report.
- **Decisions UI must support:** single MO device; free-form `phoneNumber` parameter; `text` parameter (≤160 char hint); repeat & delay.
- **Failure modes:** SnapBox 4xx/5xx, `tool_Result === 'Fail'`. UI shows the literal SnapBox response code and "Resend with same parameters" CTA.

#### W3 — Configure & start Remote SMS with validation (`MO_MT_SMS`)

- **Goal:** Send an SMS from MO and verify it arrives on MT, with text + sender match.
- **Decisions UI must support:** MO + MT slot; `text` parameter; iOS-aware behavior banner ("Apple MT devices skip text/sender validation"); `subsequentTimeout` for multi-part SMS (computed = `Math.ceil(text.length / 160)`, surfaced as "this message will arrive in N parts").
- **Failure modes:** part-timeout exceeded (`MT_RECEIVE_SMS` still PROGRESS when timer fires) → "MT did not receive part 2 of 3 within 10s" inline on the action timeline.

#### W4 — Configure & start Remote-to-Remote Voice Call (`EXT_MO_MT`)

- **Goal:** EXTERNAL_MO device dials MT (lab device) and call connects.
- **Decisions UI must support:** EXTERNAL_MO + MT slot. The MT slot must show only devices currently available for booking; the EXTERNAL_MO slot must show only devices currently registered via `xperf-device-registry` and `ONLINE`.
- **Failure modes:** start timeout (no DIAL state from external), MT subscription failure (`POST /SnapBox/api/v1/devices/{sn}/monitoring?type=CALL_STATE` failed).

#### W5 — Monitor active execution

- **Goal:** Watch one or many tests progress through `IDLE → PROGRESS → FINALIZING → COMPLETED/FAILED`.
- **Decisions UI must support:** which iteration is current (`1/N`), per-action progress, per-device live state (`IDLE | DIALING | RINGING | CONNECTED`), live event log from RabbitMQ.

#### W6 — Review completed reports (Summary → Session → Artifact)

- **Goal:** Move from outcome to evidence in three predictable layers.
- **Decisions UI must support:** comparing iterations side-by-side; jumping from a Summary KPI tile straight to the iteration that contains its outlier; downloading the full artifact ZIP.

#### W7 — Inspect Summary / Session / Artifact (UX detail in §7)

#### W8 — View charts, maps, KPIs

- **Decisions UI must support:** DFIT-only chart visibility (`destination === "DFIT"`), threshold band overlays, GPS-tagged KPI overlays on map.

#### W9 — Download artifacts / CSV

- **Decisions UI must support:** per-file download (`/api/file-storage/download`), bulk ZIP (`/api/automation/telephony/tests/:momtId/download-zip`), rename and remove cloud copies.

---

## 4. Design System Direction

### 4.1 Color strategy

A **neutral, technical palette** anchored in cool grays, with a single restrained accent (electric blue) for primary actions and informational status, and a tightly bounded semantic palette for state communication. **No gradients on chrome.** Status colors are reserved exclusively for status — never used for branding.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-app` | `#F7F8FA` | `#0B0E13` | App background |
| `--bg-surface` | `#FFFFFF` | `#11151C` | Cards, panels |
| `--bg-surface-2` | `#F2F4F7` | `#161B24` | Nested panels, table headers |
| `--border` | `#E4E7EC` | `#1F2632` | All hairlines |
| `--border-strong` | `#CDD2DA` | `#2A3242` | Focused inputs, selected rows |
| `--fg-primary` | `#0F1419` | `#E6E9EF` | Body text |
| `--fg-secondary` | `#475467` | `#98A2B3` | Labels, meta |
| `--fg-tertiary` | `#667085` | `#667085` | Captions, hints |
| `--accent` | `#1F6FEB` | `#4D8DF0` | Primary action, links, focus |
| `--accent-soft` | `#E8F0FE` | `#142440` | Selection, accent backgrounds |
| `--status-idle` | `#667085` | `#98A2B3` | IDLE, SCHEDULED |
| `--status-progress` | `#1F6FEB` | `#4D8DF0` | PROGRESS, EXECUTING |
| `--status-finalizing` | `#9C5BF5` | `#B98DF7` | FINALIZING (purple — distinct from running) |
| `--status-pass` | `#0E9F6E` | `#22C58B` | COMPLETED, PASS |
| `--status-fail` | `#D92D20` | `#F26A60` | FAILED |
| `--status-cancel` | `#A86A00` | `#D69633` | CANCELED, CANCELLING |
| `--kpi-good` | `#0E9F6E` | `#22C58B` | Threshold: goodToModerate |
| `--kpi-moderate` | `#D69633` | `#F0B86A` | Threshold: moderateToBad |
| `--kpi-bad` | `#D92D20` | `#F26A60` | Below threshold |

`FINALIZING` deliberately gets its own non-running, non-passing color so operators distinguish "still uploading" from both "still running" and "done".

### 4.2 Typography

Font pairing — **Inter Variable** for UI text + **JetBrains Mono** for data, IDs, IMEIs, S3 paths, RabbitMQ routing keys, action enums:

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 36 | 600 | Page titles |
| `h1` | 22 / 30 | 600 | Section titles |
| `h2` | 18 / 26 | 600 | Card titles |
| `h3` | 15 / 22 | 600 | Subsection titles |
| `body` | 14 / 20 | 400 | Default body |
| `body-strong` | 14 / 20 | 500 | Form labels, table headers |
| `small` | 13 / 18 | 400 | Meta, captions |
| `tiny` | 12 / 16 | 500 (uppercase, +0.04em) | Eyebrow labels, status chips |
| `mono` | 13 / 20 | 400 | IDs, paths, code |
| `mono-sm` | 12 / 18 | 500 | Inline tokens, chips with codes |

> ⚠ The system prompt's default-aesthetic note flags Inter as overused. Inter is chosen here because this is a data-heavy enterprise console where x-height legibility at 13–14px on mixed-density tables matters more than visual differentiation. Acceptable substitution: **IBM Plex Sans** (same metric class).

### 4.3 Spacing

8-pt base scale, with a 4-pt half-step for dense table interiors:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 80`

- Card padding: 20 (default), 16 (compact), 24 (report).
- Form row vertical: 16. Table cell: 12 / 8 (compact-density variant).
- Section vertical rhythm: 32.

### 4.4 Layout grid

12-column fluid grid, max content width 1440 in standard pages, **1680 in report pages with side panels**. Gutter 24. Pages with dense tables (History, Devices) go full-bleed minus 24-pt outer padding.

### 4.5 Iconography

**Lucide** icon set, 16/20/24 sizes, 1.5 stroke. No filled icons except for status dots. Only essential icons:

- nav: `LayoutGrid`, `Cpu`, `Play`, `FileBarChart`, `Smartphone`, `Settings`
- actions: `Play`, `Square` (cancel), `Download`, `Repeat`, `MoreHorizontal`
- semantic: `CheckCircle2`, `XCircle`, `Loader2` (animated for PROGRESS), `UploadCloud` (animated for FINALIZING), `Clock` (SCHEDULED)
- artifact: `Video`, `FileText`, `BarChart3`, `Network`, `Phone`, `Mic`

### 4.6 Status chips, cards, tables

- **Status chip:** 22-pt pill, 8-pt left dot, mono-sm text, semantic color background at 10% on light / 18% on dark, full-strength dot. Always upper-cased.
- **Card:** 1-pt border, 8-pt radius, surface-1 fill, no shadow at rest, 4-pt subtle shadow on hover only when interactive.
- **Table:** zebra off, 1-pt row dividers, 12-pt top header padding, sticky header on scroll, sticky first column on horizontal scroll.

### 4.7 Light vs Dark

The portal **defaults to dark** because:
- Operators run long monitoring sessions; dark reduces fatigue.
- KPI charts with semantic colors gain contrast on dark.
- Most engineers using terminals nearby will appreciate consistency.

Light mode is fully supported and defaulted for printed/exported PDFs.

### 4.8 Accessibility

- All text ≥ 4.5:1 contrast in both modes (KPI chart fills tested at AA on data and AAA on labels).
- Status is **never communicated by color alone** — every chip carries an icon and a text label.
- All interactive elements have a visible 2-pt accent focus ring with 2-pt offset.
- Tables use `<th scope>` and live regions on row changes.
- Keyboard: `?` opens shortcut help; `g d`, `g r`, `g c` for global nav (à la GitHub).

---

## 5. Layout Framework

### 5.1 App shell

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TopBar:  ☰ logo  /  breadcrumb            search          ⚠ alerts  ◐ theme │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▌Active Runs strip — sticky, only visible when ≥1 run in PROGRESS|FINALIZING │
│ ▌  ● VoIP_Run_42 · iter 3/10 · MO_DIALING_MT          [view]  [cancel]      │
├──┬───────────────────────────────────────────────────────────────────────────┤
│  │                                                                           │
│ N│                       Page content                                        │
│ A│                                                                           │
│ V│                                                                           │
│  │                                                                           │
└──┴───────────────────────────────────────────────────────────────────────────┘
```

- **Left nav rail** — 64 px collapsed (icons only), 232 px expanded. Persistent. Collapse persists per-user.
- **TopBar** — 56 px fixed. Holds breadcrumb, global search (Cmd-K), system alerts (e.g., "RabbitMQ disconnected"), theme toggle.
- **Active Runs strip** — 44 px sticky strip directly under the TopBar, **only present when ≥1 test is in PROGRESS or FINALIZING**. Cycles through up to 3 active runs; shows a "+N more" anchor that opens the runs drawer. This is the single most important affordance in the whole product.

### 5.2 Page header

Every content page has a 72-pt header zone:

```
[Title h1]                                            [Primary action]
[Subtitle / breadcrumb · meta]                        [Secondary action]
```

### 5.3 Content container

- **List pages (Active, History, Devices):** full-bleed minus 24 px, table-first.
- **Form pages (configure):** 880-px centered container with 320-px right rail for "Test summary" preview that updates live.
- **Report pages:** 1280-px centered, expandable to full-bleed via a "Wide layout" toggle that splits Summary | Session | Artifact into a 3-pane split-view.

### 5.4 Filter bar pattern

Every list has the same filter shape:

`[Type ▾] [Status ▾] [Destination ▾] [Date range] [Device ▾]   [Search ____________]   [Saved views ▾]`

Filters are URL-encoded so they share/bookmark.

### 5.5 Sticky areas

- TopBar (always)
- Active Runs strip (when applicable)
- Page header (sticks on scroll past 56 px in report pages only)
- Run context header on Run pages
- Table header rows
- "Start test" CTA on configure pages (sticky bottom-right)

### 5.6 Responsive breakpoints

| Breakpoint | Treatment |
|---|---|
| ≥ 1440 (desktop) | Full layout; report pages allow 3-pane split |
| 1024–1439 (laptop) | Left rail auto-collapses to icons; reports drop to single-pane tabs |
| 768–1023 (tablet) | Top-bar nav becomes a hamburger drawer; tables become accordion cards (one row = one card); charts fit-to-width |
| ≤ 767 (mobile) | Read-only mode for History and Reports; configure & start are disabled with a banner ("Mobile is view-only"). Active Runs strip stays. |

> ⚠ Mobile is intentionally **read-only**: the underlying workflows are too device-dense and too risky (cancel actions, AWS calls) to expose at small screens.

---

## 6. Screen-by-Screen Design

### 6.1 Dashboard

**Purpose.** The 5-second snapshot of "what's happening across my labs right now?"

**Layout.**
```
┌──────────── Page header: "Operations Overview" ────────────────────┐
│                                                                    │
│ ┌──── Active runs (4) ─────┐  ┌──── 24h KPIs ────┐ ┌── Devices ──┐ │
│ │ VoIP_Run_42  iter 3/10   │  │ Pass rate  92%   │ │ Lab    18/20│ │
│ │ ● PROGRESS  · MO dials MT│  │ Tests run  37    │ │ Ext     7/9 │ │
│ │ ─────────────────────────│  │ Avg dur    1m12s │ │ VoIP    11  │ │
│ │ SMS_Validate_88  iter 8/8│  │ Failures   3     │ │             │ │
│ │ ◐ FINALIZING · upload    │  └─────────────────┘ └─────────────┘ │
│ │ … 2 more …               │                                      │
│ └──────────────────────────┘                                      │
│                                                                    │
│ ┌──── Recent completed (8 rows) ──────────────────────────────────┐ │
│ │ # · type · status · pass/fail · dur · finished · → report       │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌──── Quick start: 5 launchpad cards ─────────────────────────────┐│
│ │ [ Remote VoIP ] [ SMS no-val ] [ SMS validate ] [ R2R ] [ Vid ]  ││
│ └─────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

**Sections.**
- **Active runs panel** — list of up to 6 in-flight tests with iteration counter, current action (humanized from `actions[].type`), live status chip, and inline actions `View`, `Cancel`. Auto-scrolls when overflow.
- **24h KPI tiles** — Pass rate, tests run, avg duration, failures (all with sparkline behind the number).
- **Device readiness** — Ratio cards for Lab MO/MT pool, External devices (from `xperf-device-registry` ONLINE count), AWS Connect DID count. Click drills into Devices.
- **Recent completed** — table of last 8 runs.
- **Quick start launchpad** — 5 large feature cards as the visual entry to creating a new test.

**States.**
- Empty: "No active runs. Start one →" with launchpad pulled up.
- Loading: skeleton tiles + skeleton rows.
- Error: tile-level error cards (one tile failure does not break the page).

**Responsive.** Tile grid collapses 4→2→1.

---

### 6.2 Test Case Catalog / Launchpad

**Purpose.** The clean entry point to the five supported tests.

**Layout.** Single-column grid of 5 large explanation cards. Each card is identical structure:

```
┌──────────────────────────────────────────────────────────────┐
│  [icon]  Remote VoIP                       [ Configure → ]   │
│                                                              │
│  Validate that an external device can dial an AWS Connect    │
│  DID phone number and complete the call.                     │
│                                                              │
│  Devices needed:    EXTERNAL_MO  +  VOIP_MT (AWS DID)        │
│  Typical duration:  ~45s per iteration                       │
│  Artifacts:         VIDEO · NETWORK_KPI · CALL_LOG           │
│  Backend type:      VOIP_MO_MT                               │
└──────────────────────────────────────────────────────────────┘
```

**Variants per test:**
| Card | Devices needed | Notes |
|---|---|---|
| Remote VoIP | `EXTERNAL_MO` + `VOIP_MT` | Backend-only (no Angular enum). Picks DID via `/api/voip/available`. |
| Remote SMS (no validation) | `MO` only | Free-form target phone number |
| Remote SMS (validated) | `MO` + `MT` | iOS skip-validation banner |
| Remote-to-Remote Call | `EXTERNAL_MO` + `MT` | RabbitMQ DIAL command |
| Video & Artifacts | (any test) | Selecting this opens a chooser to attach VIDEO recording to one of the 4 above |

**States.** No empty state — all 5 always visible. A card is **disabled with reason** when the underlying capability is unavailable (e.g., Video card disables if no logs_video_service health-check).

---

### 6.3 Test Configuration — Remote VoIP

**Purpose.** Configure and start a `VOIP_MO_MT` test.

**Layout.** Two-column: left = stepped form, right = live test summary.

```
LEFT (stepper)
┌─────────────────────────────────────────┐
│ 1. Devices                              │
│    ┌─ EXTERNAL_MO slot ──────────────┐  │
│    │ ▼ Pick external device...        │  │
│    │   Galaxy S22 — udid …  ● ONLINE  │  │
│    └─────────────────────────────────┘  │
│    ┌─ VOIP_MT slot (AWS Connect DID) ┐  │
│    │ ▼ +1 214-257-0986    US · DID   │  │
│    └─────────────────────────────────┘  │
│                                         │
│ 2. Parameters                           │
│    Repeat count       [ 1 ]             │
│    Iteration delay    [ 3 ] sec         │
│    Start timeout      [ 15000 ] ms      │
│                                         │
│ 3. Artifacts                            │
│    [✓] VIDEO    [✓] NETWORK_KPI         │
│    [✓] CALL_LOG [ ] DEVICE_LOG          │
│                                         │
│ 4. Review                               │
│    [ Save ] [ Schedule… ] [ Start ▶ ]   │
└─────────────────────────────────────────┘

RIGHT (sticky preview)
┌─────────────────────────────────────────┐
│ Test summary                            │
│ Type        VOIP_MO_MT                  │
│ Destination LAB                         │
│ Devices     2 (1 external, 1 AWS DID)   │
│ Actions     MO_DIALING_MT → ...         │
│ Duration~   ~45s × 1 iter ≈ 45s         │
│ ───────── action timeline preview ──────│
│ ●─MO_DIALING_MT───●─MT_WAIT_END─●        │
└─────────────────────────────────────────┘
```

**Validation guidance.**
- EXTERNAL_MO slot rejects devices not registered via `xperf-device-registry`.
- VOIP_MT slot lazy-loads from `/api/voip/available`; falls back to hardcoded list if AWS unreachable, with inline notice.
- Start button disabled until both slots filled and at least one artifact selected (CALL_LOG enabled by default).

**States.** Loading device list, error when device booking already held, success → navigate to Active Run page.

---

### 6.4 Test Configuration — Remote SMS without validation

Same shell as 6.3. Form differences:

- **Devices.** Single slot: MO. No MT, no EXTERNAL_MO.
- **Parameters.** `phoneNumber` (target, free text, e.164 hint), `text` (textarea, character counter showing parts = `Math.ceil(len/160)`), `repeatCount`, `iterationDelay`.
- **Artifacts.** Defaults `[CALL_LOG]`. VIDEO available but tagged "may double test duration".
- **Review banner.** "This test does not validate delivery — pass means SnapBox accepted the send command."

---

### 6.5 Test Configuration — Remote SMS with validation

Form differences:

- **Devices.** MO slot + MT slot. Both required.
- **Parameters.** `text` (textarea); auto-shows: "This message will arrive in **N parts**. Per-part timeout: 10000 ms."
- **iOS banner.** If MT slot's selected device has `oem === 'Apple'`, render an info banner: "Apple MT devices skip text and sender validation. The test will pass on receipt of any matching part."
- **Timeouts.** Per-action timestamp (default 10 000 ms) and `subsequentTimeout` (default 10 000 ms) shown as advanced fields under a disclosure.
- **Review.** Action timeline preview: `MO_MESSAGING_MT → MT_RECEIVE_SMS`.

---

### 6.6 Test Configuration — Remote-to-Remote Voice Call

Form differences:

- **Devices.** EXTERNAL_MO slot + MT slot.
- **Action preview.** `MO_DIALING_MT → MT_WAIT_START → ... → MT_WAIT_END`.
- **State preview panel.** Mini-diagram showing where each device will sit during the call.
- **Recording.** External recording (RabbitMQ START_RECORDING) auto-enabled; cannot disable when external destination.

---

### 6.7 Active Test Run

**Purpose.** Live monitoring of one test, possibly across iterations.

**Layout.**

```
┌─ Run context header (sticky) ───────────────────────────────────┐
│  VoIP_Run_42                            ● PROGRESS · iter 3/10  │
│  VOIP_MO_MT · LAB · 4 artifacts · started 14:32                 │
│  [ Pause logs ] [ Cancel ] [ Duplicate to bulk ]                │
├─ Tabs: ▍Live · Summary · Session · Artifact ────────────────────┤

LIVE TAB:
┌─────────────────────────────┐  ┌────────────────────────────────┐
│ Iteration progress          │  │ Device role cards              │
│  ●━●━○━○━○ 3 / 10           │  │ ┌─ EXTERNAL_MO ─┐┌─ VOIP_MT ──┐│
│                              │  │ │ Galaxy S22    ││ +1 214…    ││
│ Action timeline (current)    │  │ │ ● DIALING     ││ ● RINGING  ││
│  ●─────●─────○─────○         │  │ │ udid abc-123  ││ AWS Connect││
│  Dial  Ring  Talk  End       │  │ └───────────────┘└────────────┘│
│  PASS  PROG  IDLE  IDLE       │  └────────────────────────────────┘
│                              │  ┌─ Live event log ───────────────┐
│ Mini KPI strip (DFIT only):  │  │ 14:33:02 SnapBox call/initiate │
│  RSRP -82  RSRQ -10  SINR 14 │  │ 14:33:03 RMQ DIAL → udid abc.. │
└─────────────────────────────┘  │ 14:33:05 callstate DIALING    │
                                  │ 14:33:07 callstate RINGING    │
                                  │ … live tail …                 │
                                  └────────────────────────────────┘
```

**Async treatment.**
- The status chip in the context header reflects `MomtCallTest.status` exactly: `IDLE → PROGRESS → FINALIZING → COMPLETED/FAILED/CANCELED/CANCELLING`.
- `FINALIZING` swaps the iteration progress for an "**Uploading artifacts**" panel that lists each non-CALL_LOG/non-TRACE_LOG artifact with its own per-artifact spinner — because that is what is actually happening in `logs_video_service`.
- The live event log is a tail of the RabbitMQ events relevant to this run, **with backend nomenclature humanized** (`MO_DIALING_MT` → "MO dials MT"), but the raw token is shown on hover for debuggability.

**Cancel/retry.** Cancel sets `CANCELLING` immediately and shows a soft toast; full `CANCELED` arrives when backend confirms. After a `FAILED` run, "Retry with same settings" button is offered.

**States.** Skeleton during initial load; per-section error fallbacks; `OFFLINE` device card if RabbitMQ device-registry stops reporting.

---

### 6.8 Test History

**Purpose.** Browseable archive of every run.

**Layout.** Filter bar + dense table:

```
[Type ▾] [Status ▾] [Destination ▾] [Date 14d ▾] [Device ▾]   [search________]   [Saved ▾]

# │ Name              │ Type        │ Status     │ Pass │ Dur    │ Started        │ →
──┼───────────────────┼─────────────┼────────────┼──────┼────────┼────────────────┼───
42│ VoIP_Run_42       │ VOIP_MO_MT  │ ● COMPLETED│ 9/10 │ 7m22s  │ today 14:32    │ ›
41│ SMS_Bulk_03       │ MO_MT_SMS   │ ● COMPLETED│ 8/8  │ 2m11s  │ today 13:18    │ ›
40│ R2R_call_test_a   │ EXT_MO_MT   │ ● FAILED   │ 0/3  │ 41s    │ today 12:01    │ ›
```

- Sortable columns; bulkId-grouped runs collapse into a single parent row with a chevron.
- Row → opens Report (Summary tab default).
- Row hover reveals: `Re-run`, `Duplicate`, `Download ZIP`, `Delete` (with confirm modal).

**States.** Empty state shows the launchpad. Error: per-row error markers if a run's record is partially missing.

---

### 6.9 Report — Summary

**Purpose.** Executive answer to "did this test pass and why?"

**Layout.**
```
[ context header from §6.7 ]
[ Tabs: Live(disabled) · ▍Summary · Session · Artifact ]

┌─ Headline ───────────────────────────────────────────────────────┐
│ ✓ COMPLETED  ·  9 of 10 iterations passed  ·  total 7m22s         │
│ One failure on iteration 6 — MO did not reach DIALING within 15s  │
│ [ Download all artifacts (ZIP) ]   [ Open failed iteration → ]    │
└──────────────────────────────────────────────────────────────────┘

┌─ KPI tiles ──────────────────────────────────────────────────────┐
│ Pass rate 90%  ·  Avg setup 2.4s  ·  Avg call 38s  ·  RSRP -82dBm│
└──────────────────────────────────────────────────────────────────┘

┌─ Iteration matrix (dense) ───────────────────────────────────────┐
│ #  status  setup  call  end  artifacts                            │
│ 1   ✓ PASS   2.1s   38s  ok    [v][l][k][n]                       │
│ 2   ✓ PASS   2.4s   40s  ok    [v][l][k][n]                       │
│ 6   ✗ FAIL   timeout —    —    [v][l][k]                          │
└──────────────────────────────────────────────────────────────────┘
```

- **Headline** is a one-sentence interpretation. Always visible.
- **KPI tiles** pull from `metrics-summary` (DFIT) or basic action timing (lab destination).
- **Iteration matrix** is the bridge to Session — clicking any row jumps to the `playId` in the Session tab.
- **Downloads** are top-level: full ZIP, plus a CSV summary (synthesized client-side from action data — no new backend route needed).

---

### 6.10 Report — Session

**Purpose.** Step-by-step truth for a single iteration.

**Layout.** Master/detail.

```
LEFT (master, 280px):
  Iterations 1..N as a vertical list with status dot + "iter 1 · 41s · PASS"

RIGHT (detail):
  ┌─ Iteration 6 · FAILED · 14:38:02 → 14:38:17 ────────────────┐
  │ Action timeline:                                             │
  │  ●──────●──────●──────○                                      │
  │  Dial   Ring   Talk   End                                    │
  │  FAIL   IDLE   IDLE   IDLE                                   │
  │                                                              │
  │  Step detail (selected):                                     │
  │  MO_DIALING_MT — "MO dials MT"                              │
  │  start  14:38:02.103                                        │
  │  end    14:38:17.211                                        │
  │  status FAILED                                              │
  │  errors  [400] "Did not reach DIALING within 15000ms"       │
  │                                                              │
  │  Per-device states at failure:                               │
  │  · EXTERNAL_MO  Galaxy S22  — last state: IDLE              │
  │  · VOIP_MT     +1214… AWS  — last state: —                  │
  │                                                              │
  │  Linked evidence:                                            │
  │  → VIDEO recording (12s · 4MB) [ preview ] [ download ]      │
  │  → CALL_LOG (3KB) [ preview ] [ download ]                  │
  │  → NETWORK_KPI (8KB) [ preview ] [ download ]                │
  └─────────────────────────────────────────────────────────────┘
```

- Each step expands to show its `data.timestamp`, `finishedAt`, errors.
- Cross-link to Artifact tab uses `?artifactId=…` so deep links work.

---

### 6.11 Report — Artifact

**Purpose.** Browse and grab raw evidence.

**Layout.**

```
[ filter: type ▾ device ▾ status ▾ ]   [ Download all (ZIP) ]

┌── Grouped by device, then by content type ─────────────────────┐
│ ▼ Galaxy S22  (EXTERNAL_MO  ·  udid abc…)                       │
│   ▼ VIDEO                                                       │
│       run42_iter1.mp4   12.4MB  ✓ COMPLETED  [▶ preview][⬇][⋯]  │
│       run42_iter2.mp4   12.1MB  ✓ COMPLETED  [▶ preview][⬇][⋯]  │
│       run42_iter6.mp4   8.9MB   ✓ COMPLETED  [▶ preview][⬇][⋯]  │
│   ▼ NETWORK_KPI                                                  │
│       run42_iter1.csv   8KB     ✓ COMPLETED  [👁 preview][⬇]    │
│   ▼ CALL_LOG                                                    │
│       run42_calls.txt   3KB     ✓ COMPLETED  [👁 preview][⬇]    │
└────────────────────────────────────────────────────────────────┘
```

- **Inline preview:** video plays in a right-side drawer; CSVs render as the first 100 rows in a table; logs render with monospace + line numbers.
- **Status:** each artifact carries its own `IDLE | PROGRESS | FINALIZING | COMPLETED | FAILED | CANCELED` chip; `FINALIZING` shows an upload spinner.
- **Bulk action bar** appears on multi-select: download N, delete N (cloud), rename (cloud).
- **Empty per-section** if the test did not select that artifact type ("CALL_LOG was not selected for this run").

---

### 6.12 KPI Analysis

**Purpose.** Charted KPI evidence. Visible only when `destination === "DFIT"`.

**Layout.** Tabbed by metric family — Signal, Voice, Network — with multi-iteration overlay capability.

```
┌── Signal Quality ───────────────────────────────────────────────┐
│  RSRP   line, with threshold band overlay (good / mod / bad)    │
│  RSRQ   same                                                    │
│  SINR   same                                                    │
│  RSSI   same                                                    │
│ ── Voice Quality ──                                             │
│  VVQ    line                                                    │
│  RTP_JITTER    line                                             │
│  RTP_PACKET_LOSS  line                                          │
│  AUDIO_DATA_RATE_DL/UL  paired line                             │
│  RX_DELAY / RX_DELTA_DELAY  paired line                          │
└────────────────────────────────────────────────────────────────┘
```

- **Threshold bands** drawn from `telephony.trace.thresholds` shaded behind the line (good = `--kpi-good` 8% fill, moderate = 8% amber, bad = 8% red).
- **Outlier markers** placed on points whose `metricsVerbosityType` is `ALERT` or `ERROR`.
- **Compare drawer** lets the user overlay another iteration or another run for diff.

---

### 6.13 Map View

**Purpose.** GPS-tagged KPI evidence for DFIT runs that include lat/lng.

**Layout.** Full-bleed map with right rail.

- Map: dot per `telephony.trace.logs` entry colored by selected metric (RSRP default), sized by `metricsVerbosityType`.
- Right rail: metric picker, threshold legend, route/timeline scrubber that highlights dots for a time window.
- Click a dot → opens the inline log entry as a popover with Session deep link.

> ⚠ Assumption: Mapbox/Leaflet tiles are reused from existing SNAP infra. The portal does not introduce a new map backend.

---

### 6.14 Device Selection / Device Context Panel

**Purpose.** A reusable side panel and a Devices page.

**Side panel (slide-over from anywhere a device chip is clicked).**

```
Galaxy S22                      ● ONLINE
sn  S22-ABC-001
udid abc-123-…
imei 123456789012345
oem  Samsung · Android 14
phone +1 555-0102

Role in current test: EXTERNAL_MO
Subscriptions: CALL_STATE (count 1)

Recent activity:
 14:33  RMQ DIAL → +1214…
 14:33  callstate DIALING
 …
```

**Devices page.** Three tabs: Lab Devices, External Devices, VoIP Numbers.

| Tab | Source |
|---|---|
| Lab Devices | `devices` collection where `labId` is set |
| External | `devices` registered via `xperf-device-registry` |
| VoIP Numbers | `/api/voip/available` |

Each row shows readiness (`deviceCommunicationStatus`, `deviceStateCode`) and current booking.

---

## 7. Summary / Session / Artifact UX Model

The most important UX commitment in the entire portal: **the report experience is a 3-step funnel from interpretation to evidence.**

```
SUMMARY        SESSION              ARTIFACT
─────────      ────────────         ────────────────
"What         "What happened       "Show me the raw
 happened?"    step by step?"       evidence."
─────────      ────────────         ────────────────
Headline       Iterations list     Files grouped by device
KPI tiles      Action timelines    Inline previews
Iteration      Per-step detail     Per-file COMPLETED/FINALIZING
matrix         Errors & timing     Bulk download / delete
              Per-device state     CSV / video / log / KPI
```

### 7.1 What each tab emphasizes

- **Summary** — interpretation. One headline sentence + KPI tiles + iteration pass/fail matrix. 80% of users stop here.
- **Session** — chronology. Iteration master, action timeline, per-step detail panel.
- **Artifact** — evidence. Files grouped by device → content type, inline preview, downloads.

### 7.2 First-paint priority

| Tab | First thing the user sees |
|---|---|
| Summary | The headline sentence and the pass/fail count |
| Session | The most recent iteration's timeline |
| Artifact | The largest / most informative artifact group (VIDEO if present) expanded; everything else collapsed |

### 7.3 Always visible vs collapsible

- **Always visible:** the run context header (status, type, iteration count, cancel/retry).
- **Collapsible by default:** per-iteration step detail (Session), per-content-type group (Artifact), advanced timing fields, raw RabbitMQ events.

### 7.4 Outward motion

- Summary KPI tile → click → opens the Session tab anchored to the iteration containing the outlier.
- Session step detail → "Linked evidence" → opens Artifact tab anchored to that file.
- Artifact file row → "Used in iteration 6" → returns to Session.

### 7.5 Interaction model

**Tabs at the run level**, **master/detail inside each tab**.
- Tabs were chosen over a single split-pane because operators commonly flip between Summary and Artifact without needing them both visible. Wide-layout toggle remains for 1440+ users who want all three at once.

### 7.6 Avoiding overload

- Backend nomenclature is shown but never primary. Action enum codes appear as monospace tokens after the human label.
- Routing keys, `udid`, `imei`, `bulkId` are shown in monospace and copyable but live in disclosure panels.
- Default densities are mid; a "Compact density" toggle reduces row heights for analyst sessions.

### 7.7 Sticky context header

A 64-pt sticky bar across all three tabs holds: name, type, status chip, iteration `X/Y`, started/finished timestamps, primary CTAs (Cancel during PROGRESS, Re-run after, Download ZIP always).

---

## 8. Real-Time and State-Driven UX

### 8.1 Status design tokens

| Status | Token | Icon | Visual treatment |
|---|---|---|---|
| `IDLE` | `--status-idle` | `Circle` | Outline chip, gray |
| `SCHEDULED` | `--status-idle` | `Clock` | Outline chip with clock icon |
| `EXECUTING` / `PROGRESS` | `--status-progress` | `Loader2` (spin) | Filled chip, blue, spinning icon |
| `FINALIZING` | `--status-finalizing` | `UploadCloud` (pulse) | Filled chip, **purple — distinct from progress** |
| `COMPLETED` / `PASS` | `--status-pass` | `CheckCircle2` | Filled chip, green |
| `FAILED` | `--status-fail` | `XCircle` | Filled chip, red |
| `CANCELED` / `CANCELLING` | `--status-cancel` | `OctagonX` | Outline chip, amber |

### 8.2 Severity & visual priority of alerts

| Severity | Inline | Banner | Toast | Persistent |
|---|---|---|---|---|
| Info (e.g., "AWS DID list refreshed") | – | – | ✓ | – |
| Warning (e.g., "AWS Connect unreachable, fallback DIDs") | ✓ | – | – | – |
| Error (e.g., test failed) | ✓ | – | – | row chip |
| Critical (e.g., RabbitMQ disconnected) | – | ✓ | – | TopBar dot |

### 8.3 Progress indicators

- **Iteration progress** — segmented dots `●━●━○━○━○` with current iteration highlighted.
- **Action progress** — segmented timeline with each action as a node; `PROGRESS` shows a pulsing ring.
- **Artifact upload** — per-file spinner during `FINALIZING`; the run-level chip stays `FINALIZING` until all artifacts move to `COMPLETED`/`FAILED`.

### 8.4 Device online/offline

The device chip has an LED dot:
- green = ONLINE in `xperf-device-registry`
- amber = `remote-testing` (busy)
- gray = OFFLINE last seen > 60 s
- red = explicit `OFFLINE` event

### 8.5 Delayed artifact availability

Because S3 upload is async, the Artifact tab shows entries the moment the test moves to `FINALIZING` — even before the upload is done. Each entry has its own status. **Empty state for an artifact mid-upload** reads: "Uploading run42_iter1.mp4 — typically <60s after run completes."

### 8.6 Polling strategy

- During `PROGRESS` and `FINALIZING`, the Run page polls `GET /api/automation/telephony/tests/:momtId` every **5 s** for run-level status and every **20 s** for artifact metadata, matching the legacy 20 s interval. Polling stops the moment status reaches a terminal state.
- The Active Runs strip uses the run-level poll only (5 s).
- Artifact and event log subscriptions can be upgraded to a dedicated WebSocket later; the polling design must accept a swap-in.

> ⚠ Assumption: WebSocket / SSE are not currently exposed. Spec assumes polling like the legacy frontend.

### 8.7 Long-running test visibility

Any test running > 5 minutes shows a "long-running" badge on the Active Runs strip; the user gets a non-blocking toast at 30 minutes asking if they want to cancel.

### 8.8 Partial completion / missing artifacts

If a test reaches `COMPLETED` but one or more artifacts are still `FINALIZING` after a 10-minute grace, the report shows a yellow inline banner: "1 artifact (run42_iter6.mp4) is still uploading. The run is complete; the file will appear when ready." If an artifact transitions to `FAILED`, that banner becomes red and offers a "Retry artifact" CTA where supported.

### 8.9 Toast strategy

Toasts are strictly transient and short. Anything important enough to persist is a banner or an inline marker. Toasts appear bottom-right, max 3 stacked, auto-dismiss in 5 s.

### 8.10 Skeletons & empties

- Skeletons match the shape of the eventual content; never use spinners for full-page loads.
- Empty states always show at minimum: title, one sentence of explanation, and a primary CTA.

### 8.11 Retry/cancel patterns

- **Cancel** — single click; intermediate `CANCELLING` chip + soft confirm toast; full `CANCELED` confirms backend ack.
- **Retry** — appears next to FAILED; pre-fills the configure form. Bulk runs support "Retry failed iterations only" (client constructs a new run with same parameters and a `repeatCount` equal to the failed count).

---

## 9. Data Visualization Strategy

### 9.1 Chart-type → KPI mapping

| KPI family | Chart | Why |
|---|---|---|
| RSRP, RSRQ, SINR, RSSI | Time-series **line** with threshold-band background | Continuous signal; bands matter |
| VVQ | Time-series **line + point markers** | Sparse sampling; marker = sample |
| RTP_JITTER, RTP_PACKET_LOSS | **Stacked area** capped at threshold | Bounded metric, distribution matters |
| AUDIO_DATA_RATE_DL/UL | Paired **line** with shared axis | Up/down comparison |
| RX_DELAY / RX_DELTA_DELAY | Paired **line** | Same |
| QCI / 5QI | **Step chart** | Categorical-stepped values |
| Pass/fail per iteration | **Heatmap row** | Compact iteration overview |
| Trend across runs | **Sparkline** | Tiny, in-tile use |
| KPI distribution | **Histogram** | Distribution shape |
| Geo KPI | **Color-coded map dots** | Spatial KPI |

### 9.2 Avoiding clutter

- One KPI per chart unless it is a paired metric (DL/UL, delay/delta).
- Threshold bands always at 8% fill — they should be felt, not read.
- Legends only when ≥2 series. Otherwise the y-axis label suffices.
- Tooltips are sparse — value, timestamp, threshold band, iteration link.

### 9.3 Coordinating with Summary / Session / Artifact

- Summary shows aggregate KPI tiles + sparkline.
- Session shows per-iteration mini-charts inline with the action timeline.
- Artifact tab is the only place the raw CSV is exposed.

### 9.4 Color rules

- Use `--kpi-good`, `--kpi-moderate`, `--kpi-bad` only for thresholds.
- Use `--accent` only for the primary line.
- Comparison overlays use ColorBrewer "Set2" palette starting at the second color.
- Map dots use a 5-stop diverging scale (good→bad) — never rainbow.

### 9.5 Tooltip / legend / export

- Tooltip: timestamp · value · band · "open in Session →".
- Legend: top-right, click to mute series.
- Export: PNG and CSV per chart; PDF for the whole KPI page.

### 9.6 Mobile degradation

- Charts collapse to one-column.
- Threshold bands stay; tooltips become tap-to-show.
- Compare overlay is disabled.

---

## 10. Component Library Recommendation

| Component | Purpose | States | Variants | Best usage |
|---|---|---|---|---|
| `AppShell` | Persistent chrome | – | with/without ActiveRunsStrip | Wraps every page |
| `SidebarNav` | Primary nav | collapsed/expanded | with badge counts | App-wide |
| `TopBar` | Breadcrumb + global search + theme | normal / alert | with system warning | App-wide |
| `ActiveRunsStrip` | Sticky banner of runs in flight | hidden / 1 / many | – | Below TopBar |
| `RunContextHeader` | Run identity + status + actions | progress / final / canceled | with retry / with download | Run pages |
| `FilterBar` | Standard filter row | default / saved-view | with bulk actions | History, Devices |
| `TestTypeCard` | Catalog cards | enabled / disabled | – | Catalog |
| `DeviceCard` | Device summary | online / offline / busy / unknown | role: MO / MT / EXT_MO / VOIP_MT | Run Live tab |
| `DeviceSelectField` | Form slot for device pick | empty / filled / error | by-role | Configure forms |
| `StatusChip` | Status pill | all of `MomtCallTest.status` enum | sizes sm/md | Everywhere |
| `KpiTile` | Big number + sparkline | loading / value / error | with threshold dot | Dashboard, Summary |
| `IterationDots` | `●━●━○━○━○` progress | – | sizes sm/md | Live, Summary |
| `ActionTimeline` | Action node-edge timeline | per-step status | horizontal/vertical | Live, Session |
| `Stepper` | Form steps 1..4 | step state | – | Configure |
| `ReportTabs` | Live · Summary · Session · Artifact | – | Live disabled when terminal | Run pages |
| `ArtifactRow` | One artifact file | IDLE / PROGRESS / FINALIZING / COMPLETED / FAILED | with preview / download / rename | Artifact tab |
| `VideoViewer` | In-drawer video player | – | – | Artifact preview |
| `LogViewer` | Monospace log display | – | with line numbers, search | Artifact preview |
| `KpiChart` | Time-series with threshold bands | – | line / area / step | KPI Analysis |
| `KpiMap` | Map with KPI dots | – | – | Map View |
| `DataTable` | Standard table | loading / empty / data / error | density compact / cozy | Lists |
| `SearchFilterControls` | Search + dropdown filters | – | with saved views | All lists |
| `FormControls` | Inputs, textareas, selects | default / focus / error / disabled | sizes sm/md | Forms |
| `ConfirmModal` | Destructive confirm | – | severity info / warn / danger | Cancel, Delete |
| `EmptyState` | Standard empty | – | with primary CTA | Lists, Reports |
| `ErrorState` | Standard error | – | with retry | Sections |
| `Toast` | Transient notifications | info / success / warn / error | – | App-wide |
| `Banner` | Persistent inline notice | info / warn / error | dismissible | Page-level |
| `DownloadActionBlock` | "Download all" + ZIP/CSV | – | bulk select aware | Reports |

---

## 11. Angular-Friendly Implementation Guidance

### 11.1 Module / route layout

```
src/app/
├── core/                     // singletons, interceptors, auth, RxJS WS/poll services
├── shared/                   // ui-kit, status pipes, status-icon component
├── features/
│   ├── dashboard/
│   ├── catalog/
│   │   ├── voip/
│   │   ├── mo-sms/
│   │   ├── mo-mt-sms/
│   │   ├── ext-mo-mt/
│   │   └── video/
│   ├── runs/
│   │   ├── active/
│   │   ├── history/
│   │   └── run-detail/
│   │       ├── live/
│   │       ├── summary/
│   │       ├── session/
│   │       └── artifact/
│   ├── devices/
│   └── settings/
└── layout/                   // AppShell, SidebarNav, TopBar, ActiveRunsStrip
```

Use **standalone components** + **lazy-loaded routes** per feature. Each catalog form is its own lazy module.

### 11.2 Smart vs presentational

- **Containers** (`*-page.component.ts`) own data fetching, polling, and routing. One per route.
- **Presentational** (`status-chip`, `iteration-dots`, `kpi-tile`, etc.) take inputs and emit outputs. Storybook-ready.
- Reports compose presentational sub-components; the run-detail container owns the polling and shares it via DI.

### 11.3 State management

- **NgRx Component Stores** (or Signal-based stores) per feature, not a global RxJS store. The data shape is page-local.
- A small **runs feed** singleton service drives the Active Runs strip — it polls `GET /api/automation/telephony/tests?statuses=PROGRESS,FINALIZING` every 5 s and exposes a `Signal<ActiveRun[]>`.
- A **per-run polling service** is provided at the run-detail route's component level so it tears down when the user navigates away.

### 11.4 Async UI plumbing

- All polling uses `interval(5000)` + `switchMap` + `takeUntilDestroyed()`.
- Move to WebSocket later by swapping the source observable; UI does not need to change.
- Skeleton states live in template via `@if (data(); as d) { … } @else { <skeleton/> }`.

### 11.5 Design tokens

Tokens defined once in `_tokens.scss`:

```scss
:root {
  --bg-app: #f7f8fa;
  --status-progress: #1f6feb;
  // …
}
:root[data-theme="dark"] {
  --bg-app: #0b0e13;
  // …
}
```

Components consume tokens only — never hex.

### 11.6 SCSS organization

```
styles/
├── _tokens.scss
├── _typography.scss
├── _layout.scss
├── _utilities.scss
└── globals.scss
```

Per-component SCSS uses `:host` and BEM-ish locals. No deep selectors.

### 11.7 Decomposition for table/chart/report

- `data-table` is a single dumb component taking columns and rows; complex cells receive `TemplateRef`s.
- `kpi-chart` is a wrapper around ECharts (lightweight tree-shaken) — one component per chart variant (`line-with-threshold`, `paired-line`, `step`).
- Reports compose smaller pieces: `<run-context-header>`, `<report-tabs>`, `<summary-page>`, `<session-page>`, `<artifact-page>`.

### 11.8 Forms

Use Angular Reactive Forms. The configure shell is a single dynamic form (`FormGroup`) that loads its schema from the test type. This keeps the four configure pages thin.

---

## 12. Detailed Mockup Descriptions (6 most important screens)

### 12.1 Dashboard (deep mock)

Top-bar (56 px): SNAP wordmark left, breadcrumb "Operations Overview", a Cmd-K search at right, alerts dot, theme toggle.

Below the top-bar, the **Active Runs strip** displays. Today there are 3 runs in flight: VoIP_Run_42 (PROGRESS, iter 3/10, MO_DIALING_MT), SMS_Validate_88 (FINALIZING), R2R_call_test_a (PROGRESS, iter 2/3). Each row: 8-pt status dot, run name (medium-weight), backend type in mono-sm tag, iteration counter, current action humanized, then [view] [cancel] tucked right.

Page header: large `display`-size title "Operations Overview", small subtitle "All labs · last 24h". Right-aligned: secondary "Refresh" button and primary "Start a test ▾" split-button.

Below, a 12-column grid:

- Cols 1–6 — **Active runs panel.** Card title "Active runs · 3", body is a vertical list mirroring the strip but with more detail (started time, duration so far, devices). A subtle "View all" link at the bottom of the card opens `/runs/active`.
- Cols 7–9 — **24h KPIs.** Stack of four `KpiTile`s: Pass rate, Tests run, Avg duration, Failures. Each tile: label (tiny eyebrow), big number (display), sparkline behind, threshold dot.
- Cols 10–12 — **Devices.** Three `DeviceCard`s vertical: Lab pool (18/20 ready), External pool (7/9 online), VoIP DIDs (11). Click any opens Devices.

Next row, full width — **Recent completed** table, 8 rows. Columns: #, name, type, status chip, pass/fail (e.g. "9/10"), duration, finished, a chevron. Hover row → row CTA reveals re-run/duplicate/download.

Final row — **Quick start launchpad**: 5 horizontal cards with icons and one-sentence descriptions. Clicking enters the configure flow.

User notices first: the Active Runs strip (it's the only colored thing above the fold). Status and action are the two most prominent items there.

### 12.2 Remote VoIP configuration (deep mock)

Stepper page. Left rail (220 px): vertical step list with 4 steps. Center (640 px): the form for the active step. Right rail (320 px): sticky live "Test Summary" card that updates as the user fills the form.

Step 1, "Devices":
- Section title "Devices", small description "Pick one external device and one AWS Connect DID".
- `DeviceSelectField` for EXTERNAL_MO. Empty state shows a placeholder; clicking opens a popover list of currently registered external devices with online dot, model, udid mono-sm. Filter input at top of popover.
- `DeviceSelectField` for VOIP_MT. Similar popover; lists DIDs from `/api/voip/available`. Inline notice if list is the hardcoded fallback.

Step 2, "Parameters":
- Three numeric inputs in a row (repeatCount, iterationDelay, startTimeout). Each labeled with tiny eyebrow + small helper text below.

Step 3, "Artifacts":
- 4 toggle chips: VIDEO, NETWORK_KPI, CALL_LOG, DEVICE_LOG. CALL_LOG checked by default.

Step 4, "Review":
- Three lines summarizing the test, then a row of CTAs: secondary "Save", secondary "Schedule…", primary "Start ▶". The primary button is sticky bottom-right of the page.

Right rail summary:
- "Test summary" h2.
- 6 rows (type, destination, devices, actions, artifacts, est. duration).
- Action timeline preview: circle-and-edge sketch of the actions.
- "What happens when I press Start?" disclosure that explains in plain English: "We'll dial +1 214… from Galaxy S22 via RabbitMQ, wait for call state to reach RINGING, run for ~38s, then collect artifacts."

User notices first: the device slots, because they are the largest unfilled control.

### 12.3 Remote SMS with validation configuration (deep mock)

Same shell. Differences:

Step 1: MO + MT slots. If the chosen MT is `oem === 'Apple'`, an info banner ("Apple MT skips text/sender validation") appears between Step 1 and 2 and stays visible.

Step 2:
- `text` textarea (full width, 4 lines tall, 460-char counter and parts indicator below: "Will arrive in 3 parts · per-part timeout 10s").
- repeat & delay inline as in 12.2.
- Disclosure "Advanced timing": fields for `actions[].data.timestamp` (per-step timeout) and `actions[].data.subsequentTimeout` (multi-part SMS timeout).

Step 3: defaults to CALL_LOG only; VIDEO is offered with a subtle "may extend test by ~10s" note.

Right rail action timeline shows two nodes: `MO_MESSAGING_MT → MT_RECEIVE_SMS`. The first is auto-PASS; the second is the validation gate.

User notices first: text textarea + parts indicator.

### 12.4 Active Test Run (deep mock)

Run context header (sticky 64 px): name "VoIP_Run_42" + mono-sm `VOIP_MO_MT` chip + status chip "● PROGRESS" + "iter 3/10" + started 14:32. Right side: secondary "Pause logs", danger "Cancel", "Duplicate to bulk".

Tabs: Live (active), Summary, Session, Artifact.

Live tab — three-zone layout:

Left column (cols 1–7):
- **Iteration progress** (`●━●━○━○━○`) with iteration timestamps tooltip.
- **Action timeline** for the current iteration: nodes for the actions defined in `actions[]`, each with status. The current node pulses; passed nodes are filled green; idle are outlined.
- **Mini KPI strip** — three small tiles for RSRP / RSRQ / SINR if `destination === "DFIT"`.

Right column (cols 8–12):
- **Device role cards** for EXTERNAL_MO and VOIP_MT side by side; each card shows device identity + live `IDLE | DIALING | RINGING | CONNECTED` chip + recent state changes.
- **Live event log** below, monospace, reverse-chronological tail. Toggle "raw" hides the humanized labels and shows enums for debug.

User notices first: the pulsing action node on the timeline. The status chip in the header is a very close second.

### 12.5 Report Summary (deep mock)

Same context header (status chip now COMPLETED). Tabs: Live disabled, Summary active, Session, Artifact.

Body:
- **Headline card** at top spans full width. Big check mark, "9 of 10 iterations passed · total 7m22s". Second line: "One failure on iteration 6 — MO did not reach DIALING within 15000 ms." Right-aligned: "Download all artifacts (ZIP)" primary button + "Open failed iteration →" secondary.
- **KPI tiles** row: 4 tiles. Pass rate 90%, Avg setup 2.4s, Avg call 38s, Avg RSRP -82 dBm.
- **Iteration matrix** card. A dense table: iteration number, status chip, setup time, call time, end time, artifacts mini-icons. Failed iteration highlighted in a soft red row. Click any row → Session tab anchored to that iteration.
- **Trend strip** at the bottom (only when ≥2 historical runs of the same type exist) — a sparkline of pass rate over the last 10 runs of this type.

User notices first: the headline sentence and the green check.

### 12.6 Report Artifact (deep mock)

Sticky context header. Tabs with Artifact active.

Top filter row: Type dropdown (VIDEO, LOG, USER_ACTION, KPIS, CALL_LOG, TRACE_LOG, NETWORK_KPI), Device dropdown, Status dropdown. Right side: "Download all (ZIP)" primary.

Body: collapsible groups. The **first group** is the most informative device, default expanded. Inside, content-type sub-groups (Video, Network KPI, Call Log) each list their files.

Each artifact row:
- 24×24 type icon
- filename in mono
- size · uploaded timestamp · status chip
- inline actions: preview (eye for text, play for video), download (cloud arrow), more (rename / delete cloud / copy URL).

Selecting one or more rows reveals a top-anchored bulk action bar: "3 selected — Download · Delete · Cancel selection".

Inline preview opens as a right-side drawer (480 px) with:
- header: filename + close
- body: video player (with native controls + iteration jump buttons), or text viewer (with mono font, line numbers, search), or CSV table viewer (first 100 rows + "show more")
- footer: "Open in Session iteration 6 →"

User notices first: the device group header and the most prominent file (the largest video) with its inline preview button.

---

## 13. What To Keep, Remove, and Simplify

### 13.1 Hide / simplify

| Backend concept | New portal treatment |
|---|---|
| RabbitMQ exchange / routing key (`*.xperf-testing`) | Hidden. Surfaced only in the Live event log "raw" toggle and in advanced support views. |
| `udid` vs `serialNumber` distinction | Both copyable in the device side panel; the form layer uses one consistent "device" abstraction. |
| AWS Connect IDs (`Id`, `Arn`) | Hidden. Only `PhoneNumber` and `PhoneNumberCountryCode` shown. |
| `deviceCommunicationStatus`, `deviceStateCode` raw codes | Mapped to ONLINE / OFFLINE / BUSY / OFFLINE>60s. Raw codes available on the device side panel. |
| `MomtScheduledIteration` mechanism (long-delay persistence) | Hidden. The user only sees that long-delay iterations work; the persistence is invisible. |
| `bulkId` UUID | Surfaced as "Bulk run #abcd" in the History row when multiple runs share an id; full UUID copyable. |
| TTL index 365d on tests | Surfaced once on History as "older than 1 year are auto-deleted". |
| Action enum strings (`MO_DIALING_MT`) | Replaced with the `MomtTypeMap` UI labels. Raw enum shown on hover for support / debug. |
| Per-action `data.timestamp` ms numbers | Reframed as "Timeout (s)" with sane defaults. |
| `subsequentTimeout` for multi-part SMS | Reframed as "Per-part timeout (s)" only on the SMS-validate form. |
| `DeviceTesting.data.text/parts` accumulation | Hidden. Only "Parts received: 2/3" shown on the Live tab. |
| Internal feature flags (`TELEPHONY_TEST`, `BOOKING`) | Hidden. Pages return 403 silently if the user lacks the flag. |
| iOS validation skipping | Surfaced as a banner on the SMS-validate config; not exposed in code form. |

### 13.2 Keep visible

- The five test types as first-class entry points.
- Iteration-by-iteration pass/fail.
- Per-action status with timing.
- Per-device live state during PROGRESS.
- Each artifact's status, size, and S3 evidence.
- DFIT charts with thresholds.
- Bulk runs with grouped progress.

### 13.3 Behind the scenes

- All RabbitMQ plumbing (KPI, artifacts, call states, device registry queues).
- All Java service ports, log shipping, FFmpeg processing, S3 path conventions.
- AWS keys and instance ARNs.
- `telephony.trace.thresholds` schema editor (admin only — Settings).

### 13.4 Advanced mode

A user toggle in Settings reveals:
- Raw RabbitMQ event log on the Live tab
- Action enum codes shown alongside labels everywhere
- Threshold band raw values
- Internal IDs (`udid`, `imei`, `bulkId`) shown inline

---

## 14. Final Design Recommendation

### 14.1 Overall UX direction

A focused operational console with a sticky Active Runs surface, a 5-card launchpad, and a three-tab Report unit (Summary / Session / Artifact). Status and asynchrony are first-class. Backend nomenclature is humanized but always recoverable on hover for support workflows.

### 14.2 Best navigation model

A **persistent left rail** with six items (Dashboard, Test Cases, Test Runs, Reports, Devices, Settings). The Test Runs item carries a live count badge of in-flight tests. The Active Runs strip directly beneath the TopBar makes the in-flight world visible from any page.

### 14.3 Recommended report experience

**Tabs at the run level (Live · Summary · Session · Artifact)** with master/detail inside each. Outward-motion design: KPI tile in Summary → row in Session → file in Artifact. A wide-layout toggle for analysts who want all three panes at once at ≥1440 widths.

### 14.4 Recommended visual style

Neutral, technical, dark-by-default with a single restrained electric-blue accent and a tightly scoped semantic palette for status. Inter + JetBrains Mono. 8-pt grid. No gradients, no shadows on chrome, no decorative imagery.

### 14.5 Top 10 design priorities for the new portal team

1. **Active Runs strip everywhere.** This is the single most valuable affordance; build it first and make it bulletproof.
2. **Status chip taxonomy.** Pin the status tokens early — they touch every screen.
3. **Three-tab Report unit.** Lock down Summary / Session / Artifact contracts before any one screen is built deeply.
4. **Configure stepper shell.** One reactive form shell that loads per-test schemas; do not build five bespoke forms.
5. **Polling abstraction.** A single observable contract for run-level + artifact-level updates. Swap to WebSocket later without touching screens.
6. **Status humanization layer.** A pipe and a constant map for enum → label that is the *only* source of truth for human strings.
7. **Device side panel as a shared overlay.** Built once, used from chips everywhere.
8. **Artifact preview drawer.** Built once, used from Session and Artifact.
9. **Threshold-band chart primitive.** One chart component supports all four signal KPIs.
10. **Mobile read-only mode.** Lock down what mobile shows; do not pretend mobile can run tests.

---

> *End of specification. All system behavior cited from `SNAP_REMOTE_FEATURES_COMPLETE_KNOWLEDGE.md` (2026-05-07). Assumptions called out inline with `> ⚠ Assumption:` callouts.*
