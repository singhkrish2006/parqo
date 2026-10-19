import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <p className="font-mono text-lg font-semibold tracking-tight">
        Parqo<span className="text-accent">.</span>
      </p>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted">
        Parqo needs a connection to show live parking availability. Reconnect
        and try again.
      </p>
    </div>
  );
}
