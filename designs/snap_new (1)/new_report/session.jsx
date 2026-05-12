/* === Session Tab — Iterations | KPIs | Map view | Event log === */

const SESSION_SUBTABS = [
  ["iterations","Iterations"],
  ["kpis","KPIs"],
  ["map","Map view"],
  ["events","Event log"],
];

const SessionTab = ({ run }) => {
  const [sub, setSub] = pS("iterations");
  return (
    <div className="rep-body">
      <div className="card sess-card">
        <div className="sess-subnav-row">
          <nav className="sess-subnav">
            {SESSION_SUBTABS.map(([k,l]) => (
              <button key={k} className={`sess-subtab ${sub===k?"active":""}`} onClick={()=>setSub(k)}>{l}</button>
            ))}
          </nav>
          <div className="sess-subnav-right">
            <span className="dim" style={{fontSize:12}}>Rows per page</span>
            <select className="input" style={{padding:"4px 10px"}}><option>10</option><option>25</option></select>
            <span className="dim mono" style={{fontSize:12}}>1–{run.iterations.length} of {run.iterations.length}</span>
          </div>
        </div>
        <div className="sess-pane">
          {sub==="iterations" && <SessIterations run={run}/>}
          {sub==="kpis"       && <SessKpis run={run}/>}
          {sub==="map"        && <SessMap run={run}/>}
          {sub==="events"     && <SessEvents run={run}/>}
        </div>
      </div>
    </div>
  );
};

