# SNAP Qube Product Document
> Source of truth derived from: *SNAP Qube powered by Drayvn AI — Product Narrative and Jira-Oriented Implementation Plan* (Procal Technologies, May 8 2026)
> Labels: **[PDF]** = explicitly stated in source document · **[INFERRED]** = inferred from context

---

## 1. SNAP Product Overview

### What It Is
SNAP Qube powered by Drayvn AI is a **real-time, AI-assisted RAN (Radio Access Network) intelligence workbench** for planning, executing, analyzing, replaying, and reporting application-oriented mobile network drive tests using autonomous Android devices.

It transforms live drive testing from a manually coordinated, fragmented, post-processed engineering activity into a real-time, autonomous, AI-assisted operational workflow. **[PDF]**

### Who It Is For
- Network planners and engineers who need to design and validate coverage
- Field testers and technicians executing drive test campaigns
- Engineering management and operations stakeholders consuming reports
- IT/platform administrators managing devices, users, and permissions

### Core Business Problem It Solves
Traditional mobile network drive testing is slow, manually coordinated, fragmented, and produces post-processed results that lag operational needs. SNAP Qube:
1. Replaces manual device coordination with autonomous Android device control
2. Replaces delayed post-processing with real-time telemetry and live dashboards
3. Replaces opaque test results with AI-explained, evidence-bound analysis
4. Provides a unified workflow from plan construction to final reporting **[PDF]**

### High-Level Product Value
> "SNAP Qube is a real-time, AI-assisted RAN intelligence workbench for planning, executing, analyzing, replaying, and reporting application-oriented mobile network drive tests using autonomous Android devices." **[PDF — Positioning Statement]**

The differentiator over conventional tools: **real-time visibility + post-run AI explanation**, not merely data capture. **[PDF]**

---

## 2. Users and Roles

Six RBAC roles are explicitly defined. **[PDF]**

| Role | Primary Responsibility | Key Access |
|---|---|---|
| **SYSADM** | Full platform administration across all teams, tenants, devices, infrastructure, users, system policy | Everything |
| **TEAMADM** | Administrative control over a Team and its subteam hierarchy | Team-scoped management |
| **SUBADM** | Administrative control over one or more assigned Subteams | Subteam-scoped management |
| **PLANNER** | Creates, modifies, versions, and publishes Drive Plans | Drive Plan authoring tools |
| **TESTER** | Coordinates live drive-plan execution with field technicians and autonomous devices | Live execution dashboard |
| **VIEWER** | Reviews plans, executions, reports, replays, dashboards, and AI summaries | Read-only access |

### Role Scope Matrix (Selected Capabilities) **[PDF]**

| Capability | SYSADM | TEAMADM | SUBADM | PLANNER | TESTER | VIEWER |
|---|---|---|---|---|---|---|
| Manage global platform settings | Yes | No | No | No | No | No |
| Manage Teams | Yes | Limited | No | No | No | No |
| Register devices | Yes | Yes | Yes | No | No | No |
| Create drive plans | Yes | Yes | Scoped | Yes | No | No |
| Publish drive plans | Yes | Yes | Scoped approval | Optional | No | No |
| Execute drive plans | Yes | Yes | Yes | Optional | Yes | No |
| View live execution | Yes | Yes | Yes | Yes | Yes | Yes |
| View reports | Yes | Yes | Yes | Yes | Yes | Yes |
| Generate AI summary | Yes | Yes | Yes | Yes | Yes | View only |
| Export reports | Yes | Yes | Yes | Yes | Yes | Configurable |
| View audit logs | Yes | Team-scoped | Subteam-scoped | No | No | No |

### User Goals by Role

**PLANNER**: Design drive test campaigns. Needs route drawing tools, RAN infrastructure overlays, test profile selection, device assignment, threshold definition, plan versioning, and AI-assisted plan review.

**TESTER**: Execute planned campaigns from the field. Needs a live execution dashboard showing real-time GPS, RAN metrics, device health, test status, scores, alerts. Must be able to start, pause, stop execution and capture field notes.

**VIEWER**: Consume results. Needs clean report summaries, replay capability, AI summaries, and the ability to export/share findings.

**SYSADM / TEAMADM / SUBADM**: Manage the organizational hierarchy, device fleet, user access, and APK versions. Need device inventory views, OTA update management, audit logs, and hierarchy management screens.

---

## 3. Operating Model

### Organizational Hierarchy **[PDF]**

| Concept | Definition |
|---|---|
| Team | A top-level organizational boundary (e.g., a national wireless network organization) |
| Subteam | A region, market, district, engineering group, or nested operational domain under a Team or parent Subteam. Recursive. |
| Scope | Devices, users, drive plans, executions, reports, and visibility are constrained by Team/Subteam hierarchy |
| Controller | The Autonomous Android Controller — accepts device registrations, controls APK updates, pulls APK logs, initiates/terminates drive-plan telemetry, provides real-time streams to the Qube portal |

All data, APIs, and portal views are Team/Subteam-scoped. Every query and action enforces hierarchy-based visibility. **[PDF]**

