/**
 * Synthetic, deterministic embeddings — NO external API key required.
 *
 * This is a local feature-hashing embedding (bag-of-words + bigrams, L2-normalized).
 * It produces stable vectors so cosine similarity captures keyword/topic overlap
 * between a student profile and a program. It is intentionally swappable: when a
 * real embedding API (Claude/Voyage/OpenAI) is wired up, implement EmbeddingProvider
 * and return it from getEmbeddingProvider() — nothing else changes.
 */

export const EMBED_DIM = 64;

export interface EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  embed(text: string): number[];
}

/** FNV-1a 32-bit hash — deterministic across runs/processes. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

const STOP = new Set(["the", "and", "for", "with", "of", "in", "to", "at", "on", "a", "an"]);

/** Hash tokens (and adjacent bigrams) into a fixed-dim vector, then L2-normalize. */
export function embedText(text: string): number[] {
  const vec = new Array(EMBED_DIM).fill(0);
  const tokens = tokenize(text).filter((t) => !STOP.has(t));

  const add = (term: string, weight: number) => {
    const h = fnv1a(term);
    const idx = h % EMBED_DIM;
    const sign = (h >> 16) & 1 ? 1 : -1;
    vec[idx] += sign * weight;
  };

  for (let i = 0; i < tokens.length; i++) {
    add(tokens[i], 1);
    if (i + 1 < tokens.length) add(`${tokens[i]}_${tokens[i + 1]}`, 0.5); // bigram
  }

  // L2-normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/** Cosine similarity in [-1, 1]; safe on empty/zero vectors. */
export function cosineSim(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ── Text builders ─────────────────────────────────────────────────────

export function programText(p: {
  name: string;
  specialization?: string | null;
  degreeLevel: string;
  eligibility?: string | null;
  university?: { name?: string; country?: string } | null;
}): string {
  return [
    p.name,
    p.specialization ?? "",
    p.degreeLevel,
    p.eligibility ?? "",
    p.university?.name ?? "",
    p.university?.country ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function profileText(p: {
  highestQualification?: string | null;
  targetDegreeLevel?: string | null;
  preferredSubjects?: string[];
  preferredCountries?: string[];
  careerGoals?: string | null;
}): string {
  return [
    p.highestQualification ?? "",
    p.targetDegreeLevel ?? "",
    ...(p.preferredSubjects ?? []),
    ...(p.preferredCountries ?? []),
    p.careerGoals ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ── Provider (swap point for a real embedding API) ────────────────────

export const syntheticEmbeddingProvider: EmbeddingProvider = {
  name: "synthetic-hash-64",
  dim: EMBED_DIM,
  embed: embedText,
};

export function getEmbeddingProvider(): EmbeddingProvider {
  // When ANTHROPIC_API_KEY / a vector API is configured, return that provider here.
  return syntheticEmbeddingProvider;
}
