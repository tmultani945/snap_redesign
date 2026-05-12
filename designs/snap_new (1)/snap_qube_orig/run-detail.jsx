/* SNAP Remote Portal — Run Detail (Live + Summary + Session + Artifact) */

const RunDetail = ({ runId, runs, onBack }) => {
  const run = runs.find(r => r.id === runId) || runs[0];
  const isLive = run.status === "PROGRESS" || run.status === "FINALIZING";
  const [tab, setTab] = pS(isLive ? "live" : "summary");
  const tabs = isLive
    ? [["live","Live"],["summary","Summary"],["session","Session"],["artifact","Artifact"]]
    : [["summary","Summary"],["session","Session"],["artifact","Artifact"]];

  return (
    <div className="page run-detail">
      {/* Sticky context header */}
      <div className="run-context">
        <div className="run-ctx-top">
          <button className="back-btn" onClick={onBack}>
            <Icon name="chevron" size={14} className="flip" /> Runs
          </button>
          <h1 className="run-title">{run.name}</h1>
          <Tag mono>{run.type}</Tag>
          <Tag>{run.dest}</Tag>
          <StatusChip status={run.status} />
          <span className="run-meta mono">iter {run.iter}/{run.total}</span>
          <span className="run-meta">started today {run.started}</span>
          <div className="run-ctx-actions">
            {isLive ? (
              <Btn icon="cancel" onClick={()=>{}}>Cancel</Btn>
            ) : (
              <>
                <Btn icon="repeat">Re-run</Btn>
                <Btn icon="download">Download ZIP</Btn>
              </>
            )}
          </div>
        </div>
        <nav className="run-tabs">
          {tabs.map(([k, l]) => (
            <button key={k} className={`run-tab ${tab===k ? "active" : ""}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </nav>
      </div>

      {tab === "live"     && <RunLive run={run} />}
      {tab === "summary"  && <ReportSummary run={run} onJumpSession={()=>setTab("session")} />}
      {tab === "session"  && <ReportSession run={run} onArtifact={()=>setTab("artifact")} />}
      {tab === "artifact" && <ReportArtifact run={run} />}
    </div>
  );
};

/* ============================================================
   LIVE
   ============================================================ */
const RunLive = ({ run }) => {
  const [events, setEvents] = pS([
    { t: "14:33:02.103", k: "snapbox", msg: "POST /SnapBox/api/v1/telephony/devices/S22-EXT-001/call/initiate" },
    { t: "14:33:02.418", k: "rmq",     msg: "publish DIAL → udid abc-123-def-456 · routing key abc-123-def-456.xperf-testing" },
    { t: "14:33:03.104", k: "state",   msg: "MO callstate → DIALING" },
    { t: "14:33:04.812", k: "state",   msg: "MT callstate → RINGING" },
    { t: "14:33:05.220", k: "kpi",     msg: "RSRP -82 dBm · RSRQ -10 · SINR 14" },
    { t: "14:33:05.871", k: "state",   msg: "MO callstate → CONNECTED" },
  ]);
  const [showRaw, setShowRaw] = pS(false);

  // simulate event tail
  pE(() => {
    const id = setInterval(() => {
      const samples = [
        { k: "kpi",   msg: `RSRP ${-78 - Math.floor(Math.random()*8)} dBm · RSRQ ${-9 - Math.floor(Math.random()*4)}` },
        { k: "rmq",   msg: "xperf-cell-kpi-device-events: dto.networkType=LTE" },
        { k: "state", msg: "MT callstate → CONNECTED" },
      ];
      const pick = samples[Math.floor(Math.random()*samples.length)];
      const t = new Date();
      const ts = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}.${String(t.getMilliseconds()).padStart(3,"0")}`;
      setEvents(ev => [...ev.slice(-30), { t: ts, ...pick }]);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const actions = run.type === "VOIP_MO_MT" || run.type === "EXT_MO_MT"
    ? [
        { enum: "MO_DIALING_MT",   human: "MO dials MT",       status: "PASS" },
        { enum: "MT_RINGING",      human: "MT rings",          status: "PASS" },
        { enum: "MO_MT_SPEAKING",  human: "Verify connected",  status: "PROGRESS" },
        { enum: "MT_WAIT_END",     human: "Call ends",         status: "IDLE" },
      ]
    : [
        { enum: "MO_MESSAGING_MT", human: "MO sends SMS",      status: "PASS" },
        { enum: "MT_RECEIVE_SMS",  human: "MT receives SMS",   status: "PROGRESS" },
      ];

  return (
    <div className="run-body grid-12">
      <div className="col-7">
        <Card title={`Iteration progress · ${run.iter} of ${run.total}`}>
          <IterDots done={run.iter - 1} total={run.total} />
          <div className="iter-meta">
            <span>Started {run.started}</span>
            <span>Elapsed {fmtDur(run.durSec)}</span>
            <span>ETA <span className="mono">~2m</span></span>
          </div>
        </Card>

        <Card title="Action timeline (current iteration)">
          <ActionTimeline actions={actions} />
        </Card>

        {run.dest === "DFIT" && (
          <Card title="Live KPIs · DFIT">
            <div className="mini-kpi-row">
              <KpiTile label="RSRP" value="-82" sub="dBm · good" />
              <KpiTile label="RSRQ" value="-10" sub="dBm · good" />
              <KpiTile label="SINR" value="14"  sub="dB · good" />
              <KpiTile label="VVQ"  value="3.9" sub="MOS · good" />
            </div>
          </Card>
        )}
      </div>

      <div className="col-5">
        <Card title="Device roles">
          <div className="role-cards">
            <RoleCard role="EXTERNAL_MO" device={DEVICES.ext1} state="CONNECTED" recent={[
              "RMQ DIAL +1 214-257-0986",
              "callstate DIALING",
              "callstate CONNECTED",
            ]} />
            {run.type === "VOIP_MO_MT" ? (
              <RoleCard role="VOIP_MT" voipPhone="+1 214-257-0986" state="CONNECTED" recent={["AWS Connect routing"]} />
            ) : (
              <RoleCard role="MT" device={DEVICES.mt1} state="RINGING" recent={[
                "subscribe CALL_STATE",
                "callstate RINGING",
              ]} />
            )}
          </div>
        </Card>

        <Card title="Live event log" action={
          <label className="raw-toggle">
            <input type="checkbox" checked={showRaw} onChange={e=>setShowRaw(e.target.checked)} />
            <span>Raw enums</span>
          </label>
        }>
          <div className="event-log">
            {events.slice().reverse().map((e, i) => (
              <div key={i} className={`event-row event-${e.k}`}>
                <span className="event-t mono">{e.t}</span>
                <span className={`event-tag mono event-tag-${e.k}`}>{e.k.toUpperCase()}</span>
                <span className="event-msg mono">{e.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const RoleCard = ({ role, device, voipPhone, state, recent }) => (
  <div className="role-card">
    <div className="role-head">
      <Tag mono>{role}</Tag>
      <span className={`call-state call-${state.toLowerCase()}`}>● {state}</span>
    </div>
    {device ? (
      <>
        <div className="role-name">{device.name}</div>
        <div className="role-meta mono">{device.sn}</div>
        <div className="role-meta">udid <span className="mono">{device.udid}</span></div>
      </>
    ) : (
      <>
        <div className="role-name mono">{voipPhone}</div>
        <div className="role-meta">AWS Connect DID</div>
      </>
    )}
    <div className="role-recent">
      {recent.map((r, i) => <div key={i} className="role-recent-row mono">→ {r}</div>)}
    </div>
  </div>
);

/* ============================================================
   SUMMARY
   ============================================================ */
const ReportSummary = ({ run, onJumpSession }) => {
  const ok = run.status === "COMPLETED";
  const passed = parseInt((run.pass||"0/0").split("/")[0]);
  const total = parseInt((run.pass||"0/0").split("/")[1]) || run.total;
  return (
    <div className="run-body">
      <div className={`headline-card ${ok ? "ok" : "fail"}`}>
        <div className="headline-icon">
          {ok ? <Icon name="check" size={28}/> : <Icon name="x" size={28}/>}
        </div>
        <div className="headline-text">
          <h2>{ok ? `${passed} of ${total} iterations passed` : "Run failed"} · total {fmtDur(run.durSec)}</h2>
          <p>{ok
            ? `One outlier on iteration 6 — MO_DIALING_MT exceeded 15 000 ms timeout. Other iterations within bounds.`
            : `MO_DIALING_MT did not reach DIALING within startTimeout (15 000 ms). External device returned no callstate.`}
          </p>
        </div>
        <div className="headline-actions">
          <Btn kind="primary" icon="download">Download ZIP</Btn>
          <Btn icon="arrow" onClick={onJumpSession}>Open failed iteration</Btn>
        </div>
      </div>

      <div className="kpi-row-grid grid-12-tiles">
        <KpiTile label="Pass rate"      value={`${Math.round(passed/total*100)}%`} sub="9 of 10" />
        <KpiTile label="Avg setup time" value="2.4s" sub="< 5s threshold" />
        <KpiTile label="Avg call time"  value="38s"  sub="—" />
        <KpiTile label="Avg RSRP"       value="-82" sub="dBm · good" />
      </div>

      <Card title="Iteration matrix" action={<Btn icon="bar">CSV</Btn>}>
        <table className="data-table compact">
          <thead><tr><th>#</th><th>Status</th><th>Setup</th><th>Call</th><th>End</th><th>Artifacts</th><th></th></tr></thead>
          <tbody>
            {Array.from({length: total}).map((_, i) => {
              const failed = i === 5; // iter 6
              return (
                <tr key={i} className={failed ? "row-fail" : ""} onClick={onJumpSession}>
                  <td className="mono">{i+1}</td>
                  <td><StatusChip status={failed ? "FAILED" : "PASS"} size="sm" /></td>
                  <td className="mono">{failed ? "timeout" : `${(2 + Math.random()*0.7).toFixed(1)}s`}</td>
                  <td className="mono">{failed ? "—" : `${(36 + Math.random()*4).toFixed(0)}s`}</td>
                  <td className="mono">{failed ? "—" : "ok"}</td>
                  <td>
                    <Tag mono>VIDEO</Tag>
                    {!failed && <Tag mono>NETWORK_KPI</Tag>}
                    <Tag mono>CALL_LOG</Tag>
                  </td>
                  <td><Icon name="chevron" size={12} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title="Signal Quality · iteration 1" action={<Btn icon="eye">Open KPI Analysis</Btn>}>
        <KpiChart />
      </Card>
    </div>
  );
};

/* ============================================================
   SESSION
   ============================================================ */
const ReportSession = ({ run, onArtifact }) => {
  const total = parseInt((run.pass||"0/0").split("/")[1]) || run.total;
  const [iter, setIter] = pS(6); // failed iter
  const failed = iter === 6;
  return (
    <div className="run-body session-grid">
      <aside className="session-rail">
        <div className="rail-head mono">{total} iterations</div>
        {Array.from({length: total}).map((_, i) => {
          const f = i === 5;
          return (
            <button key={i} className={`rail-iter ${iter===i+1 ? "active":""} ${f ? "rail-fail":""}`} onClick={()=>setIter(i+1)}>
              <StatusChip status={f ? "FAILED" : "PASS"} size="sm" />
              <span className="rail-iter-name">iter {i+1}</span>
              <span className="mono rail-iter-dur">{f ? "15.1s" : `${(38 + Math.random()*4).toFixed(0)}s`}</span>
            </button>
          );
        })}
      </aside>

      <div className="session-detail">
        <Card title={`Iteration ${iter} · ${failed ? "FAILED" : "PASSED"} · 14:38:02 → 14:38:${failed ? 17 : 42}`}>
          <ActionTimeline actions={[
            { enum:"MO_DIALING_MT",  human:"MO dials MT",        status: failed ? "FAILED" : "PASS" },
            { enum:"MT_RINGING",     human:"MT rings",           status: failed ? "IDLE" : "PASS" },
            { enum:"MO_MT_SPEAKING", human:"Verify connected",   status: failed ? "IDLE" : "PASS" },
            { enum:"MT_WAIT_END",    human:"Call ends",          status: failed ? "IDLE" : "PASS" },
          ]} />
        </Card>

        <Card title="Selected step · MO_DIALING_MT">
          <div className="step-grid">
            <Row label="Human label"   v="MO dials MT" />
            <Row label="Enum"          v={<span className="mono">MO_DIALING_MT</span>} />
            <Row label="Started"       v={<span className="mono">14:38:02.103</span>} />
            <Row label="Ended"         v={<span className="mono">{failed ? "14:38:17.211" : "14:38:04.812"}</span>} />
            <Row label="Duration"      v={<span className="mono">{failed ? "15.108s" : "2.709s"}</span>} />
            <Row label="Status"        v={<StatusChip status={failed ? "FAILED" : "PASS"} size="sm" />} />
            {failed && <Row label="Errors" fullCol v={
              <div className="err-block">
                <div className="err-head"><span className="mono err-code">[400]</span> Did not reach DIALING within 15 000 ms</div>
                <div className="err-meta mono">setExternalMoMtStartTimeout fired · external device returned no callstate</div>
              </div>
            } />}
          </div>
        </Card>

        <Card title="Per-device state at this step">
          <div className="device-state-grid">
            <RoleCard role="EXTERNAL_MO" device={DEVICES.ext1} state={failed ? "IDLE" : "DIALING"} recent={[
              "RMQ DIAL sent",
              failed ? "no callstate received" : "callstate DIALING",
            ]} />
            <RoleCard role={run.type === "VOIP_MO_MT" ? "VOIP_MT" : "MT"} device={run.type === "VOIP_MO_MT" ? null : DEVICES.mt1} voipPhone="+1 214-257-0986" state={failed ? "—" : "RINGING"} recent={[
              failed ? "n/a" : "callstate RINGING",
            ]} />
          </div>
        </Card>

        <Card title="Linked evidence" action={<Btn icon="arrow" onClick={onArtifact}>All artifacts</Btn>}>
          <div className="link-evidence">
            <button className="evidence-row" onClick={onArtifact}>
              <Icon name="video" size={16} />
              <span className="ev-name mono">run42_iter{iter}.mp4</span>
              <span className="ev-meta">12.4 MB · {failed ? "12s" : "42s"}</span>
              <Btn icon="play">Preview</Btn>
              <Btn icon="download">Download</Btn>
            </button>
            <button className="evidence-row" onClick={onArtifact}>
              <Icon name="file" size={16} />
              <span className="ev-name mono">run42_calls.txt</span>
              <span className="ev-meta">3 KB · CALL_LOG</span>
              <Btn icon="eye">Preview</Btn>
              <Btn icon="download">Download</Btn>
            </button>
            {!failed && (
              <button className="evidence-row" onClick={onArtifact}>
                <Icon name="network" size={16} />
                <span className="ev-name mono">run42_iter{iter}.csv</span>
                <span className="ev-meta">8 KB · NETWORK_KPI</span>
                <Btn icon="eye">Preview</Btn>
                <Btn icon="download">Download</Btn>
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   ARTIFACT
   ============================================================ */
const ReportArtifact = ({ run }) => {
  const [preview, setPreview] = pS(null);
  const groups = [
    { dev: DEVICES.ext1, role: "EXTERNAL_MO", expanded: true, files: [
      { type: "VIDEO",       name: "run42_iter1.mp4", size: "12.4 MB", status: "COMPLETED" },
      { type: "VIDEO",       name: "run42_iter2.mp4", size: "12.1 MB", status: "COMPLETED" },
      { type: "VIDEO",       name: "run42_iter6.mp4", size: "8.9 MB",  status: "FINALIZING" },
      { type: "NETWORK_KPI", name: "run42_iter1.csv", size: "8 KB",    status: "COMPLETED" },
      { type: "CALL_LOG",    name: "run42_calls.txt", size: "3 KB",    status: "COMPLETED" },
    ]},
    { dev: DEVICES.mt1, role: "MT (lab)", expanded: false, files: [
      { type: "VIDEO",  name: "mt_iter1.mp4", size: "11.2 MB", status: "COMPLETED" },
      { type: "DEVICE_LOG", name: "mt_logcat.txt", size: "210 KB", status: "COMPLETED" },
    ]},
  ];

  const [open, setOpen] = pS(groups.map(g => g.expanded));
  const [selected, setSelected] = pS(new Set());

  const toggleSel = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  return (
    <div className="run-body">
      {selected.size > 0 && (
        <div className="bulk-bar">
          <b>{selected.size} selected</b>
          <Btn icon="download">Download</Btn>
          <Btn icon="x">Delete</Btn>
          <Btn onClick={()=>setSelected(new Set())}>Clear</Btn>
        </div>
      )}

      <div className="filter-bar">
        <select className="input"><option>All types</option><option>VIDEO</option><option>NETWORK_KPI</option><option>CALL_LOG</option></select>
        <select className="input"><option>All devices</option></select>
        <select className="input"><option>All statuses</option></select>
        <div className="filter-spacer" />
        <Btn icon="download" kind="primary">Download all (ZIP)</Btn>
      </div>

      <div className={`art-layout ${preview ? "with-preview" : ""}`}>
        <div className="art-list">
          {groups.map((g, gi) => (
            <div key={gi} className="art-group">
              <button className="art-group-head" onClick={() => setOpen(o => o.map((v,i)=>i===gi?!v:v))}>
                <Icon name="chevronDown" size={14} className={open[gi] ? "" : "rot-90"} />
                <b>{g.dev.name}</b>
                <Tag mono>{g.role}</Tag>
                <span className="mono dim">udid {g.dev.udid}</span>
                <span className="art-count">{g.files.length} files</span>
              </button>
              {open[gi] && (
                <div className="art-files">
                  {g.files.map((f, fi) => {
                    const id = `${gi}-${fi}`;
                    return (
                      <div key={fi} className={`art-file ${selected.has(id) ? "sel" : ""}`}>
                        <input type="checkbox" checked={selected.has(id)} onChange={()=>toggleSel(id)} />
                        <Icon name={f.type==="VIDEO" ? "video" : f.type==="NETWORK_KPI" ? "network" : "file"} size={16} />
                        <Tag mono>{f.type}</Tag>
                        <span className="art-name mono">{f.name}</span>
                        <span className="art-size mono">{f.size}</span>
                        <StatusChip status={f.status} size="sm" />
                        <div className="art-acts">
                          <button className="ic-btn" onClick={()=>setPreview(f)} title="Preview"><Icon name="eye" size={14}/></button>
                          <button className="ic-btn" title="Download"><Icon name="download" size={14}/></button>
                          <button className="ic-btn" title="More"><Icon name="more" size={14}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {preview && (
          <aside className="art-preview">
            <div className="preview-head">
              <Icon name={preview.type==="VIDEO"?"video":preview.type==="NETWORK_KPI"?"network":"file"} size={16}/>
              <b className="mono">{preview.name}</b>
              <button className="ic-btn" onClick={()=>setPreview(null)}><Icon name="x" size={14}/></button>
            </div>
            {preview.type === "VIDEO" && (
              <div className="preview-video">
                <div className="video-stub">
                  <Icon name="play" size={32} />
                  <div className="mono dim">{preview.name}</div>
                  <div className="mono dim">12s · 12.4 MB · S3 snap-logcat-dev</div>
                </div>
                <div className="video-ctrls">
                  <Icon name="play" size={14} />
                  <div className="video-bar"><span style={{width:"32%"}}/></div>
                  <span className="mono">00:04 / 00:12</span>
                </div>
              </div>
            )}
            {preview.type === "CALL_LOG" && (
              <pre className="preview-pre mono">
{`14:33:02.103  initiate(+12142570986)
14:33:02.418  RMQ → DIAL
14:33:03.104  callstate DIALING
14:33:04.812  callstate RINGING
14:33:05.871  callstate CONNECTED
14:33:43.422  callstate IDLE
14:33:43.443  call ended (40.5s)`}
              </pre>
            )}
            {preview.type === "NETWORK_KPI" && (
              <table className="preview-table">
                <thead><tr><th>t</th><th>RSRP</th><th>RSRQ</th><th>SINR</th></tr></thead>
                <tbody>
                  {Array.from({length:8}).map((_,i)=>(
                    <tr key={i}><td className="mono">14:33:0{i}</td><td className="mono">-{78+i}</td><td className="mono">-{9+i%3}</td><td className="mono">{14-i%4}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="preview-foot">
              <Btn icon="arrow">Open in Session</Btn>
              <Btn icon="download" kind="primary">Download</Btn>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   KPI CHART (inline SVG)
   ============================================================ */
const KpiChart = () => {
  const W = 720, H = 200;
  const data = uM(() => Array.from({length: 60}).map((_, i) => -82 + Math.sin(i/4)*4 + (Math.random()-0.5)*3), []);
  const min = -100, max = -70;
  const x = i => 40 + (i / (data.length-1)) * (W - 60);
  const y = v => H - 24 - ((v - min) / (max - min)) * (H - 40);
  const path = data.map((v, i) => `${i===0?"M":"L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="kpi-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="kpi-chart" preserveAspectRatio="none">
        {/* threshold bands */}
        <rect x="40" y={y(-80)} width={W-60} height={y(-90)-y(-80)} fill="var(--kpi-good)" opacity="0.08" />
        <rect x="40" y={y(-90)} width={W-60} height={y(-100)-y(-90)} fill="var(--kpi-moderate)" opacity="0.10" />
        {/* gridlines */}
        {[-75,-85,-95].map(v => (
          <g key={v}>
            <line x1="40" x2={W-20} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 4" />
            <text x="32" y={y(v)+4} fontSize="11" fill="var(--fg-tertiary)" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
        {/* outlier marker */}
        <circle cx={x(36)} cy={y(data[36])} r="3.5" fill="var(--kpi-bad)" stroke="var(--bg-surface)" strokeWidth="2" />
        <text x={W-20} y="14" fontSize="10" fill="var(--fg-secondary)" textAnchor="end" fontFamily="Inter">RSRP · dBm</text>
      </svg>
      <div className="chart-legend">
        <span><i style={{background:"var(--accent)"}}/>Signal</span>
        <span><i className="band-good"/>Good ≥ -80</span>
        <span><i className="band-mod"/>Moderate -90 to -80</span>
        <span><i className="band-bad"/>Bad &lt; -90</span>
      </div>
    </div>
  );
};

window.RunDetail = RunDetail;
