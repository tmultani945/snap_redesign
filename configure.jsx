/* SNAP Remote Portal — Configure (redesigned) */

const CFG_TEST_TYPES = {
  VOIP_MO_MT: {
    label:"Remote VoIP Call", desc:"2 devices · ~45 s / iteration", icon:"phone",
    slots:[
      {key:"mo",role:"EXTERNAL_MO",title:"Select Remote MO Device",screen:"External device · RabbitMQ"},
      {key:"mt",role:"VOIP_MT",    title:"Select VoIP MT Device",  screen:"AWS Connect DID · ready"},
    ],
    steps:[
      {n:1,time:"00:30:000",dev:"MO",    devClass:"mo",    action:"MO dials to MT"},
      {n:2,time:"00:05:000",dev:"Verify",devClass:"verify",action:"Verify Connected state"},
      {n:3,time:"00:20:000",dev:"MT",    devClass:"mt",    action:"MT ends call"},
    ],
    timeline:["MO dials MT (AWS DID)","Verify connected state","MT ends call"],
    params:{phone:false,sms:false},
    artifactLayout:"matrix",
    artifactRows:["MO device","MT device"],
    artifactCols:["Device Logs","Video","User Actions","Device KPIs","Network KPIs"],
    artifactDefaults:{"MO device":["Video","Device Logs"],"MT device":["Video"]},
    artifactSingleLabel:null,
    explain:"RabbitMQ sends a DIAL command to the external device's .xperf-testing queue. AWS Connect routes the inbound call to the assigned DID. We watch xperf-call-states for connected → disconnect transitions. Artifacts upload to S3 after the run.",
    backend:"VOIP_MO_MT",iteration:"~45 s",
  },
  MO_SMS:{
    label:"Send short SMS without validation",desc:"1 device · ~8 s / iteration",icon:"sms",
    slots:[{key:"mo",role:"MO",title:"Select MO Device",screen:"Lab device · ready"}],
    steps:[{n:1,time:"00:08:000",dev:"MO",devClass:"mo",action:"MO sends SMS text to RMT"}],
    timeline:["MO sends SMS"],
    params:{phone:true,sms:true},
    artifactLayout:"list",
    artifactSingleLabel:"Save SMS logs",
    artifactListOptions:["Save SMS logs","Save device logs","Save video","Save user actions","Save device KPIs","Save network KPIs"],
    artifactDefaultsList:["Save SMS logs"],
    explain:"The SnapBox agent calls POST /api/sendSMS on the MO device with the supplied target number and text. Pass = SnapBox accepted the send. No delivery validation is performed against the receiver.",
    backend:"MO_SMS",iteration:"~8 s",
  },
  MO_MT_SMS:{
    label:"Validate SMS",desc:"2 devices · ~12 s / iteration",icon:"sms",
    slots:[
      {key:"mo",role:"MO",title:"Select MO Device",screen:"Lab device · ready"},
      {key:"mt",role:"MT",title:"Select MT Device",screen:"Lab device · ready"},
    ],
    steps:[
      {n:1,time:"00:05:000",dev:"MO",devClass:"mo",action:"MO sends SMS text to MT"},
      {n:2,time:"00:07:000",dev:"MT",devClass:"mt",action:"MT receives SMS from MO"},
    ],
    timeline:["MO sends SMS to MT","MT receives SMS"],
    params:{phone:false,sms:true},
    artifactLayout:"matrix",
    artifactRows:["MO device","MT device"],
    artifactCols:["Device Logs","Video","User Actions","Device KPIs","Network KPIs"],
    artifactDefaults:{"MO device":["Device Logs"],"MT device":["Device Logs","Video"]},
    artifactSingleLabel:"Save SMS logs",
    explain:"SnapBox sends from MO. We subscribe MT to INCOMING_SMS monitoring and validate sender + text content per part. Apple MT devices skip validation and pass on receipt of any matching part.",
    backend:"MO_MT_SMS",iteration:"~12 s",
  },
  EXT_MO_MT:{
    label:"External voice call",desc:"2 devices · ~55 s / iteration",icon:"phone",
    slots:[
      {key:"mo",role:"EXTERNAL_MO",title:"Select Remote MO Device",screen:"External device · RabbitMQ"},
      {key:"mt",role:"MT",         title:"Select MT Device",        screen:"Lab device · ready"},
    ],
    steps:[
      {n:1,time:"00:35:000",dev:"MO",devClass:"mo",action:"RMO device dials MT"},
      {n:2,time:"00:20:000",dev:"MT",devClass:"mt",action:"MT closes call (wait for end)"},
    ],
    timeline:["RMO device dials MT","MT closes call"],
    params:{phone:false,sms:false},
    artifactLayout:"matrix",
    artifactRows:["MO device","EXTERNAL_MO device"],
    artifactCols:["Device Logs","Video","User Actions","Device KPIs","Network KPIs"],
    artifactDefaults:{"MO device":["Device Logs","Video"],"EXTERNAL_MO device":["Device Logs"]},
    artifactSingleLabel:"Save call logs",
    explain:"External MO receives a DIAL command via RabbitMQ. SnapBox monitors MT for CALL_STATE changes (RINGING → CONNECTED → DISCONNECTED). Both sides record artifacts. Video adds ~10 s to overall duration.",
    backend:"EXT_MO_MT",iteration:"~55 s",
  },
  VIDEO:{
    label:"Remote video playback",desc:"Artifact option — attaches to any test",icon:"video",
    slots:[],steps:[],
    timeline:["Captured silently in background"],
    params:{phone:false,sms:false},
    artifactLayout:"info-only",
    explain:"Remote video playback is not a standalone test type. It is captured silently as a background artifact during any selected test and appears only in the report's Artifacts section after finalization. Toggle the VIDEO checkbox in step 3 of any other test to include it.",
    backend:"—",iteration:"—",
  }
};

