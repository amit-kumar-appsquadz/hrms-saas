/**
 * Lightweight inline-SVG charts (DESIGN_SYSTEM §4): no 3D/decorative styling,
 * color-blind-safe palette. Each chart carries an accessible summary / fallback
 * for screen readers. Kept dependency-free to keep the bundle lean.
 */

const PALETTE = ["#1C4E80", "#1E7D44", "#B7791F", "#1C6E8C", "#7A3E9D", "#C0392B", "#5B636C"];

export function BarChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        {data.map((d, i) => (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-caption tabular text-text-muted">{d.value}</span>
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${(d.value / max) * (height - 40)}px`, backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="w-full truncate text-center text-caption text-text-muted" title={d.label}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} role="img" aria-label={`Donut chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {data.map((d) => {
            const frac = d.value / total;
            const dash = frac * circumference;
            const seg = (
              <circle
                key={d.label}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={18}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="tabular" fontSize="20" fontWeight="600" fill="var(--color-text)">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-body-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="text-text-muted">{d.label}</span>
            <span className="tabular text-text">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChart({
  data,
  height = 200,
}: {
  data: { month: string; value: number }[];
  height?: number;
}) {
  const width = 480;
  const pad = 28;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const span = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((d.value - min) / span) * (height - pad * 2);
    return { x, y, ...d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Line chart: ${data.map((d) => `${d.month} ${d.value}`).join(", ")}`}>
      <path d={path} fill="none" stroke="#1C4E80" strokeWidth={2} />
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={3} fill="#1C4E80" />
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
            {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function StackedTrend({
  data,
}: {
  data: { day: string; present: number; absent: number; leave: number }[];
}) {
  const max = Math.max(...data.map((d) => d.present + d.absent + d.leave), 1);
  const segs = [
    { key: "present" as const, color: "#1E7D44", label: "Present" },
    { key: "leave" as const, color: "#1C6E8C", label: "Leave" },
    { key: "absent" as const, color: "#C0392B", label: "Absent" },
  ];
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 flex-col-reverse justify-start">
              {segs.map((s) => (
                <div key={s.key} style={{ height: `${(d[s.key] / max) * 140}px`, backgroundColor: s.color }} />
              ))}
            </div>
            <span className="text-caption text-text-muted">{d.day}</span>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-3">
        {segs.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-caption text-text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
