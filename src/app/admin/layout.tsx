import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visitor Insights",
  description: "Private visitor statistics.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