const CFG_DEVICES = {
  mo:[
    {id:"mo1",name:"Pixel 8 — MO-Lab-01",   os:"Android 14",state:"online",sn:"SN-LAB-301",meta:"us-west-2 · lab-pool-a"},
    {id:"mo2",name:"Galaxy S24 — MO-Lab-04",os:"Android 14",state:"online",sn:"SN-LAB-340",meta:"us-east-1 · lab-pool-b"},
    {id:"mo3",name:"iPhone 15 — MO-Lab-09", os:"iOS 17.4",  state:"busy",  sn:"SN-LAB-412",meta:"eu-west-1 · in use"},
  ],
  mt:[
    {id:"mt1",name:"Pixel 7 — MT-Lab-02",   os:"Android 14",state:"online",sn:"SN-LAB-208",meta:"us-west-2 · lab-pool-a"},
    {id:"mt2",name:"iPhone 14 — MT-Lab-05", os:"iOS 17.2",  state:"online",sn:"SN-LAB-271",meta:"us-east-1 · lab-pool-b"},
    {id:"mt3",name:"Galaxy A55 — MT-Lab-11",os:"Android 14",state:"online",sn:"SN-LAB-380",meta:"us-west-2 · lab-pool-a"},
    {id:"mt4",name:"+1 415-555-0150 (DID)", os:"AWS DID",   state:"online",sn:"arn:aws:connect:…/0150",meta:"US · TOLL_FREE"},
  ]
};

const CFG_ART_DESC = {
  "Save SMS logs":"sms_logs.json","Save call logs":"call_logs.json",
  "Save device logs":"logcat / syslog","Save video":".mp4 · 9:16",
  "Save user actions":"actions.jsonl","Save device KPIs":"kpi-device.csv",
  "Save network KPIs":"kpi-network.csv",
};

const CFG_TYPE_ORDER = ["VOIP_MO_MT","MO_SMS","MO_MT_SMS","EXT_MO_MT","VIDEO"];
const CFG_STEPS = ["Devices","Parameters","Artifacts","Review"];