---

## 4. Product Scope

### Main Modules / Pages

| Module | Primary Actor | Core Purpose |
|---|---|---|
| Drive Plan Authoring Canvas | PLANNER | Create, edit, version, validate, publish, archive, clone Drive Plans |
| RAN Infrastructure Map | PLANNER, TESTER | Visualize and query RAN infrastructure assets (antennas, sites, sectors) on a map |
| Live Execution Dashboard | TESTER | Real-time monitoring of drive execution: GPS, RAN metrics, test status, device health, alerts |
| Device Registry & Management | SYSADM, TEAMADM, SUBADM | Enroll, configure, assign, monitor, and retire Autonomous Android devices |
| APK / OTA Management | SYSADM | Manage APK versions, staged rollouts, rollbacks, and device log retrieval |
| Test Profile Catalog | PLANNER | Define and manage reusable end-user test profiles (calling, video, SMS, browser, upload/download) |
| Post-Execution Reports | All | Detailed execution summaries: metrics, maps, charts, AI findings, recommendations |
| Drive Plan Replay | All | Reconstruct and replay completed drive executions with synchronized map, telemetry, and events |
| AI Analysis (Drayvn AI IQ) | All | Agentic analysis of execution data: anomaly detection, summaries, recommendations |
| Team / Subteam Admin | SYSADM, TEAMADM, SUBADM | Manage the organizational hierarchy, users, roles, visibility scope |
| Alerts & Notifications | TESTER, VIEWER | Real-time alerts for KPI breaches, device failures, route deviation, AI-generated concerns |
| Audit Log | SYSADM, TEAMADM | Traceable record of user, device, controller, and AI actions |

### Major Capabilities (26 Epics) **[PDF]**

| Epic ID | Capability Area |
|---|---|
| SQ-001 | Product Foundation and System Architecture |
| SQ-002 | Team, Subteam, and Tenant Hierarchy Management |
| SQ-003 | Identity, Authentication, Authorization, and RBAC |
| SQ-004 | Autonomous Android Device Registry |
| SQ-005 | Autonomous Android Controller Command Plane |
| SQ-006 | APK Lifecycle, OTA Updates, and Device Log Retrieval |
| SQ-007 | Drive Plan Authoring and CRUD |
| SQ-008 | RAN Infrastructure Inventory and Map Layers |
| SQ-009 | Test Profile and Application Workload Catalog |
| SQ-010 | Live Drive Execution Orchestration |
| SQ-011 | Real-Time Telemetry Ingestion |
| SQ-012 | Real-Time Streaming to the Qube Portal |
| SQ-013 | React Qube Portal Foundation |
| SQ-014 | Planner Experience and Drive Plan Canvas |
| SQ-015 | Tester Live Execution Experience |
| SQ-016 | RAN and Application Scoring Engine |
| SQ-017 | Drayvn AI IQ Layer and Agentic Analysis |
| SQ-018 | Post-Execution Reporting |
| SQ-019 | Drive Plan Replay |
| SQ-020 | Alerts, Notifications, and Operational Exceptions |
| SQ-021 | Backend API Gateway and Service Contracts |
| SQ-022 | Data Governance, Security, and Audit |
| SQ-023 | Observability, Monitoring, and Operations |
| SQ-024 | Automated Testing and Verification |
| SQ-025 | Deployment, CI/CD, and Environment Management |
| SQ-026 | Documentation, Training, and Operational Readiness |

---

## 5. Feature Breakdown

### 5.1 Drive Plan Authoring (SQ-007, SQ-014)

**Purpose:** Allow PLANNER users to create structured drive plans defining where to drive, what to test, which devices to use, what infrastructure to observe, and what success thresholds apply.

**Core Actions:**
- Create, read, update, archive, clone Drive Plans
- Draw or import roadway routes using map tools
- Define areas of concentration (polygon, corridor, radius, or manually selected area)
- Associate RAN infrastructure assets (antennas, sectors, cells, infrastructure groups) with the plan
- Select test profiles (calling, video, SMS/MMS, browser, upload/download) and configure sequences
- Reserve eligible devices for the plan
- Define KPI thresholds for route, test, RAN, and application outcomes
- Validate plan completeness (missing route, no devices, unavailable test profiles, invalid thresholds)
- Submit, validate, and publish drive plan versions (Draft → Review → Published → Executing → Completed → Archived)
- Published plans are immutable; edits create a new version
- Compare plan versions
- Export plans as PDF/JSON for field review
- AI-assisted plan review (Drayvn AI reviews completeness, risk, route gaps, infrastructure coverage)

**Inputs:** Route geometry, area polygons, RAN asset IDs, test profile references, device reservations, KPI thresholds, schedule, notes.

**Outputs:** Published Drive Plan (versioned, immutable), plan readiness score, exported PDF/JSON.

**Important UI States:**
- Draft (editable)
- Under review
- Published (locked, can only be viewed or cloned)
- Executing (in active use)
- Completed / Archived

