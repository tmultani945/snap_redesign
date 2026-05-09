# SNAP Remote Features — Complete Knowledge Document

**Scope:** Five remote telephony/media test features in the SNAP platform  
**Repositories covered:** snap_node_server, snap_angular_webapp, procal0-snap_java_server-96e7231fe535 (telephony_logs_service, logs_video_service, java_server)  
**Document date:** 2026-05-07  
**Audience:** Developer with no code access who needs to rebuild these features from scratch

---

## Table of Contents

1. [Feature Inventory](#1-feature-inventory)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Models & MongoDB Collections](#3-data-models--mongodb-collections)
4. [REST API Contracts](#4-rest-api-contracts)
5. [RabbitMQ Message Contracts](#5-rabbitmq-message-contracts)
6. [State Machines](#6-state-machines)
7. [SnapBox Integration (Lab Agent API)](#7-snapbox-integration-lab-agent-api)
8. [AWS Connect Integration (VoIP)](#8-aws-connect-integration-voip)
9. [Artifact & Video Pipeline](#9-artifact--video-pipeline)
10. [DFIT Trace Monitoring Pipeline](#10-dfit-trace-monitoring-pipeline)
11. [SMS Feature Deep-Dive](#11-sms-feature-deep-dive)
12. [Angular Frontend Components](#12-angular-frontend-components)
13. [Authentication & Authorization](#13-authentication--authorization)
14. [Configuration Reference](#14-configuration-reference)
15. [Error Handling & Timeouts](#15-error-handling--timeouts)
16. [Gaps & Clarifications Needed](#16-gaps--clarifications-needed)

---

## 1. Feature Inventory

| # | Feature Name (UI label) | Internal `type` value | Angular enum member | Backend function |
|---|---|---|---|---|
| 1 | Remote VoIP | `VOIP_MO_MT` | Not in Angular TelephonyTestType enum (backend-only) | `startAwsMoMtTest()` |
| 2 | Send short SMS without validation | `MO_SMS` | `TelephonyTestType.MO_SMS = 'MO_SMS'` | `startSimpleSmsTest()` |
| 3 | Remote video playback | Artifact type `VIDEO` on any test | `ArtifactTypeEnum.VIDEO = 'VIDEO'` | `startLogsVideo()` + logs_video_service |
| 4 | Remote-to-remote voice call | `EXT_MO_MT` | `TelephonyTestType.EXT_MO_MT = 'EXT_MO_MT'` | `startExternalMoMtTest()` |
| 5 | Remote SMS with validation | `MO_MT_SMS` | `TelephonyTestType.MO_MT_SMS = 'MO_MT_SMS'` | `startSmsTest()` |

**Source files:**
- `snap_angular_webapp/src/app/main/momt-call/interfaces/momt-test.interface.ts` — `TelephonyTestType` enum, UI display labels in `MomtTypeMap`
- `snap_node_server/services/telephonyFunctions.js` — all execution logic
- `snap_node_server/models/momtCallTest.js` — schema type enum

**UI display labels** (from `MomtTypeMap` in momt-test.interface.ts):

| Type | UI Label |
|---|---|
| `MO_SMS` | "Send short SMS without validation" |
| `MO_MT_SMS` | "Validate SMS" |
| `EXT_MO_MT` | "External voice call" |
| `VOIP_MO_MT` | Not in Angular map — shown via bulk/API only |
| `VIDEO` artifact | "Video" (ArtifactTypeDisplayMap) |

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Angular SPA (port 4200)                                                       │
│  momt-call module  ←→  MomtCallService  ←→  NetworkService (HTTP)             │
└──────────────────────────────┬─────────────────────────────────────────────────┘
                               │ HTTP REST
                               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  Node.js / Express (port 8082)                                                 │
│  routes/telephony.js  →  /api/automation/telephony/*                          │
│  routes/voip.js       →  /api/voip/*                                          │
│  services/telephonyFunctions.js  (core state machine)                         │
│  services/rabbitMQFunctions.js   (RabbitMQ pub/sub)                           │
│  services/textFunctions.js       (SMS via SnapBox)                             │
│  services/amazonConnect.js       (AWS Connect phone list)                      │
│  startup/rabbitMQClient.js       (amqplib singleton, topic exchange)           │
└────┬─────────────────────────┬──────────────────────────┬──────────────────────┘
     │ HTTP (per-device)        │ RabbitMQ publish         │ HTTP REST
     ▼                         ▼                           ▼
┌──────────────┐   ┌──────────────────────────┐   ┌───────────────────────────┐
│  SnapBox     │   │  RabbitMQ broker          │   │  telephony_logs_service    │
│  (Java agent │   │  Exchange: snap_uat_xperf │   │  (Spring Boot, port 8084)  │
│   port 8080  │   │  Type: topic              │   │  /telephony/commands       │
│   /SnapBox)  │   │  Queues:                  │   │  → START/STOP_COLLECTING   │
│              │   │  xperf-cell-kpi-device-   │   │  → GET_DEVICE_MODEM_DATE   │
│  call, sms,  │   │  events (KPI)             │   │  → SET_DEVICE_PROPERTIES   │
│  monitoring, │   │  xperf-testing (commands) │   └───────────────────────────┘
│  logs/video  │   │  xperf-cell-kpi-artifacts │   ┌───────────────────────────┐
└──────────────┘   │  xperf-call-states        │   │  logs_video_service        │
                   └──────────────────────────┘   │  (Spring Boot, port 8081)  │
                                                   │  Exchange: snap_dev        │
                                                   │  Queues: video, log,       │
                                                   │  network-kpi etc.          │
                                                   └────────────┬──────────────┘
                                                                │ Upload
                                                                ▼
                                                   ┌───────────────────────────┐
                                                   │  AWS S3                    │
                                                   │  snap-logcat-dev (artifacts│
                                                   │  qube-project-files (user) │
                                                   └───────────────────────────┘
```

### Component Ports & Context Paths

| Service | Port | Context |
|---|---|---|
| Angular SPA | 4200 | / |
| Node.js Express | 8082 | / |
| Java SnapBox agent (lab) | 8080 | /SnapBox |
| logs_video_service | 8081 | / |
| telephony_logs_service | 8084 | / |

### Device paradigm

- **MO** — Mobile Originating: makes the call / sends the SMS. Lab device controlled via SnapBox HTTP calls.
- **MT** — Mobile Terminating: receives the call / SMS. Lab device controlled via SnapBox HTTP calls.
- **EXTERNAL_MO** — remote device outside the lab, controlled via RabbitMQ commands (DIAL, END, START_RECORDING, STOP_RECORDING).
- **VOIP_MT** — AWS Connect DID phone number (not a physical device). Acts as the MT side for VoIP tests.
- **RMT** — Remote MT (used in MO_DIALS type, dialing an arbitrary phone number parameter).

---

## 3. Data Models & MongoDB Collections

### 3.1 `momtCallTests` — MomtCallTest

**File:** `snap_node_server/models/momtCallTest.js`  
**Collection:** `momtCallTests`  
**TTL index:** `createdAt` expires after 365 days

```json
{
  "_id": "ObjectId",
  "name": "string (optional)",
  "description": "string",
  "destination": "enum: LAB | DFIT | EXTERNAL",
  "type": "enum: MO_MT | MO_MT_LONG | MT_ANSWERS | MO_DIALS | MT_VOICEMAIL | MERGE_CALL | SWAP_CALL | DIAL_MT2 | MO_SMS | MO_MT_SMS | MO_MT_CALL_SMS | SPEED_TEST | EXT_MO_MT | VOIP_MO_MT",
  "status": "enum: IDLE | PROGRESS | FINALIZING | COMPLETED | FAILED | CANCELED | SCHEDULED | CANCELLING | EXECUTING",
  "repeatCount": "number (iterations)",
  "iterationDelay": "number (seconds)",
  "startTimeout": "number (ms)",
  "sessionId": "string (DFIT trace sessionId)",
  "bulkId": "string (UUID for bulk tests)",
  "releaseDevices": "boolean",
  "user": { "userId": "string" },
  "devices": [
    {
      "sn": "string (serialNumber)",
      "phone": "string (phone number)",
      "type": "enum: MO | MT | EXTERNAL_MO | VOIP_MT | MO2 | MT2",
      "index": "number",
      "deviceId": "string",
      "name": "string (modelName)",
      "os": "string",
      "udid": "string"
    }
  ],
  "actions": [
    {
      "type": "TelephonyActionType (see §6)",
      "order": "number",
      "status": "IDLE | PROGRESS | PASS | FAILED | CANCELED",
      "data": {
        "timestamp": "number (ms duration/timeout)",
        "subsequentTimeout": "number (ms, SMS multi-part timeout)",
        "finishedAt": "number (ms)"
      },
      "errors": [{ "code": "string", "message": "string" }]
    }
  ],
  "artifacts": [
    {
      "status": "IDLE | PROGRESS | FINALIZING | COMPLETED | FAILED | CANCELED",
      "type": "FILE | OTHER",
      "content": "VIDEO | LOG | USER_ACTION | KPIS | CALL_LOG | TRACE_LOG | NETWORK_KPI",
      "parameters": { "sn": "string (device serialNumber)" },
      "result": {
        "payload": {
          "storage": "S3",
          "name": "string (filename)",
          "size": "number (bytes)",
          "url": "string (S3 URL or relative path)"
        },
        "errors": [{ "code": "string", "message": "string" }]
      }
    }
  ],
  "artifactSelection": ["VIDEO", "LOG", "USER_ACTION", "KPIS", "CALL_LOG", "NETWORK_KPI"],
  "parameters": [
    {
      "displayName": "string",
      "name": "string (e.g. 'phoneNumber', 'text')",
      "type": "string",
      "constraints": { "required": "boolean", "min": "number", "max": "number" },
      "value": "string"
    }
  ],
  "createdAt": "number (unix seconds)",
  "modifiedAt": "number (unix seconds)",
  "executedAt": "number (unix seconds)"
}
```

### 3.2 `momtCallTestPlays` — MomtCallTestPlay (iterations)

**File:** `snap_node_server/models/momtCallTestPlay.js`  
**Collection:** `momtCallTestPlays`

```json
{
  "_id": "ObjectId",
  "momtId": "string (ref to momtCallTest)",
  "order": "number (1-based iteration index)",
  "status": "IDLE | PROGRESS | PASS | FAILED | CANCELED",
  "startedAt": "number (ms)",
  "finishedAt": "number (ms)",
  "actions": [
    {
      "type": "TelephonyActionType",
      "order": "number",
      "status": "IDLE | PROGRESS | PASS | FAILED | CANCELED",
      "data": { "timestamp": "number", "finishedAt": "number" },
      "errors": [{ "code": "string", "message": "string" }]
    }
  ]
}
```

### 3.3 `MomtScheduledIteration`

**File:** `snap_node_server/models/momtCallTestPlay.js` (second schema)  
**Collection:** `MomtScheduledIteration`  
**Purpose:** Persists long-delay iterations (≥ 60 seconds) and long call durations (≥ 60000ms) for Node.js process restart resilience.

```json
{
  "userId": "string",
  "momtId": "ObjectId",
  "momtPlayId": "ObjectId",
  "iteration": "number",
  "startTime": "number (unix seconds)"
}
```

### 3.4 `DeviceRecording`

**File:** `snap_node_server/models/deviceRecording.js`  
**Collection:** `DeviceRecording`  
**Purpose:** Tracks one active recording session per device per test.

```json
{
  "userId": "string",
  "serialNumber": "string",
  "type": "momt",
  "operationId": "ObjectId",
  "momtCallId": "string",
  "isSessionActive": "boolean",
  "video_link": "string",
  "logs_link": "string",
  "user_action_link": "string",
  "kpis_link": "string",
  "audio_link": "string",
  "network_kpi_link": "string",
  "isVideoDeleted": "boolean"
}
```

### 3.5 `telephony.trace.logs` — TelephonyTraceLog

**File:** `snap_node_server/models/telephonyTrace.js` (Node.js model)  
**Java source:** `telephony_logs_service/.../model/LogEntity.java`  
**Collection:** `telephony.trace.logs`

```json
{
  "labId": "string",
  "imei": "string",
  "sn": "string",
  "sessionId": "string",
  "layer": "string (e.g. SIGNAL_QUALITY, SIP, RRC, IRAT_HANDOVER)",
  "eventType": "string (e.g. LTE_SIGNAL_QUALITY, NR5G_SIGNAL_QUALITY, SIP_EVENT, RRC_EVENT)",
  "eventData": "string | object",
  "network": "string",
  "timestamp": "number (adjusted, ms)",
  "deviceTimestamp": "number (raw device time, ms)",
  "lat": "number",
  "lng": "number"
}
```

### 3.6 `telephony.trace.thresholds` — TelephonyTraceThreshold

**File:** `snap_node_server/models/telephonyTrace.js`  
**Collection:** `telephony.trace.thresholds`  
**Purpose:** Alert/warning thresholds for DFIT KPI metrics (RSRP, RSRQ, SINR, RSSI, VVQ, jitter, etc.)

```json
{
  "layer": "string",
  "events": [
    {
      "eventType": "string",
      "field": "string (e.g. rsrp, rsrq)",
      "goodToModerate": "number",
      "moderateToBad": "number"
    }
  ]
}
```

### 3.7 `Automation.Telephony.Predefined_Test_Cases` — TelephonyTestCase

**File:** `snap_node_server/models/telephonyTestCases.js`  
**Collection:** `Automation.Telephony.Predefined_Test_Cases`  
**Purpose:** Stores predefined test case templates (device slot definitions, default action sequences, parameters).

```json
{
  "name": "string",
  "description": "string",
  "type": "string (TelephonyTestType)",
  "startTimeout": "number",
  "devices": [{ "type": "string", "index": "number" }],
  "actions": [{ "type": "string", "data": { "timestamp": "number" } }],
  "parameters": [{ "displayName": "string", "name": "string", "type": "string", "constraints": {} }],
  "requisites": {
    "environment": { "devices": "number", "simCards": "number" },
    "features": ["string"]
  }
}
```

### 3.8 `devices` — Device

**File:** `snap_node_server/models/device.js`  
**Collection:** `devices`

Key fields used in telephony features:

| Field | Description |
|---|---|
| `serialNumber` | Unique device ID used throughout |
| `udid` | Used as RabbitMQ routing key prefix for external devices |
| `phoneNumber` | Device phone number |
| `labId` | Which lab this device belongs to |
| `labDomain` | Base URL for SnapBox calls (e.g. `http://192.168.1.100:8080/`) |
| `oem` | Manufacturer — `'Apple'` for iOS, anything else = Android |
| `osVersion` | OS version string |
| `modelName` | Display name |
| `deviceStateCode` | Current state |
| `deviceCommunicationStatus` | e.g. `'remote-testing'` |

### 3.9 `DeviceTesting`

**File:** `snap_node_server/models/deviceTesting.js`  
**Collection:** `DeviceTesting`  
**Purpose:** Tracks which test a device is currently assigned to. Also stores in-progress SMS text accumulation.

```json
{
  "deviceId": "ObjectId (ref devices)",
  "bookingId": "string",
  "testingType": "MOMT",
  "data": {
    "status": "string (IDLE | DIALING | RINGING | CONNECTED)",
    "text": "string (accumulated SMS parts)",
    "parts": "number (SMS parts received so far)"
  }
}
```

---

## 4. REST API Contracts

### 4.1 Node.js Routes

**Base route file:** `snap_node_server/startup/routes.js`

| Route prefix | Router file |
|---|---|
| `/api/automation/telephony` | `routes/telephony.js` |
| `/api/voip` | `routes/voip.js` |
| `/api/test-scheduler` | `routes/testScheduler.js` |
| `/api/file-storage` | `routes/remoteFolders.js` |

### 4.2 Telephony Endpoints

All require JWT auth via `identityManager(["USER", ...ENTERPRISE_ROLES])` and feature flag `TELEPHONY_TEST`.  
`BOOKING` feature flag is additionally required for start endpoints.

#### POST `/api/automation/telephony/tests`
Save a test (IDLE/SCHEDULED, not started).

Request body:
```json
{
  "type": "MO_SMS | MO_MT_SMS | EXT_MO_MT | VOIP_MO_MT | ...",
  "destination": "LAB | DFIT | EXTERNAL",
  "description": "string",
  "repeatCount": 1,
  "iterationDelay": 3,
  "startTimeout": 15000,
  "releaseDevices": true,
  "isScheduled": false,
  "devices": [
    { "sn": "ABC123", "phone": "+15551234", "type": "MO", "index": 0 }
  ],
  "actions": [
    { "type": "MO_MESSAGING", "order": 0, "data": { "timestamp": 5000 } }
  ],
  "artifactSelection": ["CALL_LOG"],
  "parameters": [
    { "name": "phoneNumber", "value": "+15559999", "displayName": "Phone Number", "type": "string", "constraints": { "required": true } },
    { "name": "text", "value": "Hello World", "displayName": "SMS Text", "type": "string", "constraints": { "required": true } }
  ]
}
```

Response: `200 OK` with created `MomtCallTest` document.

#### PUT `/api/automation/telephony/tests/:momtId`
Update an existing IDLE/SCHEDULED test. Same body fields (all optional).

#### POST `/api/automation/telephony/tests/start`
Create and immediately start a test. Same body as POST `/tests` plus device booking validation.  
- Validates active booking exists for each device serial number.
- Creates `DeviceTesting` records for booking tracking.
- If `destination === "DFIT"`, calls `startTraceMonitoring()` first.
- Calls `convertArtifacts()` to build artifact array from `artifactSelection`.
- Calls `startRecording()` then `startTelephonyTest()`.

Response: `200 OK` with test and first 10 iterations.

#### POST `/api/automation/telephony/tests/:momtId/start`
Start an existing saved test.

#### POST `/api/automation/telephony/tests/:momtId/start-scheduled`
Start a previously saved SCHEDULED test (called by test-scheduler service). Same logic as `/tests/start`.

#### POST `/api/automation/telephony/tests/bulk/start`
Start multiple concurrent tests (bulk). Additional params:

```json
{
  "bulkSize": 3,
  "devices": [ { "type": "EXTERNAL_MO" }, { "type": "VOIP_MT" }, { "type": "MT" } ],
  ...
}
```

- Fetches available MOMT devices, external devices, and AWS phone numbers concurrently.
- For `VOIP_MT` devices: populates `sn: ""`, `phone: selectedPhone.PhoneNumber`, `name: "AWS Connect"`, `os: "N/A"`.
- For `EXTERNAL_MO` devices: picks from external device pool.
- Creates booking automatically (`bookedUntil = (now + actionDurationMs * repeatCount * 1.15)`).

#### POST `/api/automation/telephony/tests/:momtId/cancel`
Cancels a running test. Sets status to CANCELLING.

#### DELETE `/api/automation/telephony/tests?momtIds=id1,id2`
Deletes tests and their artifacts from S3.

#### GET `/api/automation/telephony/tests`
List tests with pagination.

Query params: `page`, `size`, `startAt`, `endAt`, `search`, `statuses`, `destination`

#### GET `/api/automation/telephony/tests/:momtId`
Get single test with details.

#### GET `/api/automation/telephony/tests/:momtId/plays`
Get iterations for a test.

Query params: `page`, `size`, `sort`, `verbosityTypes`

#### GET `/api/automation/telephony/tests/bulks/:bulkId/plays`
Get all plays for a bulk test by bulkId.

#### POST `/api/automation/telephony/tests/:momtId/artifacts/cancel`
Cancel an in-progress artifact.

#### POST `/api/automation/telephony/tests/:momtId/artifacts/remove`
Remove artifact from test (S3 delete).

#### POST `/api/automation/telephony/tests/:momtId/artifacts/remove/cloud`
Remove artifact file from S3 by artifact name.

#### POST `/api/automation/telephony/tests/:momtId/artifacts/rename/cloud`
Rename artifact file in S3.

#### GET `/api/automation/telephony/tests/:momtId/download-zip`
Download all artifacts as ZIP. Returns binary stream.

#### GET `/api/automation/telephony/test-cases`
List predefined test case templates from `Automation.Telephony.Predefined_Test_Cases`.

#### GET `/api/voip/available`
Returns list of available AWS Connect DID phone numbers.

Response:
```json
{
  "data": [
    {
      "Id": "string",
      "Arn": "string",
      "PhoneNumber": "+12142570986",
      "PhoneNumberType": "DID",
      "PhoneNumberCountryCode": "US"
    }
  ]
}
```

**File:** `snap_node_server/routes/voip.js` — single GET handler calling `getAvailablePhones()` from `snap_node_server/services/amazonConnect.js`.

#### Callback endpoints (called by SnapBox Java agent back to Node.js)

These are registered in `java_server/src/main/resources/application.properties` as callback URLs:

| Callback | Node.js endpoint | Purpose |
|---|---|---|
| Call state change | `POST /api/devices/call/update` | SnapBox pushes device call state (IDLE/DIALING/RINGING/CONNECTED) |
| Incoming SMS | `POST /api/devices/notifications/sms` | SnapBox pushes incoming SMS event |
| General monitoring | `POST /api/devices/monitoring` | SnapBox pushes device monitoring events |

### 4.3 Test Scheduler Endpoints

**Base:** `/api/test-scheduler`

#### POST `/api/test-scheduler/add`
Schedule a future test start.

```json
{
  "testId": "string",
  "deviceIdList": ["string"],
  "startAt": 1700000000,
  "testType": "MOMT",
  "startTestRequest": {
    "url": "api/automation/telephony/tests/{testId}/start-scheduled",
    "body": {}
  }
}
```

#### GET `/api/test-scheduler?testIds=id1,id2`
Get scheduled test entries.

#### POST `/api/test-scheduler/delete`
Delete scheduled test entries.

```json
{ "testScheduleIdList": ["scheduleId1"] }
```

### 4.4 File Storage Endpoint

#### GET `/api/file-storage/download?<query>`
Download a file from S3. Returns pre-signed URL or file stream.

---

## 5. RabbitMQ Message Contracts

### 5.1 Broker Configuration

**File:** `snap_node_server/config/default.json` + `snap_node_server/startup/rabbitMQClient.js`

| Config key | Value |
|---|---|
| `rabbitMQUrl` | `amqps://snap_iq:rQq2N9Wd1Ke1@18.217.222.7:5671/` |
| `rabbitExchange` | `snap_uat_xperf` |
| Exchange type | `topic` (durable) |
| Queues | All durable |
| `rabbitKPIQueue` | `xperf-cell-kpi-device-events` |
| `rabbitDeviceQueue` | `xperf-device-registry` |
| `rabbitTestingQueue` | `xperf-testing` |
| `rabbitArtifactQueue` | `xperf-cell-kpi-artifacts` |
| `rabbitCallStateQueue` | `xperf-call-states` |
| `rabbitRoutingKeyKPI` | `*.xperf-cell-kpi` |
| `rabbitRoutingKeyTesting` | `*.xperf-testing` |
| `rabbitRoutingKeyDevices` | `xperf.devices` |
| `rabbitRoutingKeyArtifacts` | `*.xperf-artifacts` |
| `rabbitRoutingKeyCallState` | `*.xperf-call-states` |

**Library:** `amqplib` (Node.js), singleton in `snap_node_server/startup/rabbitMQClient.js`

The `*` wildcard in routing keys is always replaced with `device.udid` at runtime.

### 5.2 Commands sent FROM Node.js TO external devices (via RabbitMQ)

**File:** `snap_node_server/services/rabbitMQFunctions.js`

All messages are published to exchange `snap_uat_xperf` with routing key `{device.udid}.xperf-testing`.

#### DIAL command
```json
{ "command": "DIAL", "phoneNumber": "+15551234567" }
```
**Sent by:** `sendDialCommand(device, phoneNumber)` — called from:
- `startAwsMoMtTest()` (VOIP_MO_MT: sends to EXTERNAL_MO device, targeting VOIP_MT phone number)
- `startExternalMoMtIteration()` (EXT_MO_MT: sends to EXTERNAL_MO device, targeting MT.phone)
- `initiateRemoteCall(device, phoneNumber)` (wrapper)

#### END command
```json
{ "command": "END" }
```
**Sent by:** `sendEndCallCommand(device)`

#### START_RECORDING command
```json
{ "command": "START_RECORDING", "testId": "string", "iterationId": "string" }
```
**Sent by:** `sendStartLogging(device, testId, iterationId)` — called for `EXTERNAL_MO` devices at test start.

#### STOP_RECORDING command
```json
{ "command": "STOP_RECORDING", "testId": "string", "iterationId": "string", "userId": "string" }
```
**Sent by:** `sendStopLogging(device, testId, iterationId, userId)` — called when last iteration finishes and `destination === "EXTERNAL"`.

### 5.3 Messages received BY Node.js FROM external devices

#### KPI / Cell signal message (queue: `xperf-cell-kpi-device-events`)

**Handler:** `handleKPI(dto, rawMsg)` in `rabbitMQFunctions.js`

If `dto.networkType` is present → `processCellKpi(udid, dto)` → inserts into `telephony.trace.logs`:
```json
{
  "networkType": "LTE | NR5G",
  "lat": 37.7749,
  "lng": -122.4194,
  "timestamp": 1700000000000,
  "testId": "string",
  "cellLte": { "pci": "", "frequency": "", "rsrp": -80, "rsrq": -10, "rssnr": 15, "rssi": -70, "dbm": -80 },
  "cellNr": { "pci": "", "frequency": "", "csiRsrp": -90, "csiRsrq": -12, "csiSinr": 14, "rssi": -75, "dbm": -90 }
}
```

If no `networkType` → `processArtifactUpload(udid, dto)` [artifact upload notification].

#### Call state message (queue: `xperf-call-states`, routing: `*.xperf-call-states`)

**Handler:** `handleCallState(dto, rawMsg)` in `rabbitMQFunctions.js`

The `dto` is the call state object. Node.js finds the in-progress test for the device and calls `handleExternalTestProgress(momtTest, device, state)`.

#### Artifact upload message (queue: `xperf-cell-kpi-artifacts`, routing: `*.xperf-artifacts`)

**Handler:** `handleArtifacts(dto, rawMsg)` in `rabbitMQFunctions.js`

```json
{ "testId": "string", "url": "string (path)", "size": "number" }
```

Determines content type from filename: `.html` → `REPORT`, otherwise → `NETWORK_KPI`.  
Adds artifact to the test's artifact array if not already present.

#### Device registration (queue: `xperf-device-registry`, routing: `xperf.devices`)

**Handler:** `registerExternalDevice(dto, rawMsg)` in `rabbitMQFunctions.js`

```json
{
  "udid": "string",
  "imei": "string",
  "phoneNumber": "string",
  "oem": "string",
  "os": "string",
  "osVersion": "string",
  "name": "string",
  "serialNumber": "string"
}
```

Creates or updates device in `devices` collection with `deviceStateCode: 'ONLINE'`.

### 5.4 telephony_logs_service RabbitMQ (internal)

**File:** `telephony_logs_service/src/main/resources/application.properties` + `RabbitConfig.java`

| Config | Value |
|---|---|
| Exchange type | Direct |
| Commands request queue | `snap.trace.{labId}.commands.requests` |
| Commands response queue | `snap.trace.commands.responses` |
| Logs queue | `snap.trace.logs` |
| Pattern | RPC (request/reply correlation) |

Logs consumer: `@RabbitListener(queues = "#{logsQueue}")` → inserts `LogEntity` into `telephony.trace.logs`.

### 5.5 logs_video_service RabbitMQ (internal)

**File:** `logs_video_service/src/main/resources/application.properties`

| Config | Value |
|---|---|
| Exchange | `snap_dev` (direct) |
| Video queue | `snap_dev_sqs_video_queue` |
| Log queue | `snap_dev_sqs_log_queue` |
| Network KPI queue | `snap_dev_network_kpi` |
| S3 bucket | `snap-logcat-dev` |

Commands consumed by `MessageConsumer.java`:
- Video: START, SAVE, STOP, CANCEL, CLEAN
- Log: START, LOG, STOP, CANCEL, CLEAN
- UserAction: START, ACTION, STOP
- DeviceKpi: START, ACTION, STOP
- NetworkKpi: START, ACTION, STOP
- NetworkProc: START, ACTION, STOP

---

## 6. State Machines

### 6.1 Action Types Reference

**File:** `snap_angular_webapp/src/app/main/momt-call/interfaces/momt-action.interface.ts`

| Enum member | Value string | UI label |
|---|---|---|
| `DIALING` | `MO_DIALING_MT` | MO dials to MT |
| `ANSWER` | `MT_ANSWER` | MT answers call |
| `SPEAKING` | `MO_MT_SPEAKING` | Verify Connected state |
| `END` | `MT_END_CALL` | MT ends up call |
| `DELAY` | `ITERATION_DELAY` | Delay between iterations |
| `MT_START` | `MT_WAIT_START` | RMO device dials MT |
| `MT_SPEAKING` | `MT_SPEAKING` | Verify Connected state |
| `VOICEMAIL_ACTIVATION` | `MO_MT_VOICEMAIL_ACTIVATION` | Call forwarded to Voicemail |
| `VOICEMAIL_RECORDING` | `MO_VOICEMAIL_RECORDING` | Verify Connected state |
| `MO_END` | `MO_END_CALL` | MO ends up call |
| `MO_MT_RINGING` | `MO_MT_RINGING` | Verify Ringing state |
| `MT_RINGING` | `MT_RINGING` | Verify Ringing state |
| `MT_WAIT_END` | `MT_WAIT_END` | MT closes call |
| `MO_DIALING` | `MO_DIALING` | MO dials to RMT |
| `RMT_ANSWER` | `RMT_ANSWER` | RMT answers call |
| `MO_SPEAKING` | `MO_SPEAKING` | Verify Connected state |
| `MO_WAIT_END` | `MO_WAIT_END` | RMT closes call |
| `MO2_DIALING_MT` | `MO2_DIALING_MT` | MO2 dials to MT |
| `MO2_MT_RINGING` | `MO2_MT_RINGING` | Verify Ringing state |
| `MO_MO2_MT_SPEAKING` | `MO_MO2_MT_SPEAKING` | Verify Connected state |
| `MT_MERGE_CALL` | `MT_MERGE_CALL` | MT performs Merge Calls |
| `ANSWER2` | `MT_ANSWER2` | MT answers call |
| `MT_SWAP_CALL` | `MT_SWAP_CALL` | MT performs Swap Call |
| `MO_DIALING_MT2` | `MO_DIALING_MT2` | MO dials to MT2 |
| `MO_MT2_RINGING` | `MO_MT2_RINGING` | Verify Ringing state |
| `MT2_ANSWER` | `MT2_ANSWER` | MT2 answers call |
| `MO_MT_MT2_SPEAKING` | `MO_MT_MT2_SPEAKING` | Verify Connected state |
| `MT2_END_CALL` | `MT2_END_CALL` | MT2 ends up call |
| `MO_MESSAGING` | `MO_MESSAGING` | MO sends SMS text to RMT |
| `MESSAGING` | `MO_MESSAGING_MT` | MO sends SMS text to MT |
| `RECEIVE_SMS` | `MT_RECEIVE_SMS` | MT receives SMS from MO |
| `SPEED_TEST` | `SPEED_TEST` | Device speed test |

### 6.2 Feature 1: Remote VoIP (VOIP_MO_MT) State Machine

**Core file:** `snap_node_server/services/telephonyFunctions.js` — `startAwsMoMtTest()`

```
Start: startAwsMoMtTest()
  ├── Find device type 'VOIP_MT' from test.devices → mt (AWS Connect phone number, no physical device)
  ├── Find device type 'EXTERNAL_MO' from test.devices → mo (external device, RabbitMQ controlled)
  ├── Find moDevice in DB → Device record with udid field
  ├── sendDialCommand(moDevice, mt.phone)
  │     Publishes: { command: 'DIAL', phoneNumber: mt.phone }
  │     Routing key: {moDevice.udid}.xperf-testing
  ├── setExternalMoMtStartTimeout(momtId, startTimeout, 1, undefined)
  │     Note: no mtDevice passed — VoIP MT has no DB device
  └── setIterationTimeout(test, 1, [])

Progress via handleCallState (RabbitMQ xperf-call-states queue):
  handleCallState → handleExternalTestProgress(momtTest, device, state)

Action sequence (inferred from EXT_MO_MT pattern used in iteration):
  MO_DIALING_MT → [timeout if EXTERNAL_MO does not reach DIALING]
  [External MO calls AWS Connect number]
  [On success: MT_WAIT_START or similar completion action]
  → nextIteration → PASS or FAILED
```

**Key difference from EXT_MO_MT:** For VOIP_MO_MT, `setExternalMoMtStartTimeout` is called without mtDevice (3rd argument is `undefined`), because VOIP_MT is not a physical device monitored by SnapBox.

**Iteration loop:** `startExternalMoMtIteration()` handles subsequent iterations for both EXT_MO_MT and VOIP_MO_MT (case statement at line 839 in telephonyFunctions.js).

### 6.3 Feature 4: Remote-to-Remote Voice Call (EXT_MO_MT) State Machine

**Core file:** `snap_node_server/services/telephonyFunctions.js`

```
Start: startExternalMoMtTest()
  ├── Find MT device (type 'MT') in test.devices
  ├── Find mtDevice in DB
  ├── subscribeDevice(mtDevice)
  │     POST {labDomain}SnapBox/api/v1/devices/{sn}/monitoring?type=CALL_STATE&command=START
  ├── setExternalMoMtStartTimeout(momtId, startTimeout, 1, mtDevice)
  └── setIterationTimeout(test, 1, [mtDevice])

Progress trigger: SnapBox callback → POST /api/devices/call/update
  → Node routes to handleTestProgress(test, device, status)
  → handleExternalTestProgress(momtTest, device, state)

Action sequence per iteration:
  MO_DIALING_MT [IDLE]
       │
       │  initiateRemoteCall(moDevice, mt.phone)
       │  = sendDialCommand(moDevice, mt.phone) via RabbitMQ
       │  routing key: {moDevice.udid}.xperf-testing
       ▼
  MO_DIALING_MT [PROGRESS]
       │  setExternalMoMtStartTimeout fires if no call state within startTimeout
       ▼
  [External MO device receives DIAL command, dials MT]
  [MT receives incoming call → SnapBox fires CALL_STATE callback]
  [MT reaches RINGING state]
       │
       │  finishAction(MO_DIALING_MT → MT_WAIT_START or next)
       ▼
  [Call in progress...]
       │
       │  [External MO ends call OR timeout]
       ▼
  nextIteration → PASS or FAILED
       │  if last iteration: stopRecording, unsubscribeDevice(mtDevice)
       │  if destination=EXTERNAL: stopExternalRecording(moDevice)
       ▼
  Test status: COMPLETED | FAILED
```

**Recording for EXTERNAL_MO:** `startExternalRecording(externalMo, testId, iterationId)` → `sendStartLogging()` via RabbitMQ. Stop via `stopExternalRecording()` → `sendStopLogging()`.

### 6.4 Feature 2: Remote Short SMS Without Validation (MO_SMS) State Machine

**Core file:** `snap_node_server/services/telephonyFunctions.js` — `startSimpleSmsTest()`

```
Start: startSimpleSmsTest(test, devices)
  ├── moDevice = devices[0] (only one device, type 'MO')
  ├── phoneNumber = test.parameters.find(p => p.name === 'phoneNumber').value
  ├── text = test.parameters.find(p => p.name === 'text').value
  ├── [optional: startLogging if CALL_LOG artifact selected]
  ├── play = MomtCallTestPlay.findOne({ momtId, status: "PROGRESS", order: 1 })
  └── result = await sendSms(moDevice, phoneNumber.value, text.value)
        POST {labDomain}SnapBox/api/sendSMS
        body: { serialNumber, phoneNumber, message }

  if result.status !== 200 OR result.data.tool_Result === 'Fail':
    failAction(play._id, 'MO_MESSAGING', [{code: 400, message: "Unable to send sms..."}])
    nextIteration(play._id, devices, 'FAILED')
  else:
    finishAction(play._id, 'MO_MESSAGING')
    nextIteration(play._id, devices, 'PASS')

Action sequence:
  MO_MESSAGING [PROGRESS]
       │
       │  sendSms(moDevice, targetPhone, text)
       ▼
  MO_MESSAGING [PASS | FAILED]  (synchronous, no waiting for delivery)
       │
       ▼
  ITERATION_DELAY (if repeatCount > 1)
       │
       ▼
  Next iteration or COMPLETED
```

**No MT device required.** Sends to any phone number (parameter). No validation of delivery. Result is purely whether the SnapBox send call succeeded.

**Iteration restart:** `startSmsIteration()` handles subsequent iterations, same logic for `MO_SMS` type via `simpleSmsTest()` inner function.

### 6.5 Feature 5: Remote SMS With Validation (MO_MT_SMS) State Machine

**Core file:** `snap_node_server/services/telephonyFunctions.js` — `startSmsTest()`, `handleSmsTestProgress()`

```
Start: startSmsTest(test, devices)
  ├── Find MO device (type 'MO'), mtDevice (type 'MT')
  ├── subscribeTextDevice(mtDevice)
  │     POST {labDomain}SnapBox/api/v1/devices/{sn}/monitoring?type=INCOMING_SMS&command=START
  ├── [optional: startLogging]
  └── result = await sendSms(moDevice, mt.phone, text.value)

  if send fails:
    failAction(play._id, 'MO_MESSAGING_MT', [...])
    nextIteration(play._id, devices, 'FAILED')
  else:
    handleSendAction(test, devices, 1)
      finishAction(play._id, 'MO_MESSAGING_MT', 'MT_RECEIVE_SMS')
      setTimeout(receiveAction.data.timestamp, →
        if MT_RECEIVE_SMS still PROGRESS: fail + nextIteration FAILED
      )
      setIterationTimeout(test, 1, devices)

Action sequence:
  MO_MESSAGING_MT [PROGRESS]
       │
       │  sendSms(moDevice, mt.phone, text)
       ▼
  MO_MESSAGING_MT [PASS]
  MT_RECEIVE_SMS [PROGRESS]
       │
       │  Wait for SnapBox INCOMING_SMS callback → POST /api/devices/notifications/sms
       │  → handleTextTestProgress → handleSmsTestProgress(test, deviceInfo, text, phoneNumber)
       │
       │  Validation (Android only):
       │    phoneNumber check: mo.phone.slice(-10) === incomingPhone.slice(-10)
       │    text content: expectedText.value === combinedText
       │  Multi-part SMS:
       │    partsExpected = Math.ceil(expectedText.length / 160)
       │    partsReceived accumulated in DeviceTesting.data.text + .parts
       │    Timeout between parts: currentAction.data.subsequentTimeout
       ▼
  MT_RECEIVE_SMS [PASS | FAILED]
       │
       ▼
  ITERATION_DELAY (if repeatCount > 1)
       │
       ▼
  Next iteration or COMPLETED

iOS (Apple) behavior:
  - Phone number validation: SKIPPED
  - Text content validation: SKIPPED
  (oem.toUpperCase() !== 'APPLE' check before each validation)
```

**Cleanup:** On last iteration: `unsubscribeTextDevice(device)` → `POST SnapBox/api/v1/devices/{sn}/monitoring?type=INCOMING_SMS&command=STOP`

### 6.6 Feature 3: Remote Video Playback — Artifact Pipeline State Machine

Video is an artifact type that can be selected on any telephony test. It is not a standalone test type.

```
Test start: startRecording(test, devices)
  For each device with VIDEO artifact selected:
    startLogsVideo(test, device, deviceArtifacts)
      ├── Check/deactivate any existing active DeviceRecording session
      │     If exists: POST {labDomain}SnapBox/api/v2/devices/{sn}/logs/stop?operationId=...
      ├── deviceManualSessionEntry() → new DeviceRecording { type: "momt", operationId: new ObjectId() }
      └── POST {labDomain}SnapBox/api/v2/devices/{sn}/logs/start
            body: {
              type: "momt",
              internalPath: "automation/Telephony/call/{test.type}",
              userId: session.userId,
              operationId: session.operationId,
              artifactTypes: ["VIDEO", "DEVICE_LOG", "USER_ACTIONS", "DEVICE_KPIS", "NETWORK_KPI"]
            }
            (ArtifactTypeMap: LOG→DEVICE_LOG, VIDEO→VIDEO, USER_ACTION→USER_ACTIONS,
             KPIS→DEVICE_KPIS, NETWORK_KPI→NETWORK_KPI)

SnapBox agent → logs_video_service (via snap_dev exchange):
  Receives START command with artifact types list
  Begins capturing video (screen recording), device logs, user actions, KPIs, network KPIs

Test completes (nextIteration last): stopRecording(test, devices)
  For each device:
    stopLogsVideo(test, device)
      Finds active DeviceRecording session
      POST {labDomain}SnapBox/api/v2/devices/{sn}/logs/stop?operationId=...
      (deactivates session, does NOT delete)

logs_video_service receives STOP command:
  Finalizes video recording (FFmpeg processing)
  Uploads to S3 bucket: snap-logcat-dev
  Path: automation/Telephony/call/{test.type}/...
  Sends upload notification back (via RabbitMQ or callback) with S3 URL and size

Test status: FINALIZING (while artifacts upload)
  MomtCallTest.artifacts[n].status = 'FINALIZING' (non CALL_LOG/TRACE_LOG artifacts)
  When logs_video_service completes upload:
    MomtCallTest.artifacts[n].status = 'COMPLETED'
    MomtCallTest.artifacts[n].result.payload = { storage: "S3", name, size, url }

Test status: COMPLETED (when all artifacts done)

Frontend polling (momt-test-report.component.ts):
  Every 20s during FINALIZING status
  GET /api/automation/telephony/tests/:momtId
  Displays artifacts tabbed by device
  Download via: GET /api/file-storage/download?<query>
    Returns pre-signed S3 URL
  Bulk download: GET /api/automation/telephony/tests/:momtId/download-zip
    Returns binary ZIP stream
```

**Artifact content types** (`ArtifactTypeEnum` in Angular, `snap_angular_webapp/src/app/shared/enum/artifact-type.enum.ts`):

| Enum value | Display name | Description |
|---|---|---|
| `VIDEO` | Video | Screen recording of device |
| `LOG` | Device Logs | ADB/device logs |
| `USER_ACTION` | User Actions | Recorded touch/actions |
| `KPIS` | Device KPIs | Device performance metrics |
| `CALL_LOG` | Call Log | In-memory text log, uploaded to S3 at end |
| `TRACE_LOG` | Trace log | DFIT telephony trace (from telephony_logs_service) |
| `NETWORK_KPI` | Network KPIs | Network performance data from external device |

---

## 7. SnapBox Integration (Lab Agent API)

**SnapBox** is the Java lab agent running at each lab on port 8080 with context path `/SnapBox`. All calls go through `requestDeviceLab()` in `snap_node_server/services/commonFunctions.js`, which uses the device's `labDomain` field as base URL.

### 7.1 Call Control Endpoints

All under `{labDomain}SnapBox/api/v1/telephony/devices/{serialNumber}/call/`

| Endpoint | Method | Purpose | Timeout |
|---|---|---|---|
| `call/initiate?phoneNumber={phone}` | POST | MO dials a number | 40000ms |
| `call/accept` | POST | MT answers incoming call | 20000ms |
| `call/decline` | POST | Device hangs up | 20000ms |
| `call/merge` | POST | MT merges calls (3-way) | 20000ms |
| `call/swap` | POST | MT swaps active calls | 20000ms |
| `call/status` | GET | Get current call state (returns `{status: "IDLE|DIALING|RINGING|CONNECTED"}`) | default |

### 7.2 Monitoring Subscription Endpoints

| Endpoint | Method | Parameters | Purpose |
|---|---|---|---|
| `SnapBox/api/v1/devices/{sn}/monitoring` | POST | `type=CALL_STATE&command=START` | Subscribe to call state changes |
| `SnapBox/api/v1/devices/{sn}/monitoring` | POST | `type=CALL_STATE&command=STOP` | Unsubscribe from call state |
| `SnapBox/api/v1/devices/{sn}/monitoring` | POST | `type=INCOMING_SMS&command=START` | Subscribe to incoming SMS |
| `SnapBox/api/v1/devices/{sn}/monitoring` | POST | `type=INCOMING_SMS&command=STOP` | Unsubscribe from SMS |

**File:** `snap_node_server/services/telephonyFunctions.js` (call monitoring), `snap_node_server/services/textFunctions.js` (SMS monitoring)

### 7.3 SMS Endpoints

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `SnapBox/api/sendSMS` | POST | `{ serialNumber, phoneNumber, message }` | Send SMS from device | 40000ms |

**File:** `snap_node_server/services/textFunctions.js`

### 7.4 Logging/Recording Endpoints

| Endpoint | Method | Body/Params | Purpose |
|---|---|---|---|
| `SnapBox/api/v2/devices/{sn}/logs/start` | POST | `{ type, internalPath, userId, operationId, artifactTypes[] }` | Start capturing artifacts |
| `SnapBox/api/v2/devices/{sn}/logs/stop?operationId={id}` | POST | — | Stop capturing, trigger upload |

**File:** `snap_node_server/services/telephonyFunctions.js` — `startLogsVideo()`, `stopLogsVideo()`

### 7.5 Subscription Count Management

Node.js maintains an in-memory `deviceSubscriptionCount` Map (in telephonyFunctions.js) to avoid unsubscribing a device from CALL_STATE monitoring while:
1. A webhook is still registered for `DEVICE_INCOMING_CALL` or `DEVICE_STATE_CHANGED`
2. Another test is still using the same device

---

## 8. AWS Connect Integration (VoIP)

**File:** `snap_node_server/services/amazonConnect.js`

### 8.1 AWS Configuration

```javascript
const connectClient = new ConnectClient({
    credentials: {
        secretAccessKey: "<REDACTED>",
        accessKeyId: "<REDACTED>",
    },
    region: "us-east-1"
});
const INSTANCE_ID = "ef7dd460-a1ac-4c38-ba47-902843529021";
const INSTANCE_ARN = "arn:aws:connect:us-east-1:891377061473:instance/ef7dd460-a1ac-4c38-ba47-902843529021";
```

**SDK:** `@aws-sdk/client-connect`

### 8.2 getAvailablePhones()

Calls `ListPhoneNumbersCommand` with:
- `PhoneNumberCountryCode: "US"`
- `PhoneNumberType: "DID"`
- `MaxResults: 100`

Fallback if AWS call fails (hardcoded):
```javascript
[
  { PhoneNumber: '+1 214-257-0986' },
  { PhoneNumber: '+1 702-577-0258' },
  { PhoneNumber: '+1 702-577-2681' },
]
```

Response shape: `PhoneNumberSummaryList` → each item has `{ Id, Arn, PhoneNumber, PhoneNumberType, PhoneNumberCountryCode }` (matches `VOIPDevice` interface in Angular).

### 8.3 How VoIP Test Uses AWS Connect

1. Frontend calls `GET /api/voip/available` → gets list of DID numbers.
2. User selects a phone number (or bulk test auto-assigns).
3. Test is saved with `devices: [{ type: "VOIP_MT", phone: "+12142570986", sn: "", name: "AWS Connect", os: "N/A", udid: "" }]`.
4. On test start, `startAwsMoMtTest()` calls `sendDialCommand(moDevice, mt.phone)` → external device dials the AWS Connect DID.
5. AWS Connect routes the call (IVR/flow configured in AWS Console — SNAP code has no control over call routing within AWS Connect).
6. External device call state changes are received via RabbitMQ `xperf-call-states` queue.

**Important:** AWS Connect call flow configuration is outside the SNAP codebase.

---

## 9. Artifact & Video Pipeline

### 9.1 Artifact Selection Flow

When user creates a test, they select artifacts via `artifactSelection: string[]` (e.g. `["VIDEO", "LOG", "CALL_LOG"]`).

`convertArtifacts(artifactSelection, devices)` in `routes/telephony.js` transforms this into the `artifacts` array on the test document — one artifact entry per selected type per device (matching device serial numbers).

### 9.2 Artifact Status Lifecycle

```
IDLE → PROGRESS (test started) → FINALIZING (iteration complete) → COMPLETED (S3 upload done)
                                                                  → FAILED (upload error)
                                                                  → CANCELED
```

- `CALL_LOG` and `TRACE_LOG` are excluded from the FINALIZING batch update (they are handled separately).
- `CALL_LOG` is uploaded via `uploadLogFile(momtId, userId, testType)` in `logFunctions.js` to `snap-logcat-dev` bucket.
- `TRACE_LOG` artifacts are added from the `stopTraceMonitoring()` response (DFIT only).
- `NETWORK_KPI` and `REPORT` artifacts for external devices are added from RabbitMQ `handleArtifacts()` handler.

### 9.3 S3 Bucket Structure

| Bucket | Used for |
|---|---|
| `qube-project-files` | User-uploaded files (`remoteFolders` feature) |
| `snap-logcat-dev` | All telephony test artifacts (videos, logs, call logs, trace logs) |

**File:** `snap_node_server/services/s3upload.js`

Key functions:
- `uploadDirectFileS3(bucket, key, stream)` — direct upload
- `uploadRemoteFolderFile(key, stream)` — uploads to `remoteFolderBucket` (`snap-logcat-dev`)
- `downloadFilesAsZip(bucket, keys[])` — returns array of ReadStreams for ZIP assembly
- `sizeOf(bucket, key)` — HeadObject ContentLength
- `getUrlFromS3Bucket(bucket, key)` — pre-signed URL
- `downloadFilesFromS3(bucket, key)` — pre-signed URL (alias)

### 9.4 Video Processing

**Service:** `logs_video_service` (Spring Boot, port 8081)  
**Technology:** FFmpeg (used internally by logs_video_service for screen recording finalization)  
**Storage:** Uploads to `snap-logcat-dev` S3 bucket  
**Path pattern:** `automation/Telephony/call/{testType}/...`

### 9.5 Frontend Video Display

**File:** `snap_angular_webapp/src/app/main/momt-call/momt-test-report/momt-test-report.component.ts`

- Polls test status every 20 seconds during `FINALIZING`.
- Once artifact status is `COMPLETED`, displays download link.
- Download calls `GET /api/file-storage/download?<queryParam>` which returns pre-signed S3 URL.
- Bulk download: `downloadAllArtifacts(testId)` → `getZip()` from NetworkService → `GET /api/automation/telephony/tests/:id/download-zip` → binary ZIP via archiver.

---

## 10. DFIT Trace Monitoring Pipeline

DFIT (Drive/Field/Integration Testing) is activated when `destination === "DFIT"` on a test.

### 10.1 Start Trace Monitoring

**File:** `snap_node_server/services/telephonyFunctions.js` — `startTraceMonitoring(devices)`

```javascript
// 1. Start location monitoring for each device
await startLocationMonitoring(devices);

// 2. Build devices map with IMEI from DeviceDynamicFields
devicesMap = [{ sn: "ABC", imei: "123456789" }, ...]

// 3. POST to telephony_logs_service
POST http://localhost:8084/telephony/commands?type=START_COLLECTING_LOGS
body: {
  labId: config.get("telephonyLabId"),  // "1234" in dev
  devices: [{ sn, imei }],
  eventTypes: ["START_CALL", "NORMAL_RELEASE_CALL", "DROP_CALL", "ABORT_CALL", "CANCEL_CALL"]
}

// Returns: { status: "SUCCESS", sessionId: "uuid" }
// sessionId stored in MomtCallTest.sessionId
```

### 10.2 Log Time Offset Synchronization

After `START_COLLECTING_LOGS`, Node.js calls `updateLogTimeOffset()`:

```
POST /telephony/commands?type=GET_DEVICE_MODEM_DATE
body: { labId, sessionId, devices: [{ sn, imei }] }
→ returns device timestamps
→ calculates dateOffset = now() - device.timestamp
→ POST /telephony/commands?type=SET_DEVICE_PROPERTIES
   body: [{ sn, timestamp: now(), dateOffset }]
```

This ensures log timestamps are aligned with server time.

### 10.3 Location Monitoring

`startLocationMonitoring()` → for each device:
1. `getDeviceLocation(deviceEntity)` — GET device location from SnapBox
2. `updateDeviceLocation(sn, lat, lng)` → `POST /telephony/commands?type=SET_DEVICE_PROPERTIES` with location
3. `startDeviceLocationMonitoring(deviceEntity)` — starts periodic location polling

### 10.4 Stop Trace Monitoring

`stopTraceMonitoring(sessionId)`:
```
POST http://localhost:8084/telephony/commands?type=STOP_COLLECTING_LOGS
body: { labId, sessionId }
→ returns { logFiles: [{ path, sn, size }] }
```

The response `logFiles` are mapped to `TRACE_LOG` artifacts and pushed to the test's artifacts array.

### 10.5 telephony_logs_service Command Flow

**File:** `telephony_logs_service/src/main/java/snapBox/snap/web/CommandsController.java`

| Command type | Action |
|---|---|
| `START_COLLECTING_LOGS` | Generate UUID sessionId, send RPC to trace agent via `snap.trace.{labId}.commands.requests` queue |
| `STOP_COLLECTING_LOGS` | Send RPC to stop, return logFiles list |
| `GET_DEVICE_MODEM_DATE` | Query trace agent for device modem timestamp |
| `SET_DEVICE_PROPERTIES` | Push location/offset properties to trace agent |

### 10.6 DFIT KPI Metrics (Angular)

**File:** `snap_angular_webapp/src/app/main/dfit/dfit.service.ts`

KPI types tracked:

| KPI | Description |
|---|---|
| `QCI` | QoS Class Identifier |
| `5QI` | 5G QoS Indicator |
| `VVQ` | Voice/Video Quality |
| `RTP_JITTER` | RTP jitter (ms) |
| `RTP_PACKET_LOSS` | RTP packet loss (%) |
| `AUDIO_DATA_RATE_DL` | Audio download rate |
| `AUDIO_DATA_RATE_UL` | Audio upload rate |
| `RX_DELAY` | Receive delay |
| `RX_DELTA_DELAY` | Delta receive delay |
| `RSRQ` | Reference Signal Received Quality |
| `RSSI` | Received Signal Strength Indicator |
| `SINR` | Signal-to-Interference-plus-Noise Ratio |
| `RSRP` | Reference Signal Received Power |

Endpoints:
- `GET api/automation/telephony/tests/{id}/plays/{playId}/metrics` — per-iteration KPIs
- `POST api/automation/telephony/tests/{id}/metrics-summary` — aggregate metrics for map view

Threshold types in `markLogs()` (`telephonyFunctions.js` lines 3248–3309):
- `SIGNAL_QUALITY` layer: `rsrp`, `rsrq`, `sinr`, `rssi` checked against `TelephonyTraceThreshold`
- `SIP` layer + `SIP_EVENT` eventType: `ALERT` if `eventData.result !== 'Success'`
- `IRAT_HANDOVER` layer + `COMPLETED` event: same
- `RRC` layer + `RRC_EVENT` event: same

Verbosity types: `ERROR`, `ALERT`, `WARNING` (set on `metricsVerbosityType` field of each log entry)

---

## 11. SMS Feature Deep-Dive

### 11.1 MO_SMS — Simple SMS (No Validation)

```
Required parameters:
  - phoneNumber (string, required): target phone number (can be any number, not MT's phone)
  - text (string, required): message content

Required devices:
  - 1x MO device (type: 'MO')

Action sequence:
  [MO_MESSAGING]

Execution:
  sendSms(moDevice, phoneNumber.value, text.value)
  → POST {labDomain}SnapBox/api/sendSMS
  → body: { serialNumber: moDevice.serialNumber, phoneNumber, message: text }
  → timeout: 40000ms
  → success determined by: result.status === 200 AND result.data.tool_Result !== 'Fail'

Result: PASS if SnapBox API call succeeds, FAILED otherwise
No delivery verification.
```

### 11.2 MO_MT_SMS — SMS With Validation

```
Required parameters:
  - text (string, required): message content to send AND verify

Required devices:
  - 1x MO device (type: 'MO') — sends the SMS
  - 1x MT device (type: 'MT') — receives and validates the SMS

Action sequence:
  [MO_MESSAGING_MT] → [MT_RECEIVE_SMS]

Multi-part SMS handling:
  partsExpected = Math.ceil(text.length / 160)
  Each incoming SMS from SnapBox callback adds to DeviceTesting.data.text (accumulated)
  partsReceived tracked in DeviceTesting.data.parts
  Between parts: subsequentTimeout timer (from action.data.subsequentTimeout)
  When partsReceived < partsExpected: wait for next part (with timeout)
  When partsReceived >= partsExpected: validate full text

Validation rules (Android only — iOS skipped):
  1. Sender phone match: mo.phone.slice(-10) === incomingPhoneNumber.slice(-10)
     - If mismatch: ignore the SMS (return, do not fail — may be from another sender)
  2. Text content match: expectedText.value === combinedText
     - If mismatch: failAction('MT_RECEIVE_SMS', [{code: '400', message: 'Text verification failed'}])

iOS behavior:
  - Sender validation: SKIPPED (oem.toUpperCase() !== 'APPLE' check)
  - Text validation: SKIPPED (same check)
  - iOS test always passes if SMS is received (regardless of sender or text content)

Timeout:
  - MT_RECEIVE_SMS timeout: action.data.timestamp ms from send
  - Between parts: action.data.subsequentTimeout ms

SMS subscription lifecycle:
  Test start: subscribeTextDevice(mtDevice)
    POST {labDomain}SnapBox/api/v1/devices/{sn}/monitoring?type=INCOMING_SMS&command=START
  Test end (last iteration): unsubscribeTextDevice(device) for all devices
    POST {labDomain}SnapBox/api/v1/devices/{sn}/monitoring?type=INCOMING_SMS&command=STOP
    (skipped if webhook registered for DEVICE_INCOMING_TEXT on this device)
```

### 11.3 SMS Callback Chain

```
SnapBox agent (on incoming SMS)
  → POST Node.js /api/devices/notifications/sms
    body: { serialNumber, text, phoneNumber }
  
Node.js handler (in routes/devices.js or similar — exact handler file not confirmed):
  → finds test where device is involved and status is PROGRESS
  → calls handleTextTestProgress(test, deviceInfo, text, phoneNumber)
    → switch on test.type:
      'MO_MT_SMS' → handleSmsTestProgress(test, deviceInfo, text, phoneNumber)
      'MO_MT_CALL_SMS' → handleCallSmsTestProgress(test, deviceInfo, text, phoneNumber)
```

---

## 12. Angular Frontend Components

### 12.1 Module Structure

**File:** `snap_angular_webapp/src/app/main/momt-call/momt-call.module.ts`

The `momt-call` module is lazy-loaded. Entry route: navigates to `momt-main-view` component.

### 12.2 Key Components

| Component | File | Purpose |
|---|---|---|
| `MomtMainViewComponent` | `momt-main-view/momt-main-view.component.ts` | Top-level view, tab management |
| `MomtNewTestComponent` | `momt-new-test/momt-new-test.component.ts` | Create/configure/run a test |
| `MomtTableViewComponent` | `momt-table-view/momt-table-view.component.ts` | List of tests with status |
| `MomtTestReportComponent` | `momt-test-report/momt-test-report.component.ts` | Test results, artifacts, iterations |
| `TelephonyTestSidepanelComponent` | `components/telephony-test-sidepanel/` | Sidepanel for test details |
| `DeviceSelectionComponent` | `components/device-selection/` | Device picker UI |
| `DeviceDropdownComponent` | `components/device-dropdown/` | Dropdown for device selection |
| `IterationAccordionComponent` | `components/iteration-accordion/` | Iteration results display |
| `MultiDeviceSelectComponent` | `components/multi-screencast/multi-device-select.component.ts` | Multi-device screencast |
| `SpeedTestDataComponent` | `components/speed-test-data/` | Speed test results display |

### 12.3 MomtCallService

**File:** `snap_angular_webapp/src/app/main/momt-call/momt-call.service.ts`

| Method | HTTP call | Purpose |
|---|---|---|
| `saveTest(form)` | POST `api/automation/telephony/tests` | Save only |
| `updateTest(id, form)` | PUT `api/automation/telephony/tests/{id}` | Update saved test |
| `createAndStartTest(form)` | POST `api/automation/telephony/tests/start` | Create and run |
| `startTest(id, form)` | POST `api/automation/telephony/tests/start` | Run existing |
| `cancelTest(id)` | POST `api/automation/telephony/tests/{id}/cancel` | Cancel |
| `deleteTest(id)` | DELETE `api/automation/telephony/tests?momtIds={id}` | Delete |
| `getTestList(query)` | GET `api/automation/telephony/tests?page=...` | List |
| `getTestInfo(id)` | GET `api/automation/telephony/tests/{id}` | Single test |
| `getBulkInfo(bulkId)` | GET `api/automation/telephony/tests/bulks/{bulkId}/plays` | Bulk test plays |
| `getAvailableVOIP()` | GET `api/voip/available` | AWS Connect phones |
| `getAvailableExternalDevices()` | GET `api/v3/devicebooking/available/external` | External devices |
| `getAvailableLabDevices()` | GET `api/v3/devicebooking/available/momt` | Lab devices for MOMT |
| `getTestIterations(id, page, size, verbosityTypes, sort)` | GET `api/automation/telephony/tests/{id}/plays?...` | Iterations |
| `cancelArtifact(artifactId, testId)` | POST `api/automation/telephony/tests/{testId}/artifacts/cancel?artifactId=...` | Cancel artifact |
| `removeArtifact(artifactId, testId)` | POST `api/automation/telephony/tests/{testId}/artifacts/remove?artifactId=...` | Remove artifact |
| `downloadAllArtifacts(testId)` | GET `api/automation/telephony/tests/{testId}/download-zip` | Binary ZIP |
| `getFileDownloadApi(queryParam)` | GET `api/file-storage/download?{queryParam}` | File download URL |
| `getTestCaseList(query)` | GET `api/automation/telephony/test-cases?{query}` | Test case templates |
| `getIPerfServers()` | GET `api/iperf/servers` | iPerf servers (speed test) |
| `scheduleStartTest(request)` | POST `api/test-scheduler/add` | Schedule a test |
| `getScheduledTests(testIds)` | GET `api/test-scheduler?testIds=...` | Scheduled entries |
| `deleteTestSchedule(scheduleIds)` | POST `api/test-scheduler/delete` | Remove schedule |

### 12.4 DTOs

**File:** `snap_angular_webapp/src/app/main/momt-call/dto/new-momt.dto.ts`

`NewTelephonyDto` — request body for POST/PUT test endpoints.  
`SpeedTestDto` — alternate form for speed test type.  
`SpeedTestAction` — action definition for speed tests.

### 12.5 Test Status Display

**File:** `snap_angular_webapp/src/app/main/momt-call/interfaces/momt-test.interface.ts`

`MomtStatusMap` maps enum to display string:

| Status | Display |
|---|---|
| `IDLE` | Not Started |
| `PROGRESS` | In Progress |
| `FINALIZING` | Finalizing |
| `COMPLETED` | Completed |
| `FAILED` | Failed |
| `CANCELED` | Canceled |
| `SCHEDULED` | Scheduled |
| `CANCELLING` | Cancelling |
| `EXECUTING` | Executing |

### 12.6 MomtCallService Helper Methods

```typescript
getDeviceStatus(data: any): string
// Translates device state/stateCode/communicationStatus to display string
// 'online' | 'testing' | 'disconnected' | 'blocked' | 'unknown'

getTestCaseEstimate(testCase: TelephonyTestCase): number
// Returns estimated duration in ms
// MT_ANSWERS: 80000ms fixed
// MO_SMS: 5000ms fixed
// Others: sum of action.data.timestamp

calculateDuration(duration: number): string
// Formats seconds to "X days Y hours Z minutes"

displayDeviceType(deviceType: string): string
// 'EXTERNAL_MO' → 'Remote MO'
// 'VoIP_*' → 'VoIP *'
// Others: split on '_' and join with space
```

### 12.7 Scheduling

`scheduleStartTest(request)` builds a body with `testType: 'MOMT'` and `startTestRequest.url: api/automation/telephony/tests/{testId}/start-scheduled`, then posts to `api/test-scheduler/add` via `networkService.schedulePost`.

---

## 13. Authentication & Authorization

### 13.1 JWT Authentication

**Middleware:** `identityManager()` in `snap_node_server/middleware/auth.js`

JWT private key: `jmHXLjvdk+KdTsU4c2nR1imRQjbD9z8fm3lBzmOFeK8=` (from `default.json`)

All telephony endpoints require roles: `["USER", ...ENTERPRISE_ROLES]`

`req.jwtData.userId` — extracted userId used in test creation.

### 13.2 Feature Flags

**Middleware:** `featureManager()` in `snap_node_server/middleware/feature.js`

Required feature flags:
- `TELEPHONY_TEST` — required for all telephony test CRUD
- `BOOKING` — additionally required for start/cancel endpoints

### 13.3 Device Lab Authentication

`requestDeviceLab()` in `snap_node_server/services/commonFunctions.js` uses device-specific authentication (lab token) when making HTTP calls to SnapBox agents.

### 13.4 telephony_logs_service Authentication

Token: `telephonyLogServiceToken` from config (JWT). Passed as Bearer token in `requestJavaServer()` calls.

---

## 14. Configuration Reference

**File:** `snap_node_server/config/default.json`

| Key | Value | Used By |
|---|---|---|
| `environment` | `"dev"` | Logging |
| `app_domain` | `"http://localhost:4200"` | CORS |
| `jwtPrivateKey` | `"jmHXLjvdk+KdTsU4c2nR1imRQjbD9z8fm3lBzmOFeK8="` | JWT auth |
| `bcryptSalt` | `"$2b$10$oPd2gJERglqNiWXf3sYwIu"` | Password hashing |
| `dbMlab` | `"mongodb://snap-user:snap-user-d@localhost:27017/snap?..."` | MongoDB connection |
| `port` | `"8082"` | Node.js listen port |
| `requiresAuth` | `true` | Auth enforcement |
| `S3_SECRET_KEY` | `"<REDACTED>"` | AWS S3 |
| `S3_ACCESS_KEY` | `"<REDACTED>"` | AWS S3 |
| `S3_BUCKET_REGION` | `"us-east-2"` | AWS S3 |
| `S3_BUCKET_NAME` | `"qube-project-files"` | User file uploads |
| `localSetup` | `false` | Local dev mode |
| `remoteFolderBucket` | `"snap-logcat-dev"` | Artifact storage bucket |
| `telephonyLogServiceUrl` | `"http://localhost:8084"` | telephony_logs_service base URL |
| `telephonyLogServiceToken` | `"eyJhbGci..."` (JWT) | Auth for telephony_logs_service |
| `telephonyLabId` | `"1234"` | Lab ID sent to trace service |
| `rabbitMQUrl` | `"amqps://snap_iq:rQq2N9Wd1Ke1@18.217.222.7:5671/"` | RabbitMQ broker |
| `rabbitExchange` | `"snap_uat_xperf"` | RabbitMQ exchange name |
| `rabbitKPIQueue` | `"xperf-cell-kpi-device-events"` | KPI queue |
| `rabbitDeviceQueue` | `"xperf-device-registry"` | Device registration queue |
| `rabbitTestingQueue` | `"xperf-testing"` | Commands queue |
| `rabbitArtifactQueue` | `"xperf-cell-kpi-artifacts"` | Artifact upload notifications |
| `rabbitCallStateQueue` | `"xperf-call-states"` | External device call state |
| `rabbitRoutingKeyKPI` | `"*.xperf-cell-kpi"` | KPI routing key pattern |
| `rabbitRoutingKeyTesting` | `"*.xperf-testing"` | Commands routing key pattern |
| `rabbitRoutingKeyDevices` | `"xperf.devices"` | Device registration routing key |
| `rabbitRoutingKeyArtifacts` | `"*.xperf-artifacts"` | Artifact notification routing key |
| `rabbitRoutingKeyCallState` | `"*.xperf-call-states"` | Call state routing key pattern |
| `STRIPE_KEY` | `"sk_test_51JB2Fb..."` | Billing |
| `loginURL` | `"http://uat.snapautomation.com"` | Auth redirect |
| `max_otp_attempts` | `3` | OTP security |
| `otp_expiry_in_mins` | `15` | OTP TTL |
| `cheatOTP` | `true` | Dev: bypass OTP |
| `logsDeletePeriod` | `30` | Log auto-delete days |
| `userS3TotalSpace` | `10` | User S3 quota GB |
| `turnSecretKey` | `"99c4da0c..."` | WebRTC TURN |
| `SQS_URL` | `"https://sqs.us-east-1.amazonaws.com/..."` | AWS SQS for contact events |

### 14.1 telephony_logs_service Configuration

**File:** `telephony_logs_service/src/main/resources/application.properties`

| Property | Value |
|---|---|
| `server.port` | `8084` |
| MongoDB database | `telephony.trace.logs` collection |
| RabbitMQ commands request queue | `snap.trace.commands.responses` |
| RabbitMQ logs queue | `snap.trace.logs` |
| Heartbeat interval | `3000ms` |

### 14.2 logs_video_service Configuration

**File:** `logs_video_service/src/main/resources/application.properties`

| Property | Value |
|---|---|
| `server.port` | `8081` |
| Exchange | `snap_dev` (direct) |
| Video queue | `snap_dev_sqs_video_queue` |
| Log queue | `snap_dev_sqs_log_queue` |
| Network KPI queue | `snap_dev_network_kpi` |
| S3 bucket | `snap-logcat-dev` |

### 14.3 Node-config Override Pattern

Node.js uses the `config` package. To override for local development, create `config/local.json` with only the keys to override. `NODE_CONFIG_ENV` environment variable selects which config file is loaded.

---

## 15. Error Handling & Timeouts

### 15.1 Action-Level Timeouts

All action timeouts are set in milliseconds in each action's `data.timestamp` field.

**Functions:**
- `setTelephonyTimeout(testId, playId, timeout, actionType, deviceConfigs)` — generic per-action timeout stored in `momtTimeouts` Map keyed by testId.
- `clearMoMtActionTimeout(testId)` — clears and removes the timeout.

When a timeout fires:
1. Checks each device's current call status via `getDeviceStatus()`.
2. If any device is in wrong state: `failAction(playId, actionType, [{code:'408', message:'Timeout of X seconds exceeded'}])`.
3. Calls `nextIteration(playId, devices, 'FAILED')`.

### 15.2 Start Timeouts

Three start timeout functions (per test type):

| Function | Used for | Triggered if |
|---|---|---|
| `setMoMtStartTimeout()` | MO_MT, MO_MT_LONG, MT_VOICEMAIL, MERGE/SWAP/DIAL_MT2, MO_MT_CALL_SMS | MO does not reach DIALING state within `test.startTimeout` |
| `setMtStartTimeout()` | MT_ANSWERS | MT does not reach RINGING state within `test.startTimeout` |
| `setMoStartTimeout()` | MO_DIALS | MO does not reach DIALING within `test.startTimeout` |
| `setExternalMoMtStartTimeout()` | EXT_MO_MT, VOIP_MO_MT | External MO does not start dialing within `test.startTimeout` |

Error code for start timeouts: `408` with message `"Initialization timeout of X seconds exceeded"`.

### 15.3 Total Iteration Timeout

`setIterationTimeout(momtTest, order, devices)`:
- Total = sum of all action `data.timestamp` values + `test.startTimeout`.
- Timer set for `(total + startTimeout) * 1.5` ms.
- Fails any PROGRESS action with `"Total iteration timeout of X seconds exceeded"`.

### 15.4 Long Call / Long Delay Scheduling

When speaking duration ≥ 60000ms OR iteration delay ≥ 60s:
- `MomtScheduledIteration.create({userId, momtId, momtPlayId, iteration, startTime})` is written to MongoDB.
- A background cron or restart mechanism reads these and resumes the test.
- This provides crash recovery for long-running tests.

### 15.5 Test Failure Cleanup

`failTest(momtCallTest, devices, message)`:
1. Logs failure message (if CALL_LOG artifact).
2. If DFIT: `stopTraceMonitoring()` + `stopLocationMonitoring()`.
3. `stopRecording()` for all devices.
4. `unsubscribeDevice()` for all devices.
5. Unsubscribe SMS monitoring if MO_MT_CALL_SMS.
6. Updates all IDLE/PROGRESS plays to FAILED.
7. Sets test status to FAILED, artifact statuses to FINALIZING.
8. Uploads call log to S3.
9. `releaseDevices()` — deletes DeviceTesting records, optionally releases bookings if `test.releaseDevices === true`.

### 15.6 Error Codes Used

| Code | Meaning |
|---|---|
| `408` | Timeout exceeded |
| `400` | Validation failure (e.g. text mismatch) |
| `503` | Unable to perform action (e.g. cannot dial) |

### 15.7 SnapBox Response Validation

For SnapBox calls, success is determined by:
```javascript
result?.status === 200 AND result?.data?.tool_Result !== 'Fail'
```
The `tool_Result` field in SnapBox responses can be `'Fail'` even with HTTP 200. The exception detail is in `result?.data?.tool_Exception`.

---

## 16. Gaps & Clarifications Needed

The following items were not found in the scanned code or need clarification:

### 16.1 Not Found — Exact callback handler routes

The exact Node.js route handler files for SnapBox callbacks were not located:
- `POST /api/devices/call/update` — registered in `java_server/application.properties` but the handler file in `snap_node_server/routes/` was not scanned.
- `POST /api/devices/notifications/sms` — same situation.
- `POST /api/devices/monitoring` — same situation.

These likely live in `snap_node_server/routes/devices.js` or `snap_node_server/routes/adbDevices.js`. Developer must confirm which route file handles these callbacks and trace the call chain to `handleTestProgress()` and `handleTextTestProgress()`.

### 16.2 Not Found — `handleExternalTestProgress()` implementation

`handleExternalTestProgress(momtTest, device, state)` is called from `rabbitMQFunctions.js` `handleCallState()` for EXT_MO_MT and VOIP_MO_MT call state updates. The function is exported from `telephonyFunctions.js` but was not found in the scanned portions of that file (file is ~3300+ lines). Developer must search for this function to understand the EXT_MO_MT / VOIP_MO_MT call state progression logic.

### 16.3 Not Found — VoIP test action sequence

The exact action sequence (action types and order) for `VOIP_MO_MT` tests is not defined in the scanned Angular code (it's not in `MomtTypeMap` and there's no predefined test case template visible). The backend `startAwsMoMtTest()` only sends the DIAL command and sets timeouts — the complete action sequence depends on how the external device reports state back via RabbitMQ. Clarify what actions are stored in the test's `actions` array for VOIP_MO_MT.

### 16.4 Not Found — snap_backend (procal0-snap_backend-64a3887ee150) content

The `snap_backend` component (a separate service, directory `procal0-snap_backend-64a3887ee150`) was not scanned. If it plays any role in telephony features (e.g. additional API routes, device management), its contribution is unknown.

### 16.5 Not Found — xr_server content and relevance

The `xr_server` component was identified in the project but not scanned. Its role (if any) in the five features is unknown.

### 16.6 Not Found — logFunctions.js detail

`snap_node_server/services/logFunctions.js` contains `startLogging()`, `updateLog()`, `uploadLogFile()`. These manage the in-memory CALL_LOG artifact. The exact log file format, in-memory storage mechanism, and S3 upload key structure were not fully verified.

### 16.7 Not Found — locationFunctions.js detail

`snap_node_server/services/locationFunctions.js` contains `startDeviceLocationMonitoring()`, `stopDeviceLocationMonitoring()`, `getDeviceLocation()`. The polling interval and exact SnapBox endpoint used for location are unknown.

### 16.8 Not Found — AWS Connect call flow

What happens after the external device dials the AWS Connect DID number is controlled by the AWS Connect contact flow (IVR configuration). This is configured in the AWS Console, not in any SNAP codebase file. Developer must obtain the AWS Connect instance configuration separately.

### 16.9 Not Found — convertArtifacts() implementation

`convertArtifacts(artifactSelection, devices)` is called in `routes/telephony.js` line 374 but its implementation (in `commonFunctions.js` or inline) was not scanned. It maps the string array `artifactSelection` and device list to the `artifacts` array format.

### 16.10 Not Found — DeviceBooking model detail

The `DeviceBooking` collection schema used in the booking validation logic (finding active bookings for test start) was not fully scanned. Fields used include: `deviceSerialNumber`, `bookedFrom`, `bookedUntil`, `status` (`STARTED | UPDATED`).

### 16.11 Not Found — DFIT frontend detail

`snap_angular_webapp/src/app/main/dfit/dfit-test-report/dfit-test-report.component.ts` was identified as containing Highcharts charts, map view (`iterations-map-view`), event log, and summary cards, but was not fully re-read in this session. The exact chart types, map library, and VVQ/alert/error/warning card logic are unconfirmed. The file is large enough to warrant a dedicated read.

### 16.12 Partially Found — logs_video_service video processing

FFmpeg usage was confirmed from the previous session's summary but the exact Spring Boot code for video finalization and S3 upload in `logs_video_service` was not re-read. The START/STOP command protocol between SnapBox and logs_video_service (via `snap_dev` direct exchange) is known but the exact message formats are unconfirmed.

### 16.13 Not Confirmed — `MomtScheduledIteration` resume mechanism

`MomtScheduledIteration` records are written when delays ≥ 60s or call durations ≥ 60s are needed. But the consumer of these records (the cron or background job that reads them and calls `startTelephonyIteration()` at the right time) was not found in the scanned code. Developer must locate this scheduled job — likely in `snap_node_server/startup/` or a cron setup file.

---

*End of document. All information is sourced directly from the SNAP codebase. Items marked `[NOT FOUND IN CODE — NEEDS CLARIFICATION]` are gathered in Section 16.*
