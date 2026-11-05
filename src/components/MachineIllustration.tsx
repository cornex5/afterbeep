import CassetteReels from "./CassetteReels";
import LedCounter from "./LedCounter";
import styles from "./MachineIllustration.module.css";

type Props = {
  unhandledCount?: number;
};

export default function MachineIllustration({ unhandledCount = 3 }: Props) {
  return (
    <div className={styles.machine} aria-hidden="true">
      <div className={styles.body}>
        <div className={styles.topBar}>
          <span className={styles.brand}>afterbeep</span>
          <div className={styles.ledArea}>
            <LedCounter count={unhandledCount} scale={1} />
          </div>
        </div>

        <div className={styles.deckWindow}>
          <CassetteReels size={64} />
          <div className={styles.tapeBar} />
        </div>

        <div className={styles.transportRow}>
          {["rew", "play", "fwd", "stop", "rec"].map((label) => (
            <div key={label} className={styles.transportButton}>
              <span className={styles.transportLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.bottomPanel}>
          <div className={styles.grille}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.grilleSlot} />
            ))}
          </div>
          <div className={styles.cassetteDoor}>
            <div className={styles.doorSlot} />
          </div>
        </div>
      </div>
    </div>
  );
}
