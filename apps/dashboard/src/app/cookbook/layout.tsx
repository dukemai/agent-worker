import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookbook",
  description: "Shared recipes — browse, filter, and cook",
};

export default function CookbookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
