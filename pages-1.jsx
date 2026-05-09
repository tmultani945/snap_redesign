/* SNAP Remote Portal — Pages */
const { useState: pS, useEffect: pE, useMemo: pM } = React;

/* ============================================================
   DASHBOARD
   ============================================================ */
const Dashboard = ({ runs, onOpenRun, onConfigure, onNav }) => {
  const live = runs.filter((r) => r.status === "PROGRESS" || r.status === "FINALIZING");
  const [step, setStep] = pS(0);
  const tourSteps = [
  { icon: "play",   num: "01", verb: "PICK",     title: "Choose a test",     text: "Voice, SMS, VoIP, or remote-to-remote — five focused entry points." },
  { icon: "cpu",    num: "02", verb: "ASSIGN",   title: "Pick devices",      text: "Drop in lab phones, registered external devices, or AWS DIDs." },
  { icon: "loader", num: "03", verb: "RUN",      title: "Watch it live",     text: "A timeline shows every action, every device, every state change." },
  { icon: "file",   num: "04", verb: "REVIEW",   title: "Get evidence",      text: "Summary, sessions, and artifacts. Every test ends with proof." }];

  const tourPreviews = [
    <div className="tp-list">
      <div className="tp-mini tp-mini-on"><span className="tp-dot tp-dot-on"/>Remote VoIP</div>
      <div className="tp-mini"><span className="tp-dot"/>Send SMS</div>
      <div className="tp-mini"><span className="tp-dot"/>Validate SMS</div>
    </div>,
    <div className="tp-list">
      <div className="tp-mini"><span className="tp-dot tp-dot-g"/>Galaxy S22 · ONLINE</div>
      <div className="tp-mini"><span className="tp-dot tp-dot-g"/>+1 214-257-0986</div>
    </div>,
    <div className="tp-tl">
      <div className="tp-row">
        <span className="tp-node tp-done"/><span className="tp-line tp-done"/>
        <span className="tp-node tp-done"/><span className="tp-line tp-done"/>
        <span className="tp-node tp-now"/><span className="tp-line"/>
        <span className="tp-node"/>
      </div>
      <div className="tp-labels mono"><span>DIAL</span><span>RING</span><span>TALK</span><span>END</span></div>
    </div>,
    <div className="tp-files">
      <span className="tp-tag">▶ video.mp4</span>
      <span className="tp-tag">📊 kpi.csv</span>
      <span className="tp-tag">📄 call.log</span>
      <span className="tp-tag">⬇ ZIP</span>
      <div className="tp-pass">✓ 9 of 10 iterations passed</div>
    </div>,
  ];


  return (
    <div className="page">
      {/* Hero / Welcome */}
      <section className="welcome-hero">
        <div className="hero-badge">
          <span className="hero-dot" /> Welcome to Qube
        </div>
        <h1 className="hero-title">
          Run real phone tests, <span className="hero-accent">remotely.</span>
        </h1>
        <p className="hero-lede">
          Qube is a remote mobile network testing platform that runs real voice, SMS, and VoIP tests on
          physical smartphones — and turns every test into a structured, evidence-backed result you can
          replay, share, and trust.
        </p>
        <div className="hero-cta">
          <Btn kind="primary" icon="play" onClick={() => onConfigure("VOIP_MO_MT")}>Start your first test</Btn>
          <Btn icon="arrow" onClick={() => onNav && onNav("catalog")}>Browse test catalog</Btn>
          {live.length > 0 &&
          <button className="hero-live" onClick={() => onOpenRun(live[0].id)}>
              <span className="live-dot" />
              {live.length} run{live.length > 1 ? "s" : ""} live now
              <Icon name="chevron" size={14} />
            </button>
          }
        </div>

        <div className="hero-illu" aria-hidden="true">
          <div className="illu-card illu-c1">
            <div className="illu-row"><Icon name="phone" size={14} /> Galaxy S22</div>
            <div className="illu-state"><span className="ld" /> DIALING</div>
          </div>
          <div className="illu-arrow">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M2 12 L92 12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" /><path d="M88 6 L96 12 L88 18" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            <span className="illu-tag">RabbitMQ · DIAL</span>
          </div>
          <div className="illu-card illu-c2">
            <div className="illu-row"><Icon name="voip" size={14} /> +1 214-257…</div>
            <div className="illu-state"><span className="ld ld-ok" /> RINGING</div>
          </div>
        </div>
      </section>

      {/* What is Qube */}
      <section className="explain-grid">
        <article className="explain-card">
          <div className="explain-icon"><Icon name="cpu" size={22} /></div>
          <h3>What is Qube?</h3>
          <p>A remote test platform for real smartphones. Control devices in your lab — or anywhere in the world — without ever touching them.</p>
        </article>
        <article className="explain-card">
          <div className="explain-icon"><Icon name="play" size={22} /></div>
          <h3>What does it do?</h3>
          <p>Runs voice, SMS, and VoIP test cases. Captures network KPIs, device logs, screen recordings, and call states. Organizes everything into reports.</p>
        </article>
        <article className="explain-card">
          <div className="explain-icon"><Icon name="bar" size={22} /></div>
          <h3>Why teams love it</h3>
          <p>Manual phone testing is slow and impossible to prove. Qube gives you fast, repeatable runs with the receipts: video, KPIs, logs, maps.</p>
        </article>
      </section>

      {/* How it works tour */}
      <section className="tour">
        <div className="tour-head">
          <div>
            <div className="page-eyebrow">How it works</div>
            <h2 className="tour-title">From "I need to test this" to "here's the proof" in four steps.</h2>
          </div>
        </div>
        <div className="tour-steps">
          {tourSteps.map((s, i) =>
          <button key={i} className={`tour-step ${step === i ? "tour-active" : ""}`} onClick={() => setStep(i)}>
              <div className="tour-num mono">{s.num} — {s.verb}</div>
              <div className="tour-s-title">{s.title}</div>
              <div className="tour-s-text">{s.text}</div>
              <div className="tour-preview">{tourPreviews[i]}</div>
            </button>
          )}
        </div>
      </section>

      {/* Use cases */}
      <section className="usecases">
        <div className="page-eyebrow">Use cases</div>
        <h2 className="uc-title">Five things our customers run every day.</h2>
        <div className="uc-grid">
          {[
          { type: "VOIP_MO_MT", uc: "Measure VoIP quality on live cellular", who: "VoIP / IMS engineers" },
          { type: "MO_MT_SMS", uc: "Verify SMS delivery and message accuracy", who: "Messaging QA" },
          { type: "EXT_MO_MT", uc: "Validate remote-to-remote voice calls", who: "Carrier interop teams" },
          { type: "MO_SMS", uc: "Send SMS when only the sender is in lab", who: "Field operators" },
          { type: "VIDEO", uc: "Capture video, logs, KPIs as evidence", who: "Test managers" }].
          map(({ type, uc, who }) => {
            const t = TEST_TYPES[type];
            return (
              <button key={type} className="uc-card" onClick={() => onConfigure(type)}>
                <div className="uc-icon"><Icon name={t.icon} size={20} /></div>
                <div className="uc-body">
                  <div className="uc-name">{t.label}</div>
                  <div className="uc-uc">{uc}</div>
                  <div className="uc-who">For {who}</div>
                </div>
                <div className="uc-cta">Try it <Icon name="arrow" size={14} /></div>
              </button>);

          })}
        </div>
      </section>

      {/* Live snapshot — only when something is running */}
      {live.length > 0 &&
      <section className="live-snap">
          <div className="page-eyebrow">Right now in your labs</div>
          <h2 className="ls-title">{live.length} test{live.length > 1 ? "s" : ""} running.</h2>
          <div className="active-list">
            {live.map((r) =>
          <button key={r.id} className="active-row" onClick={() => onOpenRun(r.id)}>
                <StatusChip status={r.status} size="sm" />
                <div className="ar-main">
                  <div className="ar-title">{r.name} <Tag mono>{r.type}</Tag></div>
                  <div className="ar-sub">iter {r.iter}/{r.total} · {r.action} · started {r.started}</div>
                </div>
                <div className="ar-progress">
                  <IterDots done={r.iter - 1} total={r.total} />
                </div>
                <Icon name="chevron" size={14} className="ar-chev" />
              </button>
          )}
          </div>
        </section>
      }

      {/* Final CTA strip */}
      <section className="cta-strip">
        <div className="cta-text">
          <h3>Ready when you are.</h3>
          <p>Pick a test type, drop in a device, and run your first remote test in under a minute.</p>
        </div>
        <div className="cta-actions">
          <Btn kind="primary" icon="play" onClick={() => onConfigure("VOIP_MO_MT")}>Start a VoIP test</Btn>
          <Btn icon="sms" onClick={() => onConfigure("MO_MT_SMS")}>Start an SMS test</Btn>
        </div>
      </section>
    </div>);

};