/* ─── Iterations sub-tab ─────────────────────── */
const SessIterations = ({ run }) => {
  const [ratF, setRatF] = pS("All");
  const [stF, setStF] = pS("All");
  const rows = run.iterations.filter(it => {
    if (ratF !== "All" && it.rat !== ratF && (it.status==="PASS"?(""):it.rat)!==ratF) {
      const rat = it.rat || (it.dl > 130 ? "5G NR NSA" : "LTE");
      if (rat !== ratF) return false;
    }
    if (stF !== "All" && it.status !== stF) return false;
    return true;
  });
  const ratFor = (it,i) => i===0 ? "5G NR NSA" : "LTE";
  return (
    <>
      <div className="sess-head">
        <h3>Iterations</h3>
      </div>
      <div className="sess-filters two">
        <select className="input" value={ratF} onChange={e=>setRatF(e.target.value)}>
          <option>RAT</option><option>All</option><option>5G NR NSA</option><option>LTE</option>
        </select>
        <select className="input" value={stF} onChange={e=>setStF(e.target.value)}>
          <option>All</option><option>PASS</option><option>FAILED</option>
        </select>
      </div>
      <table className="data-table sess-table">
        <thead>
          <tr>
            <th>Iterations</th><th>Status</th><th>Duration (sec)</th>
            <th>MO (RAT)</th><th>MT (RAT)</th>
            <th>Errors</th><th>Alerts</th><th>Warnings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it,i) => (
            <tr key={it.i}>
              <td className="cell-strong">Iteration {it.i}</td>
              <td><StatusChip status={it.status} size="sm"/></td>
              <td className="num-cell">{it.call ?? (it.setup==null? "—" : it.setup)}</td>
              <td><Tag mono>{ratFor(it,i)}</Tag></td>
              <td><Tag mono>{ratFor(it,i)}</Tag></td>
              <td className="num-cell">{it.status==="FAILED" ? 1 : 0}</td>
              <td className="num-cell">{16 + i*5}</td>
              <td className="num-cell">{52 + i*7}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

/* ─── KPIs sub-tab ─────────────────────── */
const SessKpis = ({ run }) => {
  const [devs, setDevs] = pS(["MO Device"]);
  const [iters, setIters] = pS([1]);
  const [kpi, setKpi] = pS("LTE RSRQ");
  const KPIS = ["LTE RSRQ","LTE RSRP","LTE SINR","NR5G RSRP","NR5G SINR","RTP Jitter","RTP Packet Loss","VVQ","Audio DL","Audio UL"];

  // synth series per iteration
  const n = 70;
  const mkSeries = (iter, dev) => {
    const seed = iter*7 + (dev==="MO Device"?0:11);
    const base = -9 + Math.sin(seed)*1.2;
    return Array.from({length:n}, (_,i) => base + Math.sin(i/4 + seed)*1.8 + (Math.random()-0.5)*1.5 - (i>40 && iter===3? 4:0));
  };
  const COLORS = { "MO Device": ["#1F2A38","#F59E0B","#ea4c89"], "MT Device": ["#3B82F6","#22C55E","#A78BFA"] };

  const series = [];
  devs.forEach(d => iters.forEach(it => {
    series.push({ name: `Iter ${it} (${d})`, color: COLORS[d][(it-1)%3], data: mkSeries(it,d) });
  }));

  const W=760, H=300;
  const vmin=-30, vmax=0;
  const x = i => 40 + (i/(n-1))*(W-60);
  const y = v => H-40 - ((v-vmin)/(vmax-vmin))*(H-60);

  return (
    <>
      <div className="sess-head">
        <h3>KPIs</h3>
        <a className="sess-thresh"><Icon name="sliders" size={13}/> Thresholds</a>
      </div>
      <div className="sess-filters three">
        <MultiChip label="MO Device" value={devs} options={["MO Device","MT Device"]} onChange={setDevs} accent/>
        <MultiChip label="Iteration" value={iters} options={[1,2,3]} formatter={v=>`Iteration ${v}`} onChange={setIters} accent/>
        <select className="input" value={kpi} onChange={e=>setKpi(e.target.value)}>
          {KPIS.map(k=><option key={k}>{k}</option>)}
        </select>
      </div>
      <div className="sess-chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0,-10,-20,-30].map(v => (
            <g key={v}>
              <line x1="40" x2={W-20} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 4"/>
              <text x="34" y={y(v)+4} fontSize="10" fill="var(--fg-tertiary)" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
              <text x={W-18} y={y(v)+4} fontSize="10" fill="var(--fg-tertiary)" textAnchor="start" fontFamily="JetBrains Mono">{v}</text>
            </g>
          ))}
          {/* threshold dashed lines */}
          <line x1="40" x2={W-20} y1={y(-15)} y2={y(-15)} stroke="#22C55E" strokeDasharray="6 4" strokeWidth="1.5"/>
          <line x1="40" x2={W-20} y1={y(-25)} y2={y(-25)} stroke="#EF4444" strokeDasharray="6 4" strokeWidth="1.5"/>
          {/* time axis labels */}
          {[0,10,20,30,40,50,60,70].map(t => (
            <text key={t} x={x(t*n/70)} y={H-22} fontSize="10" fill="var(--fg-tertiary)" textAnchor="middle" fontFamily="JetBrains Mono">
              {String(Math.floor(t/60)).padStart(2,"0")}:{String(t%60*10).padStart(2,"0").slice(0,2)}
            </text>
          ))}
          {series.map((s,si) => {
            const path = s.data.map((v,i)=>`${i===0?"M":"L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
            return (
              <g key={si}>
                <path d={path} stroke={s.color} strokeWidth="1.4" fill="none"/>
                {s.data.map((v,i)=>i%4===0 && (
                  <rect key={i} x={x(i)-2} y={y(v)-2} width="4" height="4" fill={s.color}/>
                ))}
              </g>
            );
          })}
        </svg>
        <div className="sess-chart-legend">
          <span><i style={{background:"#EF4444"}}/>Threshold Moderate → Bad (−25)</span>
          <span><i style={{background:"#22C55E"}}/>Threshold Good → Moderate (−15)</span>
          {series.map(s=>(<span key={s.name}><i style={{background:s.color}}/>{s.name}</span>))}
        </div>
      </div>
    </>
  );
};

/* ─── Map sub-tab ─────────────────────── */
const SessMap = ({ run }) => {
  const [filters, setFilters] = pS({ rat: [], errOnly: false, color: "rsrp" });
  return (
    <>
      <div className="sess-head">
        <h3>Map view</h3>
        <a className="sess-thresh"><Icon name="sliders" size={13}/> Thresholds</a>
      </div>
      <div className="sess-filters two">
        <MultiChip label="Device" value={["MO Device","MT Device"]} options={["MO Device","MT Device"]} onChange={()=>{}} accent/>
        <MultiChip label="Iteration" value={[1,2,3]} options={[1,2,3]} formatter={v=>`Iteration ${v}`} onChange={()=>{}} accent/>
      </div>
      <div className="sess-filters two">
        <MultiChip label="KPI" value={["LTE RSRQ"]} options={["LTE RSRQ","LTE RSRP","NR5G RSRP","SINR"]} onChange={()=>{}} accent/>
        <MultiChip label="Verbosity" value={["Error","Warning"]} options={["Error","Warning","Alert","Info"]} onChange={()=>{}} accent/>
      </div>
      <div style={{height:480, borderRadius:12, overflow:"hidden", border:"1px solid var(--border)"}}>
        <ReportMap run={run} filters={filters}/>
      </div>
      <div className="sess-map-legend">
        <span><i style={{background:"#22C55E"}}/>Good</span>
        <span><i style={{background:"#F59E0B"}}/>Moderate</span>
        <span><i style={{background:"#EF4444"}}/>Bad</span>
        <span style={{marginLeft:"auto"}} className="dim">© OpenStreetMap contributors</span>
      </div>
    </>
  );
};

/* ─── Event log sub-tab ─────────────────────── */
const SessEvents = ({ run }) => {
  const [open, setOpen] = pS({});
  const iters = run.iterations.slice(0,3);
  const eventsFor = (it) => [
    { t:"00:00:01", layer:"CALL", type:"Start Call",            status:"Success" },
    { t:"00:00:02", layer:"SIP",  type:"INVITE sent",           status:"Success" },
    { t:"00:00:03", layer:"RRC",  type:"RRC Connection Setup",  status:"Success" },
    { t:"00:00:04", layer:"SIG",  type:"LTE Signal Quality",    status:"Info", note:"RSRP -78 / RSRQ -9" },
    { t:"00:00:05", layer:"SIP",  type:"200 OK",                status:"Success" },
    { t:"00:00:07", layer:"CALL", type:"Connected",             status:"Success" },
    { t:"00:00:32", layer:"SIG",  type:"IRAT Handover",         status:"Warning", note:"LTE → 5G NR NSA" },
    { t:"00:00:45", layer:"RTP",  type:"Jitter spike",          status:"Alert",   note:"38 ms" },
    { t:"00:01:08", layer:"CALL", type:it.status==="FAILED"?"Drop Call":"Normal Release", status:it.status==="FAILED"?"Failure":"Success" },
  ];
  return (
    <>
      <div className="sess-head"><h3>Event log</h3></div>
      <div className="sess-filters two">
        <MultiChip label="Device" value={["MO Device","MT Device"]} options={["MO Device","MT Device"]} onChange={()=>{}} accent/>
        <MultiChip label="Verbosity" value={["Error","Warning"]} options={["Error","Warning","Alert","Info"]} onChange={()=>{}} accent/>
      </div>
      <div className="sess-filters one">
        <MultiChip label="Category" value={["Test steps","Signal Quality"]} options={["Test steps","Signal Quality","SIP","RRC","RTP","SMS","Handover"]} onChange={()=>{}} accent/>
      </div>

      <div className="sess-acc">
        {iters.map(it => {
          const isOpen = !!open[it.i];
          const evs = eventsFor(it);
          return (
            <div key={it.i} className={`sess-acc-row ${isOpen?"open":""}`}>
              <div className="sess-acc-head" onClick={()=>setOpen(o=>({...o,[it.i]:!o[it.i]}))}>
                <span className="nm">Iteration {it.i}</span>
                <span className="acc-meta dim mono">{evs.length} events</span>
                <span className={`acc-pill ${it.status==="PASS"?"pass":"fail"}`}>{it.status}</span>
                <Icon name="chevronDown" size={14} className={isOpen?"flip":""}/>
              </div>
              {isOpen && (
                <div className="sess-acc-body">
                  <table className="ev-table">
                    <thead><tr><th>Time</th><th>Layer</th><th>Event</th><th>Status</th><th>Detail</th></tr></thead>
                    <tbody>
                      {evs.map((e,i)=>(
                        <tr key={i} className={`ev-${e.status.toLowerCase()}`}>
                          <td className="mono">{e.t}</td>
                          <td><Tag mono>{e.layer}</Tag></td>
                          <td>{e.type}</td>
                          <td><span className={`ev-pill ev-${e.status.toLowerCase()}`}>{e.status}</span></td>
                          <td className="dim mono">{e.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

/* MultiChip — purple filled chips for multi-select */
const MultiChip = ({ label, value, options, onChange, formatter, accent }) => {
  const [open, setOpen] = pS(false);
  const ref = uR(null);
  pE(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const fmt = v => formatter ? formatter(v) : v;
  const visible = value.slice(0,2), extra = value.length - visible.length;
  return (
    <div className={`mc-pill ${accent?"accent":""}`} ref={ref} onClick={()=>setOpen(o=>!o)}>
      <div className="mc-tags">
        {value.length===0 ? <span className="mc-empty">{label}</span> :
          <>
            {visible.map(v => (
              <span key={v} className="mc-chip">{fmt(v)}
                <span className="x" onClick={(e)=>{e.stopPropagation(); onChange(value.filter(x=>x!==v));}}>×</span>
              </span>
            ))}
            {extra > 0 && <span className="mc-more">+{extra}</span>}
          </>
        }
      </div>
      <Icon name="chevronDown" size={12} className="mc-caret"/>
      {open && (
        <div className="mf-pop" onClick={e=>e.stopPropagation()}>
          {options.map(o => (
            <div key={o} className="mf-pop-row" onClick={()=>{
              onChange(value.includes(o) ? value.filter(x=>x!==o) : [...value, o]);
            }}>
              <input type="checkbox" checked={value.includes(o)} readOnly/>
              <span>{fmt(o)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

window.SessionTab = SessionTab;