**Dependencies:** RAN Infrastructure Service, Test Profile Catalog, Device Registry, Route drawing tools (geospatial map).

---

### 5.2 RAN Infrastructure Inventory and Map Layers (SQ-008)

**Purpose:** Provide geospatial visualization and querying of RAN infrastructure assets.

**Core Actions:**
- Import infrastructure data (CSV, GeoJSON, API, approved source format)
- Display antennas, sectors, cells, bands, carriers, PCIs, TACs, azimuth, beamwidth, technology attributes on map
- Filter by LTE, NR, band, carrier, site, PCI, sector, market, or status
- Associate infrastructure assets with Drive Plans
- Correlate telemetry events with nearby RAN infrastructure assets
- Associate metrics with serving and neighboring cells
- Track import source, version, and timestamp

**Data Model:** Site → Antenna → Sector → Cell, with band/carrier/technology/PCI/TAC/azimuth/beamwidth attributes.

---

### 5.3 Autonomous Android Device Registry (SQ-004)

**Purpose:** Register, identify, classify, and manage Autonomous Android devices running the Drayvn Autonomous Android APK.

**Core Actions:**
- Register devices (controller or APK self-registration)
- Approve, reject, suspend, retire, or quarantine devices
- Assign devices to Team/Subteam, optionally tagged by market, lab, field kit, or fleet
- Monitor device heartbeat: online/offline, battery, network, GPS state, APK status, command readiness
- Handle duplicate registration (update existing records)
- Quarantine devices with invalid identity, stale APK, failed integrity, or bad telemetry

**Device Registration Payload:** Device identity, OS version, APK version, radio capability, permissions, hardware profile, SIM/network info, location capability. **[PDF]**

**Device States:** Pending → Approved → Online / Offline / Busy / Suspended / Retired / Quarantined

---

### 5.4 APK Lifecycle and OTA Updates (SQ-006)

**Purpose:** Manage APK versions, device updates, rollbacks, and remote log collection.

**Core Actions:**
- Create and maintain APK version catalog (version, checksum, release notes, compatibility, rollout policy)
- Define APK eligibility rules (required, optional, blocked, deprecated)
- Issue OTA update commands to devices
- Staged rollout (target lab devices, subteams, regions, or percentages)
- Rollback to a prior approved version
- Track update status: pending → downloading → installing → installed → failed → rollback-required
- Remote APK log pull (authorized users)
- Execution-specific log capture (logs associated with execution session and device)
- Log artifact viewer (searchable, filterable, downloadable, referenceable by AI)

---

### 5.5 Autonomous Android Controller Command Plane (SQ-005)

**Purpose:** Build the controller service responsible for commanding, regulating, and supervising Autonomous Android devices.

**Core Actions:**
- Send commands to devices (start, stop, pause, resume, collect logs, update APK, report status)
- Queue and correlate commands to device acknowledgment
- Handle timeouts (timed-out commands marked failed, visible in portal)
- Configure retry policy by command type
- Cancel pending commands
- Monitor controller health: connected devices, command latency, failure rates, stream health
- Start drive-plan telemetry and test execution on selected devices
- Safely terminate drive-plan execution and flush telemetry
- Trace every command to user, drive plan, execution, device, and timestamp

---

### 5.6 Test Profile and Application Workload Catalog (SQ-009)

**Purpose:** Define reusable end-user test profiles for calling, video, music, messaging, upload/download, and browser responsiveness.

**Test Profile Types:**
- **Voice call** — Call setup, call duration, failure detection, drop detection, quality markers
- **SMS** — Send/receive timing, delivery confirmation, failure capture
- **MMS** — Media send/receive validation, latency, failure reason
- **Video playback** — Startup delay, buffering, resolution changes, playback stall, session quality
- **Music playback** — Startup delay, continuity, stall detection, playback status
- **Upload/download** — Throughput, latency, jitter, failure, server endpoint metadata
- **Browser responsiveness** — Page load time, first response, rendering completion, timeout

**Core Actions:**
- Create, version, validate, simulate test profiles
- Execute profiles sequentially, cyclically, or conditionally
- Validate profiles without live execution (simulator)
- Published profiles are immutable and referenced by execution session

---

### 5.7 Live Drive Execution Orchestration (SQ-010, SQ-015)

**Purpose:** Allow TESTER users to coordinate live execution of Drive Plans with field technicians and autonomous devices.

**Execution Flow:** Planner Publishes Drive Plan → Tester Launches Execution → Controller Commands Devices → Devices Stream Telemetry → Portal Visualizes Live Drive → AI + Reporting Finalize Results. **[PDF]**

**Pre-execution Readiness Check:** Verifies devices online, GPS enabled, APK current, permissions valid, battery acceptable, test profiles supported.

**Live Execution Dashboard (TESTER view):**
- Current GPS position on route map
- RAN assets and serving-cell overlays
- Application test status (active calling, media, SMS/MMS, throughput, browser tests)
- Device health (battery, signal, GPS, APK, connection, command status)
- Route progress (% complete, next segment, missed segment, route deviation)
- Live scoring overlay (route segments colored by quality score)
- Anomaly feed (live anomalies as timestamped events)
- Manual note capture (tied to timestamp and map location)
- Execution controls (start, stop, pause, resume, emergency stop — role-protected)

