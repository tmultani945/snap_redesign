/* Charts — small SVG chart components for the Report */

/* === SPARKLINE === */
const Spark = ({ data, color="#ea4c89", bad=null, height=28 }) => {
  const W = 120, H = height;
  const vmin = Math.min(...data), vmax = Math.max(...data);
  const x = i => (i/(data.length-1))*(W-2)+1;
  const y = v => H - 2 - ((v-vmin)/(Math.max(vmax-vmin,0.0001)))*(H-4);
  const path = data.map((v,i)=>`${i===0?"M":"L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path} stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {bad !== null && bad >= 0 && bad < data.length && (
        <circle cx={x(bad)} cy={y(data[bad])} r="2.5" fill="#EF4444" stroke="#fff" strokeWidth="1.2"/>
      )}
    </svg>
  );
};

/* === MULTI-LINE TIMESERIES === */
const MultiLine = ({ series, yLabel, bands=[], yMin, yMax, badIdx=null, height=240 }) => {
  const W = 760, H = height;
  const all = series.flatMap(s => s.data);
  const vmin = yMin ?? Math.min(...all);
  const vmax = yMax ?? Math.max(...all);
  const n = series[0].data.length;
  const x = i => 44 + (i/(n-1))*(W-64);
  const y = v => H - 28 - ((v-vmin)/(vmax-vmin))*(H-48);

  const ticks = 4;
  const yTicks = Array.from({length: ticks}, (_,k) => vmin + (k/(ticks-1))*(vmax-vmin));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* bands */}
      {bands.map((b,bi) => (
        <rect key={bi} x="44" y={y(b.max)} width={W-64} height={y(b.min)-y(b.max)}
              fill={b.color} opacity={b.opacity ?? 0.08}/>
      ))}
      {/* gridlines */}
      {yTicks.map((v,i) => (
        <g key={i}>
          <line x1="44" x2={W-20} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 4"/>
          <text x="38" y={y(v)+4} fontSize="10" fill="var(--fg-tertiary)" textAnchor="end"
                fontFamily="JetBrains Mono">{Math.round(v)}</text>
        </g>
      ))}
      {/* x axis labels — iteration numbers */}
      {Array.from({length: n}).map((_,i) => (
        <text key={i} x={x(i)} y={H-10} fontSize="10" fill="var(--fg-tertiary)" textAnchor="middle"
              fontFamily="JetBrains Mono">{i+1}</text>
      ))}
      {/* series lines */}
      {series.map((s, si) => {
        const path = s.data.map((v,i)=>`${i===0?"M":"L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
        return <path key={si} d={path} stroke={s.color} strokeWidth="1.8" fill="none" strokeLinejoin="round" />;
      })}
      {/* dots */}
      {series.map((s, si) =>
        s.data.map((v,i) => (
          <circle key={si+"-"+i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color}
                  stroke={badIdx===i ? "#EF4444" : "var(--bg-surface)"} strokeWidth={badIdx===i ? 2 : 1.2}/>
        ))
      )}
      <text x={W-20} y="14" fontSize="10" fill="var(--fg-secondary)" textAnchor="end"
            fontFamily="Plus Jakarta Sans" fontWeight="600">{yLabel}</text>
    </svg>
  );
};

/* === BAR CHART (for throughput) === */
const BarChart = ({ data, color="#ea4c89", yLabel, height=240, secondary=null }) => {
  const W = 760, H = height;
  const all = [...data, ...(secondary?.data || [])];
  const vmax = Math.max(...all)*1.1;
  const vmin = 0;
  const n = data.length;
  const bw = (W-64)/n - 6;
  const x = i => 44 + (i/n)*(W-64) + 3;
  const y = v => H - 28 - ((v-vmin)/(vmax-vmin))*(H-48);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => vmin + t*(vmax-vmin));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {yTicks.map((v,i) => (
        <g key={i}>
          <line x1="44" x2={W-20} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 4"/>
          <text x="38" y={y(v)+4} fontSize="10" fill="var(--fg-tertiary)" textAnchor="end"
                fontFamily="JetBrains Mono">{Math.round(v)}</text>
        </g>
      ))}
      {Array.from({length: n}).map((_,i) => (
        <text key={i} x={x(i)+bw/2} y={H-10} fontSize="10" fill="var(--fg-tertiary)" textAnchor="middle"
              fontFamily="JetBrains Mono">{i+1}</text>
      ))}
      {data.map((v,i) => (
        <rect key={i} x={x(i)} y={y(v)} width={bw} height={Math.max(H-28-y(v),0)} fill={color} rx="2"/>
      ))}
      {secondary && secondary.data.map((v,i) => (
        <rect key={"s"+i} x={x(i)+bw*0.55} y={y(v)} width={bw*0.45} height={Math.max(H-28-y(v),0)}
              fill={secondary.color || "#A78BFA"} rx="2" opacity="0.9"/>
      ))}
      <text x={W-20} y="14" fontSize="10" fill="var(--fg-secondary)" textAnchor="end"
            fontFamily="Plus Jakarta Sans" fontWeight="600">{yLabel}</text>
    </svg>
  );
};

/* === DONUT === */
const Donut = ({ data, size=110, thickness=22 }) => {
  const total = data.reduce((s,d)=>s+d.value,0);
  const r = size/2 - thickness/2;
  const cx = size/2, cy = size/2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-surface-2)" strokeWidth={thickness}/>
      {data.map((d,i) => {
        const frac = d.value/total;
        const len = 2*Math.PI*r;
        const off = -acc*len;
        acc += frac;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                  stroke={d.color} strokeWidth={thickness}
                  strokeDasharray={`${(frac*len).toFixed(2)} ${len.toFixed(2)}`}
                  strokeDashoffset={off}
                  transform={`rotate(-90 ${cx} ${cy})`}/>
        );
      })}
      <text x={cx} y={cy-2} fontSize="14" fontWeight="800" textAnchor="middle"
            fill="var(--fg-primary)" fontFamily="Plus Jakarta Sans">{total}</text>
      <text x={cx} y={cy+12} fontSize="9" fill="var(--fg-tertiary)" textAnchor="middle"
            fontFamily="JetBrains Mono" letterSpacing="0.06em">ITERS</text>
    </svg>
  );
};

window.Spark = Spark; window.MultiLine = MultiLine;
window.BarChart = BarChart; window.Donut = Donut;
