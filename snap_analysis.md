# SNAP Qube — Full Product and Implementation Analysis
> Prepared: 2026-05-11  
> Source of truth: SNAP_Qube_Powered_by_Drayvn_AI_Procal_Technologies.pdf  
> Implementation reviewed: /Snap_qube_redesign_2/ (all .jsx, .css, .md files)

---

## Part 1 — Executive Summary

### Critical Finding: Product Scope Mismatch

The current `snap_redesign` implementation and the PDF source of truth describe **two related but fundamentally different products**.

| Dimension | PDF (SNAP Qube) | snap_redesign Implementation |
|---|---|---|
| **Product name** | SNAP Qube powered by Drayvn AI | SNAP Remote Portal |
| **Core purpose** | Drive test RAN intelligence platform | Remote phone test coordination system |
| **Test execution model** | Vehicles driving GPS routes with autonomous Android devices | Lab/external devices executing calls and SMS via RabbitMQ |
| **Test types** | Calling, video, music, SMS/MMS, upload/download, browser — during drive routes | VOIP_MO_MT, MO_SMS, MO_MT_SMS, EXT_MO_MT, VIDEO |
| **Device model** | Autonomous Android APK (Drayvn APK) on field devices | Lab phones + external devices + AWS Connect DIDs |
| **Map role** | First-class: GPS route visualization, RAN overlays, live position tracking | Supporting: KPI sample coloring on a static route |
| **AI** | Drayvn AI IQ Agents (core differentiator) | Not present |
| **Drive Plans** | Core product concept (route + tests + thresholds + devices) | Not present |
| **RBAC** | 6 roles (SYSADM, TEAMADM, SUBADM, PLANNER, TESTER, VIEWER) | Single implicit USER role |
| **Org hierarchy** | Team → Subteam → recursive scope | Not present |
| **Replay** | Full GPS + telemetry + event synchronized replay | Not present |
| **Scoring engine** | Segment-level + application + composite scores | Not present |

The snap_redesign is a polished, coherent redesign of what appears to be an existing SNAP remote testing portal — focused on remote VoIP, SMS, and voice call testing via RabbitMQ and SnapBox. It has its own separate design specification (`SNAP Remote Portal Design Specification.md`).

**The snap_redesign does not implement SNAP Qube as described in the PDF.**

There is partial functional overlap in a small number of areas: the core React portal shell (SQ-013), a device management concept (partial SQ-004), execution monitoring (partial SQ-010 and SQ-015), and post-execution reporting (partial SQ-018). But the underlying product model — Drive Plans, GPS routes, autonomous Android devices, RAN infrastructure, AI analysis, replay, scoring — is entirely absent.

This analysis documents both dimensions: (1) what the snap_redesign does well on its own terms, and (2) what is missing relative to the full SNAP Qube PDF specification.

---

## Part 2 — product.md

> See `product.md` (saved to project root). Full product source-of-truth derived from the PDF. Not reproduced here for space.

---

## Part 3 — Implementation Coverage Audit

### Summary Matrix

| Module / Epic | PDF Status | snap_redesign Status | Severity of Gap |
|---|---|---|---|
| SQ-001: Product Foundation / Architecture | Required | Not implemented | — (backend concern) |
| SQ-002: Team/Subteam Hierarchy | MVP | **Not implemented** | Critical |
| SQ-003: Identity / Auth / RBAC | MVP | **Not implemented** | Critical |
| SQ-004: Device Registry (Drayvn APK) | MVP | Partially — different model | High |
| SQ-005: Controller Command Plane | Release 2 | **Not implemented** | High |
| SQ-006: APK OTA / Log Retrieval | Release 1 | **Not implemented** | High |
| SQ-007: Drive Plan Authoring | MVP | **Not implemented** | Critical |
| SQ-008: RAN Infrastructure Map | MVP | **Not implemented** | Critical |
| SQ-009: Test Profile Catalog | Release 1 | Partially — different model | High |
| SQ-010: Live Execution Orchestration | MVP | Partially — different model | High |
| SQ-011: Real-Time Telemetry Ingestion | Release 2 | Not implemented (mock data) | High |
| SQ-012: Real-Time Streaming to Portal | Release 2 | Not implemented (mock data) | High |
| SQ-013: React Qube Portal Foundation | Release 0 | **Mostly implemented** | Low |
| SQ-014: Planner Experience / Drive Plan Canvas | Release 1 | **Not implemented** | Critical |
| SQ-015: Tester Live Execution Experience | MVP | Partially — different model | High |
| SQ-016: RAN/App Scoring Engine | Release 3 | **Not implemented** | High |
| SQ-017: Drayvn AI IQ Layer | Release 3 | **Not implemented** | Critical |
| SQ-018: Post-Execution Reporting | Release 3 | Partially implemented | Medium |
| SQ-019: Drive Plan Replay | Release 3 | **Not implemented** | High |
| SQ-020: Alerts and Notifications | Release 2 | Partially | Medium |
| SQ-021–SQ-026: Backend / Ops / Infra | Various | Not in scope (frontend only) | — |

---

### Module-by-Module Audit

---

## [SQ-002] Team, Subteam, and Tenant Hierarchy Management

- **Status: Not Implemented**
- **Evidence in code:** No Team/Subteam model, no organizational selector, no hierarchy-scoped filtering. The user pill in the sidebar shows `lab-east-1 · USER` as a hardcoded string.
- **What matches product.md:** Nothing from this epic is present.
- **What is missing:** The entire organizational hierarchy model — Team creation, Subteam nesting, hierarchy-aware API filtering, all assignment workflows, audit events.
- **What is ambiguous:** It is unclear whether "lab-east-1" in the sidebar is a placeholder for a Subteam or a lab location concept from the legacy portal.
- **Severity: Critical** — Every other module depends on Team/Subteam scope. Without it, RBAC, device assignment, Drive Plans, and reporting are all unscoped.
- **Recommendation:** Define the Team/Subteam entity model and hierarchy-aware API filter as the first backend contract. Portal shell needs a Team/Subteam context selector in the top bar.

