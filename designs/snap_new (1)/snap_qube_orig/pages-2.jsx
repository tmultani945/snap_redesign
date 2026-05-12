/* SNAP Remote Portal — History, Devices, Tweaks */

const History = ({ runs, onOpenRun, onConfigure }) => {
  const [type, setType] = pS("");
  const [status, setStatus] = pS("");
  const [q, setQ] = pS("");
  const filtered = runs.filter(r =>
    (!type || r.type === type) &&
    (!status || r.status === status) &&
    (!q || r.name.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Test Runs</div>
          <h1>History</h1>
          <div className="page-sub">Every run from the last 365 days · TTL governed</div>
        </div>
        <div className="page-actions">
          <Btn icon="download">Export CSV</Btn>
          <Btn kind="primary" icon="plus" onClick={()=>onConfigure("VOIP_MO_MT")}>New run</Btn>
        </div>
      </div>

      <div className="filter-bar">
        <select className="input" value={type} onChange={e=>setType(e.target.value)}>
          <option value="">All types</option>
          {Object.keys(TEST_TYPES).map(k=> <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["PROGRESS","FINALIZING","COMPLETED","FAILED","CANCELED","SCHEDULED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input"><option>Last 14 days</option></select>
        <select className="input"><option>All devices</option></select>
        <div className="filter-spacer" />
        <div className="search-input">
          <Icon name="search" size={14}/>
          <input className="input" placeholder="Search by name…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <select className="input"><option>Saved views</option></select>
      </div>

      <Card pad={false}>
        <table className="data-table dense">
          <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Destination</th><th>Status</th><th>Pass</th><th>Iter</th><th>Duration</th><th>Started</th><th></th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} onClick={()=>onOpenRun(r.id)}>
                <td className="mono">#{r.id.replace("r","")}</td>
                <td><b>{r.name}</b></td>
                <td><Tag mono>{r.type}</Tag></td>
                <td><Tag>{r.dest}</Tag></td>
                <td><StatusChip status={r.status} size="sm"/></td>
                <td className="mono">{r.pass || "—"}</td>
                <td className="mono">{r.iter}/{r.total}</td>
                <td className="mono">{fmtDur(r.durSec)}</td>
                <td className="mono">today {r.started}</td>
                <td><Icon name="chevron" size={12}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const DevicesPage = () => {
  const [tab, setTab] = pS("lab");
  const labDevs = [DEVICES.mo1, DEVICES.mt1, DEVICES.mt2];
  const extDevs = [DEVICES.ext1, DEVICES.ext2];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Devices</div>
          <h1>Lab and external device pool</h1>
          <div className="page-sub">Sources: <span className="mono">devices</span> collection, <span className="mono">xperf-device-registry</span>, AWS Connect</div>
        </div>
      </div>

      <div className="seg-tabs">
        <button className={tab==="lab"?"active":""} onClick={()=>setTab("lab")}>Lab Devices ({labDevs.length})</button>
        <button className={tab==="ext"?"active":""} onClick={()=>setTab("ext")}>External ({extDevs.length})</button>
        <button className={tab==="voip"?"active":""} onClick={()=>setTab("voip")}>VoIP Numbers ({VOIP_NUMBERS.length})</button>
      </div>

      <Card pad={false}>
        {(tab==="lab" || tab==="ext") && (
          <table className="data-table">
            <thead><tr><th>State</th><th>Device</th><th>OEM / OS</th><th>Phone</th><th>Serial</th><th>UDID</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {(tab==="lab" ? labDevs : extDevs).map(d => (
                <tr key={d.id}>
                  <td><span className={`dev-state dev-${d.state.toLowerCase()}`}/> {d.state}</td>
                  <td><b>{d.name}</b></td>
                  <td>{d.oem} · {d.os}</td>
                  <td className="mono">{d.phone}</td>
                  <td className="mono">{d.sn}</td>
                  <td className="mono dim">{d.udid}</td>
                  <td><Tag mono>{d.role}</Tag></td>
                  <td><button className="ic-btn"><Icon name="more" size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab==="voip" && (
          <table className="data-table">
            <thead><tr><th>State</th><th>Phone</th><th>Country</th><th>Type</th><th>Source</th></tr></thead>
            <tbody>
              {VOIP_NUMBERS.map(p => (
                <tr key={p.PhoneNumber}>
                  <td><span className="dev-state dev-online"/> AVAILABLE</td>
                  <td className="mono"><b>{p.PhoneNumber}</b></td>
                  <td>{p.PhoneNumberCountryCode}</td>
                  <td>{p.PhoneNumberType}</td>
                  <td className="mono dim">/api/voip/available</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

const Settings = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">Settings</div>
        <h1>Workspace settings</h1>
      </div>
    </div>
    <div className="grid-2">
      <Card title="DFIT thresholds">
        <table className="data-table compact">
          <thead><tr><th>Metric</th><th>Good → Moderate</th><th>Moderate → Bad</th></tr></thead>
          <tbody>
            <tr><td>RSRP (dBm)</td><td className="mono">-80</td><td className="mono">-90</td></tr>
            <tr><td>RSRQ (dB)</td><td className="mono">-10</td><td className="mono">-15</td></tr>
            <tr><td>SINR (dB)</td><td className="mono">10</td><td className="mono">0</td></tr>
            <tr><td>RSSI (dBm)</td><td className="mono">-70</td><td className="mono">-85</td></tr>
          </tbody>
        </table>
      </Card>
      <Card title="Advanced mode">
        <p className="hint">Toggle to reveal raw RabbitMQ events on the Live tab, action enum codes everywhere, and internal IDs (udid, imei, bulkId).</p>
        <label className="switch"><input type="checkbox"/><span>Enable advanced mode</span></label>
      </Card>
    </div>
  </div>
);

window.History = History;
window.DevicesPage = DevicesPage;
window.Settings = Settings;
