"use client";

import { useState } from "react";
import styles from "./CopyButton.module.css";

type Props = {
  text: string;
  label: string;
};

export default function CopyButton({ text, label }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className={styles.button}
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
