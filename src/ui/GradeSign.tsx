// Live Austrian steep-grade warning sign: red-bordered triangle, black slope wedge, percentage.

export function GradeSign({ grade, size = 132 }: { grade: number; size?: number }) {
  const g = Math.max(-20, Math.min(20, grade));
  const shown = Math.abs(g) < 0.5 ? 0 : Math.round(g);
  const steep = Math.min(Math.abs(g), 20) / 20;
  // wedge sits on the base of the inner triangle, rising towards the travel direction
  const baseY = 86;
  const x0 = 30;
  const x1 = 90;
  const rise = 5 + steep * 19;
  const wedge = g >= 0 ? `M${x0},${baseY} L${x1},${baseY} L${x1},${baseY - rise} Z` : `M${x0},${baseY} L${x1},${baseY} L${x0},${baseY - rise} Z`;
  return (
    <svg className="grade-sign" width={size} height={size * 0.9} viewBox="0 0 120 108" role="img" aria-label={`Gradient ${shown} percent`}>
      <path d="M60 6 L114 100 Q116 104 111 104 L9 104 Q4 104 6 100 Z" fill="#f7f7f2" stroke="#d7322b" strokeWidth="9" strokeLinejoin="round" />
      <path d={wedge} fill="#121416" />
      <text x="60" y="60" textAnchor="middle" className="grade-sign-num" fill="#121416">
        {shown}%
      </text>
    </svg>
  );
}