**Execution states:** IDLE → PROGRESS → FINALIZING → COMPLETED / FAILED / CANCELED

**Exception handling:** Device disconnect, GPS loss, command failure, app failure, route deviation — all visible and logged.

**Post-stop transition:** Portal transitions to summary generation state when execution completes.

---

### 5.8 Real-Time Telemetry Ingestion and Streaming (SQ-011, SQ-012)

**Purpose:** Ingest high-frequency RAN metrics, GPS telemetry, application test events, and device state from autonomous devices; stream to portal in real time.

**Telemetry Event Types:**
- GPS (lat/lng/altitude/speed/heading/accuracy)
- RAN metrics (RSRP, RSRQ, SINR, RSSI, PCI, TAC, band, carrier, serving cell, neighbor cells, throughput, latency)
- Application test events (call, SMS, MMS, video, music, browser, upload, download)
- Device state events

**Streaming:** WebSocket/SSE from controller to portal. Portal subscribes per execution within visibility scope. Reconnects without losing current execution context. High-frequency telemetry is downsampled for UI display while preserving raw data.

**Stream health indicator:** Live, delayed, reconnecting, stale, or disconnected state visible in UI. **[PDF]**

---

### 5.9 RAN and Application Scoring Engine (SQ-016)

**Purpose:** Compute meaningful quality scores for RAN performance, route segments, application tests, and execution outcomes.

**Scoring Dimensions:** Coverage, stability, throughput, latency, application behavior, test success, route compliance. **[PDF]**

**Score Levels:**
- Segment-level scoring (route divided into segments with individual scores)
- RAN signal scoring (RSRP, RSRQ, SINR, PCI changes, serving-cell stability, neighbor behavior)
- Throughput scoring (upload/download test outcomes)
- Application scoring (calling, messaging, video, music, browser, each with type-specific factors)
- Composite execution score combining route, RAN, application, and device confidence
- Confidence score (indicates whether data quality is sufficient for analysis)
- Scoring explainability (contributing factors and raw evidence references)

---

### 5.10 Drayvn AI IQ Layer and Agentic Analysis (SQ-017)

**Purpose:** Use Drayvn AI agents to analyze collected data, detect issues, explain outcomes, and generate summaries. **Recommended stack: LangGraph for orchestration, Langfuse for observability.** **[PDF]**

**AI Agents:**
| Agent | Responsibility |
|---|---|
| Execution Summary Agent | Generates plain-language summary of drive execution |
| RAN Anomaly Agent | Identifies likely coverage, handoff, signal, congestion, or interference anomalies |
| Application Experience Agent | Analyzes call, video, music, messaging, browser, and throughput test behavior |
| Route Compliance Agent | Evaluates whether the drive followed the planned route and area |
| Device Health Agent | Identifies whether device state affected data quality |
| Infrastructure Correlation Agent | Correlates issues with nearby RAN infrastructure assets |
| Recommendation Agent | Produces engineering recommendations and next-step actions |

**AI Guardrails [PDF]:**
- Agents MUST: analyze completed executions, explain anomalies, generate summaries, recommend next actions, correlate telemetry to infrastructure, highlight uncertainty, bind conclusions to evidence
- Agents MUST NOT: invent RAN infrastructure facts, modify execution records without workflow, override scoring without traceable policy, produce unsupported root-cause claims

**Evidence binding:** Every AI conclusion links to supporting telemetry, KPI, map segment, or artifact evidence. All outputs include confidence and uncertainty assessments.

**AI workflow:** Completed executions trigger asynchronous AI analysis jobs. Authorized users can inspect analysis stages, tool calls, and source evidence (AI trace viewer). Authorized users can regenerate summary after data correction or threshold change. Users can rate AI findings (useful, incorrect, incomplete, needs review).

---

### 5.11 Post-Execution Reporting (SQ-018)

**Purpose:** Generate detailed execution reports containing metrics, maps, graphs, AI analysis, evidence, and recommendations.

**Report Contents:**
- Executive summary (AI-generated)
- Plan metadata (route, area, devices, tests, thresholds)
- Route heatmap (colored by quality score)
- RAN metric charts (signal, throughput, latency, handoff, application)
- Application test summary (call, SMS/MMS, video, music, browser, upload/download outcomes)
- Anomaly table (timestamp, location, metric, impact, evidence)
- Drayvn AI explanation and recommendations
- Device data quality section (GPS gaps, device disconnects, stale data, APK issues)
- Report exported to PDF / CSV / JSON

**Report lifecycle:** Completed executions automatically trigger report generation. Regenerated reports maintain version history.

**Access:** Browseable by Team/Subteam, plan, execution, date, status, and score.

---

### 5.12 Drive Plan Replay (SQ-019)

