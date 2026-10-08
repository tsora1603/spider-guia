export function ProgressBarVisual({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return <progress class={`progress-bar ${className}`.trim()} max={100} value={value} aria-label={label}>{value}%</progress>;
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 38;
  return (
    <div class="progress-ring" role="img" aria-label={`${label}: ${clamped}%`}>
      <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
        <circle class="progress-ring-track" cx="48" cy="48" r={radius} />
        <circle class="progress-ring-value" cx="48" cy="48" r={radius} pathLength="100" strokeDasharray={`${clamped} ${100 - clamped}`} />
      </svg>
      <b>{clamped}%</b>
    </div>
  );
}