---

## [SQ-003] Identity, Authentication, Authorization, RBAC

- **Status: Not Implemented**
- **Evidence in code:** No auth layer is present. A single implicit role ("USER") is referenced in the sidebar pill. No route guards, no field-level permissions, no role-specific landing pages. The `Settings` page shows DFIT thresholds globally — no scoping.
- **What matches product.md:** Nothing from this epic.
- **What is missing:** Role model (SYSADM/TEAMADM/SUBADM/PLANNER/TESTER/VIEWER), authentication integration, scoped authorization middleware, portal route guards, field-level UI permissions, role assignment workflows, impersonation-safe audit, session timeout/refresh.
- **Severity: Critical** — Without RBAC, the portal cannot be used in a multi-tenant, multi-role environment. PLANNER must not see TESTER pages and vice versa.
- **Recommendation:** Implement role model and route guards in Release 0. Design system must reserve design tokens for role-specific accent/branding (e.g., PLANNER views have planning-oriented landing).

---

## [SQ-004] Autonomous Android Device Registry

- **Status: Partially Implemented — Different Model**
- **Evidence in code:** `DevicesPage` (`pages-2.jsx`) shows a 3-tab device list (Lab Devices, External, VoIP Numbers) with device name, OEM, OS, phone number, serial, UDID, role, and online state. Mock data in `app.jsx` (DEVICES object) models basic device properties.
- **What matches product.md:** Device concept with state (ONLINE/BUSY), roles (MO/MT/EXTERNAL_MO/VOIP_MT), basic identification fields (serial, UDID, OEM, OS).
- **What is missing:**
  - Drayvn APK version tracking (the implementation has no APK awareness)
  - Device registration/approval workflow (no pending → approved → rejected flow)
  - Heartbeat tracking (no last-seen, battery, GPS state, command readiness)
  - Device quarantine capability
  - Device assignment to Team/Subteam
  - Capability model (which tests each device supports)
  - Duplicate registration handling
  - Device audit trail
  - Device context panel / slide-over (chips are static, not clickable)
- **What is ambiguous:** The implementation uses "Lab" vs "External" device distinctions. The PDF uses Drayvn APK-running autonomous devices, which is conceptually different from the lab/external model. These may be different products, not just implementation gaps.
- **Severity: High** — The device model is present in skeleton form but misses the autonomous device management lifecycle entirely.
- **Recommendation:** The current device list table is a good UI foundation. Add APK version column, heartbeat status, approval workflow modal, and device detail slide-over.

---

## [SQ-005] Autonomous Android Controller Command Plane

- **Status: Not Implemented**
- **Evidence in code:** Not present. The `configure.jsx` references RabbitMQ as a transport mechanism for remote tests, but this is the legacy SnapBox/RabbitMQ command system, not the Drayvn Autonomous Android Controller.
- **What is missing:** The entire controller service concept — command queuing, acknowledgment, timeout handling, retry policy, command cancellation, controller health dashboard, device command history.
- **Severity: High** — Controller is the operational nerve center for field execution.
- **Recommendation:** Controller health/status should become a dashboard panel in Release 2. A "Controller" admin section should surface command queues, latency, and device connection counts for SYSADM.

---

## [SQ-006] APK Lifecycle, OTA Updates, and Device Log Retrieval

- **Status: Not Implemented**
- **Evidence in code:** Not present. No APK catalog, no OTA command interface, no rollout tracking, no log retrieval UI.
- **Severity: High**
- **Recommendation:** APK management becomes critical in Release 1 when real devices are connected. Build as a sub-section of the Devices module accessible only to SYSADM/TEAMADM.

---

## [SQ-007] Drive Plan Authoring and CRUD

- **Status: Not Implemented — Critical Gap**
- **Evidence in code:** Not present. The closest analogy is the `Configure` wizard (`configure.jsx`), which configures individual test runs (VoIP, SMS, etc.). This is fundamentally different from Drive Plan authoring.
- **What is missing:** The entire Drive Plan concept:
  - Drive Plan as a named, versioned entity (separate from a test run)
  - Route drawing on map canvas
  - Area of concentration tools (polygon, corridor, radius)
  - RAN asset selection/binding to plan
  - Test profile selection and sequencing
  - Device eligibility and reservation
  - KPI threshold definition
  - Plan validation (missing route, no devices, unavailable profiles, invalid thresholds)
  - Plan versioning (Draft → Review → Published → immutable)
  - Plan cloning, archiving, exporting
  - Plan comparison view
  - Plan readiness score
  - AI-assisted plan review (Drayvn AI)
  - Drive Plan list view with filter/search/sort/clone
- **Severity: Critical** — Drive Plans are the core product concept. Everything else in the product (live execution, replay, reporting, scoring) is downstream of a published Drive Plan.
- **Recommendation:** This is Release 1's anchor deliverable. Build the Plan list view and Plan editor canvas (SQ-014) together. The canvas is the most complex UI component in the product.

---

## [SQ-008] RAN Infrastructure Inventory and Map Layers

- **Status: Not Implemented — Critical Gap**
- **Evidence in code:** Not present in the main portal. The `designs/drive_route_suggestion/` folder contains a separate route suggestion tool with a map, but this is a standalone design artifact, not integrated into the portal.
- **What is missing:**
  - RAN asset data import (CSV/GeoJSON/API)
  - Antenna/site/sector/cell visualization on map
  - Technology/band/carrier/PCI/TAC attribute display
  - Infrastructure filtering (LTE/NR/band/carrier/site/PCI/status)
  - Nearest-asset correlation
  - Serving-cell and neighbor-cell correlation
  - RAN asset association to Drive Plans
  - Geospatial indexing
