/* SNAP / Qube — Suggested Routes landing wired into the app shell */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#3F8CFF",
  "apiState": "ready"
}/*EDITMODE-END*/;

const ACCENTS_R = {
  "#3F8CFF": "Signal Blue",
  "#7C5CFF": "Telemetry Violet",
  "#10B981": "Operator Green",
  "#F59E0B": "Amber Alert"
};

const RoutesApp = () => {
  const [tw, setTw] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("routes");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = tw.theme;
    document.documentElement.dataset.density = "comfy";
    document.documentElement.style.setProperty("--accent", tw.accent);
    document.documentElement.style.setProperty(
      "--font-mono",
      `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
    );
    document.documentElement.dataset.advanced = "0";
  }, [tw]);

  const handleUseRoute = (routeId) => {
    setToast({ id: routeId });
    // In production: parent routes the user to /plan?route=<id>
    if (typeof window !== "undefined") console.log("onUseRoute(", routeId, ")");
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Dummy runs for the active-strip (matches sidebar shell expectations)
  const runs = [];

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} runCount={0} />
      <main className="main">
        <TopBar
          crumbs={["Drive Testing", "Suggested Routes"]}
          theme={tw.theme}
          setTheme={(v) => setTw("theme", v)}
        />
        <div className="main-scroll">
          <SuggestedRoutesLanding
            onUseRoute={handleUseRoute}
            theme={tw.theme}
            forceState={tw.apiState}
          />
        </div>
      </main>

      {toast && (
        <div className="rt-toast" role="status">
          <Icon name="check" size={16} style={{ color: "var(--accent)" }} />
          <div>
            <b>Route selected.</b>{" "}
            <span className="mono">onUseRoute("{toast.id}")</span>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            value={tw.theme}
            onChange={(v) => setTw("theme", v)}
            options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
          />
        </TweakSection>
        <TweakSection title="Accent">
          <TweakColor
            value={tw.accent}
            onChange={(v) => setTw("accent", v)}
            options={Object.keys(ACCENTS_R)}
          />
          <div className="tweak-hint">{ACCENTS_R[tw.accent]}</div>
        </TweakSection>
        <TweakSection title="API state">
          <TweakRadio
            value={tw.apiState}
            onChange={(v) => setTw("apiState", v)}
            options={[
              { value: "ready",   label: "Ready" },
              { value: "loading", label: "Loading" },
              { value: "error",   label: "Error" }
            ]}
          />
          <div className="tweak-hint">Simulates GET /api/routes states</div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<RoutesApp />);
