import Link from "next/link";
import type { CallSummary } from "@/lib/repository";
import { relativeTime, isExpiringSoon, daysUntilExpiry, languageLabel } from "@/lib/ui";
import type { Urgency } from "@/lib/schema";
import CassetteReels from "./CassetteReels";
import styles from "./CassetteCard.module.css";

type Props = {
  call: CallSummary;
  now: Date;
};

function urgencyClass(urgency: Urgency): string {
  if (urgency === "high") return styles.edgeHigh;
  if (urgency === "normal") return styles.edgeNormal;
  return styles.edgeLow;
}

export default function CassetteCard({ call, now }: Props) {
  const expiring = isExpiringSoon(call.expiresAt, now);
  const daysLeft = daysUntilExpiry(call.expiresAt, now);
  const handled = call.handledAt !== null;
  const time = relativeTime(call.receivedAt, now);
  const lang = languageLabel(call.transcriptLanguage);

  return (
    <article
      className={`${styles.card} ${urgencyClass(call.urgency)} ${handled ? styles.handled : ""}`}
      role="listitem"
    >
      <Link
        href={`/dashboard/calls/${call.id}`}
        className={styles.link}
        aria-label={`Call from ${call.callerName}, ${time}${call.urgency === "high" ? ", urgent" : ""}`}
      >
        <div className={styles.window}>
          <CassetteReels size={32} />
        </div>

        <div className={styles.label}>
          <p className={styles.callerName}>{call.callerName}</p>
          <p className={styles.reason}>{call.reason}</p>
          <p className={`${styles.callbackNumber} mono`}>
            {call.callbackNumber}
          </p>
        </div>

        <div className={styles.strip}>
          <span className={`${styles.time} mono`}>{time}</span>
          {lang !== "English" && (
            <span className={styles.langChip}>{lang}</span>
          )}
          {call.urgency === "high" && (
            <span className={styles.urgentBadge}>
              <span className="visually-hidden">Urgent</span>
              <span aria-hidden="true">urgent</span>
            </span>
          )}
          {expiring && (
            <span className={styles.expiryWarning}>
              {daysLeft <= 0 ? "expires today" : `expires in ${daysLeft}d`}
            </span>
          )}
          {handled && <span className={styles.handledBadge}>handled</span>}
        </div>
      </Link>
    </article>
  );
}
