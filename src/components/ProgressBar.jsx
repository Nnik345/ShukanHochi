export default function ProgressBar({ value, max, color = '#6366f1', label, height = 12 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar-wrapper">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-track" style={{ height }}>
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
