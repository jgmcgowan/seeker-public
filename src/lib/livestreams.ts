import data from "./livestreams.json";

// Congregations that stream their services, found on their own websites by
// scripts/find-livestreams.mjs (Philadelphia so far). Keyed by place id.

export type Livestream = {
  url: string;
  /** Where it's published: YouTube, Facebook, a streaming platform, or their own site. */
  kind: "youtube" | "facebook" | "platform" | "site";
  /** True when the link always points at the current stream; false when it lists each service's video. */
  persistent: boolean;
  /** Approximate date of the newest YouTube stream when we checked. */
  lastStreamed?: string;
  checked: string;
};

const STREAMS = data as Record<string, Livestream & { name: string; city: string; source: string }>;

export function livestreamFor(id: string): Livestream | null {
  const s = STREAMS[id];
  return s ? { url: s.url, kind: s.kind, persistent: s.persistent, lastStreamed: s.lastStreamed, checked: s.checked } : null;
}
