import styles from "./CassetteReels.module.css";

type Props = {
  spinning?: boolean;
  size?: number;
};

export default function CassetteReels({ spinning = false, size = 40 }: Props) {
  return (
    <div
      className={styles.reels}
      aria-hidden="true"
      style={{ gap: Math.round(size * 0.6) + "px" }}
    >
      <Reel size={size} spinning={spinning} />
      <Reel size={size} spinning={spinning} />
    </div>
  );
}

function Reel({ size, spinning }: { size: number; spinning: boolean }) {
  const r = size / 2;
  const hub = r * 0.3;
  const spoke = r * 0.62;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={spinning ? styles.reel + " " + styles.spinning : styles.reel}
    >
      <circle cx={r} cy={r} r={r - 1} fill="var(--smoke)" stroke="var(--tape)" strokeWidth="1.5" />
      <circle cx={r} cy={r} r={hub} fill="var(--tape)" />
      {[0, 120, 240].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = r + hub * Math.cos(rad);
        const y1 = r + hub * Math.sin(rad);
        const x2 = r + spoke * Math.cos(rad);
        const y2 = r + spoke * Math.sin(rad);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--tape)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={r} cy={r} r={hub * 0.45} fill="var(--putty)" />
    </svg>
  );
}
