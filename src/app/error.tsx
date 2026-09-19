"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <p className="font-mono text-lg font-semibold tracking-tight">
        Parqo<span className="text-accent">.</span>
      </p>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">
        The map hit an unexpected problem. Try again — if it keeps happening,
        reload the page.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-90"
      >
        Try again
      </button>
    </div>
  );
}
