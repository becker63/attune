import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Attune Studio",
  description:
    "Ask a repository a question. Compare the evidence behind the answers.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
