export interface AuditEntry {
  id: number;
  type: string;
  timestamp: number;
  details: string;
}

interface AuditLogTimelineProps {
  entries: AuditEntry[];
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  AI_GENERATION_STARTED: { icon: "🤖", color: "#004085", bg: "#cce5ff" },
  AI_CODE_GENERATED: { icon: "💻", color: "#155724", bg: "#d4edda" },
  INVARIANT_CHECK_PASSED: { icon: "✅", color: "#155724", bg: "#d4edda" },
  INVARIANT_CHECK_FAILED: { icon: "❌", color: "#721c24", bg: "#f8d7da" },
  SIMULATION_STARTED: { icon: "🧪", color: "#856404", bg: "#fff3cd" },
  SIMULATION_PASSED: { icon: "🎯", color: "#155724", bg: "#d4edda" },
  SIMULATION_FAILED: { icon: "💥", color: "#721c24", bg: "#f8d7da" },
  HUMAN_OVERRIDE: { icon: "👤", color: "#383d41", bg: "#e2e3e5" },
  EXECUTION_SUBMITTED: { icon: "🚀", color: "#0c5460", bg: "#d1ecf1" },
};

const DEFAULT_CONFIG = { icon: "📝", color: "#333", bg: "#f0f0f0" };

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function AuditLogTimeline({ entries }: AuditLogTimelineProps) {
  return (
    <div>
      <div style={{ position: "relative", paddingLeft: "2rem" }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: "0.7rem",
          top: 0,
          bottom: 0,
          width: 2,
          background: "#e0e0e0",
        }} />

        {entries.map((entry, i) => {
          const cfg = typeConfig[entry.type] ?? DEFAULT_CONFIG;
          return (
            <div key={entry.id} style={{ position: "relative", marginBottom: "1.5rem" }}>
              {/* Dot */}
              <div style={{
                position: "absolute",
                left: "-1.65rem",
                top: "0.3rem",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: cfg.bg,
                border: `2px solid ${cfg.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
              }}>
                {cfg.icon}
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 10, padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: "0.15rem 0.6rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
                    {cfg.icon} {entry.type.replace(/_/g, " ")}
                  </span>
                  <span style={{ color: "#888", fontSize: "0.8rem" }}>
                    Block #{entry.id} · {formatTime(entry.timestamp)}
                  </span>
                </div>
                <div style={{ color: "#555", fontSize: "0.9rem" }}>{entry.details}</div>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <p style={{ color: "#888", textAlign: "center" }}>No audit entries yet.</p>
      )}
    </div>
  );
}
