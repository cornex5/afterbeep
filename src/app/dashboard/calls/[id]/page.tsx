import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepository } from "@/lib/repositoryFactory";
import { relativeTime, languageLabel } from "@/lib/ui";
import CassetteReels from "@/components/CassetteReels";
import MarkHandledButton from "@/components/MarkHandledButton";
import CopyButton from "@/components/CopyButton";
import styles from "./page.module.css";

const OWNER_ID = "demo";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CallDetailPage({ params }: Props) {
  const { id } = await params;
  const repo = getRepository();
  const call = await repo.getCall(id, OWNER_ID);

  if (!call) {
    notFound();
  }

  const now = new Date();
  const time = relativeTime(call.receivedAt, now);
  const lang = languageLabel(call.transcriptLanguage);
  const isHandled = call.handledAt !== null;

  const expiryDate = call.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          Back to dashboard
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.cassetteDetail}>
          <div className={styles.cassetteBody}>
            <div className={styles.cassetteEdge} aria-hidden="true" data-urgency={call.urgency} />

            <div className={styles.cassetteWindow}>
              <CassetteReels spinning={!isHandled} size={48} />
            </div>

            <div className={styles.cassetteLabel}>
              <div className={styles.labelHeader}>
                <p className={styles.callerName}>{call.callerName}</p>
                <span className={`${styles.timeStamp} mono`}>{time}</span>
              </div>
              <p className={styles.reason}>{call.reason}</p>
              <div className={styles.labelMeta}>
                {lang !== "English" && (
                  <span className={styles.langChip}>{lang}</span>
                )}
                {call.urgency === "high" && (
                  <span className={styles.urgentBadge}>urgent</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.detailGrid}>
          <section className={styles.fieldGroup}>
            <h2 className={styles.groupHeading}>Message details</h2>

            <dl className={styles.fieldList}>
              <div className={styles.fieldRow}>
                <dt>Caller name</dt>
                <dd className="mono">{call.callerName}</dd>
              </div>
              <div className={styles.fieldRow}>
                <dt>Callback number</dt>
                <dd className="mono">{call.callbackNumber}</dd>
              </div>
              {call.callerIdNumber && call.callerIdNumber !== call.callbackNumber && (
                <div className={styles.fieldRow}>
                  <dt>Caller ID</dt>
                  <dd className="mono">{call.callerIdNumber}</dd>
                </div>
              )}
              <div className={styles.fieldRow}>
                <dt>Reason</dt>
                <dd>{call.reason}</dd>
              </div>
              <div className={styles.fieldRow}>
                <dt>Urgency</dt>
                <dd className="mono">{call.urgency}</dd>
              </div>
              <div className={styles.fieldRow}>
                <dt>Received</dt>
                <dd className="mono">
                  {call.receivedAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div className={styles.fieldRow}>
                <dt>Language</dt>
                <dd className="mono">{lang}</dd>
              </div>
              {isHandled && call.handledAt && (
                <div className={styles.fieldRow}>
                  <dt>Handled</dt>
                  <dd className="mono">
                    {call.handledAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {call.suggestedReply && (
            <section className={styles.fieldGroup}>
              <h2 className={styles.groupHeading}>Suggested reply</h2>
              <p className={styles.suggestedReply}>{call.suggestedReply}</p>
            </section>
          )}

          {call.transcript && (
            <section className={styles.fieldGroup}>
              <h2 className={styles.groupHeading}>Transcript</h2>
              <p className={styles.transcript}>{call.transcript}</p>
            </section>
          )}

          <div className={styles.actions}>
            <MarkHandledButton callId={call.id} isHandled={isHandled} />
            {call.callbackNumber !== "unknown" && (
              <CopyButton
                text={call.callbackNumber}
                label="Copy callback number"
              />
            )}
          </div>

          <p className={styles.retentionNote}>
            Transcript kept until {expiryDate}.
          </p>
        </div>
      </main>
    </div>
  );
}