**Purpose:** Allow users to replay completed drive plan executions as if watching the live drive again.

**Replay Capabilities:**
- Synchronized GPS, RAN metrics, test events, alerts, notes, and scoring on a timeline
- Replay controls: play, pause, seek, speed control, jump to anomaly, jump to test
- Route GPS position, RAN assets, scores, and telemetry markers render during replay
- Charts update based on replay timestamp
- Field notes appear at correct timestamp and map location
- Multi-device replay (multiple devices in same execution)
- Reports can link directly to replay timestamps

---

### 5.13 Alerts and Notifications (SQ-020)

**Purpose:** Notify users about execution risks, device issues, KPI breaches, and AI-generated concerns.

**Alert Categories:** Device, execution, telemetry, route, RAN, application, system, AI.

**Alert Types:**
- Live execution alerts (visible to TESTER during active execution)
- Device health alerts (low battery, GPS disabled, stale heartbeat, APK mismatch, lost connection)
- KPI threshold alerts (route segment or test threshold breaches)
- Route deviation alerts (GPS path deviates from planned route)
- Telemetry gap alerts (missing or stale data flagged)

**Alert lifecycle:** Unread → Active → Resolved / Acknowledged. Users can acknowledge, resolve, or comment on alerts. AI can suggest likely cause and recommended action. Alert lifecycle is traceable (audit events).

---

## 6. End-to-End User Flows

### Flow 1: Drive Plan Creation and Publishing (PLANNER)

1. PLANNER opens Drive Plan Canvas (SQ-014)
2. Names plan, assigns to Team/Subteam
3. Draws or imports route on map
4. Optionally defines area of concentration (polygon/corridor)
5. Toggles RAN overlay to see infrastructure assets along route
6. Selects test profiles and configures sequence/thresholds
7. Assigns eligible devices to the plan
8. Runs AI-assisted plan review (Drayvn AI checks completeness, gaps, risk)
9. Addresses flagged issues
10. Publishes plan (plan becomes immutable, version locked)
11. Published plan appears in TESTER's execution list

### Flow 2: Live Drive Execution (TESTER)

1. TESTER selects a published Drive Plan from execution launch page
2. System runs readiness check (devices online, GPS, APK, battery, test profiles)
3. TESTER starts execution (controller dispatches commands to devices)
4. Live execution dashboard activates:
   - Map shows real-time vehicle/device GPS position
   - Route progress indicator updates
   - Test status panel shows active tests
   - Device health panel shows battery, signal, APK, connection
   - Anomaly feed shows live alerts
5. TESTER captures field notes as needed
6. TESTER stops execution (or execution completes automatically)
7. System finalizes: locks telemetry, generates replay track, triggers reporting pipeline
8. Portal transitions to summary generation state

### Flow 3: Post-Execution Analysis (VIEWER/TESTER/PLANNER)

1. User opens completed execution report
2. Executive summary with Drayvn AI findings presented first
3. Route heatmap shows quality score by segment
4. RAN metric charts show signal, throughput, latency across execution
5. Application test summary shows call/SMS/video/etc. outcomes
6. Anomaly table with evidence references
7. User opens AI analysis panel for specific anomaly
8. AI finding links to telemetry, KPI, map segment evidence
9. User exports report (PDF/CSV)

### Flow 4: Replay a Completed Execution

1. User selects completed execution
2. Opens replay view
3. Map shows route with GPS trace
4. User presses play — position marker moves along route in sync with timeline
5. Charts update in real time showing metrics at each point
6. Field notes and anomaly markers appear at correct timestamps
7. User can jump to anomaly events or specific test failures
8. User can export replay link anchored to a timestamp

### Flow 5: Device Management (SYSADM/SUBADM)

1. Admin views device inventory (filtered by Team/Subteam, status, APK version)
2. Approves a new device registration from controller
3. Assigns device to Subteam and tags (market, field kit)
4. Pushes OTA APK update to selected devices (staged rollout)
5. Monitors update status (pending → downloading → installed)
6. Quarantines a device with bad telemetry
7. Pulls APK logs from a specific device

---

## 7. Data and Entities

### Core Domain Objects **[PDF]**

