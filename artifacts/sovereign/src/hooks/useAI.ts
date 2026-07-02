/**
 * React hooks for calling the api-server AI endpoints.
 * Gracefully handles network errors — never crashes the UI.
 */
import { useState, useCallback } from "react";

const BASE = "/api/ai";

async function postAI<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────

export type PilotResult = {
  verdict: "accept" | "negotiate" | "decline";
  score: number;
  headline: string;
  points: string[];
  risk: string | null;
  suggested_counter: string | null;
  source: "ai" | "heuristic";
};

export type ScoutResult = {
  score: number;
  verdict: "strong" | "improve" | "weak";
  headline: string;
  suggestions: string[];
  pitch_feedback: string | null;
  source: "ai" | "heuristic";
};

export type ClassifyResult = {
  category: "work" | "audience" | "direct";
  confidence: number;
  source: "ai" | "heuristic";
};

// ── Pilot hook ───────────────────────────────────────────────────

export function usePilot() {
  const [result, setResult] = useState<PilotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (deal: {
    deal_type: string;
    budget_range?: string | null;
    payment_structure?: string | null;
    timeline?: string | null;
    commitments?: string[];
    pitch?: string | null;
    celebrity_username?: string | null;
    sender_name?: string | null;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await postAI<PilotResult>("/pilot", deal);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Could not analyse deal");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, analyse, reset };
}

// ── Scout hook ───────────────────────────────────────────────────

export function useScout() {
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [loading, setLoading] = useState(false);

  const score = useCallback(async (draft: {
    deal_type?: string | null;
    budget_range?: string | null;
    payment_structure?: string | null;
    timeline?: string | null;
    commitments?: string[];
    pitch?: string | null;
    celebrity_username?: string | null;
  }) => {
    // Only score when at least deal_type is set
    if (!draft.deal_type) { setResult(null); return; }
    setLoading(true);
    try {
      const data = await postAI<ScoutResult>("/scout", draft);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, score };
}

// ── Classify hook ────────────────────────────────────────────────

export function useClassify() {
  const classify = useCallback(async (content: string, subject?: string | null, senderName?: string | null): Promise<ClassifyResult | null> => {
    if (!content.trim()) return null;
    try {
      return await postAI<ClassifyResult>("/classify", { content, subject, sender_name: senderName });
    } catch {
      return null;
    }
  }, []);

  return { classify };
}
