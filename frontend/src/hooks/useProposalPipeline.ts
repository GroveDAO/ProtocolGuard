import { useState, useEffect, useCallback } from "react";

export type PipelineStep =
  | "IDLE"
  | "FETCHING_CONTEXT"
  | "GENERATING_CODE"
  | "CHECKING_INVARIANTS"
  | "SIMULATING"
  | "SUBMITTING_REPORT"
  | "DONE"
  | "FAILED";

export interface PipelineStatus {
  step: PipelineStep;
  proposalId: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:3001";
const POLL_INTERVAL_MS = 10_000;

export function useProposalPipeline(proposalId: number | null) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (proposalId === null) return;
    try {
      const res = await fetch(`${AI_ENGINE_URL}/api/proposals/${proposalId}/status`);
      if (!res.ok) {
        if (res.status === 404) return; // Pipeline not started yet
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as PipelineStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [proposalId]);

  // Poll every 10 seconds while pipeline is running
  useEffect(() => {
    if (proposalId === null) return;
    const done = status?.step === "DONE" || status?.step === "FAILED";
    if (done) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [proposalId, status?.step, fetchStatus]);

  const triggerPipeline = useCallback(
    async (input: Record<string, unknown>) => {
      if (proposalId === null) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${AI_ENGINE_URL}/api/proposals/${proposalId}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [proposalId, fetchStatus]
  );

  const fetchReport = useCallback(async (): Promise<string | null> => {
    if (proposalId === null) return null;
    const res = await fetch(`${AI_ENGINE_URL}/api/proposals/${proposalId}/report`);
    if (!res.ok) return null;
    return res.text();
  }, [proposalId]);

  return { status, loading, error, triggerPipeline, fetchReport, refetch: fetchStatus };
}
