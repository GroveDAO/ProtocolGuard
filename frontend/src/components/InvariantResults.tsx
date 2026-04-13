export type Verdict = "PASS" | "FAIL" | "UNCERTAIN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface InvariantResult {
  id: number;
  text: string;
  verdict: Verdict;
  riskLevel: RiskLevel;
  reasoning: string;
}

interface InvariantResultsProps {
  results: InvariantResult[];
}

const verdictStyle: Record<Verdict, { bg: string; color: string; icon: string }> = {
  PASS: { bg: "#d4edda", color: "#155724", icon: "✅" },
  FAIL: { bg: "#f8d7da", color: "#721c24", icon: "❌" },
  UNCERTAIN: { bg: "#fff3cd", color: "#856404", icon: "⚠️" },
};

const riskStyle: Record<RiskLevel, { bg: string; color: string }> = {
  LOW: { bg: "#d4edda", color: "#155724" },
  MEDIUM: { bg: "#fff3cd", color: "#856404" },
  HIGH: { bg: "#f8d7da", color: "#721c24" },
  CRITICAL: { bg: "#dc3545", color: "#fff" },
};

export default function InvariantResults({ results }: InvariantResultsProps) {
  const summary = {
    pass: results.filter(r => r.verdict === "PASS").length,
    fail: results.filter(r => r.verdict === "FAIL").length,
    uncertain: results.filter(r => r.verdict === "UNCERTAIN").length,
  };

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Passed", count: summary.pass, ...verdictStyle.PASS },
          { label: "Failed", count: summary.fail, ...verdictStyle.FAIL },
          { label: "Uncertain", count: summary.uncertain, ...verdictStyle.UNCERTAIN },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, color: s.color, borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{s.count}</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-invariant cards */}
      {results.map(r => {
        const vs = verdictStyle[r.verdict];
        const rs = riskStyle[r.riskLevel];
        return (
          <div key={r.id} style={{ border: `1px solid ${vs.bg}`, borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ background: vs.bg, color: vs.color, padding: "0.2rem 0.7rem", borderRadius: 4, fontWeight: 700, fontSize: "0.85rem" }}>
                {vs.icon} {r.verdict}
              </span>
              <span style={{ background: rs.bg, color: rs.color, padding: "0.2rem 0.7rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>
                {r.riskLevel}
              </span>
              <span style={{ color: "#888", fontSize: "0.8rem" }}>#{r.id}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{r.text}</div>
            <div style={{ color: "#555", fontSize: "0.9rem" }}>{r.reasoning}</div>
          </div>
        );
      })}

      {results.length === 0 && (
        <p style={{ color: "#888", textAlign: "center" }}>No invariants to display.</p>
      )}
    </div>
  );
}
