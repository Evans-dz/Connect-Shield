// Pure SVG SSVI gauge (0–16). The recurring signature element of the brand.
const TONE = { low: "#2E9E62", mid: "#C98A1F", high: "#D14343" };

export default function Gauge({ score = 9, tone = "high", size = 132, stroke = 10, label = "SSVI" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(16, score)) / 16;
  const color = TONE[tone] || TONE.mid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${score} out of 16`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - pct * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F3F5F8"
        style={{ font: `600 ${size * 0.3}px var(--font-mono), monospace` }}
      >
        {score}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#93A0B8"
        style={{ font: `500 ${size * 0.11}px var(--font-mono), monospace`, letterSpacing: "0.1em" }}
      >
        /16 {label}
      </text>
    </svg>
  );
}
