/* SNAP Remote Portal — Run Detail (Live + Summary + Session + Artifact) */

const RunDetail = ({ runId, runs, onBack }) => {
  const run = runs.find(r => r.id === runId) || runs[0];
  const isLive = run.status === "PROGRESS" || run.status === "FINALIZING";
  const [tab, setTab] = pS(isLive ? "live" : "summary");
  const tabs = isLive
    ? [["live","Live"],["summary","Summary"],["session","Session"],["artifact","Artifact"],["kpi","KPI Analysis"]]
    : [["summary","Summary"],["session","Session"],["artifact","Artifact"],["kpi","KPI Analysis"]];

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
      {tab === "summary"  && <SummaryTab run={window.REPORT_RUN} t={{ showKpiCharts: true, showWaterfall: true, mapColor: "rsrp", denseMatrix: false }} />}
      {tab === "session"  && <SessionTab run={window.REPORT_RUN} />}
      {tab === "artifact" && <ReportArtifact run={run} />}
      {tab === "kpi"      && <KpiAnalysisTab run={window.REPORT_RUN} />}
    </div>
  );
};

/* ============================================================
   LIVE
   ============================================================ */
const interpPos = (route, t) => {
  const [sLat, sLng] = route.start;
  const [eLat, eLng] = route.end;
  const wob = Math.sin(t * Math.PI * 3) * 0.0035 + Math.cos(t * Math.PI * 1.6) * 0.0022;
  return [
    sLat + (eLat - sLat) * t + wob,
    sLng + (eLng - sLng) * t + Math.sin(t * Math.PI * 2) * 0.005,
  ];
};

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

  const tRef = uR((run.iter - 1) / run.total);
  const [livePos, setLivePos] = pS(() =>
    run.route ? interpPos(run.route, tRef.current) : null
  );

  // advance device position along route in sync with event tick
  pE(() => {
    if (!run.route) return;
    const id = setInterval(() => {
      tRef.current = Math.min(tRef.current + 0.008, 0.98);
      setLivePos(interpPos(run.route, tRef.current));
    }, 2200);
    return () => clearInterval(id);
  }, []);

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
        {run.route && (
          <Card title="Live route" action={<Tag><span className="live-dot" style={{display:"inline-block",marginRight:4}}/>LIVE</Tag>}>
            <ReportMap run={run} mode="live" position={livePos} />
          </Card>
        )}

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


window.RunDetail = RunDetail;
