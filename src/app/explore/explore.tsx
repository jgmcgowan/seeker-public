"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readStored, writeStored } from "@/lib/stored";
import { QUESTIONS, fitLabel, suggest, type Answers, type Suggestion } from "@/lib/quiz";
import { ALL_BRANCHES, findBranch, branchLabel } from "@/lib/traditions";

const KEY = "seeker.quiz" as const;
// At most this many suggestions per tradition, so results show a range of faiths.
const PER_TRADITION = 2;
const SHOWN = 6;

type Saved = { answers: Answers; roots: string | null; done: boolean };

export function Explore() {
  // A finished reflection is restored on this device (rendered inside ClientOnly).
  const [saved] = useState(() => readStored<Saved | null>(KEY, null));
  const [answers, setAnswers] = useState<Answers>(saved?.done ? saved.answers : {});
  const [roots, setRoots] = useState<string | null>(saved?.done ? saved.roots : null);
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(!!saved?.done);

  const returning = answers.stage?.includes("returning");
  // The roots picker is an extra step right after "What brings you here?".
  const steps = returning ? ["stage", "roots", ...QUESTIONS.slice(1).map((q) => q.id)] : QUESTIONS.map((q) => q.id);
  const current = steps[step];
  const question = QUESTIONS.find((q) => q.id === current);

  const pick = (qid: string, oid: string, multi?: boolean) => {
    setAnswers((a) => {
      const prev = a[qid] ?? [];
      const next = multi ? (prev.includes(oid) ? prev.filter((x) => x !== oid) : [...prev, oid]) : [oid];
      return { ...a, [qid]: next };
    });
    if (!multi) setTimeout(() => setStep((s) => s + 1), 150);
  };

  const done = restored || step >= steps.length;
  useEffect(() => writeStored(KEY, { answers, roots, done } satisfies Saved), [answers, roots, done]);

  if (done) {
    return (
      <Results
        answers={answers}
        roots={roots}
        onRestart={() => {
          setAnswers({});
          setRoots(null);
          setStep(0);
          setRestored(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Question {Math.min(step + 1, steps.length)} of {steps.length}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-sunk">
          <div className="h-full bg-accent transition-all" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
      </div>

      {current === "roots" ? (
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-semibold">Which tradition did you grow up with?</h1>
          <select className="field" value={roots ?? ""} onChange={(e) => setRoots(e.target.value || null)}>
            <option value="">Choose one…</option>
            {ALL_BRANCHES.map((b) => (
              <option key={b.branch.slug} value={b.branch.slug}>
                {branchLabel(b)}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">We&apos;ll show it alongside your results, with nearby places to return to.</p>
        </div>
      ) : (
        question && (
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-semibold">{question.prompt}</h1>
            {question.help && <p className="text-muted">{question.help}</p>}
            <div className="grid gap-2">
              {question.options.map((o) => {
                const on = answers[question.id]?.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => pick(question.id, o.id, question.multi)}
                    className={`card px-4 py-3 text-left transition-colors hover:border-accent ${on ? "border-accent bg-accent-soft" : ""}`}
                    aria-pressed={on}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      <div className="flex justify-between">
        <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        {(current === "roots" || question?.multi || answers[current]) && (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
            {step === steps.length - 1 ? "See results" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}

function Results({ answers, roots, onRestart }: { answers: Answers; roots: string | null; onRestart: () => void }) {
  const rootsRef = findBranch(roots);
  const shown = useMemo(() => {
    const perTradition = new Map<string, number>();
    const out: Suggestion[] = [];
    for (const s of suggest(answers)) {
      if (s.branch.slug === roots) continue;
      const n = perTradition.get(s.tradition.slug) ?? 0;
      if (n >= PER_TRADITION) continue;
      perTradition.set(s.tradition.slug, n + 1);
      out.push(s);
      if (out.length === SHOWN) break;
    }
    return out;
  }, [answers, roots]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">Traditions worth exploring</h1>
        <p className="max-w-2xl text-muted">
          Based on what you shared, these may resonate with you. They&apos;re starting points for curiosity,
          not a verdict. Every congregation is different, and the best way to know is to read, visit and ask.
        </p>
      </header>

      {rootsRef && (
        <div className="card space-y-2 border-gold bg-gold-soft p-5">
          <p className="text-sm font-semibold text-gold">Your roots</p>
          <h2 className="font-display text-2xl font-semibold">{branchLabel(rootsRef)}</h2>
          <p className="text-sm">{rootsRef.branch.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link className="btn-primary" href={`/find?branch=${rootsRef.branch.slug}`}>
              Find a {rootsRef.tradition.place} to return to
            </Link>
            <Link className="btn-ghost" href={`/traditions/${rootsRef.tradition.slug}#${rootsRef.branch.slug}`}>
              Read about it
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((s) => (
          <div key={s.branch.slug} className="card flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{s.tradition.name}</p>
                <h2 className="font-display text-xl font-semibold">{s.branch.name}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {fitLabel(s.score)}
              </span>
            </div>
            <p className="text-sm">{s.branch.summary}</p>
            {s.reasons.length > 0 && (
              <p className="text-sm text-muted">
                <span className="font-semibold text-ink">Why it might resonate: </span>
                you value {joinList(s.reasons)}.
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link className="btn-ghost" href={`/traditions/${s.tradition.slug}#${s.branch.slug}`}>
                Learn more
              </Link>
              <Link className="btn-ghost" href={`/find?branch=${s.branch.slug}`}>
                Visit nearby
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/traditions" className="btn-primary">
          Browse every tradition
        </Link>
        <button type="button" className="btn-ghost" onClick={onRestart}>
          Start over
        </button>
      </div>
    </div>
  );
}

function joinList(items: string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
