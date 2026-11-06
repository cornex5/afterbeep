import Link from "next/link";
import MachineIllustration from "@/components/MachineIllustration";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <h1>Never lose a caller.</h1>
          <p className={styles.heroSubtitle}>
            Afterbeep answers when you can't, writes down who called and why,
            and emails you the card in seconds.
          </p>
          <div className={styles.heroCta}>
            <Link href="/demo/start" className={styles.primaryButton}>
              Try the demo
            </Link>
            <a href="#how-it-works" className={styles.quietLink}>
              How it works
            </a>
          </div>
          <p className={styles.pricingLine}>
            From 9 EUR per number per month.
          </p>
        </div>
        <div className={styles.heroIllustration}>
          <MachineIllustration unhandledCount={3} />
        </div>
      </header>

      <section id="how-it-works" className={styles.howSection}>
        <h2>How it works</h2>
        <div className={styles.howSteps}>
          <p>
            When a call comes in, Afterbeep picks up and plays a short
            disclosure, then records the caller clearly while they leave their
            message.
          </p>
          <p>
            The recording is transcribed and sent to an AI that reads the words
            and pulls out the caller's name, callback number, reason for
            calling, and urgency level.
          </p>
          <p>
            The completed card lands in your inbox within seconds, ready to
            read. You can also review every card and its transcript on the
            dashboard. The audio itself is deleted once the card exists.
          </p>
        </div>
      </section>

      <section className={styles.sampleSection}>
        <h2>What a card looks like</h2>
        <div className={styles.sampleCard}>
          <div className={styles.sampleEdge} aria-hidden="true" />
          <div className={styles.sampleWindow} aria-hidden="true">
            <div className={styles.sampleReel} />
            <div className={styles.sampleReel} />
          </div>
          <div className={styles.sampleLabel}>
            <p className={styles.sampleCaller}>Thomas Berger</p>
            <p className={styles.sampleReason}>
              Burst pipe in the basement, water coming in fast
            </p>
            <p className={`${styles.sampleNumber} mono`}>+49 30 5550 0112</p>
            <div className={styles.sampleMeta}>
              <span className={`${styles.sampleTime} mono`}>12m ago</span>
              <span className={styles.sampleUrgent}>urgent</span>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          MIT license. Afterbeep is a Kiroween 2026 hackathon entry,
          Resurrection category.
        </p>
        <p>
          Built by Jonas Klein, founder. Code on{" "}
          <a href="https://github.com/cornex5/afterbeep">GitHub</a>.
        </p>
      </footer>
    </div>
  );
}
