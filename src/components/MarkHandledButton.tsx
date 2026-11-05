"use client";

import { useTransition } from "react";
import { markHandledAction } from "@/app/actions";
import styles from "./MarkHandledButton.module.css";

type Props = {
  callId: string;
  isHandled: boolean;
  compact?: boolean;
};

export default function MarkHandledButton({ callId, isHandled, compact = false }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      markHandledAction(callId, !isHandled);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`${styles.button} ${isHandled ? styles.unmark : styles.mark} ${compact ? styles.compact : ""}`}
      aria-label={isHandled ? "Mark as not handled" : "Mark as handled"}
    >
      {isPending ? "Saving..." : isHandled ? "Unmark handled" : "Mark handled"}
    </button>
  );
}
