import { Suspense } from "react";
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
