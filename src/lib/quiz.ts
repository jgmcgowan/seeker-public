import { ALL_BRANCHES, TRAITS, TRAIT_REASON, type BranchRef, type Trait } from "./traditions";

// The Explore reflection. Each answer nudges trait preferences; branches are then
// ranked by how well their tendencies line up. Nothing here is a verdict: the UI
// presents results as "worth exploring" and always links to every tradition.

export type Option = { id: string; label: string; hint?: string; effect?: Partial<Record<Trait, number>> };
export type Question = {
  id: string;
  prompt: string;
  help?: string;
  multi?: boolean;
  options: Option[];
};

export const QUESTIONS: Question[] = [
  {
    id: "stage",
    prompt: "What brings you here?",
    options: [
      { id: "new", label: "Faith is new to me" },
      { id: "returning", label: "I'm returning to a faith I grew up with" },
      { id: "switching", label: "I have a faith but I'm curious about others" },
      { id: "learning", label: "I just want to learn" },
    ],
  },
  {
    id: "divine",
    prompt: "How do you tend to think about God or the sacred?",
    help: "Choose the one closest to you today. It's fine not to know.",
    options: [
      { id: "personal", label: "A personal God who knows and cares for me", effect: { personal: 2 } },
      { id: "reality", label: "An ultimate reality or truth, more than a person", effect: { personal: -1, contemplative: 1, open: 1 } },
      { id: "unsure", label: "I'm not sure, and I'd like room for questions", effect: { open: 2, personal: -1 } },
      { id: "practice", label: "I'm drawn more to practice than to belief", effect: { personal: -2, contemplative: 1, practice: 1 } },
    ],
  },
  {
    id: "gathering",
    prompt: "Which kind of gathering sounds most appealing?",
    options: [
      { id: "ancient", label: "Ancient and ritual-rich: chant, candles, set prayers", effect: { liturgy: 2, lively: -1 } },
      { id: "contemporary", label: "Warm and contemporary, with modern music and a practical talk", effect: { liturgy: -2, lively: 1, scripture: 1 } },
      { id: "quiet", label: "Quiet and reflective: silence or meditation", effect: { contemplative: 2, lively: -2 } },
      { id: "expressive", label: "Energetic and expressive: singing, clapping, joy", effect: { lively: 2, liturgy: -1 } },
    ],
  },
  {
    id: "text",
    prompt: "How do you feel about a sacred text guiding your life?",
    options: [
      { id: "central", label: "I'd like a clear text and teaching to guide me", effect: { scripture: 2, open: -1 } },
      { id: "interpreted", label: "Meaningful, read with study and discussion", effect: { scripture: 1, open: 1 } },
      { id: "experience", label: "Experience matters more to me than texts", effect: { scripture: -1, contemplative: 1 } },
    ],
  },
  {
    id: "daily",
    prompt: "How much daily structure do you want?",
    options: [
      { id: "structured", label: "Set daily prayers or practices, maybe food or rest rules", effect: { practice: 2 } },
      { id: "some", label: "A daily habit, but flexible", effect: { practice: 1 } },
      { id: "light", label: "Mostly a weekly gathering", effect: { practice: -1 } },
    ],
  },
  {
    id: "community",
    prompt: "What kind of community feels right?",
    options: [
      { id: "close", label: "Close-knit: people know my name and check in", effect: { community: 2 } },
      { id: "pace", label: "Some connection, at my own pace", effect: { community: 1 } },
      { id: "anonymous", label: "I'd rather blend in at first", effect: { community: -1 } },
    ],
  },
  {
    id: "service",
    prompt: "How important is serving others and working for justice?",
    options: [
      { id: "central", label: "Central to what faith means to me", effect: { service: 2 } },
      { id: "important", label: "Important, alongside worship", effect: { service: 1 } },
      { id: "personal", label: "More personal than organized", effect: { service: 0 } },
    ],
  },
  {
    id: "questions",
    prompt: "When it comes to questions and doubt…",
    options: [
      { id: "answers", label: "I want clear answers and firm teaching", effect: { open: -2 } },
      { id: "balance", label: "Clear teaching, with space to ask", effect: { open: 0 } },
      { id: "welcome", label: "I want a place where many views are welcome", effect: { open: 2 } },
    ],
  },
  {
    id: "hopes",
    prompt: "What are you hoping faith could offer you?",
    help: "Choose any that apply.",
    multi: true,
    options: [
      { id: "peace", label: "Peace and less stress", effect: { contemplative: 1 } },
      { id: "meaning", label: "Meaning and purpose", effect: { personal: 1, scripture: 1 } },
      { id: "belonging", label: "Belonging and friendship", effect: { community: 1 } },
      { id: "guidance", label: "Moral guidance", effect: { scripture: 1, practice: 1 } },
      { id: "grief", label: "Comfort in grief or hard times", effect: { personal: 1, community: 1 } },
      { id: "family", label: "Values and community for my family", effect: { community: 1, practice: 1 } },
      { id: "justice", label: "A way to make a difference", effect: { service: 1 } },
      { id: "joy", label: "Joy and celebration", effect: { lively: 1 } },
    ],
  },
];

export type Answers = Record<string, string[]>;

export type Suggestion = BranchRef & { score: number; reasons: string[] };

export function preferences(answers: Answers): Record<Trait, number> {
  const pref = Object.fromEntries(TRAITS.map((t) => [t, 0])) as Record<Trait, number>;
  for (const q of QUESTIONS) {
    for (const id of answers[q.id] ?? []) {
      const effect = q.options.find((o) => o.id === id)?.effect ?? {};
      for (const [t, v] of Object.entries(effect)) pref[t as Trait] += v;
    }
  }
  return pref;
}

/** Branches ranked by cosine similarity between preferences and tendencies. */
export function suggest(answers: Answers): Suggestion[] {
  const pref = preferences(answers);
  const prefNorm = Math.hypot(...TRAITS.map((t) => pref[t])) || 1;
  return ALL_BRANCHES.map((ref) => {
    const traits = ref.branch.traits;
    const norm = Math.hypot(...TRAITS.map((t) => traits[t] ?? 0)) || 1;
    const parts = TRAITS.map((t) => ({ t, v: pref[t] * (traits[t] ?? 0) }));
    const score = parts.reduce((s, p) => s + p.v, 0) / (prefNorm * norm);
    const reasons = parts
      .filter((p) => p.v > 0 && pref[p.t] > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .map((p) => TRAIT_REASON[p.t]);
    return { ...ref, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

export function fitLabel(score: number): string {
  if (score >= 0.6) return "Strong fit";
  if (score >= 0.35) return "Good fit";
  return "Worth a look";
}
