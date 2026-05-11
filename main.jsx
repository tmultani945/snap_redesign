/* SNAP Remote Portal — Main App + Tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3F8CFF",
  "density": "comfy",
  "monoFont": "JetBrains Mono",
  "advanced": false,
  "theme": "light"
}/*EDITMODE-END*/;

const ACCENTS = {
  "#3F8CFF": "Signal Blue",
  "#7C5CFF": "Telemetry Violet",
  "#10B981": "Operator Green",
  "#F59E0B": "Amber Alert",
};

const App = () => {
  const [tw, setTw] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("dashboard");
  const [runId, setRunId] = useState(null);
  const [cfgType, setCfgType] = useState(null);
  const [runs, setRuns] = useState(window.RUNS);
  const [driveToast, setDriveToast] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = tw.theme;
    document.documentElement.dataset.density = tw.density;
    document.documentElement.style.setProperty("--accent", tw.accent);
    document.documentElement.style.setProperty("--font-mono", `"${tw.monoFont}", ui-monospace, SFMono-Regular, Menlo, monospace`);
    document.documentElement.dataset.advanced = tw.advanced ? "1" : "0";
  }, [tw]);

  // Tick the active runs forward to feel alive
  useEffect(() => {
    const id = setInterval(() => {
      setRuns(rs => rs.map(r => {
        if (r.status !== "PROGRESS") return r;
        if (r.iter < r.total) return { ...r, iter: r.iter + 1, durSec: r.durSec + 4 };
        return { ...r, status: "FINALIZING", durSec: r.durSec + 4 };
      }));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!driveToast) return;
    const t = setTimeout(() => setDriveToast(null), 3200);
    return () => clearTimeout(t);
  }, [driveToast]);

  const goToRun = (id) => { setRunId(id); setRoute("runs/detail"); };
  const goToConfigure = (type) => { setCfgType(type); setRoute("catalog/configure"); };

  // Crumbs
  let crumbs = ["Dashboard"];
  if (route === "catalog") crumbs = ["Test Cases"];
  else if (route === "catalog/configure") crumbs = ["Test Cases", TEST_TYPES[cfgType]?.label || "Configure"];
  else if (route === "runs") crumbs = ["Test Runs", "History"];
  else if (route === "runs/detail") {
    const r = runs.find(x => x.id === runId);
    crumbs = ["Test Runs", r ? r.name : "Run"];
  }
  else if (route === "reports") crumbs = ["Reports"];
  else if (route === "devices") crumbs = ["Devices"];
  else if (route === "settings") crumbs = ["Settings"];

  const liveCount = runs.filter(r => r.status === "PROGRESS" || r.status === "FINALIZING").length;
  const baseRoute = route.split("/")[0];

  return (
    <div className="app">
      <Sidebar route={baseRoute} setRoute={setRoute} runCount={liveCount} />
      <main className="main">
        <TopBar crumbs={crumbs} theme={tw.theme} setTheme={(v)=>setTw("theme", v)} />
        {baseRoute !== "runs" && baseRoute !== "catalog" && baseRoute !== "dashboard" && (
          <ActiveRunsStrip runs={runs} onView={goToRun} />
        )}
        <div className="main-scroll">
          {route === "dashboard" && <Dashboard runs={runs} onOpenRun={goToRun} onConfigure={goToConfigure} onNav={setRoute} onUseRoute={(id) => setDriveToast(id)} theme={tw.theme} />}
          {route === "catalog" && <Catalog onConfigure={goToConfigure} />}
          {route === "catalog/configure" && (
            <Configure testType={cfgType}
              onCancel={() => setRoute("catalog")}
              onStart={() => { setRoute("runs/detail"); setRunId("r42"); }} />
          )}
          {route === "runs" && <History runs={runs} onOpenRun={goToRun} onConfigure={goToConfigure} />}
          {route === "runs/detail" && <RunReport onBack={() => setRoute("runs")} />}
          {route === "reports" && <History runs={runs.filter(r=>r.status==="COMPLETED"||r.status==="FAILED")} onOpenRun={goToRun} onConfigure={goToConfigure} />}
          {route === "devices" && <DevicesPage />}
          {route === "settings" && <Settings />}
        </div>
      </main>

      {driveToast && (
        <div className="rt-toast" role="status">
          <Icon name="check" size={16} style={{ color: "var(--accent)" }} />
          <div>
            <b>Route selected.</b>{" "}
            <span className="mono">{driveToast}</span>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio value={tw.theme} onChange={(v)=>setTw("theme", v)}
            options={[{value:"dark", label:"Dark"}, {value:"light", label:"Light"}]} />
        </TweakSection>
        <TweakSection title="Accent">
          <TweakColor value={tw.accent} onChange={(v)=>setTw("accent", v)} options={Object.keys(ACCENTS)} />
          <div className="tweak-hint">{ACCENTS[tw.accent]}</div>
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio value={tw.density} onChange={(v)=>setTw("density", v)}
            options={[{value:"comfy", label:"Comfy"}, {value:"compact", label:"Compact"}]} />
        </TweakSection>
        <TweakSection title="Mono font">
          <TweakSelect value={tw.monoFont} onChange={(v)=>setTw("monoFont", v)}
            options={["JetBrains Mono","IBM Plex Mono","SFMono-Regular"]} />
        </TweakSection>
        <TweakSection title="Advanced mode">
          <TweakToggle value={tw.advanced} onChange={(v)=>setTw("advanced", v)}
            label="Reveal raw enums, RMQ events, IDs" />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};



ReactDOM.createRoot(document.getElementById("root")).render(<App />);
