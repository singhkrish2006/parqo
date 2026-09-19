import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Parqo collects, why, and how it is used.",
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "No accounts",
    body: [
      "Parqo doesn't ask you to sign up. We don't collect your name, email address or phone number.",
    ],
  },
  {
    heading: "Your location",
    body: [
      "If you allow it, your device location is used in your browser to sort spots by distance and to start routes from where you are.",
      "When you report a spot's status, your coordinates at that moment are sent with the report so the service can confirm you are near the spot. They are stored with the report.",
    ],
  },
  {
    heading: "Anonymous device identifier",
    body: [
      "Parqo creates a random identifier and keeps it in your browser's local storage. It is attached to the reports and spot suggestions you submit so we can limit spam and count how many different devices agree on a status. It isn't linked to your identity, and clearing your browser data resets it.",
    ],
  },
  {
    heading: "Stored on your device",
    body: [
      "The spots you choose to watch are saved in your browser's local storage and never sent to us.",
    ],
  },
  {
    heading: "Search and routes",
    body: [
      "When you search for a destination, the text you type is sent to Parqo's server, which forwards it to a geocoding service to find the place and to a routing service to draw the route.",
    ],
  },
  {
    heading: "Service providers",
    body: [
      "Data is stored with Supabase. Map images are loaded from a map tile provider, which sees your IP address as any website you visit does. Directions links open Google Maps, which is governed by Google's own policy.",
    ],
  },
  {
    heading: "No advertising or tracking",
    body: [
      "Parqo doesn't show ads and doesn't use analytics or advertising trackers.",
    ],
  },
  {
    heading: "Questions",
    body: [
      "Open an issue on the project's GitHub repository if you have a question or want something removed.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-5 py-10">
        <Link
          href="/"
          className="mb-8 inline-block font-mono text-sm font-semibold tracking-tight"
        >
          Parqo<span className="text-accent">.</span>
        </Link>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Privacy</h1>
        <p className="mb-8 text-sm text-muted">Last updated 19 September 2026</p>

        {sections.map((section) => (
          <section key={section.heading} className="mb-7">
            <h2 className="mb-2 text-base font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mb-2 text-sm leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