- **Severity: Critical** — The RAN map overlay is the core visual differentiator of SNAP Qube. Without it, the product cannot fulfill its RAN intelligence workbench mission.
- **Recommendation:** Use Leaflet (already in the codebase) with PostGIS backend for antenna rendering. Design a filter panel that controls which asset categories and technology layers are visible. Build in Release 1.

---

## [SQ-009] Test Profile and Application Workload Catalog

- **Status: Partially Implemented — Different Model**
- **Evidence in code:** The `Catalog` page (`pages-1.jsx`) shows 5 test type cards (VOIP_MO_MT, MO_SMS, MO_MT_SMS, EXT_MO_MT, VIDEO). The `Configure` wizard has test-type-specific parameter definitions in `CFG_TEST_TYPES`. This is a functional test type catalog — but it is hardcoded, not managed as versioned Test Profiles.
- **What matches product.md:** The concept of distinct test types with device requirements, duration, and artifacts is aligned. Voice call and SMS test types exist in both products.
- **What is missing:**
  - Reusable, versioned Test Profile entity (separate from test run configuration)
  - Video playback, music playback, browser responsiveness, and upload/download profiles (only voice/SMS exist)
  - Pass/fail threshold configuration in profiles
  - Test profile simulator (validate without live execution)
  - Profile permissions (who can create/modify shared profiles)
  - Profile versioning (immutable published profiles)
  - Sequential, cyclical, or conditional execution sequencing within a Drive Plan
- **Severity: High** — The current test type catalog is good foundation but needs to become a first-class managed entity with versioning.
- **Recommendation:** Evolve the current hardcoded `CFG_TEST_TYPES` into a persistent Test Profile catalog backed by the service layer. Add additional profile types for video/music/browser/throughput in Release 2.

---

## [SQ-010] Live Drive Execution Orchestration

- **Status: Partially Implemented — Different Model**
- **Evidence in code:** The `RunDetail` → `RunLive` view (`run-detail.jsx`) shows:
  - Iteration progress dots (`IterDots`)
  - Action timeline with current step and status
  - Device role cards with live call state (DIALING, RINGING, CONNECTED)
  - Live event log (simulated RabbitMQ events, polling every 2.2s with `setInterval`)
  - Live KPI strip (RSRP, RSRQ, SINR, VVQ) for DFIT destination
- **What matches product.md:** The live monitoring concept is well-designed — iteration progress, action timeline with humanized labels, device role cards, live event log, KPI strip. These directly map to SQ-015 Tester Live Execution Experience requirements.
- **What is missing:**
  - GPS position on route map during live execution (map is not present in live view)
  - Route progress indicator (% complete, next segment, route deviation)
  - Route deviation detection
  - Live scoring overlay (route segments colored by quality)
  - Anomaly feed (events from AI detection)
  - Field technician note capture
  - Multi-device execution coordination
  - Execution readiness check workflow (pre-execution validation)
  - Pause/resume controls (only cancel exists)
  - Post-stop transition to summary generation state
  - All data is mock (setInterval simulation, not real WebSocket/SSE)
- **Severity: High** — The live execution UI pattern is strong but lacks the GPS/map component entirely and operates on mock data.
- **Recommendation:** Add the live GPS map as the left-column anchor of the live execution view (replace or augment the current KPI card). Wire to real streaming API in Release 2.

---

## [SQ-011] Real-Time Telemetry Ingestion

- **Status: Not Implemented (Frontend Layer)**
- **Evidence in code:** All telemetry data in the implementation is mock. The `RUNS` array in `app.jsx` is static. The live event log uses `setInterval` to simulate events with random KPI values. No WebSocket, SSE, or polling to a real backend exists.
- **Severity: High** — This is a backend epic primarily, but the portal's live features are entirely simulated. The simulation is excellent for prototyping but blocks any real testing.
- **Recommendation:** Design a streaming abstraction layer (WebSocket/SSE consumer) that the UI subscribes to. Build it so mock data can swap to real data without UI changes.

---

## [SQ-012] Real-Time Streaming to the Qube Portal

- **Status: Not Implemented (Frontend Layer)**
- **Evidence in code:** Same as SQ-011. No real streaming exists.
- **Severity: High**
- **Recommendation:** Stream health indicator (live/delayed/reconnecting/stale) referenced in the PDF is also missing from the UI. Add it to the TopBar and to the live execution view header.

---

## [SQ-013] React Qube Portal Foundation

- **Status: Mostly Implemented**
- **Evidence in code:**
  - `shell.jsx`: Sidebar nav, TopBar, ActiveRunsStrip, base primitive components (Btn, Card, KpiTile, IterDots, ActionTimeline, Empty, StatusChip, Tag, Icon)
  - `styles.css`: Full design token system (light/dark themes, status palette, typography scale, spacing, shadows, radii)
  - `app.jsx`: Icon system (Lucide-style, 40+ icons), StatusChip system covering all run states (IDLE, SCHEDULED, PROGRESS, EXECUTING, FINALIZING, COMPLETED, PASS, FAILED, CANCELED, CANCELLING)
  - Light/dark theme toggle (functional)
  - ActiveRunsStrip (functional, shows live/finalizing runs)
  - Breadcrumb navigation in TopBar
  - Global search pill (UI only, no function)
  - Notification bell (UI only)
- **What matches product.md:**
  - Status chip system is excellent — 10 distinct states correctly implemented
  - Purple accent color as specified by PDF
  - Persistent sidebar navigation
  - ActiveRunsStrip pattern is correctly implemented
  - Design token architecture is strong
- **What is missing:**
  - Role-specific home pages (single landing view for all users)
  - Canvas-oriented interaction (no concurrent canvas objects, no docking/resizing/minimizing of panels)
  - Workspace state persistence across navigation (state is lost on route change)
  - Team/Subteam context selector in TopBar
  - Global search functionality (UI only)
  - Notification center (bell exists, no content)
  - Accessibility: no keyboard shortcuts, no `aria-*` attributes observed in components, focus states not verified
  - Responsive breakpoints (not implemented — single layout)