| Entity | Key Attributes |
|---|---|
| **Team** | ID, name, top-level org boundary |
| **Subteam** | ID, name, parent Team or parent Subteam, hierarchy path |
| **User** | ID, identity, status, profile metadata, Team/Subteam assignment, role bindings |
| **Role** | Functional permission bundle (SYSADM, TEAMADM, SUBADM, PLANNER, TESTER, VIEWER) |
| **Device** | ID, identity, OS version, APK version, radio capability, permissions, hardware profile, SIM info, location capability, Team/Subteam, state |
| **Device Assignment** | Device ↔ Team/Subteam ↔ test pool ↔ operational status |
| **APK Version** | Version number, checksum, release notes, compatibility, rollout policy |
| **Drive Plan** | Name, objective, Team/Subteam, route, area, infrastructure focus, test suite, devices, schedule, thresholds, version, status, notes |
| **Route** | Ordered geospatial path with waypoints and roadway metadata (PostGIS geometry) |
| **Area of Concentration** | Polygon, corridor, market area, or manually selected map area |
| **RAN Infrastructure Asset** | Site, antenna, sector, cell; band, carrier, PCI, TAC, azimuth, beamwidth, technology (NR/LTE attributes) |
| **Test Profile** | Name, type, duration, parameters, pass/fail thresholds, required permissions, supported devices, version |
| **Execution Session** | Drive Plan version, tester, devices, route, start/end time, status, telemetry stream IDs |
| **Telemetry Event** | GPS point, radio metrics, device state, app test event, throughput, latency, failure, handoff event |
| **Live Stream** | Real-time data channel from device/controller to portal (WebSocket/SSE) |
| **Scoring Result** | Segment-level, application-level, composite score; confidence score; contributing factors; evidence references |
| **Replay Track** | Reconstructable execution timeline from telemetry, synchronized GPS + metrics + events |
| **AI Analysis** | Agent-generated insight, anomaly explanation, summary, recommendations; bound to evidence |
| **Report** | Human-readable post-execution summary: charts, maps, scores, AI findings, evidence, exported artifacts |
| **Artifact** | APK logs, execution logs, packet summaries, screenshots, video snippets, exported reports |
| **Alert** | Category, severity, timestamp, execution/device reference, status, AI recommendation |
| **Audit Event** | Actor, action, target, scope, timestamp, reason |

---

## 8. Functional Requirements

### Explicit Requirements (from PDF) **[PDF]**

**RBAC & Auth**
- FR-001: Role-based access control enforced both in React UI and server-side API layer
- FR-002: Team/Subteam hierarchy applied to every query and action
- FR-003: Portal route guards render only when role and scope allow access
- FR-004: Field-level UI permissions: buttons, forms, actions, exports hidden or disabled based on role
- FR-005: Session timeout and token refresh with configurable policy

**Portal UX Model**
- FR-006: Portal is a persistent React workspace — open views, selected records, filters, map context, and unsaved edits persist across navigation
- FR-007: Canvas-oriented interaction: maps, charts, plan editors, reports, AI panels, device views can open as concurrent canvas objects (move, resize, minimize, maximize, restore)
- FR-008: Role-specific home pages: each role sees appropriate primary workflows immediately after login
- FR-009: Map-first execution: live execution centers on route progress, device movement, RAN antennas, scoring overlays, and anomaly events
- FR-010: Evidence-docked AI: AI summaries appear beside the evidence they reference, not as disconnected chatbot text
- FR-011: Replay as analysis tool: completed drive plans must be replayable with synchronized map movement, test events, telemetry charts, notes, and anomalies

**Drive Plans**
- FR-012: Drive Plans include name, objective, Team/Subteam, route, area, infrastructure focus, test suite, devices, thresholds, schedule, and notes
- FR-013: Drive Plan lifecycle: Draft → Review → Published → Executing → Completed → Archived
- FR-014: Published plans are immutable; edits create a new version
- FR-015: Planner can draw, edit, import, and validate routes on a map
- FR-016: Planner can draw and edit concentration zones
- FR-017: Planner can associate antennas, sectors, cells, or infrastructure groups with the plan
- FR-018: Plan readiness score calculated by portal before execution

**Execution**
- FR-019: Execution readiness check verifies devices online, GPS enabled, APK current, permissions valid, battery acceptable, test profiles supported
- FR-020: TESTER can start, pause, resume, stop execution from portal
- FR-021: Portal detects route deviation when GPS path deviates from planned route beyond configured tolerance
- FR-022: Live view shows active test, queued test, completed test, failed test, and retry status
- FR-023: Multi-device execution: one execution can coordinate multiple autonomous devices
- FR-024: TESTER can annotate live execution with observed field conditions
- FR-025: System locks telemetry, closes command stream, generates replay track, and triggers reporting pipeline on execution finalization
- FR-026: All start, stop, pause, resume, command, and override actions are traceable (audit)

**AI**
- FR-027: All AI findings must bind to telemetry, KPI, map segment, artifact, or infrastructure evidence
- FR-028: All AI outputs include confidence and uncertainty assessments
- FR-029: Agents cannot fabricate infrastructure facts or produce unsupported root-cause claims
- FR-030: Authorized users can inspect analysis stages, tool calls, and source evidence (AI trace viewer)
- FR-031: Authorized users can regenerate summary after data correction or threshold change
- FR-032: Users can rate AI findings as useful, incorrect, incomplete, or needs review

**Reporting**
- FR-033: Completed executions automatically trigger report generation
- FR-034: Report includes executive summary, plan metadata, route heatmap, RAN metric charts, application test summary, anomaly table, AI findings, device data quality section
- FR-035: Report can be exported to PDF
- FR-036: Raw or summarized data can be exported to CSV/JSON by authorized users
- FR-037: Regenerated reports maintain version history

