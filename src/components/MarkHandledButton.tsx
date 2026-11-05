"use client";

import { useTransition } from "react";
import { markHandledAction } from "@/app/actions";
import styles from "./MarkHandledButton.module.css";

type Props = {
  callId: string;
  isHandled: boolean;
};

export default function MarkHandledButton({ callId, isHandled }: Props) {
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
      className={`${styles.button} ${isHandled ? styles.unmark : styles.mark}`}
      aria-label={isHandled ? "Mark as not handled" : "Mark as handled"}
    >
      {isPending ? "Saving..." : isHandled ? "Unmark handled" : "Mark handled"}
    </button>
  );
}