- **Severity: Low** — The shell foundation is genuinely strong. The gaps are real but addressable incrementally.
- **Recommendation:** Implement workspace state persistence via React Context or a lightweight state store. Add Team/Subteam selector to TopBar. Defer canvas-oriented interaction to later releases.

---

## [SQ-014] Planner Experience and Drive Plan Canvas

- **Status: Not Implemented — Critical Gap**
- **Evidence in code:** The `Configure` wizard is the closest analog but is for test run configuration, not Drive Plan authoring. The `design-canvas.jsx` is a Figma-like design tooling wrapper for internal design workflow — not a portal feature.
- **Severity: Critical**
- **Recommendation:** This is the highest-complexity UI component. Plan the canvas as a persistent workspace with: left panel (plan metadata), center (map canvas with route/area drawing tools), right panel (test profiles + device selection + thresholds). Use Leaflet.Draw for route drawing. Build as its own feature module.

---

## [SQ-015] Tester Live Execution Experience

- **Status: Partially Implemented — Strong Foundation, Wrong Domain**
- **Evidence in code:** `RunLive` in `run-detail.jsx` is well-implemented:
  - 7-column left / 5-column right split layout
  - Iteration progress dots
  - Action timeline with status-coded nodes (PASS/PROGRESS/IDLE/FAILED)
  - Device role cards (EXTERNAL_MO, VOIP_MT, MT) with live call state
  - Live event log with simulated tail (timestamps, event type tags, monospace messages)
  - DFIT-conditional KPI strip
- **What matches product.md:** Pattern of iteration progress + action timeline + device cards + event log is directly aligned with SQ-015 requirements for a Tester live view.
- **What is missing:**
  - Real-time map with GPS position (the most important missing element)
  - Route progress indicator
  - Route deviation detection and alert
  - Live scoring overlay
  - Anomaly feed as a dedicated panel
  - Field technician note capture
  - Pause/resume controls
  - Real data (all simulated)
- **Severity: High**
- **Recommendation:** Add map panel to live view (Leaflet instance reuse from `map-new.jsx`). Wire device position as animated marker on route polyline. Route deviation flag as colored segment highlight.

---

## [SQ-016] RAN and Application Scoring Engine

- **Status: Not Implemented**
- **Evidence in code:** The `RunReport` component (`report-new.jsx`) shows KPI metrics (pass rate, avg setup, avg call, RSRP, SINR, throughput) and a KPI badge system (GOOD/MOD/BAD), but these are calculated client-side from mock iteration data. There is no backend scoring engine, no segment-level scoring, no composite score, and no scoring explainability.
- **What is present:** KPI threshold coloring (good/moderate/bad bands) for RSRP/SINR/throughput in charts. This is UI-level threshold display, not a scoring engine.
- **Severity: High**
- **Recommendation:** Define the scoring model as a backend service first. Portal should receive pre-computed scores and render them — not compute them client-side.

---

## [SQ-017] Drayvn AI IQ Layer and Agentic Analysis

- **Status: Not Implemented — Critical Gap**
- **Evidence in code:** Not present. The `Headline` component in `RunReport` renders a hardcoded analysis sentence: *"One outlier on iteration 6 — MO_DIALING_MT exceeded 15 000 ms timeout. All other iterations completed within nominal bounds..."* This is entirely static mock text, not AI-generated.
- **What is missing:** The entire Drayvn AI system:
  - No AI agent architecture
  - No evidence binding
  - No confidence/uncertainty scores
  - No AI trace viewer
  - No AI regeneration workflow
  - No AI feedback loop (user rating)
  - No evidence-docked AI panel pattern
- **Severity: Critical** — AI is the core product differentiator ("it's not just a drive-test portal, it's an AI-assisted RAN intelligence workbench"). Without it, SNAP Qube is indistinguishable from any KPI visualization tool.
- **Recommendation:** AI panel should be a first-class UI component — not a section within Report, but a dockable panel that surfaces beside the evidence it references. Design this interaction pattern before implementing the backend. Use LangGraph as recommended in the PDF.

---

## [SQ-018] Post-Execution Reporting

- **Status: Partially Implemented — Good Structure, Wrong Data Model**
- **Evidence in code:** `RunReport` (`report-new.jsx`) and `RunDetail` (`run-detail.jsx`) provide:
  - Report context header with tabs (Summary, Session, Artifacts, KPI Analysis)
  - Meta strip (status, executed at, execution time, device details)
  - Headline card (pass/fail outcome with description)
  - KPI row with sparklines and GOOD/MOD/BAD badges
  - Device card and RAT distribution card
  - Error analysis with bar chart
  - Map with route and KPI-colored sample dots (Leaflet)
  - Iteration matrix (dense table with full metrics)
  - KPI deep-dive charts (RSRP/RSRQ/SINR, throughput, jitter/packet loss)
  - Call setup waterfall
  - End-state donut chart
  - Session tab with iteration details, action timeline, device state, evidence links
  - Artifact tab with grouped file listing, bulk selection, inline preview (video stub, log viewer, CSV preview)
- **What matches product.md:** The Summary → Session → Artifact 3-tab report structure maps directly to the PDF's post-execution reporting requirements. KPI charts with threshold bands, iteration matrix, device details, and artifact download all align.
- **What is missing:**
  - AI summary section (hardcoded text, not Drayvn AI output)
  - Route heatmap (quality score by segment — map shows KPI dots but not quality-scored segments)
  - Application test summary sections for video/music/browser/upload-download (only voice call metrics present)
  - Anomaly table (referenced in PDF, not present — errors card is different)
  - Device data quality section (GPS gaps, disconnects, stale data, APK issues — PDF SQ-018.9)
  - PDF export functionality (button exists but not implemented)
  - CSV/JSON export (button exists, not implemented)
  - Report versioning
  - All data is mock (no backend connection)