/* ============================================================
   CATALOG
   ============================================================ */
const Catalog = ({ onConfigure }) =>
<div className="page">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">Test Cases</div>
        <h1>Launchpad</h1>
        <div className="page-sub">Five focused remote test types. Pick one to begin configuration.</div>
      </div>
    </div>

    <div className="catalog-grid">
      {Object.entries(TEST_TYPES).map(([k, t]) =>
    <article key={k} className="catalog-card">
          <div className="cat-head">
            <div className="cat-icon"><Icon name={t.icon} size={22} /></div>
            <div>
              <h2>{t.label}</h2>
              <div className="cat-type mono">{k}</div>
            </div>
            <Btn kind="primary" icon="arrow" onClick={() => onConfigure(k)}>Configure</Btn>
          </div>
          <p className="cat-desc">{t.desc}</p>
          <dl className="cat-meta">
            <div><dt>Devices</dt><dd>{t.devices.map((d, i) => <Tag key={i} mono>{d}</Tag>)}</dd></div>
            <div><dt>Duration</dt><dd className="mono">{t.dur}</dd></div>
            <div><dt>Artifacts</dt><dd>
              {k === "MO_SMS" && <><Tag mono>CALL_LOG</Tag></>}
              {k === "MO_MT_SMS" && <><Tag mono>CALL_LOG</Tag><Tag mono>VIDEO</Tag></>}
              {k === "VOIP_MO_MT" && <><Tag mono>VIDEO</Tag><Tag mono>NETWORK_KPI</Tag><Tag mono>CALL_LOG</Tag></>}
              {k === "EXT_MO_MT" && <><Tag mono>VIDEO</Tag><Tag mono>NETWORK_KPI</Tag><Tag mono>CALL_LOG</Tag></>}
              {k === "VIDEO" && <><Tag mono>VIDEO</Tag><Tag mono>USER_ACTION</Tag><Tag mono>KPIS</Tag></>}
            </dd></div>
          </dl>
        </article>
    )}
    </div>
  </div>;


window.Dashboard = Dashboard;
window.Catalog = Catalog;