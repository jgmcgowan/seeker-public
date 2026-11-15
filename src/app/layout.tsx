import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Seeker — explore faith, find community", template: "%s · Seeker" },
  description:
    "Learn about faith traditions in plain language, see which might resonate with you, and find real congregations near you.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#161513" },
  ],
};

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/traditions", label: "Traditions" },
  { href: "/scriptures", label: "Scriptures" },
  { href: "/find", label: "Find a place" },
  { href: "/my-place", label: "My places" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              Seeker
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line text-xs text-muted">
          <div className="mx-auto max-w-5xl space-y-1 px-4 py-6">
            <p>
              Seeker doesn&apos;t promote any one faith. Descriptions are general; every congregation is
              different, so visit and ask.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/listing" className="font-semibold text-accent hover:underline">
                Add, update or remove your congregation
              </Link>
              <Link href="/contact" className="hover:text-ink hover:underline">
                Contact
              </Link>
            </p>
            <p>
              Places of worship from{" "}
              <a className="underline" href="https://www.openstreetmap.org/copyright">
                OpenStreetMap
              </a>{" "}
              contributors and congregations. Confirm service times with the congregation before you go.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
