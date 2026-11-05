"use client";

import { type FormEvent, useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/actions";
import type { OwnerSettings } from "@/lib/repository";
import styles from "./SettingsForm.module.css";

type Props = {
  settings: OwnerSettings;
};

export default function SettingsForm({ settings }: Props) {
  const [email, setEmail] = useState(settings.notificationEmail);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      await saveSettingsAction({ notificationEmail: email });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label htmlFor="notification-email" className={styles.label}>
          Notification email
        </label>
        <p className={styles.hint}>
          New message cards will be sent to this address within seconds of a
          call ending.
        </p>
        <input
          id="notification-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          required
          className={styles.input}
          autoComplete="email"
        />
      </div>

      <div className={styles.formFooter}>
        <button
          type="submit"
          disabled={isPending}
          className={styles.saveButton}
        >
          {isPending ? "Saving..." : "Save"}
        </button>

        {saved && (
          <p className={styles.confirmation} role="status">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
