/* SNAP Remote Portal — Configure + Active Run */

/* ============================================================
   CONFIGURE (VoIP shown; SMS/R2R follow same shell)
   ============================================================ */
const Configure = ({ testType, onCancel, onStart }) => {
  const def = TEST_TYPES[testType];
  const [step, setStep] = pS(0);
  const [extDev, setExtDev] = pS(null);
  const [moDev, setMoDev] = pS(null);
  const [mtDev, setMtDev] = pS(null);
  const [voip, setVoip] = pS(null);
  const [phone, setPhone] = pS("+1 555-0150");
  const [text, setText] = pS("Hello from SNAP automation");
  const [repeat, setRepeat] = pS(1);
  const [delay, setDelay] = pS(3);
  const [timeout, setTimeoutVal] = pS(15000);
  const [arts, setArts] = pS({ VIDEO: true, NETWORK_KPI: true, CALL_LOG: true, DEVICE_LOG: false, USER_ACTION: false, KPIS: false });

  const need = def.devices;
  const needsExt = need.includes("EXTERNAL_MO");
  const needsMo = need.includes("MO");
  const needsMt = need.includes("MT");
  const needsVoip = need.includes("VOIP_MT");
  const isSms = testType === "MO_SMS" || testType === "MO_MT_SMS";

  const partsCount = uM(() => Math.max(1, Math.ceil(text.length / 160)), [text]);
  const isApple = mtDev && mtDev.oem === "Apple";

  const filled =
    (!needsExt || extDev) &&
    (!needsMo || moDev) &&
    (!needsMt || mtDev) &&
    (!needsVoip || voip);

  const steps = ["Devices", "Parameters", "Artifacts", "Review"];

  const actionsFor = {
    VOIP_MO_MT: [{enum:"MO_DIALING_MT", human:"MO dials MT (AWS DID)"}, {enum:"MT_WAIT_END", human:"Call ends"}],
    EXT_MO_MT:  [{enum:"MO_DIALING_MT", human:"MO dials MT"}, {enum:"MT_RINGING", human:"MT rings"}, {enum:"MO_MT_SPEAKING", human:"Connected"}, {enum:"MT_WAIT_END", human:"Call ends"}],
    MO_SMS:     [{enum:"MO_MESSAGING", human:"MO sends SMS"}],
    MO_MT_SMS:  [{enum:"MO_MESSAGING_MT", human:"MO sends SMS to MT"}, {enum:"MT_RECEIVE_SMS", human:"MT receives SMS"}],
    VIDEO:      [{enum:"—", human:"Attach to base test"}],
  }[testType];

  return (
    <div className="page configure">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Configure</div>
          <h1>{def.label}</h1>
          <div className="page-sub">Backend type <span className="mono">{testType}</span></div>
        </div>
        <div className="page-actions">
          <Btn onClick={onCancel}>Cancel</Btn>
        </div>
      </div>

      <div className="cfg-grid">
        {/* Stepper rail */}
        <aside className="cfg-rail">
          {steps.map((s, i) => (
            <button key={i} className={`cfg-step ${i===step ? "active" : ""} ${i<step ? "done" : ""}`} onClick={() => setStep(i)}>
              <span className="cfg-step-num">{i<step ? <Icon name="check" size={12}/> : i+1}</span>
              <span>{s}</span>
            </button>
          ))}
        </aside>

        {/* Step body */}
        <div className="cfg-body">
          {step === 0 && (
            <Card title="Devices">
              {needsExt && <DeviceSlot label="EXTERNAL_MO" desc="External device controlled via RabbitMQ"
                value={extDev} onChange={setExtDev}
                options={[DEVICES.ext1, DEVICES.ext2]} />}
              {needsMo && <DeviceSlot label="MO" desc="Mobile-originating lab device"
                value={moDev} onChange={setMoDev} options={[DEVICES.mo1]} />}
              {needsMt && <DeviceSlot label="MT" desc="Mobile-terminating lab device"
                value={mtDev} onChange={setMtDev} options={[DEVICES.mt1, DEVICES.mt2]} />}
              {needsVoip && <VoipSlot value={voip} onChange={setVoip} />}
              {isApple && testType === "MO_MT_SMS" && (
                <div className="banner banner-info">
                  <Icon name="check" size={14} />
                  <div>
                    <b>iOS MT detected.</b> Apple devices skip text and sender validation. The test passes on receipt of any matching part.
                  </div>
                </div>
              )}
            </Card>
          )}

          {step === 1 && (
            <Card title="Parameters">
              {isSms && (
                <>
                  {testType === "MO_SMS" && (
                    <Field label="Target phone number" hint="Free-form. Any e.164 number.">
                      <input className="input mono" value={phone} onChange={e=>setPhone(e.target.value)} />
                    </Field>
                  )}
                  <Field label="Message text" hint={`${text.length} chars · arrives in ${partsCount} part${partsCount>1?"s":""}`}>
                    <textarea className="input" rows="3" value={text} onChange={e=>setText(e.target.value)} />
                  </Field>
                </>
              )}

              <div className="field-row-3">
                <Field label="Repeat count" hint="Number of iterations">
                  <input className="input mono" type="number" min="1" value={repeat} onChange={e=>setRepeat(+e.target.value)} />
                </Field>
                <Field label="Iteration delay (sec)" hint="Delay between iterations">
                  <input className="input mono" type="number" min="0" value={delay} onChange={e=>setDelay(+e.target.value)} />
                </Field>
                <Field label="Start timeout (ms)" hint="Max wait for first call state">
                  <input className="input mono" type="number" value={timeout} onChange={e=>setTimeoutVal(+e.target.value)} />
                </Field>
              </div>

              {testType === "MO_MT_SMS" && (
                <div className="adv">
                  <details>
                    <summary>Advanced timing</summary>
                    <div className="field-row-2">
                      <Field label="Per-part timeout (ms)"><input className="input mono" defaultValue={10000} /></Field>
                      <Field label="Action timeout (ms)"><input className="input mono" defaultValue={10000} /></Field>
                    </div>
                  </details>
                </div>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title="Artifacts">
              <div className="art-grid">
                {Object.keys(arts).map(k => (
                  <button key={k} className={`art-chip ${arts[k] ? "on" : ""}`}
                    onClick={() => setArts({...arts, [k]: !arts[k]})}>
                    <span className="art-chip-mark">{arts[k] && <Icon name="check" size={12}/>}</span>
                    <span className="mono">{k}</span>
                  </button>
                ))}
              </div>
              <p className="hint">CALL_LOG is enabled by default. VIDEO may extend duration by ~10s.</p>
            </Card>
          )}

          {step === 3 && (
            <Card title="Review & start">
              <div className="review-grid">
                <Row label="Type"        v={<Tag mono>{testType}</Tag>} />
                <Row label="Destination" v={testType === "EXT_MO_MT" ? <Tag>EXTERNAL</Tag> : <Tag>LAB</Tag>} />
                <Row label="Devices"     v={
                  <>
                    {extDev && <Tag mono>EXTERNAL_MO · {extDev.name}</Tag>}
                    {moDev && <Tag mono>MO · {moDev.name}</Tag>}
                    {mtDev && <Tag mono>MT · {mtDev.name}</Tag>}
                    {voip && <Tag mono>VOIP_MT · {voip.PhoneNumber}</Tag>}
                  </>
                } />
                <Row label="Iterations"  v={<span className="mono">{repeat} × ~{def.dur}</span>} />
                <Row label="Artifacts"   v={Object.entries(arts).filter(([,v])=>v).map(([k])=><Tag key={k} mono>{k}</Tag>)} />
                <Row label="Action plan" v={<ActionTimeline actions={actionsFor.map(a => ({...a, status: "IDLE"}))} />} fullCol />
              </div>
            </Card>
          )}

          <div className="cfg-foot">
            <div>
              {step > 0 && <Btn onClick={() => setStep(step-1)}>← Back</Btn>}
            </div>
            <div className="cfg-foot-right">
              <Btn>Save</Btn>
              <Btn icon="clock">Schedule…</Btn>
              {step < 3 ? (
                <Btn kind="primary" icon="arrow" onClick={() => setStep(step+1)} disabled={step===0 && !filled}>
                  Continue
                </Btn>
              ) : (
                <Btn kind="primary" icon="play" onClick={() => onStart({extDev, mtDev, voip, repeat, testType})} disabled={!filled}>
                  Start test
                </Btn>
              )}
            </div>
          </div>
        </div>

        {/* Right summary */}
        <aside className="cfg-summary">
          <div className="summary-eyebrow">Test summary</div>
          <h2>{def.label}</h2>
          <div className="summary-rows">
            <div><span>Type</span><b className="mono">{testType}</b></div>
            <div><span>Devices</span><b>{
              [extDev, moDev, mtDev, voip].filter(Boolean).length
            } / {need.length}</b></div>
            <div><span>Iterations</span><b className="mono">{repeat}</b></div>
            <div><span>Artifacts</span><b className="mono">{Object.values(arts).filter(Boolean).length}</b></div>
            <div><span>Est. duration</span><b className="mono">~{def.dur}</b></div>
          </div>
          <div className="summary-section">
            <div className="summary-eyebrow">Action timeline</div>
            <ActionTimeline actions={actionsFor.map(a => ({...a, status: "IDLE"}))} />
          </div>
          <details className="summary-explain">
            <summary>What happens when I press Start?</summary>
            <p>
              {testType === "VOIP_MO_MT" && <>RabbitMQ sends a DIAL command to the external device's <span className="mono">.xperf-testing</span> queue. We watch <span className="mono">xperf-call-states</span> for state transitions. AWS Connect routes the inbound call. Artifacts upload to S3 after the run.</>}
              {testType === "MO_SMS" && <>The SnapBox agent calls <span className="mono">POST /api/sendSMS</span> on the MO device. Pass = SnapBox accepted the send. No delivery validation.</>}
              {testType === "MO_MT_SMS" && <>SnapBox sends from MO. We subscribe MT to <span className="mono">INCOMING_SMS</span> monitoring and validate sender + text content. Apple MT skips validation.</>}
              {testType === "EXT_MO_MT" && <>External MO receives a DIAL command via RabbitMQ. SnapBox monitors MT for CALL_STATE changes. Both sides record artifacts.</>}
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <label className="field">
    <div className="field-label">{label}</div>
    {children}
    {hint && <div className="field-hint">{hint}</div>}
  </label>
);

const Row = ({ label, v, fullCol }) => (
  <div className={`review-row ${fullCol ? "full" : ""}`}>
    <div className="review-label">{label}</div>
    <div className="review-value">{v}</div>
  </div>
);

const DeviceSlot = ({ label, desc, value, onChange, options }) => {
  const [open, setOpen] = pS(false);
  return (
    <div className="dev-slot">
      <div className="dev-slot-head">
        <div>
          <div className="dev-slot-label mono">{label}</div>
          <div className="dev-slot-desc">{desc}</div>
        </div>
      </div>
      <button className="dev-pick" onClick={() => setOpen(!open)}>
        {value ? (
          <>
            <span className={`dev-state dev-${value.state.toLowerCase()}`} />
            <div className="dev-pick-main">
              <div className="dev-pick-name">{value.name} <span className="dev-pick-os">{value.os}</span></div>
              <div className="dev-pick-meta mono">{value.sn} · udid {value.udid}</div>
            </div>
            <Icon name="chevronDown" size={14} />
          </>
        ) : (
          <>
            <span className="dev-pick-empty">Pick a {label} device…</span>
            <Icon name="chevronDown" size={14} />
          </>
        )}
      </button>
      {open && (
        <div className="dev-picker">
          {options.map(o => (
            <button key={o.id} className="dev-option" onClick={() => { onChange(o); setOpen(false); }}>
              <span className={`dev-state dev-${o.state.toLowerCase()}`} />
              <div>
                <div className="dev-option-name">{o.name} <span className="dev-tone">· {o.oem} · {o.os}</span></div>
                <div className="mono dev-option-meta">{o.sn} · {o.state}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const VoipSlot = ({ value, onChange }) => {
  const [open, setOpen] = pS(false);
  return (
    <div className="dev-slot">
      <div className="dev-slot-head">
        <div>
          <div className="dev-slot-label mono">VOIP_MT</div>
          <div className="dev-slot-desc">AWS Connect DID phone number</div>
        </div>
        <Tag>From <span className="mono">/api/voip/available</span></Tag>
      </div>
      <button className="dev-pick" onClick={() => setOpen(!open)}>
        {value ? (
          <>
            <span className="dev-state dev-online" />
            <div className="dev-pick-main">
              <div className="dev-pick-name mono">{value.PhoneNumber}</div>
              <div className="dev-pick-meta">{value.PhoneNumberCountryCode} · {value.PhoneNumberType} · AWS Connect</div>
            </div>
            <Icon name="chevronDown" size={14} />
          </>
        ) : (
          <><span className="dev-pick-empty">Pick a VoIP DID…</span><Icon name="chevronDown" size={14} /></>
        )}
      </button>
      {open && (
        <div className="dev-picker">
          {VOIP_NUMBERS.map(o => (
            <button key={o.PhoneNumber} className="dev-option" onClick={() => { onChange(o); setOpen(false); }}>
              <span className="dev-state dev-online" />
              <div>
                <div className="dev-option-name mono">{o.PhoneNumber}</div>
                <div className="dev-option-meta">{o.PhoneNumberCountryCode} · {o.PhoneNumberType}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

window.Configure = Configure;