/* ── Inline SVG icons ── */
const IcPhone  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcSms    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcVideo  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m23 7-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const IcCheck  = ({s=12}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>;
const IcPlus   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;
const IcInfo   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>;
const IcClose  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>;

const cfgTypeIcon = ic => ic==="sms" ? <IcSms/> : ic==="video" ? <IcVideo/> : <IcPhone/>;

/* ── Artifact state helpers ── */
const mkArtMatrix = def => {
  const m = {};
  (def.artifactRows||[]).forEach(r => { m[r] = new Set(def.artifactDefaults?.[r]||[]); });
  return m;
};
const mkArtList = def => new Set(def.artifactDefaultsList||[]);

/* ── Phone bezel device slot ── */
const CfgPhoneSlot = ({ slot, picked, onPickClick }) => {
  const dev = picked[slot.key];
  const filled = !!dev;
  const placeholder = filled ? slot.screen : (slot.role==="VOIP_MT" ? "No DID assigned" : "No device assigned");
  return (
    <div className={`cfg-dev-slot-card ${filled?"is-filled":"is-empty"}`}>
      <span className="cfg-dev-slot-tag">
        <span className="cfg-role-dot"></span>{slot.role}
      </span>
      <div className="cfg-phone">
        <div className="cfg-phone-notch"></div>
        <div className="cfg-phone-screen">
          <div className="cfg-phone-label">{placeholder}</div>
          {filled ? (
            <div className="cfg-dev-filled" onClick={()=>onPickClick(slot.key)}>
              <div className="cfg-dev-filled-row">
                <span className={`cfg-dev-state cfg-dev-${dev.state}`}></span>
                <span className="cfg-dev-filled-name">{dev.name}</span>
                <span className="cfg-dev-filled-os">{dev.os}</span>
              </div>
              <div className="cfg-dev-filled-meta">{dev.sn}</div>
            </div>
          ) : (
            <button className="cfg-dev-pick-cta" onClick={()=>onPickClick(slot.key)}>
              <IcPlus/> {slot.title}
            </button>
          )}
        </div>
      </div>
      <div className="cfg-dev-filled-meta">
        {slot.role==="EXTERNAL_MO" ? "External device · RabbitMQ"
         : slot.role==="VOIP_MT" ? "AWS Connect DID" : "Lab device"}
      </div>
    </div>
  );
};

/* ── Device picker modal ── */
const CfgDevModal = ({ slotKey, onClose, onPick }) => {
  if (!slotKey) return null;
  const devices = CFG_DEVICES[slotKey]||CFG_DEVICES.mo;
  return (
    <div className="cfg-modal-shade" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="cfg-modal">
        <div className="cfg-modal-head">
          <h3>Pick a {slotKey==="mo"?"MO":"MT"} device</h3>
          <button className="cfg-modal-close" onClick={onClose}><IcClose/></button>
        </div>
        <div>
          {devices.map(d => (
            <button key={d.id} className="cfg-dev-option" onClick={()=>onPick(slotKey,d)}>
              <span className={`cfg-dev-state cfg-dev-${d.state}`}></span>
              <div className="cfg-dev-option-main">
                <div className="cfg-dev-option-name">{d.name}</div>
                <div className="cfg-dev-option-meta">{d.sn} · {d.meta}</div>
              </div>
              <span className="cfg-dev-option-os">{d.os}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Step 0: Devices ── */
const CfgStepDevices = ({ def, picked, onPickClick, bulk, setBulk }) => {
  if (def.slots.length===0) return (
    <div className="card">
      <div className="card-head"><h3>Devices</h3></div>
      <div className="card-body">
        <div className="cfg-banner"><IcInfo/><div><b>No devices to pick.</b> {def.explain}</div></div>
      </div>
    </div>
  );
  const avail = k => (CFG_DEVICES[k]||[]).filter(x=>x.state==="online").length;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Devices</h3>
        <span className="summary-eyebrow">{def.slots.map(s=>s.role).join(" + ")}</span>
      </div>
      <div className="cfg-dev-toolbar">
        <span className="cfg-dev-toolbar-label">Bulk size</span>
        <input className="cfg-bulk-input" type="number" min="1" max="500" value={bulk}
          onChange={e=>setBulk(+e.target.value||1)}/>
        <div className="cfg-divider-v"></div>
        <div className="cfg-avail-row">
          <span className="cfg-avail-label">Available:</span>
          {def.slots.map(s=>(
            <span key={s.key} className="cfg-avail-chip">
              <span className="cfg-avail-key">{s.role}</span>
              <span>{avail(s.key)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={`cfg-dev-stage ${def.slots.length===1?"cols-1":"cols-2"}`}>
        {def.slots.map(s=>(
          <CfgPhoneSlot key={s.key} slot={s} picked={picked} onPickClick={onPickClick}/>
        ))}
      </div>
      {def.steps.length>0&&(
        <table className="data-table">
          <thead><tr><th>Step</th><th>Time</th><th>Device</th><th>Action</th></tr></thead>
          <tbody>
            {def.steps.map(s=>(
              <tr key={s.n}>
                <td className="cfg-col-step">{s.n}</td>
                <td className="cfg-col-time">{s.time}</td>
                <td><span className={`cfg-role-tag ${s.devClass}`}>{s.dev}</span></td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

/* ── Step 1: Parameters ── */
const CfgStepParameters = ({ def, params, setParam }) => {
  const p = params;
  const parts = Math.max(1, Math.ceil((p.sms||"").length/160));
  return (
    <div className="card">
      <div className="card-head"><h3>Parameters</h3></div>
      <div className="card-body">
        {def.params.phone&&(
          <label className="field">
            <div className="field-label">Target phone number</div>
            <input className="input mono" value={p.phone} placeholder="+1 …"
              onChange={e=>setParam("phone",e.target.value)}/>
            <div className="field-hint">Any e.164 number. SnapBox routes via the carrier on the MO device.</div>
          </label>
        )}
        {def.params.sms&&(
          <label className="field">
            <div className="field-label">SMS text</div>
            <textarea className="input" rows="3" value={p.sms}
              onChange={e=>setParam("sms",e.target.value)}/>
            <div className="field-hint">{(p.sms||"").length} chars · arrives in {parts} part{parts>1?"s":""}</div>
          </label>
        )}
        <div className="field-row-3">
          <label className="field">
            <div className="field-label">Iterations</div>
            <input className="input mono" type="number" min="1" max="500" value={p.iterations}
              onChange={e=>setParam("iterations",+e.target.value||1)}/>
            <div className="field-hint">1 – 500 repeats</div>
          </label>
          <label className="field">
            <div className="field-label">Delay between iterations</div>
            <input className="input mono" type="number" min="1" max="3600" value={p.delay}
              onChange={e=>setParam("delay",+e.target.value||1)}/>
            <div className="field-hint">seconds · 1 – 3600</div>
          </label>
          <label className="field">
            <div className="field-label">Duration</div>
            <input className="input mono" value={p.duration}
              onChange={e=>setParam("duration",e.target.value)}/>
            <div className="field-hint">auto-calculated · editable</div>
          </label>
        </div>
        <div className="field-row-2">
          <label className="field">
            <div className="field-label">Start test at</div>
            <input className="input mono" type="datetime-local" value={p.startAt}
              onChange={e=>setParam("startAt",e.target.value)}/>
            <div className="field-hint">leave empty to run immediately</div>
          </label>
          <div className="field" style={{display:"flex",alignItems:"center",paddingTop:24}}>
            <label className="cfg-checkbox-row" style={{width:"100%"}}>
              <input type="checkbox" checked={p.releaseAfter}
                onChange={e=>setParam("releaseAfter",e.target.checked)}/>
              Release device after test
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Step 2: Artifacts ── */
const CfgStepArtifacts = ({ def, artMatrix, setArtMatrix, artList, setArtList }) => {
  if (def.artifactLayout==="info-only") return (
    <div className="card">
      <div className="card-head"><h3>Artifacts</h3></div>
      <div className="card-body">
        <div className="cfg-banner">
          <IcInfo/>
          <div><b>Remote video playback isn't a standalone test type.</b> Toggle the VIDEO checkbox inside another test's Artifacts step — it records silently in the background and appears in the Report afterwards.</div>
        </div>
      </div>
    </div>
  );

  if (def.artifactLayout==="list") return (
    <div className="card">
      <div className="card-head">
        <h3>Artifacts</h3>
        <span className="summary-eyebrow">Single device — pick what to save</span>
      </div>
      <div className="card-body">
        <div className="cfg-art-list">
          {def.artifactListOptions.map(opt=>{
            const on=artList.has(opt);
            return (
              <button key={opt} className={`art-chip ${on?"on":""}`} onClick={()=>{
                const s=new Set(artList);
                if(s.has(opt)) s.delete(opt); else s.add(opt);
                setArtList(s);
              }}>
                <span className="art-chip-mark">{on&&<IcCheck/>}</span>
                <span className="art-chip-label">{opt}</span>
                <span className="art-chip-desc">{CFG_ART_DESC[opt]||""}</span>
              </button>
            );
          })}
        </div>
        <div className="cfg-banner" style={{marginTop:14}}>
          <IcInfo/>
          <div><b>Cloud feature required.</b> If your subscription excludes Cloud, the artifacts step is disabled and shows "Unavailable".</div>
        </div>
      </div>
    </div>
  );

  /* matrix */
  return (
    <div className="card">
      <div className="card-head">
        <h3>Artifacts</h3>
        <span className="summary-eyebrow">Multi-device — pick per device</span>
      </div>
      <div>
        <table className="cfg-art-matrix">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Device</th>
              {def.artifactCols.map(c=><th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {def.artifactRows.map(r=>(
              <tr key={r}>
                <th>{r}</th>
                {def.artifactCols.map(c=>{
                  const on=artMatrix[r]?.has(c);
                  return (
                    <td key={c}>
                      <span className={`cfg-matrix-check ${on?"on":""}`} onClick={()=>{
                        const m={};
                        def.artifactRows.forEach(row=>{m[row]=new Set(artMatrix[row]||[]);});
                        if(!m[r]) m[r]=new Set();
                        if(m[r].has(c)) m[r].delete(c); else m[r].add(c);
                        setArtMatrix(m);
                      }}>
                        <IcCheck/>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"18px 22px"}}>
          <div className="cfg-banner">
            <IcInfo/>
            <div><b>{def.artifactSingleLabel||"Logs"}</b> are enabled by default. Toggling Video on either device adds ~10 s to the run.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Step 3: Review ── */
const CfgStepReview = ({ def, picked, params, artMatrix, artList, bulk }) => {
  const filled = def.slots.map(s=>picked[s.key]).filter(Boolean);
  const arts = def.artifactLayout==="matrix"
    ? Object.entries(artMatrix).flatMap(([r,set])=>[...set].map(c=>`${r} → ${c}`))
    : [...artList];
  const p = params;
  return (
    <div className="card">
      <div className="card-head"><h3>Review & start</h3></div>
      <div className="card-body">
        <div className="review-grid">
          <div className="review-label">Type</div>
          <div className="review-value"><span className="tag mono tag-accent">{def.backend}</span> {def.label}</div>

          <div className="review-label">Devices</div>
          <div className="review-value">
            {filled.length===0
              ? <span className="tag">No devices required</span>
              : filled.map((dev,i)=><span key={i} className="tag mono">{def.slots[i].role} · {dev.name}</span>)}
          </div>

          <div className="review-label">Iterations</div>
          <div className="review-value mono">{p.iterations} × {def.iteration} · delay {p.delay}s · bulk {bulk}</div>

          <div className="review-label">Schedule</div>
          <div className="review-value mono">{p.startAt||"Run immediately"}</div>

          <div className="review-label">Duration</div>
          <div className="review-value mono">{p.duration}</div>

          {def.params.phone&&<><div className="review-label">Target #</div><div className="review-value mono">{p.phone}</div></>}
          {def.params.sms&&<><div className="review-label">SMS text</div><div className="review-value">"{p.sms}"</div></>}

          <div className="review-label">Release after</div>
          <div className="review-value">{p.releaseAfter?"Yes":"No"}</div>

          <div className="review-label">Artifacts</div>
          <div className="review-value">
            {arts.length ? arts.map(a=><span key={a} className="tag mono">{a}</span>) : <span className="tag">None</span>}
          </div>

          <div className="review-row full">
            <div className="review-label">Action plan</div>
            <div className="review-value" style={{marginTop:8}}>
              <div className="cfg-action-tl">
                {def.timeline.map((t,i)=>(
                  <React.Fragment key={i}>
                    {i>0&&<span className="cfg-tl-edge"></span>}
                    <div className="cfg-tl-node"><span className="cfg-tl-dot"></span><span>{t}</span></div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Configure component ── */
const Configure = ({ testType: initType, onCancel, onStart }) => {
  const [activeType, setActiveType] = pS(initType||"VOIP_MO_MT");
  const [step, setStep] = pS(0);
  const [picked, setPicked] = pS({mo:null,mt:null});
  const [bulk, setBulk] = pS(1);
  const [params, setParamsRaw] = pS({
    phone:"+1 555-0150",sms:"Hello from SNAP automation",
    iterations:1,delay:3,startAt:"",duration:"1 minute",releaseAfter:true,
  });
  const [artMatrix, setArtMatrix] = pS({});
  const [artList, setArtList] = pS(new Set());
  const [pickerSlot, setPickerSlot] = pS(null);

  const def = CFG_TEST_TYPES[activeType];

  pE(()=>{
    setStep(0);
    setPicked({mo:null,mt:null});
    const d = CFG_TEST_TYPES[activeType];
    setArtMatrix(mkArtMatrix(d));
    setArtList(mkArtList(d));
  }, [activeType]);

  pE(()=>{
    setArtMatrix(mkArtMatrix(def));
    setArtList(mkArtList(def));
  }, []);

  const setParam = (k,v) => setParamsRaw(p=>({...p,[k]:v}));
  const allFilled = def.slots.length===0 || def.slots.every(s=>picked[s.key]);
  const isLast = step===CFG_STEPS.length-1;
  const artCount = def.artifactLayout==="matrix"
    ? Object.values(artMatrix).reduce((a,s)=>a+(s?.size||0),0) : artList.size;
  const filledCount = def.slots.filter(s=>picked[s.key]).length;

  const handlePick = (slotKey,dev) => { setPicked(p=>({...p,[slotKey]:dev})); setPickerSlot(null); };

  return (
    <>
      {/* Type selector tabs */}
      <div className="cfg-type-tabs">
        {CFG_TYPE_ORDER.map(k=>{
          const d = CFG_TEST_TYPES[k];
          const active = activeType===k;
          return (
            <button key={k} className={`cfg-type-tab${active?" active":""}`} onClick={()=>setActiveType(k)}>
              <span className="cfg-type-tab-ic">{cfgTypeIcon(d.icon)}</span>
              <span>{d.label}</span>
              {active&&<span className="cfg-type-tab-code">{d.backend}</span>}
            </button>
          );
        })}
      </div>

      <div className="page configure">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Configure</div>
            <h1>{def.label}</h1>
            <div className="page-sub">Backend type <span className="mono">{def.backend}</span> · {def.desc}</div>
          </div>
          <div className="page-actions"><Btn onClick={onCancel}>Cancel</Btn></div>
        </div>

        <div className="cfg-grid">
          {/* Stepper rail */}
          <aside className="cfg-rail" style={{position:"sticky",top:88}}>
            {CFG_STEPS.map((s,i)=>(
              <button key={i} className={`cfg-step${i===step?" active":""}${i<step?" done":""}`}
                onClick={()=>setStep(i)}>
                <span className="cfg-step-num">{i<step?<IcCheck s={12}/>:i+1}</span>
                <span>{s}</span>
              </button>
            ))}
          </aside>

          {/* Step body */}
          <div className="cfg-body">
            {step===0&&<CfgStepDevices def={def} picked={picked} onPickClick={setPickerSlot} bulk={bulk} setBulk={setBulk}/>}
            {step===1&&<CfgStepParameters def={def} params={params} setParam={setParam}/>}
            {step===2&&<CfgStepArtifacts def={def} artMatrix={artMatrix} setArtMatrix={setArtMatrix} artList={artList} setArtList={setArtList}/>}
            {step===3&&<CfgStepReview def={def} picked={picked} params={params} artMatrix={artMatrix} artList={artList} bulk={bulk}/>}

            <div className="cfg-foot">
              <div>{step>0&&<Btn onClick={()=>setStep(step-1)}>← Back</Btn>}</div>
              <div className="cfg-foot-right">
                <Btn>Save</Btn>
                <Btn>Schedule…</Btn>
                {isLast
                  ? <Btn kind="primary" onClick={()=>onStart({activeType,picked,params,bulk})} disabled={!allFilled}>▶ Run test</Btn>
                  : <Btn kind="primary" onClick={()=>setStep(step+1)} disabled={step===0&&!allFilled}>Continue →</Btn>
                }
              </div>
            </div>
          </div>

          {/* Summary panel */}
          <aside className="cfg-summary">
            <div className="summary-eyebrow">Test summary</div>
            <h2>{def.label}</h2>
            <div className="summary-rows">
              <div className="summary-row"><span className="lbl">Type</span><b className="val mono">{def.backend}</b></div>
              <div className="summary-row"><span className="lbl">Devices</span><b className="val">{filledCount} / {def.slots.length}</b></div>
              <div className="summary-row"><span className="lbl">Iterations</span><b className="val mono">{params.iterations}</b></div>
              <div className="summary-row"><span className="lbl">Artifacts</span><b className="val mono">{artCount}</b></div>
              <div className="summary-row"><span className="lbl">Est. duration</span><b className="val mono">{def.iteration}</b></div>
            </div>
            <div className="summary-section">
              <span className="summary-eyebrow" style={{display:"block",marginBottom:12}}>Action timeline</span>
              <div className="cfg-action-tl">
                {def.timeline.map((t,i)=>(
                  <React.Fragment key={i}>
                    {i>0&&<span className="cfg-tl-edge"></span>}
                    <div className="cfg-tl-node"><span className="cfg-tl-dot"></span><span>{t}</span></div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <details className="summary-explain">
              <summary>▸ What happens when I press Start?</summary>
              <p>{def.explain}</p>
            </details>
          </aside>
        </div>
      </div>

      {pickerSlot&&<CfgDevModal slotKey={pickerSlot} onClose={()=>setPickerSlot(null)} onPick={handlePick}/>}
    </>
  );
};

window.Configure = Configure;
