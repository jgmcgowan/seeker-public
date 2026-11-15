import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Send the Seeker team a question, idea or correction." };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">Contact</h1>
        <p className="text-muted">
          Questions, ideas, or something that looks wrong? Send a note and we&apos;ll reply by email. To change a
          congregation&apos;s details, the{" "}
          <a className="text-accent underline" href="/listing">
            listing form
          </a>{" "}
          is quickest.
        </p>
      </header>
      <ContactForm />
    </div>
  );
}