- **Severity: Medium** — The reporting UI is the strongest part of the implementation. The structure is right. The content model needs to expand.
- **Recommendation:** Connect to real backend data. Add AI summary section as a prominent panel. Add anomaly table below headline. Add PDF export in Release 3.

---

## [SQ-019] Drive Plan Replay

- **Status: Not Implemented**
- **Evidence in code:** Not present. The `SessionTab` (`session-new.jsx`) has an "Event log" sub-tab and a "Map view" sub-tab that shows the route map — this is a post-execution view of session data, not a time-synchronized replay capability.
- **What is missing:** Replay timeline controls (play/pause/seek/speed/jump), synchronized map position animation, per-timestamp chart updates, note and anomaly markers at correct timestamps, multi-device replay.
- **Severity: High**
- **Recommendation:** Replay should be a dedicated view mode, accessible from the Report Summary page. Build replay timeline as a scrubber component tied to both map position and chart rendering.

---

## [SQ-020] Alerts, Notifications, and Operational Exceptions

- **Status: Partially Implemented — UI Shell Only**
- **Evidence in code:** The TopBar has a bell icon with a `ping` indicator dot (UI only). The `ActiveRunsStrip` shows active runs with their current action — which implicitly communicates status. No alert center, no alert history, no alert acknowledgment workflow, no alert categories, no AI-generated alert recommendations.
- **What matches product.md:** The bell icon and ActiveRunsStrip provide the conceptual scaffolding.
- **What is missing:** Alert taxonomy, notification center (slide-over), alert acknowledgment, AI-generated recommendations, KPI threshold breach alerts, route deviation alerts, device health alerts, telemetry gap alerts, alert audit events.
- **Severity: Medium**
- **Recommendation:** Implement a notification center as a right-side slide-over panel triggered by the bell icon. Start with execution-level and device-health alert categories.

---

## Part 4 — Frontend / Design Audit

---

## Overall Design Maturity

The snap_redesign is a **high-quality frontend prototype for a focused remote testing product**. As a prototype for the remote phone testing use case, it is close to production-ready in structure and visual polish. As an implementation of SNAP Qube (the PDF product), it covers roughly 15–20% of the required surface area.

**Design maturity score (vs. remote testing product): 7/10**  
**Design maturity score (vs. SNAP Qube PDF product): 2/10**

---

## Visual System Review

**Strengths:**

- **Design token architecture is excellent.** `styles.css` defines a complete, named CSS variable system for colors (light/dark), typography scale, spacing, radii, and shadows. Both themes are fully defined and switching works.
- **Status chip system is production-grade.** 10 distinct status states with correct semantic colors, animated icons (spin for PROGRESS, pulse for FINALIZING), and consistent sizing (sm/md). This is directly deployable.
- **Color palette is coherent.** The pink/magenta accent (`#ea4c89`) is a deliberate Dribbble-inspired choice that differs from the PDF's recommended purple — but it's applied consistently and creates a distinctive visual identity.
- **Typography.** Plus Jakarta Sans + JetBrains Mono pairing. Mono is used correctly for IDs, enums, paths, and metrics throughout. The size scale (11px–24px) is appropriate for a dense operational console.
- **Shadows.** Five shadow levels defined and used meaningfully (cards, modals, hover states). Not overdone.
- **Icon system.** Custom inline SVG system based on Lucide aesthetic. 40+ icons defined, all named consistently. No external icon library dependency is a reasonable tradeoff for this prototype context.

**Weaknesses:**

- **Accent color mismatch with PDF.** The PDF explicitly states purple as the primary accent. The implementation uses `#ea4c89` (pink/magenta). This is visually attractive but misaligns with client specification. Changing accent from pink to purple requires only a token change — but it signals the implementation was designed independently of the PDF.
- **Dark mode as default.** The implementation defaults to light mode (`:root` = light), but `styles.css` defines a full dark theme. The PDF's design spec recommends dark-by-default for operational monitoring use. The current default is mismatched with the intended user context (long monitoring sessions, terminal-adjacent environments).
- **Sparklines are decorative noise.** `KpiTile` generates sparklines using `Math.abs(Math.sin(i+label.length))` — pure visual randomness with no data relationship. In a production tool, fake sparklines erode trust. Either connect to real data or remove them.
- **Hero section on Dashboard is wrong register.** The landing page hero ("Run real phone tests, remotely.") is marketing copy on an operational console. The design spec itself calls this out as a tension. A logged-in operator does not need to be told what the product does. The hero should be replaced with an operational overview.

---

## Navigation and Layout Review

**Strengths:**

- **Left sidebar is clean and functional.** Six nav items with icons, labels, badge on Test Runs (live count), user pill at bottom. Active state clearly indicated. This is correct.
- **TopBar is well-composed.** Breadcrumb, search pill (⌘K), alert bell with ping dot, theme toggle — all at correct visual weight.
- **ActiveRunsStrip is the standout feature.** Sticky strip below TopBar showing live/finalizing runs with status chip, iteration counter, current action, and inline "view" affordance. This is exactly the right pattern for a monitoring product. It's correctly conditional (only visible when ≥1 live run). This is the most impressive single component in the implementation.
- **Page header pattern is consistent.** Every page: eyebrow label → title → subtitle, with action buttons aligned right. Clean and replicable.
- **Sticky run context header in reports.** The `run-context` header in RunDetail stays sticky above the tab navigation. Correct for a complex report page.

**Weaknesses:**

