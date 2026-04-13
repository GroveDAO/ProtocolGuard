import { useState } from "react";

interface VotingPanelProps {
  votesFor: number;
  votesAgainst: number;
  votingEnd: number;
  status: string;
}

export default function VotingPanel({ votesFor, votesAgainst, votingEnd, status }: VotingPanelProps) {
  const [voted, setVoted] = useState<boolean | null>(null);
  const [localFor, setLocalFor] = useState(votesFor);
  const [localAgainst, setLocalAgainst] = useState(votesAgainst);

  const total = localFor + localAgainst;
  const forPct = total > 0 ? (localFor / total) * 100 : 50;
  const againstPct = 100 - forPct;
  const isActive = status === "VOTING" && Date.now() < votingEnd;
  const timeLeft = Math.max(0, votingEnd - Date.now());
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const castVote = (support: boolean) => {
    if (voted !== null || !isActive) return;
    setVoted(support);
    // Simulate weight of 1000 tokens
    if (support) setLocalFor(v => v + 1000);
    else setLocalAgainst(v => v + 1000);
  };

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Votes</h3>
        {isActive ? (
          <span style={{ background: "#cce5ff", color: "#004085", padding: "0.25rem 0.75rem", borderRadius: 4, fontSize: "0.85rem" }}>
            🕐 {daysLeft}d {hoursLeft}h remaining
          </span>
        ) : (
          <span style={{ background: "#e2e3e5", color: "#383d41", padding: "0.25rem 0.75rem", borderRadius: 4, fontSize: "0.85rem" }}>
            Voting ended
          </span>
        )}
      </div>

      {/* Progress bars */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
          <span style={{ color: "#28a745", fontWeight: 600 }}>✅ For: {fmt(localFor)} ({forPct.toFixed(1)}%)</span>
          <span style={{ color: "#dc3545", fontWeight: 600 }}>❌ Against: {fmt(localAgainst)} ({againstPct.toFixed(1)}%)</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, overflow: "hidden", background: "#dc3545", display: "flex" }}>
          <div style={{ background: "#28a745", width: `${forPct}%`, transition: "width 0.3s ease" }} />
        </div>
        <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.3rem" }}>
          Total: {fmt(total)} votes
        </div>
      </div>

      {/* Voting buttons */}
      {isActive && voted === null && (
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button
            onClick={() => castVote(true)}
            style={{ flex: 1, padding: "0.75rem", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
          >
            👍 Vote For
          </button>
          <button
            onClick={() => castVote(false)}
            style={{ flex: 1, padding: "0.75rem", background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
          >
            👎 Vote Against
          </button>
        </div>
      )}

      {voted !== null && (
        <div style={{ marginTop: "1rem", background: "#d4edda", color: "#155724", padding: "0.75rem", borderRadius: 8, textAlign: "center" }}>
          ✅ You voted <strong>{voted ? "For" : "Against"}</strong> this proposal
        </div>
      )}
    </div>
  );
}
