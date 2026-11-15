import type { TimePref } from "./service-times";

// "About you" answers on the Find page. OpenStreetMap rarely knows about programs,
// so most of these turn into questions to ask the congregation rather than filters.

export type Prefs = {
  age: string | null;
  household: string | null;
  size: "small" | "medium" | "large" | null;
  times: TimePref[];
  extras: string[];
};

export const EMPTY_PREFS: Prefs = { age: null, household: null, size: null, times: [], extras: [] };

export const AGES = ["18–29", "30–44", "45–64", "65+"];

export const HOUSEHOLDS = [
  { id: "single", label: "Single" },
  { id: "couple", label: "Couple" },
  { id: "young-kids", label: "Young children" },
  { id: "teens", label: "Teens at home" },
  { id: "empty-nest", label: "Kids grown" },
];

export const SIZES = [
  { id: "small", label: "Small & intimate" },
  { id: "medium", label: "Mid-sized" },
  { id: "large", label: "Large, lots going on" },
] as const;

export const EXTRAS = [
  { id: "fellowship", label: "Fellowship & social events" },
  { id: "outreach", label: "Community outreach" },
  { id: "study", label: "Small groups & study" },
  { id: "kids", label: "Children's programs" },
  { id: "youth", label: "Youth group" },
  { id: "young-adults", label: "Young adults" },
  { id: "seniors", label: "Seniors' ministry" },
  { id: "spanish", label: "Services in Spanish" },
  { id: "recovery", label: "Recovery & support groups" },
  { id: "accessible", label: "Wheelchair accessible" },
  { id: "lgbtq", label: "LGBTQ-affirming" },
  { id: "newcomers", label: "Newcomer / intro classes" },
];

/** Questions worth asking a congregation, based on what the person told us. */
export function questionsToAsk(prefs: Prefs): string[] {
  const q: string[] = [];
  const has = (id: string) => prefs.extras.includes(id);
  if (prefs.times.length) q.push("What are your service times, and is there a service that's best for first-time visitors?");
  if (prefs.household === "young-kids" || has("kids")) q.push("Is there a nursery or children's program during the service?");
  if (prefs.household === "teens" || has("youth")) q.push("Do you have a youth group, and when does it meet?");
  if (prefs.age === "18–29" || has("young-adults")) q.push("Is there a group for young adults?");
  if (prefs.age === "65+" || has("seniors")) q.push("Are there groups or activities for older members?");
  if (prefs.household === "single") q.push("Are there groups where single people connect?");
  if (prefs.household === "couple") q.push("Are there groups for couples or marriage enrichment?");
  if (has("fellowship")) q.push("Is there a coffee hour, meal or social event where newcomers can meet people?");
  if (has("outreach")) q.push("What service or outreach projects can members join?");
  if (has("study")) q.push("Are there small groups or study classes during the week?");
  if (has("spanish")) q.push("Do you offer a service in Spanish?");
  if (has("recovery")) q.push("Do you host recovery or support groups?");
  if (has("accessible")) q.push("Is the building wheelchair accessible, including restrooms and seating?");
  if (has("lgbtq")) q.push("How does your community welcome LGBTQ people and families?");
  if (has("newcomers")) q.push("Do you offer a newcomers' or introductory class?");
  if (prefs.size) q.push("About how many people attend a typical weekend?");
  return q;
}

export type SortBy = "best" | "distance" | "name" | "denomination";

export const SORTS: { id: SortBy; label: string }[] = [
  { id: "best", label: "Best fit" },
  { id: "distance", label: "Distance" },
  { id: "name", label: "Name" },
  { id: "denomination", label: "Denomination" },
];

/** Labels for listing features (the same ids as EXTRAS). */
export const FEATURE_LABEL: Record<string, string> = Object.fromEntries(EXTRAS.map((x) => [x.id, x.label]));
