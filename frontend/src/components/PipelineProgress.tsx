const STEPS = [
  { key: "FETCHING_CONTEXT", label: "Fetch Context" },
  { key: "GENERATING_CODE", label: "Generate Code" },
  { key: "CHECKING_INVARIANTS", label: "Check Invariants" },
  { key: "SIMULATING", label: "Simulate Fork" },
  { key: "SUBMITTING_REPORT", label: "Submit Report" },
  { key: "DONE", label: "Done" },
];

const STATUS_TO_STEP: Record<string, number> = {
  FETCHING_CONTEXT: 0,
  GENERATING_CODE: 1,
  CHECKING_INVARIANTS: 2,
  SIMULATING: 3,
  SUBMITTING_REPORT: 4,
  DONE: 5,
  FAILED: -1,
  // Map proposal status to pipeline step
  AI_PROCESSING: 1,
  SIMULATION_PASS: 5,
  SIMULATION_FAIL: 3,
  QUEUED: 5,
  EXECUTED: 5,
};

interface PipelineProgressProps {
  status: string;
}

export default function PipelineProgress({ status }: PipelineProgressProps) {
  const currentStep = STATUS_TO_STEP[status] ?? -1;
  const isFailed = status === "FAILED" || status === "SIMULATION_FAIL" || status === "AI_FAILED";
  const isDone = status === "DONE" || status === "SIMULATION_PASS" || status === "QUEUED" || status === "EXECUTED";

  return (
    <div style={{ padding: "1.5rem", background: "#f9f9f9", borderRadius: 12, border: "1px solid #eee" }}>
      <h3 style={{ marginTop: 0 }}>AI Pipeline Progress</h3>
      <div style={{ display: "flex", gap: 0 }}>
        {STEPS.map((step, i) => {
          const isActive = i === currentStep && !isFailed;
          const isComplete = i < currentStep || isDone;
          const isFail = isFailed && i === currentStep;

          return (
            <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Connector line */}
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {i > 0 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    background: isComplete ? "#28a745" : "#ddd",
                  }} />
                )}
                {/* Circle */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isFail ? "#dc3545" : isComplete ? "#28a745" : isActive ? "#0070f3" : "#e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  position: "relative",
                }}>
                  {isFail ? "✗" : isComplete ? "✓" : isActive ? (
                    <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                  ) : (i + 1)}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    background: isComplete && !isFail ? "#28a745" : "#ddd",
                  }} />
                )}
              </div>
              {/* Label */}
              <div style={{
                marginTop: "0.4rem",
                fontSize: "0.7rem",
                textAlign: "center",
                color: isFail ? "#dc3545" : isActive ? "#0070f3" : isComplete ? "#28a745" : "#aaa",
                fontWeight: (isActive || isComplete) ? 600 : 400,
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div style={{ marginTop: "1rem", background: "#f8d7da", color: "#721c24", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.9rem" }}>
          ❌ Pipeline failed at step: <strong>{status}</strong>
        </div>
      )}
      {isDone && (
        <div style={{ marginTop: "1rem", background: "#d4edda", color: "#155724", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.9rem" }}>
          ✅ AI pipeline completed successfully
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
