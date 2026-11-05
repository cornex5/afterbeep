import Link from "next/link";
import { getRepository } from "@/lib/repositoryFactory";
import { getOwnerId } from "@/lib/session";
import { sortCalls, countUnhandled, countUrgent } from "@/lib/ui";
import LedCounter from "@/components/LedCounter";
import CassetteCard from "@/components/CassetteCard";
import DemoCallRecorder from "@/components/DemoCallRecorder";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const ownerId = await getOwnerId();
  const repo = getRepository();
  const calls = await repo.listCalls(ownerId);
  const sorted = sortCalls(calls);
  const unhandled = countUnhandled(calls);
  const urgent = countUrgent(calls);
  const now = new Date();

  const active = sorted.filter((c) => c.handledAt === null);
  const handled = sorted.filter((c) => c.handledAt !== null);

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/" className={styles.brand}>
            afterbeep
          </Link>
        </div>
        <div className={styles.topBarCenter}>
          <LedCounter count={unhandled} blink={unhandled > 0} />
          {urgent > 0 && (
            <span className={styles.urgentCount} aria-label={`${urgent} urgent`}>
              {urgent} urgent
            </span>
          )}
        </div>
        <div className={styles.topBarRight}>
          <Link href="/dashboard/settings" className={styles.settingsLink}>
            Notification settings
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        {active.length === 0 && handled.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No calls yet.</p>
            <p>
              Forward your business number to Afterbeep or record a demo call
              below.
            </p>
            <DemoCallRecorder />
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className={styles.callsSection}>
                <h2 className={styles.sectionHeading}>New calls</h2>
                <div role="list" className={styles.cassetteList}>
                  {active.map((call) => (
                    <CassetteCard key={call.id} call={call} now={now} />
                  ))}
                </div>
              </section>
            )}

            {handled.length > 0 && (
              <section className={styles.callsSection}>
                <h2 className={styles.sectionHeading}>Handled</h2>
                <div role="list" className={styles.cassetteList}>
                  {handled.map((call) => (
                    <CassetteCard key={call.id} call={call} now={now} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
