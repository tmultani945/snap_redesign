/* Leaflet map with route, KPI samples, filter chips */

const ReportMap = ({ run, filters }) => {
  const mapRef = uR(null);
  const mapInst = uR(null);
  const layersRef = uR({});

  // Synthesise route polyline + KPI samples deterministically from start/end
  const samples = uM(() => {
    const N = 60;
    const [sLat, sLng] = run.route.start;
    const [eLat, eLng] = run.route.end;
    const pts = [];
    for (let i=0; i<N; i++) {
      const t = i/(N-1);
      // bezier-ish wiggle
      const wob = Math.sin(t*Math.PI*3)*0.0035 + Math.cos(t*Math.PI*1.6)*0.0022;
      const lat = sLat + (eLat-sLat)*t + wob;
      const lng = sLng + (eLng-sLng)*t + Math.sin(t*Math.PI*2)*0.005;
      // simulated KPIs along route
      const rsrp = -80 + Math.sin(t*Math.PI*4)*8 + (Math.random()-0.5)*3;
      const rsrq = -10 + Math.sin(t*Math.PI*2)*1.5;
      const sinr = 12 + Math.cos(t*Math.PI*3)*4;
      const rat  = t < 0.18 || (t > 0.52 && t < 0.65) ? "5G NR NSA" : "LTE";
      const err  = (i === 32 || i === 33) ? "Setup timeout" : null;
      pts.push({ i, lat, lng, rsrp, rsrq, sinr, rat, err });
    }
    return pts;
  }, [run]);

  const filtered = uM(() => samples.filter(s => {
    if (filters.rat.length && !filters.rat.includes(s.rat)) return false;
    if (filters.errOnly && !s.err) return false;
    return true;
  }), [samples, filters]);

  pE(() => {
    if (!window.L || !mapRef.current) return;
    if (mapInst.current) return;
    const m = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
      .setView(run.route.start, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap contributors"
    }).addTo(m);
    mapInst.current = m;
    // fit bounds
    const bounds = L.latLngBounds([run.route.start, run.route.end]);
    samples.forEach(s => bounds.extend([s.lat, s.lng]));
    setTimeout(() => m.fitBounds(bounds, { padding: [30, 30] }), 50);
  }, []);

  // re-render points
  pE(() => {
    if (!mapInst.current) return;
    const m = mapInst.current;
    // clear previous
    Object.values(layersRef.current).forEach(l => m.removeLayer(l));
    layersRef.current = {};

    // route polyline (continuous, dimmer)
    const pl = L.polyline(samples.map(s => [s.lat, s.lng]), {
      color: "#94A3B8", weight: 3, opacity: 0.45
    }).addTo(m);
    layersRef.current.pl = pl;

    // colored highlight by KPI
    const colorBy = filters.color; // "rsrp" | "rat" | "errors"
    filtered.forEach((s, idx) => {
      let color = "#94A3B8";
      if (colorBy === "rsrp") {
        if (s.rsrp >= -80) color = "#22C55E";
        else if (s.rsrp >= -90) color = "#F59E0B";
        else color = "#EF4444";
      } else if (colorBy === "rat") {
        color = s.rat === "5G NR NSA" ? "#A78BFA" : "#ea4c89";
      } else if (colorBy === "errors") {
        color = s.err ? "#EF4444" : "#22C55E";
      }
      const dot = L.circleMarker([s.lat, s.lng], {
        radius: s.err ? 6 : 4,
        color: "#fff",
        weight: 1.5,
        fillColor: color,
        fillOpacity: s.err ? 1 : 0.85,
      }).addTo(m);
      dot.bindTooltip(
        `<b>iter sample ${s.i+1}</b><br>RSRP ${s.rsrp.toFixed(0)} dBm<br>` +
        `RSRQ ${s.rsrq.toFixed(1)}<br>SINR ${s.sinr.toFixed(0)} dB<br>` +
        `RAT ${s.rat}` + (s.err ? `<br><span style="color:#EF4444">${s.err}</span>`:""),
        { className: "rep-tt" }
      );
      layersRef.current["d"+idx] = dot;
    });

    // start / end pins
    const startIcon = L.divIcon({
      html: '<div class="map-pin"><span>S</span></div>',
      className: "", iconSize: [28, 28], iconAnchor: [14, 28],
    });
    const endIcon = L.divIcon({
      html: '<div class="map-pin end"><span>E</span></div>',
      className: "", iconSize: [28, 28], iconAnchor: [14, 28],
    });
    layersRef.current.s = L.marker(run.route.start, { icon: startIcon }).addTo(m);
    layersRef.current.e = L.marker(run.route.end, { icon: endIcon }).addTo(m);
  }, [samples, filtered, filters.color]);

  return <div ref={mapRef} className="rep-map" />;
};

/* Filter pill with popover */
const FilterPill = ({ label, value, options, multi=false, onChange, allowClear=true }) => {
  const [open, setOpen] = pS(false);
  const ref = uR(null);
  pE(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const isSel = v => multi ? value.includes(v) : value === v;
  const toggle = v => {
    if (!multi) { onChange(v); setOpen(false); return; }
    onChange(isSel(v) ? value.filter(x => x!==v) : [...value, v]);
  };
  return (
    <div className="rep-map-filter" ref={ref} onClick={() => setOpen(o=>!o)}>
      <span className="mf-chips">
        {multi ? (
          value.length === 0
            ? <span className="mf-empty">{label} · All</span>
            : value.map(v => (
                <span key={v} className="mf-pill">
                  {v}
                  {allowClear && <span className="x" onClick={(e)=>{e.stopPropagation(); onChange(value.filter(x=>x!==v));}}>×</span>}
                </span>
              ))
        ) : (
          <span className="mf-empty">{label} · <b style={{color:"var(--fg-primary)"}}>{options.find(o=>o.v===value)?.l || value}</b></span>
        )}
      </span>
      <Icon name="chevronDown" size={12} className="mf-caret"/>
      {open && (
        <div className="mf-pop" onClick={e=>e.stopPropagation()}>
          {options.map(o => (
            <div key={o.v} className="mf-pop-row" onClick={()=>toggle(o.v)}>
              {multi && <input type="checkbox" checked={isSel(o.v)} readOnly/>}
              {o.color && <span className="sw" style={{background:o.color}}/>}
              <span>{o.l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

window.ReportMap = ReportMap;
window.FilterPill = FilterPill;
