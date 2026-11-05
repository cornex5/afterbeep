import Link from "next/link";
import { getRepository } from "@/lib/repositoryFactory";
import SettingsForm from "./SettingsForm";
import styles from "./page.module.css";

const OWNER_ID = "demo";

export default async function SettingsPage() {
  const repo = getRepository();
  const settings = await repo.getSettings(OWNER_ID);

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          Back to dashboard
        </Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.heading}>Notification settings</h1>
        <p className={styles.description}>
          Afterbeep sends a message card to your email within seconds of every
          call ending. Update the address below to change where cards are
          delivered.
        </p>
        <SettingsForm settings={settings} />
      </main>
    </div>
  );
}
