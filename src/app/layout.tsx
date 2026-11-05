import type { ReactNode } from "react";
import "@fontsource-variable/anybody";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/reenie-beanie";
import "./globals.css";

export const metadata = {
  title: "Afterbeep",
  description: "The answering machine, resurrected. Never lose a caller.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
