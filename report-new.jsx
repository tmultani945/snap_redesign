/* === Redesigned Run Report — integrated into SNAP Remote Portal === */

const RAT_KEYS = ["5G NR NSA","LTE","5G NA SA","Other"];
const RAT_CLS  = { "5G NR NSA":"rat-5g-nsa", "LTE":"rat-lte", "5G NA SA":"rat-5g-sa", "Other":"rat-other" };

const RunReport = ({ onBack }) => {
  const run = window.REPORT_RUN;
  const t = { showKpiCharts: true, showWaterfall: true, mapColor: "rsrp", denseMatrix: false };
  const [tab, setTab] = pS("summary");

  return (
    <>
      <ReportContext run={run} tab={tab} setTab={setTab} onBack={onBack}/>
      {tab === "summary"  && <SummaryTab run={run} t={t}/>}
      {tab === "kpi"      && <KpiAnalysisTab run={run}/>}
      {tab === "session"  && <SessionTab run={run}/>}
      {tab === "artifact" && <ArtifactStub run={run}/>}
    </>
  );
};

/* === HEADER === */
const ReportContext = ({ run, tab, setTab, onBack }) => {
  const tabs = [
    ["summary",  "Summary"],
    ["session",  "Session"],
    ["artifact", "Artifacts"],
    ["kpi",      "KPI Analysis", true],
  ];
  return (
    <div className="rep-context">
      <div className="rep-ctx-top">
        <button className="rep-back" onClick={onBack}><Icon name="chevronLeft" size={14}/> Runs</button>
        <h1 className="rep-title">Report · {run.name}</h1>
        <span className="rep-eye" title="Watch live"><Icon name="eye" size={16}/></span>
        <Tag mono>{run.type}</Tag>
        <Tag>{run.dest}</Tag>
        <StatusChip status={run.status}/>
        <span className="run-meta mono">iter {run.passCount + run.failCount}/{run.total}</span>
        <span className="run-meta">started {run.started}</span>
        <div className="rep-ctx-actions">
          <Btn icon="repeat">Re-run</Btn>
          <Btn icon="download" kind="primary">Download ZIP</Btn>
        </div>
      </div>
      <nav className="rep-tabs">
        {tabs.map(([k, l, isNew]) => (
          <button key={k} className={`rep-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>
            {l}{isNew && <span className="rep-tab-dot" title="new"/>}
          </button>
        ))}
      </nav>
    </div>
  );
};

/* === META STRIP === */
const MetaStrip = ({ run }) => (
  <div className="rep-meta-strip">
    <div className="rep-meta-cell">
      <div className="rep-meta-label">Status</div>
      <div className="rep-meta-val" style={{color: run.status==="COMPLETED"?"var(--status-pass)":"var(--status-fail)"}}>{run.status}</div>
      <div className="rep-meta-sub">{run.passCount}/{run.total} passed</div>
    </div>
    <div className="rep-meta-cell">
      <div className="rep-meta-label">Executed at</div>
      <div className="rep-meta-val">{run.started}</div>
      <div className="rep-meta-sub">today · UTC-4</div>
    </div>
    <div className="rep-meta-cell">
      <div className="rep-meta-label">Execution time</div>
      <div className="rep-meta-val">{fmtDur(run.durSec)}</div>
      <div className="rep-meta-sub">avg {Math.round(run.durSec / Math.max(run.total,1))}s / iter</div>
    </div>
    <div className="rep-meta-cell">
      <span className="rep-meta-role">MO device</span>
      <div className="rep-meta-val">{run.mo.name}</div>
      <div className="rep-meta-sub">{run.mo.os} · {run.mo.phone}</div>
    </div>
    <div className="rep-meta-cell">
      <span className="rep-meta-role">MT device</span>
      <div className="rep-meta-val">{run.mt.name}</div>
      <div className="rep-meta-sub">{run.mt.os} · {run.mt.phone}</div>
    </div>
  </div>
);

/* === HEADLINE === */
const Headline = ({ run }) => {
  const ok = run.status === "COMPLETED";
  return (
    <div className={`rep-headline ${ok ? "" : "fail"}`}>
      <div className="rep-hl-icon">
        <Icon name={ok ? "check" : "x"} size={28}/>
      </div>
      <div className="rep-hl-text">
        <h2>{ok
          ? `${run.passCount} of ${run.total} iterations passed · total ${fmtDur(run.durSec)}`
          : `Run failed · ${run.failCount} of ${run.total} iterations`}</h2>
        <p>{ok
          ? "One outlier on iteration 6 — MO_DIALING_MT exceeded 15 000 ms timeout. All other iterations completed within nominal bounds; RSRP and SINR stayed in the good band for 94 % of sampled time."
          : "MO_DIALING_MT did not reach DIALING within startTimeout (15 000 ms) on every iteration. External device returned no callstate — check device pairing or RMQ routing key."}
        </p>
      </div>
      <div className="rep-hl-actions">
        {!ok && <Btn icon="alert" kind="primary">Open failed iteration</Btn>}
        {ok && <Btn icon="play">View video</Btn>}
        <Btn icon="file">Logs</Btn>
      </div>
    </div>
  );
};

/* === KPI ROW === */
const KpiRow = ({ run }) => {
  const passRate = run.total ? Math.round(run.passCount/run.total*100) : 0;
  const ok = run.iterations.filter(i => i.status==="PASS");
  const avg = (k, dec=1) => {
    const v = ok.map(i=>i[k]).filter(x=>x!=null);
    return v.length ? (v.reduce((s,x)=>s+x,0)/v.length).toFixed(dec) : "—";
  };
  const sparkOf = k => run.iterations.map(i => i[k] ?? 0);

  return (
    <div className="rep-kpi-row">
      <Kpi label="Pass rate"      val={`${passRate}%`} sub={`${run.passCount} of ${run.total}`}
           badge={passRate>=95?"good":passRate>=80?"mod":"bad"} sparkData={run.iterations.map(i=>i.status==="PASS"?1:0)} color="#22C55E"/>
      <Kpi label="Avg setup"      val={`${avg("setup",1)}s`}  sub="< 5s threshold"
           badge="good" sparkData={sparkOf("setup")} color="#ea4c89"/>
      <Kpi label="Avg call"       val={`${avg("call",0)}s`}   sub="duration"
           sparkData={sparkOf("call")} color="#ea4c89"/>
      <Kpi label="Avg RSRP"       val={`${avg("rsrp",0)}`}    sub="dBm · good"
           badge={parseFloat(avg("rsrp"))>=-80?"good":"mod"} sparkData={sparkOf("rsrp")} color="#A78BFA" bad={5}/>
      <Kpi label="Avg SINR"       val={`${avg("sinr",0)}`}    sub="dB · good"
           badge="good" sparkData={sparkOf("sinr")} color="#6366F1" bad={5}/>
      <Kpi label="Avg throughput" val={`${avg("dl",0)}`}      sub="Mbps DL"
           badge="good" sparkData={sparkOf("dl")} color="#22C55E"/>
    </div>
  );
};

const Kpi = ({ label, val, sub, badge, sparkData, color, bad=null }) => (
  <div className="rep-kpi">
    {badge && <span className={`rep-kpi-badge ${badge}`}>{badge==="good"?"GOOD":badge==="mod"?"MOD":"BAD"}</span>}
    <div className="rep-kpi-label">{label}</div>
    <div className="rep-kpi-val">{val}</div>
    <div className="rep-kpi-sub">{sub}</div>
    {sparkData && <div className="rep-kpi-spark"><Spark data={sparkData} color={color} bad={bad}/></div>}
  </div>
);

/* === DEVICES + RAT === */
const DevicesCard = ({ run }) => (
  <div className="card">
    <div className="card-head"><h3>Devices under test</h3><Tag mono>{run.typeLabel}</Tag></div>
    <div className="card-body">
      <div className="rep-devices">
        <div className="rep-device">
          <span className="role">MO · originator</span>
          <div className="nm">{run.mo.name}</div>
          <div className="os">{run.mo.oem} · {run.mo.os}</div>
          <div className="pn">☏ {run.mo.phone}</div>
          <div className="udid">udid {run.mo.udid}</div>
        </div>
        <div className="rep-device">
          <span className="role">MT · terminator</span>
          <div className="nm">{run.mt.name}</div>
          <div className="os">{run.mt.oem} · {run.mt.os}</div>
          <div className="pn">☏ {run.mt.phone}</div>
          <div className="udid">udid {run.mt.udid}</div>
        </div>
      </div>
    </div>
  </div>
);

const RatCard = ({ run }) => {
  const seg = (role, dict) => (
    <div className="rep-rat-row">
      <span className="rep-rat-role">{role}</span>
      <div className="rep-rat-bar">
        {RAT_KEYS.map(k => dict[k] > 0 && (
          <div key={k} className={`rep-rat-seg ${RAT_CLS[k]}`} style={{width: `${dict[k]}%`}}>
            {dict[k] >= 7 ? `${dict[k]}% ${k}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="card">
      <div className="card-head"><h3>RAT distribution (Data)</h3><span className="dim mono" style={{fontSize:11}}>per device · % of samples</span></div>
      <div className="card-body">
        <div className="rep-rat">
          {seg("MO", run.ratMO)}
          {seg("MT", run.ratMT)}
        </div>
        <div className="rep-rat-legend">
          <span><i className="rat-5g-nsa"/>5G NR NSA</span>
          <span><i className="rat-lte"/>LTE</span>
          <span><i className="rat-5g-sa"/>5G NA SA</span>
          <span><i className="rat-other"/>Other</span>
        </div>
      </div>
    </div>
  );
};

/* === ERROR ANALYSIS === */
const ErrorCard = ({ run }) => {
  const total = run.errors.reduce((s,e)=>s+e.count, 0);
  const max = Math.max(1, ...run.errors.map(e=>e.count));
  return (
    <div className="card">
      <div className="card-head">
        <h3>Error analysis</h3>
        <Tag mono>{total} total</Tag>
      </div>
      <div className="card-body">
        <div className="rep-errors">
          {run.errors.map(e => (
            <div key={e.cat} className={`rep-err-row ${e.count===0?"zero":""}`}>
              <span className="rep-err-name">{e.cat}</span>
              <div className="rep-err-bar"><span style={{width: `${(e.count/max)*100}%`}}/></div>
              <span className="rep-err-num">{e.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* === MAP CARD === */
const MapCard = ({ run, colorBy }) => {
  const [filters, setFilters] = pS({ rat: [], errOnly: false, color: colorBy });
  pE(() => setFilters(f => ({ ...f, color: colorBy })), [colorBy]);

  return (
    <div className="card rep-map-card">
      <div className="card-head">
        <h3>Route map · KPI samples along the test path</h3>
        <Tag mono>{run.iterations.length} iters</Tag>
      </div>
      <div className="rep-map-filters">
        <FilterPill label="RAT" value={filters.rat} multi
          options={[
            {v:"LTE", l:"LTE", color:"#ea4c89"},
            {v:"5G NR NSA", l:"5G NR NSA", color:"#A78BFA"},
            {v:"5G NA SA", l:"5G NA SA", color:"#6366F1"},
          ]}
          onChange={(rat) => setFilters(f => ({...f, rat}))}/>
        <FilterPill label="Color by" value={filters.color}
          options={[
            {v:"rsrp", l:"RSRP signal quality"},
            {v:"rat", l:"RAT"},
            {v:"errors", l:"Errors only"},
          ]}
          onChange={(color) => setFilters(f => ({...f, color, errOnly: color==="errors"}))}/>
      </div>
      <ReportMap run={run} filters={filters}/>
      <div className="rep-map-legend">
        {filters.color === "rsrp" && (
          <>
            <span><span className="swatch" style={{background:"#22C55E"}}/>Good ≥ -80 dBm</span>
            <span><span className="swatch" style={{background:"#F59E0B"}}/>Moderate -90 to -80</span>
            <span><span className="swatch" style={{background:"#EF4444"}}/>Bad &lt; -90</span>
          </>
        )}
        {filters.color === "rat" && (
          <>
            <span><span className="swatch" style={{background:"#A78BFA"}}/>5G NR NSA</span>
            <span><span className="swatch" style={{background:"#ea4c89"}}/>LTE</span>
          </>
        )}
        {filters.color === "errors" && (
          <>
            <span><span className="swatch" style={{background:"#22C55E"}}/>Pass</span>
            <span><span className="swatch" style={{background:"#EF4444"}}/>Error</span>
          </>
        )}
        <span style={{marginLeft:"auto"}}>© OpenStreetMap contributors</span>
      </div>
    </div>
  );
};

/* === ITERATION MATRIX === */
const IterMatrix = ({ run, dense, onJump }) => (
  <div className="card">
    <div className="card-head">
      <h3>Iteration matrix</h3>
      <div style={{display:"flex", gap:8}}>
        <Btn icon="bar">CSV</Btn>
        <Btn icon="filter">Filter</Btn>
      </div>
    </div>
    <div className="card-body" style={{padding:0}}>
      <table className={`data-table rep-matrix ${dense?"compact":""}`}>
        <thead>
          <tr>
            <th className="col-sm">#</th>
            <th>Status</th>
            <th>Setup</th>
            <th>Call</th>
            <th>End</th>
            <th>RSRP</th>
            <th>SINR</th>
            <th>DL</th>
            <th>UL</th>
            <th>Loss</th>
            <th>Artifacts</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {run.iterations.map(it => {
            const failed = it.status === "FAILED";
            return (
              <tr key={it.i} className={`row-clk ${failed?"row-fail":""}`} onClick={()=>onJump(it.i)}>
                <td className="num-cell">{it.i}</td>
                <td><StatusChip status={it.status} size="sm"/></td>
                <td className="num-cell">{it.setup==null?"timeout":`${it.setup.toFixed(1)}s`}</td>
                <td className="num-cell">{it.call==null?"—":`${it.call}s`}</td>
                <td className="num-cell">{it.end}</td>
                <td className="num-cell">{it.rsrp==null?"—":`${it.rsrp}`}</td>
                <td className="num-cell">{it.sinr==null?"—":`${it.sinr}`}</td>
                <td className="num-cell">{it.dl||"—"}</td>
                <td className="num-cell">{it.ul||"—"}</td>
                <td className="num-cell">{it.loss==null?"—":`${it.loss}%`}</td>
                <td>
                  <Tag mono>VIDEO</Tag>
                  {!failed && <Tag mono>NET_KPI</Tag>}
                  <Tag mono>CALL_LOG</Tag>
                </td>
                <td><Icon name="chevron" size={12}/></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/* === CALL SETUP WATERFALL === */
const Waterfall = ({ run }) => {
  const total = run.waterfall.reduce((s,w)=>s+w.ms, 0);
  let acc = 0;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Call setup waterfall · average across passing iterations</h3>
        <Tag mono>{(total/1000).toFixed(2)}s end-to-end</Tag>
      </div>
      <div className="card-body">
        <div className="rep-waterfall">
          {run.waterfall.map((w,i) => {
            const off = (acc/total)*100;
            const w_ = (w.ms/total)*100;
            acc += w.ms;
            return (
              <div key={i} className="rep-wf-row">
                <div>
                  <div className="rep-wf-name">{w.phase}</div>
                  <div className="rep-wf-sub">{w.human}</div>
                </div>
                <div className="rep-wf-track">
                  <div className="rep-wf-fill" style={{left:`${off}%`, width:`${w_}%`}}/>
                </div>
                <div className="rep-wf-ms">{w.ms} ms</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* === KPI DEEP-DIVE === */
const KpiDeepDive = ({ run }) => {
  const [view, setView] = pS("signal");
  const badIdx = run.iterations.findIndex(i => i.status==="FAILED");

  const signalSeries = [
    { name: "RSRP (dBm)", color: "#ea4c89", data: run.iterations.map(i=>i.rsrp ?? -100) },
    { name: "RSRQ ×3 (dBm)", color: "#A78BFA", data: run.iterations.map(i=>(i.rsrq ?? -20)*3) },
  ];
  const sinrSeries = [
    { name: "SINR (dB)", color: "#6366F1", data: run.iterations.map(i=>i.sinr ?? 0) },
  ];
  return (
    <div className="card">
      <div className="card-head">
        <h3>Signal quality across iterations</h3>
        <div className="rep-multi-tabs">
          <button className={view==="signal"?"active":""} onClick={()=>setView("signal")}>RSRP / RSRQ</button>
          <button className={view==="sinr"?"active":""} onClick={()=>setView("sinr")}>SINR</button>
        </div>
      </div>
      <div className="card-body">
        <div className="rep-multi-chart">
          {view==="signal" ? (
            <MultiLine series={signalSeries} yLabel="dBm" yMin={-100} yMax={-65}
              bands={[
                { min:-80, max:-65, color:"#22C55E", opacity:0.08 },
                { min:-90, max:-80, color:"#F59E0B", opacity:0.08 },
                { min:-100, max:-90, color:"#EF4444", opacity:0.08 },
              ]}
              badIdx={badIdx}
            />
          ) : (
            <MultiLine series={sinrSeries} yLabel="dB" yMin={0} yMax={25}
              bands={[
                { min:13, max:25, color:"#22C55E", opacity:0.08 },
                { min:7,  max:13, color:"#F59E0B", opacity:0.08 },
                { min:0,  max:7,  color:"#EF4444", opacity:0.08 },
              ]}
              badIdx={badIdx}
            />
          )}
        </div>
        <div className="mini-leg">
          {view === "signal" && <>
            <span><i style={{background:"#ea4c89"}}/>RSRP</span>
            <span><i style={{background:"#A78BFA"}}/>RSRQ (×3 for scale)</span>
            <span><i style={{background:"#22C55E"}}/>Good band</span>
            <span><i style={{background:"#F59E0B"}}/>Moderate</span>
            <span><i style={{background:"#EF4444"}}/>Bad / outlier</span>
          </>}
          {view === "sinr" && <>
            <span><i style={{background:"#6366F1"}}/>SINR</span>
            <span><i style={{background:"#22C55E"}}/>Good ≥ 13 dB</span>
            <span><i style={{background:"#F59E0B"}}/>7–13 dB</span>
            <span><i style={{background:"#EF4444"}}/>&lt; 7 dB</span>
          </>}
        </div>
      </div>
    </div>
  );
};

/* === Throughput / Latency two-up === */
const ThroughputCard = ({ run }) => (
  <div className="card">
    <div className="card-head"><h3>Throughput per iteration</h3><Tag mono>Mbps</Tag></div>
    <div className="card-body">
      <div className="rep-multi-chart">
        <BarChart
          data={run.iterations.map(i=>i.dl||0)}
          secondary={{ data: run.iterations.map(i=>i.ul||0), color: "#A78BFA" }}
          color="#ea4c89"
          yLabel="Mbps"
        />
      </div>
      <div className="mini-leg">
        <span><i style={{background:"#ea4c89"}}/>Downlink</span>
        <span><i style={{background:"#A78BFA"}}/>Uplink</span>
      </div>
    </div>
  </div>
);

const QualityCard = ({ run }) => (
  <div className="card">
    <div className="card-head"><h3>Jitter & packet loss</h3><Tag mono>ms · %</Tag></div>
    <div className="card-body">
      <div className="rep-multi-chart">
        <MultiLine
          series={[
            { name: "Jitter", color: "#A78BFA", data: run.iterations.map(i=>i.jitter ?? 0) },
            { name: "Loss ×20", color: "#EF4444", data: run.iterations.map(i=>(i.loss ?? 0)*20) },
          ]}
          yMin={0} yMax={30} yLabel="ms / %×20"
          bands={[
            { min:0,  max:15, color:"#22C55E", opacity:0.05 },
            { min:15, max:25, color:"#F59E0B", opacity:0.05 },
            { min:25, max:30, color:"#EF4444", opacity:0.05 },
          ]}
        />
      </div>
      <div className="mini-leg">
        <span><i style={{background:"#A78BFA"}}/>Jitter (ms)</span>
        <span><i style={{background:"#EF4444"}}/>Packet loss (×20 for scale)</span>
      </div>
    </div>
  </div>
);

/* === End-state donut === */
const EndStateCard = ({ run }) => {
  const data = [
    { label: "Passed",       value: run.passCount, color: "#22C55E" },
    { label: "Setup timeout",value: run.errors.find(e=>e.cat==="Setup timeout")?.count || 0, color: "#EF4444" },
    { label: "Dropped",      value: run.errors.find(e=>e.cat==="Dropped")?.count || 0, color: "#F59E0B" },
    { label: "Not executed", value: run.notExec, color: "#94A3B8" },
  ].filter(d => d.value > 0);
  return (
    <div className="card">
      <div className="card-head"><h3>End-state distribution</h3></div>
      <div className="card-body">
        <div className="rep-donut">
          <Donut data={data}/>
          <div className="rep-donut-legend">
            {data.map(d => (
              <div key={d.label} className="row">
                <i style={{background:d.color}}/>
                <span>{d.label}</span>
                <span className="v">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* === SUMMARY TAB === */
const SummaryTab = ({ run, t }) => {
  const onJump = (i) => {};
  return (
    <div className="rep-body">
      <MetaStrip run={run}/>
      <Headline run={run}/>
      <KpiRow run={run}/>

      <div className="rep-split">
        <div style={{display:"flex", flexDirection:"column", gap:16, minWidth:0}}>
          <DevicesCard run={run}/>
          <RatCard run={run}/>
          <EndStateCard run={run}/>
          <ErrorCard run={run}/>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:16, minWidth:0}}>
          <MapCard run={run} colorBy={t.mapColor}/>
        </div>
      </div>

      <IterMatrix run={run} dense={t.denseMatrix} onJump={onJump}/>

      {t.showKpiCharts && (
        <>
          <KpiDeepDive run={run}/>
          <div className="rep-two-up">
            <ThroughputCard run={run}/>
            <QualityCard run={run}/>
          </div>
        </>
      )}

      {t.showWaterfall && <Waterfall run={run}/>}
    </div>
  );
};

/* === KPI Analysis tab === */
const KpiAnalysisTab = ({ run }) => (
  <div className="rep-body">
    <KpiDeepDive run={run}/>
    <div className="rep-two-up">
      <ThroughputCard run={run}/>
      <QualityCard run={run}/>
    </div>
  </div>
);

/* === Artifacts stub === */
const ArtifactStub = () => (
  <div className="rep-body">
    <div className="card"><div className="card-head"><h3>Artifacts</h3></div>
      <div className="card-body dim">Videos, KPI CSVs and call logs per device.</div>
    </div>
  </div>
);

window.RunReport = RunReport;
