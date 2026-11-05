import type { DigitSegments } from "@/lib/ui";
import styles from "./SevenSegment.module.css";

type Props = {
  segments: DigitSegments;
  lit?: boolean;
  scale?: number;
};

export default function SevenSegment({ segments, lit = true, scale = 1 }: Props) {
  const w = 20;
  const h = 36;
  const sw = 3;
  const gap = 1.5;

  const seg = (id: keyof DigitSegments) => {
    const on = segments[id] && lit;
    return on ? styles.segOn : styles.segOff;
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      aria-hidden="true"
      className={styles.digit}
    >
      <polygon
        className={seg("top")}
        points={`${gap + sw},0 ${w - gap - sw},0 ${w - gap - sw + sw * 0.5},${sw} ${gap + sw - sw * 0.5},${sw}`}
      />
      <polygon
        className={seg("topLeft")}
        points={`0,${gap + sw} ${sw},${gap + sw + sw * 0.5} ${sw},${h / 2 - gap - sw * 0.5} 0,${h / 2 - gap}`}
      />
      <polygon
        className={seg("topRight")}
        points={`${w},${gap + sw} ${w - sw},${gap + sw + sw * 0.5} ${w - sw},${h / 2 - gap - sw * 0.5} ${w},${h / 2 - gap}`}
      />
      <polygon
        className={seg("middle")}
        points={`${gap + sw},${h / 2} ${w - gap - sw},${h / 2} ${w - gap - sw + sw * 0.5},${h / 2 + sw * 0.5} ${w - gap - sw},${h / 2 + sw} ${gap + sw},${h / 2 + sw} ${gap + sw - sw * 0.5},${h / 2 + sw * 0.5}`}
      />
      <polygon
        className={seg("bottomLeft")}
        points={`0,${h / 2 + gap + sw} ${sw},${h / 2 + gap + sw * 1.5} ${sw},${h - gap - sw - sw * 0.5} 0,${h - gap - sw}`}
      />
      <polygon
        className={seg("bottomRight")}
        points={`${w},${h / 2 + gap + sw} ${w - sw},${h / 2 + gap + sw * 1.5} ${w - sw},${h - gap - sw - sw * 0.5} ${w},${h - gap - sw}`}
      />
      <polygon
        className={seg("bottom")}
        points={`${gap + sw},${h - sw} ${w - gap - sw},${h - sw} ${w - gap - sw + sw * 0.5},${h} ${gap + sw - sw * 0.5},${h}`}
      />
    </svg>
  );
}
