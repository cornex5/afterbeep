import type { ReactNode } from "react";

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
