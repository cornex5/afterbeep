import { numberToDigits, getDigitSegments } from "@/lib/ui";
import SevenSegment from "./SevenSegment";
import styles from "./LedCounter.module.css";

type Props = {
  count: number;
  blink?: boolean;
  label?: string;
  scale?: number;
};

export default function LedCounter({
  count,
  blink = false,
  label = "new messages",
  scale = 1.3,
}: Props) {
  const digits = numberToDigits(count);

  return (
    <div
      className={`${styles.counter} ${blink ? styles.blink : ""}`}
      role="status"
      aria-label={`${count} ${label}`}
    >
      <div className={styles.display} aria-hidden="true">
        {digits.map((digit, i) => (
          <SevenSegment key={i} segments={getDigitSegments(digit)} scale={scale} />
        ))}
      </div>
      <span className={styles.labelText}>{label}</span>
    </div>
  );
}