**Replay**
- FR-038: Replay supports synchronized GPS, RAN metrics, test events, alerts, notes, and scoring on a timeline
- FR-039: Replay controls: play, pause, seek, speed control, jump to anomaly, jump to test
- FR-040: Multi-device replay supported

**Alerts**
- FR-041: Alerts include categories: device, execution, telemetry, route, RAN, application, system, AI
- FR-042: AI can suggest likely cause and recommended action for alerts
- FR-043: Alert lifecycle is traceable (audit events)

### Inferred Requirements **[INFERRED]**

- IFR-001: Map provider must support geospatial KPI overlays (PostGIS + Leaflet/Mapbox likely)
- IFR-002: Real-time streaming must handle degraded states gracefully (reconnect, backpressure)
- IFR-003: AI analysis should be triggerable manually in addition to automatic post-execution trigger
- IFR-004: Reports should deep-link to specific replay timestamps and map locations
- IFR-005: Device quarantine should be reversible by SYSADM with reason logged
- IFR-006: Test profile simulator should allow validation without consuming actual devices

---

## 9. UX and Interface Implications

### What the UI Must Support **[PDF]**

**UX Principles (explicitly stated):**

| Principle | Requirement |
|---|---|
| Persistent Workspace | Open views, selected records, filters, map context, and unsaved edits persist across navigation |
| Canvas-Oriented Interaction | Maps, charts, plan editors, reports, AI panels, and device views can be opened, docked, resized, minimized, and restored as concurrent canvas objects |
| Role-Specific Landing Views | SYSADM, TEAMADM, SUBADM, PLANNER, TESTER, and VIEWER each see appropriate primary workflows immediately after login |
| Map-First Execution | Live execution centers on route progress, device movement, RAN antennas, scoring overlays, and anomaly events |
| Evidence-Docked AI | AI summaries appear beside the evidence they reference, not as disconnected chatbot text |
| Replay as Analysis Tool | Completed drive plans must be replayable with synchronized map movement, test events, telemetry charts, notes, and anomalies |

**Visual Identity (explicitly stated):**
- Purple as primary accent color on a clean white background **[PDF]**
- React-based workspace, not a conventional CRUD application **[PDF]**

**Critical Visibility Requirements:**
- Route deviation must surface immediately in live execution view
- Device health state must always be visible during execution
- Stream health indicator (live/delayed/reconnecting/stale/disconnected) must be visible
- Anomaly events as timestamped feed during live execution
- Scoring overlay on map (segments colored by quality score)

---

## 10. Data Architecture (Recommended) **[PDF]**

| Storage Layer | Technology | Purpose |
|---|---|---|
| Operational DB | PostgreSQL | Users, roles, teams, devices, drive plans, sessions |
| Geospatial DB | PostGIS extension | Routes, polygons, roadway paths, RAN assets, GPS traces |
| Time-Series Layer | PostgreSQL partitioning or Timescale | High-volume telemetry and KPI events |
| Object Storage | S3-compatible | APK logs, generated reports, exports, screenshots, large artifacts |
| Cache / Session State | Redis | Live execution state, workspace persistence, command state, temporary streams |
| Event Bus | NATS, Kafka, or RabbitMQ | Device telemetry, command events, execution events, AI jobs |
| AI Memory / Trace Store | PostgreSQL + vector index | Agent outputs, embeddings, report context, analysis history |
| Search Index | OpenSearch or PostgreSQL full-text search | Reports, devices, plans, logs, AI summaries |

**Database Decision [PDF]:** MongoDB may be useful for flexible AI payloads or temporary agent memory, but must NOT be the primary operational database for drive plans, route geometry, team hierarchy, RBAC, device inventory, or RAN geospatial analysis.

---

## 11. System Architecture (High-Level) **[PDF]**

**Major Components:**

| Component | Responsibility |
|---|---|
| React Qube Portal | Role-specific UI, drive-plan authoring, live execution, map, replay, dashboards, reports |
| API Gateway | Auth enforcement, routing, throttling, API versioning, request auditing |
| Identity/RBAC Service | Users, roles, scopes, Team/Subteam permissions |
| Team/Subteam Service | Recursive org hierarchy and visibility boundaries |
| Device Registry Service | Device enrollment, configuration capture, assignment, status |
| Autonomous Android Controller | Device control plane, command dispatch, APK update, log pull, session lifecycle |
| OTA Service | APK version catalog, staged rollout, forced upgrade, rollback |
| Drive Plan Service | CRUD, versioning, approval, route geometry, test profile binding |
| RAN Infrastructure Service | Antenna/site/sector inventory, map overlays, geospatial querying |
| Execution Orchestration Service | Starts/stops drive plans, binds devices, coordinates tests, tracks session state |
| Telemetry Ingestion Service | Receives high-volume device telemetry and RAN metrics |
| Real-Time Streaming Service | Pushes live data to portal via WebSocket/SSE |
| Scoring/KPI Service | Computes application-oriented RAN and UX quality scores |
| Replay Service | Reconstructs execution timeline and map movement |
| Reporting Service | Generates execution summaries, charts, exports |
| Drayvn AI IQ Layer | Agentic analysis, anomaly detection, recommendations, summaries |
| Artifact Service | Stores and retrieves logs, APK logs, exports, replay artifacts |
| Notification Service | Alerts for device failure, route deviation, test failure, KPI threshold breach |
| Audit Service | Tracks user, device, controller, and AI actions |
| Observability Stack | Metrics, logs, traces, operational dashboards |

