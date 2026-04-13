import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";

interface FormData {
  protocolAddress: string;
  name: string;
  description: string;
  governanceToken: string;
  proposalThreshold: string;
  quorumBps: string;
  timelockSeconds: string;
  invariant1: string;
  invariant2: string;
  upgradeTarget: string;
}

const STEPS = [
  "Protocol Address",
  "Basic Info",
  "Governance Settings",
  "Safety Invariants",
  "Review & Submit",
];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    protocolAddress: "",
    name: "",
    description: "",
    governanceToken: "",
    proposalThreshold: "1000",
    quorumBps: "500",
    timelockSeconds: "172800",
    invariant1: "",
    invariant2: "",
    upgradeTarget: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    // In production: call ProtocolGuardRegistry.registerProtocol() via wagmi
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    router.push("/protocols");
  };

  return (
    <>
      <Head>
        <title>Register Protocol — ProtocolGuard</title>
      </Head>
      <main style={{ fontFamily: "sans-serif", maxWidth: 700, margin: "0 auto", padding: "2rem" }}>
        <h1>Register Your Protocol</h1>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{
                height: 4,
                borderRadius: 2,
                background: i <= step ? "#0070f3" : "#ddd",
                marginBottom: "0.3rem",
              }} />
              <div style={{ fontSize: "0.7rem", color: i <= step ? "#0070f3" : "#aaa", textAlign: "center" }}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: "2rem" }}>
          {step === 0 && (
            <Step title="Protocol Address">
              <Label>Protocol Contract Address</Label>
              <Input value={form.protocolAddress} onChange={v => update("protocolAddress", v)} placeholder="0x..." />
            </Step>
          )}
          {step === 1 && (
            <Step title="Basic Information">
              <Label>Protocol Name</Label>
              <Input value={form.name} onChange={v => update("name", v)} placeholder="e.g., HashSwap V2" />
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={e => update("description", e.target.value)}
                placeholder="Describe your protocol..."
                style={textareaStyle}
                rows={4}
              />
              <Label>Upgrade Target Contract</Label>
              <Input value={form.upgradeTarget} onChange={v => update("upgradeTarget", v)} placeholder="0x... (optional)" />
            </Step>
          )}
          {step === 2 && (
            <Step title="Governance Settings">
              <Label>Governance Token Address</Label>
              <Input value={form.governanceToken} onChange={v => update("governanceToken", v)} placeholder="0x..." />
              <Label>Proposal Threshold (tokens)</Label>
              <Input value={form.proposalThreshold} onChange={v => update("proposalThreshold", v)} placeholder="1000" />
              <Label>Quorum (basis points, 500 = 5%)</Label>
              <Input value={form.quorumBps} onChange={v => update("quorumBps", v)} placeholder="500" />
              <Label>Timelock (seconds, min 172800 = 48h)</Label>
              <Input value={form.timelockSeconds} onChange={v => update("timelockSeconds", v)} placeholder="172800" />
            </Step>
          )}
          {step === 3 && (
            <Step title="Safety Invariants">
              <p style={{ color: "#666", marginTop: 0 }}>
                Define invariants that must NEVER be violated by any upgrade. The AI will verify these before approving any change.
              </p>
              <Label>Invariant 1</Label>
              <Input value={form.invariant1} onChange={v => update("invariant1", v)} placeholder="e.g., Total debt ≤ total collateral × LTV" />
              <Label>Invariant 2 (optional)</Label>
              <Input value={form.invariant2} onChange={v => update("invariant2", v)} placeholder="e.g., Only owner can change fee parameters" />
            </Step>
          )}
          {step === 4 && (
            <Step title="Review & Submit">
              <ReviewRow label="Address" value={form.protocolAddress} />
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Token" value={form.governanceToken} />
              <ReviewRow label="Threshold" value={`${form.proposalThreshold} tokens`} />
              <ReviewRow label="Quorum" value={`${Number(form.quorumBps) / 100}%`} />
              <ReviewRow label="Timelock" value={`${Number(form.timelockSeconds) / 3600}h`} />
              {form.invariant1 && <ReviewRow label="Invariant 1" value={form.invariant1} />}
              {form.invariant2 && <ReviewRow label="Invariant 2" value={form.invariant2} />}
            </Step>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            {step > 0 ? (
              <button onClick={back} style={btnStyle("#666")}>← Back</button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button onClick={next} style={btnStyle("#0070f3")}>Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={btnStyle(submitting ? "#999" : "#28a745")}>
                {submitting ? "Submitting..." : "Register Protocol"}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, marginTop: "1rem", marginBottom: "0.3rem" }}>{children}</div>;
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.95rem", boxSizing: "border-box" }}
    />
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.5rem 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontWeight: 600, minWidth: 120, color: "#555" }}>{label}</span>
      <span style={{ color: "#333", wordBreak: "break-all" }}>{value || "—"}</span>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    padding: "0.65rem 1.5rem",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
  };
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.9rem",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: "0.95rem",
  resize: "vertical",
  boxSizing: "border-box",
};