- **No canvas-oriented interaction.** The PDF requires concurrent canvas objects (maps, charts, panels that can be opened, docked, resized). The implementation is a conventional single-pane page router. This is the largest UX model gap.
- **No workspace state persistence.** Navigating away from Configure and back loses all form state. The PDF explicitly requires persistence of open views, filters, draft edits, and map context.
- **Tab logic in RunDetail is partially correct.** The "Live" tab correctly disappears for completed runs. But the tab list itself (`runs → run detail → tab`) has no URL structure — the tab state is local React state, which means deep linking and refresh don't work.
- **No responsive behavior.** The layout makes no accommodations for smaller screens. On a 1280px laptop the sidebar and content compete for space. No breakpoint handling exists.
- **Reports page in sidebar doesn't route anywhere.** The sidebar has a "Reports" nav item but clicking it navigates to `reports` which has no dedicated implementation — reports are accessed only through the History run list.

---

## Page-by-Page UX Completeness

### Dashboard
- **Assessment: Misaligned for an ops console**
- The current Dashboard is a product landing/onboarding page, not an operations overview. It has: welcome hero with marketing copy, "What is Qube?", "How it works" tour, suggested drive routes, and a CTA strip. This is appropriate for a public-facing or first-run experience, not for a logged-in operator's daily entry point.
- **What the PDF requires for Dashboard:** Active runs panel, 24h KPI tiles, device readiness ratios, recent completed runs table, quick start launchpad. The dashboard is meant to answer "what's happening right now?" not "what is this product?"
- **Missing:** Active runs panel (the strip exists but there's no dedicated ops card on the page), 24h KPI tiles with real aggregates, device readiness counts, recent runs table.
- **The SuggestedRoutesLanding component on dashboard is confusing.** Suggesting "drive test routes" on the dashboard of what appears to be a remote phone testing product creates category confusion.

### Test Cases (Catalog)
- **Assessment: Strong**
- Five cards, each with icon, type label, backend enum in mono, description, device requirements, duration estimate, artifact types. "Configure" CTA on each. This is clean, correct, and complete for the remote testing product scope.
- **Minor gap:** Cards do not show disabled state (the design spec says a card should disable with reason if capability is unavailable).

### Configure Wizard
- **Assessment: Strongest page in the implementation**
- The 4-step wizard (Devices → Parameters → Artifacts → Review) is well-designed:
  - Type selector tabs at top (5 test types with icons)
  - Phone bezel device slots are distinctive and communicative
  - Device picker modal is clean
  - Sticky 3-column layout (stepper rail + step body + summary sidebar) works well
  - Artifact matrix (per-device × per-artifact-type) is a strong pattern for multi-device tests
  - Review step summarizes everything before submission
  - Action timeline preview in summary sidebar is excellent
  - "What happens when I press Start?" disclosure is a nice UX touch
- **Gaps:**
  - No validation state on steps (Continue button disables correctly when no device, but no inline error messages)
  - "Save" and "Schedule" buttons do nothing (UI only)
  - No readiness check concept (PDF SQ-010.2)
  - Bulk size input is present but its meaning is unexplained to the user

### Test Runs / History
- **Assessment: Solid foundation**
- Dense table with filter bar (type, status, date, device, name search, saved views). Status chips, pass ratio, duration, iteration counter. Row click opens run detail. Export CSV and New Run buttons at top.
- **Gaps:**
  - Saved views filter is UI-only (non-functional)
  - Date range filter is a hardcoded "Last 14 days" dropdown with no calendar picker
  - No row hover actions (re-run, duplicate, download, delete)
  - No empty state (empty table with no runs shows a blank table body)
  - No bulk action mode

### Run Detail — Live Tab
- **Assessment: Good pattern, missing map**
- Iteration dots, action timeline, device role cards, live event log, optional KPI strip — all well-implemented. The `setInterval` simulation creates a convincing live feel.
- **The critical gap is the missing GPS/route map.** For SNAP Qube, the map IS the live view. Everything else is contextual to where the device is on the route.

### Run Report — Summary
- **Assessment: Strong structure, excellent charts**
- The redesigned `RunReport` (`report-new.jsx`) is the best-designed page in the project. Headline card, KPI row with sparklines and threshold badges, split layout with device card + RAT distribution + error analysis on left and route map on right, iteration matrix, deep-dive charts (RSRP/RSRQ, throughput, jitter/loss), call setup waterfall, end-state donut.
- **The chart quality is genuinely good.** Inline SVG with threshold bands, multi-series support, synchronized legends, and coloring by KPI values.
- **Gaps:**
  - AI summary section is a hardcoded string — not a designed component
  - No anomaly table
  - No route heatmap (quality scored segments)
  - PDF/CSV export buttons are UI-only

### Session Tab
- **Assessment: Good depth**
- The `SessionTab` (`session-new.jsx`) with 4 sub-tabs (Iterations, KPIs, Map view, Event log) adds meaningful analytical depth. The KPI sub-tab with multi-device, multi-iteration overlay and threshold lines is impressive. The event log accordion with layer/status classification is a strong debugging tool.
- **Gaps:**
  - MultiChip filter controls are non-functional (they're wired in the component but the filter logic has partial bugs — `ratF` filter in `SessIterations` compares against derived values, not actual data fields)
  - The iteration sub-tab shows static alert/warning counts (16+i*5, 52+i*7) — obviously fake

### Artifact Tab
- **Assessment: Well-designed**
- Grouped by device, collapsible sections, per-file status chips, multi-select with bulk action bar, inline preview panel (video stub, log viewer, CSV table viewer), filter bar at top, bulk ZIP download CTA. This is feature-complete as a design and partially functional (expand/collapse, select/deselect work).
- **Gaps:**
  - Video preview is a styled stub (no actual video player)
  - Download actions are UI-only
  - Filter dropdowns are UI-only

### Devices Page
- **Assessment: Adequate skeleton**
- Three tabs (Lab, External, VoIP), basic data table with state indicator, OEM/OS, phone number, serial, UDID, role. Clean but thin.
- **Gaps:** No device detail view, no registration/approval workflow, no heartbeat status, no APK version column, no device assignment actions, no filter bar.

### Settings Page
- **Assessment: Placeholder**
- Two cards: DFIT thresholds table (static values) and an "Advanced mode" toggle. This is a placeholder that conveys what settings might exist but implements nothing.

---

## Component Consistency

**Strong consistency across the implementation:**
- `Card`, `Btn`, `Tag`, `StatusChip`, `KpiTile`, `IterDots`, `ActionTimeline`, `Empty` — all used consistently across pages
- Button hierarchy (`kind="primary"` vs default secondary) is used correctly
- Monospace vs. sans-serif distinction is applied correctly throughout (IDs, enums, metrics → mono; labels, descriptions → sans)
- Status chip colors are semantically consistent (never used decoratively)

**Inconsistencies:**
- `RunDetail` (`run-detail.jsx`) has its own `Row` component and `step-grid` pattern that doesn't use `Card` — slight divergence from the main card pattern
- `session-new.jsx` defines `MultiChip` as a local component — should be in the shared component layer
- `report-new.jsx` redefines `Kpi` as a local component separate from the shell's `KpiTile` — two slightly different KPI tile implementations exist
- `configure.jsx` defines its own icon components (`IcPhone`, `IcSms`, `IcVideo`, `IcCheck`, `IcPlus`, `IcInfo`, `IcClose`) that duplicate the global `Icon` system — this creates maintenance risk

---

## Data-Dense UI Review

**Strong:**
- Iteration matrix in RunReport is the best data table in the project — correct density, clickable rows, status chips, metric columns, artifact tags in final column
- History table handles 9 columns cleanly with appropriate mono treatment for IDs and metrics
- Session event log (event-new sub-tab) with timestamp/layer/event/status/detail is a correct data table for diagnostic data

**Needs improvement:**
- No column sorting on any table — significant gap for analyst workflows
- No pagination on History table (7 mock rows don't expose this problem, but it will matter at scale)
- No compact/cozy density toggle on tables (the design spec specifies this requirement)
- The KPI analysis tab uses hardcoded Y-axis ranges that may clip data at real-world values

---

## States and Feedback

**What is present:**
- Status chips for all run states (IDLE through CANCELED) — correct and complete
- `Empty` component with title/subtitle/CTA — exists but is underused (most pages show blank space on empty data rather than the Empty component)
- `ActiveRunsStrip` correctly hides when no live runs
- Device state dot (online/offline) in Configure device picker

**What is missing:**
- **Loading states / skeletons:** No skeleton components exist. The implementation assumes data is always available (mock data approach).
- **Error states:** No error boundary components, no per-card error fallback, no "retry" states.
- **Partial loading:** No per-section loading indicators for a page where some sections load faster than others.
- **Toast notifications:** Bell icon exists but no toast system is implemented.
- **Form validation errors:** Configure wizard has disabled button when no device is selected, but no inline error messages on invalid fields.
- **Unsaved changes warning:** No protection against navigating away from a partially configured test.
- **Empty states:** History table, Devices page, and Settings show no empty state content.

---

## Major UX Risks

1. **No real data connection.** The entire implementation operates on mock data. This is appropriate for a prototype but must be clearly communicated — shipping this to a client as "the portal" without real API integration would create serious trust issues.

2. **Dashboard is product marketing, not ops.** The welcome hero, "How it works" tour, and "Suggested drive-test routes" section on the dashboard will confuse daily users who already know what the product does. This needs to be replaced with an operational view.

3. **The map is underutilized.** A Leaflet map exists in the codebase and is used in reports for KPI visualization. But for SNAP Qube, the map should be the primary interaction surface (live execution, route planning, RAN overlays). Using it only as a report widget undersells its importance.

4. **No RBAC awareness.** The Configure page gives all users access to start tests, set parameters, and manage devices. In the real product, only TESTER starts tests, only PLANNER creates Drive Plans, and only SYSADM manages devices. Without role guards, any user can do anything.

5. **All session state is ephemeral.** Form state, tab selections, filter state, and open panels all reset on navigation. This will frustrate operators who need to reference the report while configuring a new test.

6. **The AI section is a lie.** The headline analysis text in RunReport (`"One outlier on iteration 6 — MO_DIALING_MT exceeded 15 000 ms timeout..."`) looks like AI output but is a hardcoded string. If a client sees this in a demo, they will believe the AI is working. When it isn't, trust is destroyed. Label it clearly as "placeholder" or remove it entirely.

---

## High-Impact Design Improvements

1. **Replace Dashboard hero with operational overview.** Remove marketing copy. Add: active executions panel, 24h KPI tiles, device health ratios, recent completed runs table. Keep the quick-start launchpad at the bottom as a secondary affordance.

2. **Add GPS map to live execution view.** The live view's most important missing element. A Leaflet map showing the route polyline with a moving device position marker, colored by current RSRP, would transform the live view from "monitoring" to "situational awareness."

3. **Implement route heatmap on report map.** The current map shows individual KPI sample dots. For SNAP Qube, segments should be colored by quality score (a thick, colored polyline). This is the canonical drive test visualization that clients expect.

4. **Design the Drive Plan canvas.** This is the highest-value missing screen. Even a wireframe-level design would clarify the product's core workflow. The canvas needs: a persistent map with drawing tools on top, a right panel for test configuration, and a bottom bar for plan validation status.

5. **Design the AI evidence panel.** The PDF's most distinctive UX requirement is "evidence-docked AI" — findings appear beside the evidence they reference. Design this as a slide-over or docked panel that can be attached to a map anomaly marker, a chart outlier, or a session step. This is the visual manifestation of SNAP Qube's core differentiator.

6. **Consolidate duplicate component implementations.** Unify the two `Kpi` tile variants, the two icon systems, and the local vs. shared component splits. This should happen before the component surface area grows larger.

7. **Add skeleton loading states.** Build one `Skeleton` primitive and use it as the loading state for every card, table, and chart. This is table stakes for a professional product.

8. **Fix accent color.** Change `--accent` from `#ea4c89` (pink) to `#7C3AED` or equivalent purple per PDF specification. This is a one-token change but has product-identity implications.

---

## Part 5 — Prioritized Remaining Work

### Priority 1 — Critical (Blocks SNAP Qube MVP)

| Item | Effort | Rationale |
|---|---|---|
| Define Drive Plan entity and authoring canvas (SQ-007, SQ-014) | Very High | Core product concept. Nothing else makes sense without it. |
| Implement RBAC and role-specific landing pages (SQ-003) | High | Every feature has role-specific behavior. Must be done before feature work. |
| Implement Team/Subteam hierarchy model and context selector (SQ-002) | High | All data scoping depends on this. |
| RAN infrastructure map overlay (SQ-008) | High | Core visual differentiator. Cannot claim "RAN intelligence workbench" without it. |
| Design Drayvn AI evidence panel pattern (SQ-017) | Medium | Design must precede implementation. Most impactful product differentiator. |

### Priority 2 — High (Required for Release 2 / Live Execution)

| Item | Effort | Rationale |
|---|---|---|
| GPS map in live execution view (SQ-015) | High | Map-first execution is a stated UX principle in the PDF. |
| Real streaming connection (WebSocket/SSE) for live view (SQ-012) | High | All live data is simulated. |
| Execution readiness check (SQ-010.2) | Medium | Pre-execution validation is a safety requirement. |
| Route progress indicator and deviation detection (SQ-010.6) | Medium | Core tester visibility requirement. |
| Route heatmap (quality-scored segments) on report map (SQ-018) | Medium | Standard drive-test visualization. |
| Replace Dashboard hero with operational overview | Low | Currently misleading for daily users. |

### Priority 3 — Medium (Required for Release 3 / Reporting + AI)

| Item | Effort | Rationale |
|---|---|---|
| AI summary section with evidence binding (SQ-017) | High | Core differentiator. |
| Drive Plan Replay (SQ-019) | High | Explicitly listed as MVP capability. |
| Anomaly table in reports (SQ-018) | Medium | Required by PDF. |
| Scoring engine display (segments + composite score) (SQ-016) | Medium | Required by PDF. |
| PDF/CSV export (SQ-018) | Medium | Buttons exist, no implementation. |
| Notification center (SQ-020) | Medium | Bell icon exists, no content. |

### Priority 4 — Low (Polish and Completeness)

| Item | Effort | Rationale |
|---|---|---|
| Skeleton loading states | Low | Required for production credibility. |
| Column sorting on tables | Low | Expected in a data-dense tool. |
| Row hover actions in History (re-run, download, delete) | Low | Design spec requires this. |
| Empty states on all pages | Low | Currently shows blank space on empty data. |
| Fix accent color (pink → purple) | Trivial | Aligns with client PDF spec. |
| Consolidate duplicate components | Low | Technical debt that grows with scale. |
| URL-based tab state in RunDetail | Low | Deep linking and refresh don't work. |
| Dark mode as default | Trivial | PDF spec recommends dark-by-default for ops context. |
| Responsive breakpoints | Medium | Not implemented at any breakpoint. |

---

## Part 6 — Recommended Next Steps

### Immediate (before next design/dev sprint)

1. **Hold a product alignment meeting.** The snap_redesign and the PDF describe different products. This must be explicitly acknowledged. Decide: is the snap_redesign a redesign of the legacy SNAP Remote Portal (separate from SNAP Qube), or is it meant to be the first phase of SNAP Qube? This decision changes the entire roadmap.

2. **Fix the AI placeholder text.** The hardcoded analysis sentence in RunReport looks like real AI output. Remove it or clearly label it as placeholder before showing to clients.

3. **Fix the accent color.** One CSS token change. Do it now so all future work is on the correct visual identity.

4. **Replace the Dashboard hero.** Remove "Run real phone tests, remotely" marketing copy. Build the operational view (active runs card, KPI tiles, device health, recent runs table). The current dashboard will confuse operational users.

### Short Term (next 2–4 weeks)

5. **Design the Drive Plan entity and canvas.** Even wireframe-level. This unblocks all of Release 1. The canvas is complex enough that the design must precede engineering by a full sprint.

6. **Design the AI evidence panel.** Define: how does an AI finding appear beside a map anomaly? Beside a chart outlier? Beside a session step? This UX pattern is the product's most distinctive feature and must be locked before AI engineering begins.

7. **Implement RBAC skeleton.** Add role-aware route guards and a role context to the portal shell. Even if the backend auth is not wired, the UI layer should be prepared to receive role information and hide/show features accordingly.

8. **Wire the Live view to a real streaming endpoint.** Replace `setInterval` simulation with a WebSocket/SSE consumer. Build the streaming abstraction layer so mock data and real data are swappable without UI changes.

### Medium Term (Release 1 / 2 preparation)

9. **Build the RAN infrastructure map overlay.** Import antenna/sector data and render it as Leaflet markers with attribute popups. Add a filter panel (LTE/NR/band/carrier/site). This is the visual proof that SNAP Qube is a RAN intelligence tool.

10. **Add GPS map to live execution view.** Animate a device position marker along the planned route polyline. Color the recent track by RSRP. This single addition transforms the live view's communicative power.

11. **Build the Device Registry to SNAP Qube spec.** Add APK version tracking, heartbeat status, approval workflow, and device assignment. The current device table is a good starting skeleton — extend it rather than replace it.

12. **Consolidate components.** Unify duplicate icon/KPI implementations. Move `MultiChip`, `SessionTab`, local icon components into the shared layer. Do this before the component surface grows larger.

---

*End of Analysis*