---

## 12. MVP Scope (Recommended) **[PDF]**

The PDF explicitly recommends 12 MVP capabilities:

1. Team/Subteam hierarchy
2. RBAC for SYSADM, TEAMADM, SUBADM, PLANNER, TESTER, VIEWER
3. Device registration and inventory
4. Controller command path for start, stop, and log pull
5. Drive Plan CRUD with route and area definition
6. RAN infrastructure import and map overlay
7. Live execution dashboard
8. Real-time GPS and core RAN telemetry streaming
9. Basic test profile execution status
10. Post-execution report generation
11. Replay of GPS route and telemetry timeline
12. AI-generated execution summary with evidence references

---

## 13. Release Plan **[PDF]**

| Release | Theme | Key Epics | Exit Criteria |
|---|---|---|---|
| Release 0 | Architecture and Foundation | SQ-001, SQ-002, SQ-003, SQ-021, SQ-025 | Domain model approved; auth/RBAC working; hierarchy operational; backend scaffolding deployed; React portal shell available |
| Release 1 | Device Registration and Drive Plan MVP | SQ-004, SQ-006, SQ-007, SQ-008, SQ-014 | Devices register; Team/Subteam assignment works; plans can be created, validated, published; RAN infrastructure appears on map |
| Release 2 | Live Execution and Telemetry Streaming | SQ-005, SQ-010, SQ-011, SQ-012, SQ-015, SQ-020 | TESTER can start/stop execution; devices stream GPS/RAN metrics; live route progress, device health, command state, and alerts visible |
| Release 3 | Scoring, Reporting, Replay, and AI | SQ-016, SQ-017, SQ-018, SQ-019, SQ-024 | Execution generates score and report; replay works with synchronized telemetry; AI summary includes evidence-bound conclusions |
| Release 4 | Enterprise Hardening and Pilot Readiness | SQ-022, SQ-023, SQ-024, SQ-025, SQ-026 | Security verified; observability active; backup/restore tested; pilot guide complete; field pilot can run end-to-end |

---

## 14. Constraints and Assumptions

### Explicit Constraints **[PDF]**
- RBAC must be enforced both server-side (API) and client-side (UI route guards, field-level permissions)
- AI agents must not become the authoritative system of record; they must operate against a structured execution evidence graph
- MongoDB must not be the primary operational database for drive plans, route geometry, RBAC, or RAN geospatial analysis
- The portal must behave as a persistent workspace, not a conventional CRUD application
- AI findings must bind to evidence (telemetry, KPI, map segment, artifact, infrastructure) — unsupported conclusions are not permitted

### Inferred Constraints **[INFERRED]**
- Real-time streaming will require WebSocket/SSE infrastructure — polling is insufficient for live drive execution at acceptable UX latency
- GPS trace storage volume at drive-test frequency will be high — time-series partitioning is not optional
- RAN infrastructure datasets may be large (thousands of sites, sectors) — geospatial indexing is required for acceptable map performance
- Replay fidelity depends on telemetry replay readiness being built into ingestion from the start (deterministic timestamp order)

---

## 15. Open Questions

1. **Drive Plan route drawing**: What map provider is used? (Mapbox, Google Maps, Leaflet with OpenStreetMap?) Does the organization own existing map infrastructure from current SNAP platform?
2. **RAN infrastructure data source**: Is there an existing authoritative infrastructure data feed (e.g., from the MNO), or do admins manually import? What format is the canonical source?
3. **AI inference infrastructure**: Where does Drayvn AI run? On-prem, cloud, or hybrid? What are the latency SLAs for evidence-bound analysis generation post-execution?
4. **Controller deployment**: Is the Autonomous Android Controller on-prem at lab/field sites, or is it centralized? How many simultaneous device connections is it expected to handle?
5. **Telemetry ingestion scale**: What is the target telemetry event rate per device? Per execution? How many concurrent executions need to be supported at launch?
6. **Drive Plan approval workflow**: Who approves plans before publishing? Is there a multi-approver workflow, or can TEAMADM self-approve? What blocks publication?
7. **Field technician involvement**: The PDF mentions "field technicians driving vehicles." Does the portal need a field-facing mobile view, or is the portal always operated by TESTER remotely watching field technician drives?
8. **Replay storage**: How long are replay artifacts retained? Are they co-located with telemetry or separately stored? What is the replay artifact TTL?
9. **Test profile sequencing**: Can test profiles be mixed within a single drive plan execution (e.g., calling on segment A, video on segment B)? How is this configured?
10. **Multi-device execution coordination**: When multiple devices execute in one session, are they synchronized to the route (all at same GPS point) or independent?
