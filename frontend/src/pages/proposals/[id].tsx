import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import PipelineProgress from "../../components/PipelineProgress";
import VotingPanel from "../../components/VotingPanel";
import InvariantResults from "../../components/InvariantResults";
import AuditLogTimeline from "../../components/AuditLogTimeline";
import CodeDiffViewer from "../../components/CodeDiffViewer";

const MOCK_PROPOSAL = {
  id: 1,
  title: "Add WBTC as collateral",
  description:
    "This proposal adds Wrapped Bitcoin (WBTC) as an accepted collateral asset in the HashLend protocol with an initial LTV of 70% and a liquidation threshold of 80%.",
  protocol: "HashLend",
  status: "SIMULATION_PASS",
  votesFor: 700000,
  votesAgainst: 50000,
  proposer: "0xDeaD...BeeF",
  createdAt: Date.now() - 8 * 86400 * 1000,
  votingEnd: Date.now() - 1 * 86400 * 1000,
};

const MOCK_DIFF = `--- a/HashLend.sol
+++ b/HashLend.sol
@@ -45,6 +45,8 @@ contract HashLend {
     mapping(address => bool) public acceptedCollateral;
+    /// @notice Initial LTV for WBTC collateral
+    uint256 public wbtcLTV = 7000; // 70% in BPS
 
 constructor() {
     acceptedCollateral[WETH] = true;
+    acceptedCollateral[WBTC] = true;
 }`;

const MOCK_INVARIANTS = [
  { id: 0, text: "Total debt <= total collateral * LTV", verdict: "PASS" as const, riskLevel: "LOW" as const, reasoning: "WBTC addition does not change total debt calculation." },
  { id: 1, text: "Only owner can update LTV ratios", verdict: "PASS" as const, riskLevel: "LOW" as const, reasoning: "Access control modifiers remain intact." },
  { id: 2, text: "No flash loan exploits in collateral logic", verdict: "PASS" as const, riskLevel: "MEDIUM" as const, reasoning: "Same collateral check patterns applied consistently." },
];

const MOCK_AUDIT_ENTRIES = [
  { id: 0, type: "AI_GENERATION_STARTED", timestamp: Date.now() - 2 * 3600 * 1000, details: "Pipeline initiated" },
  { id: 1, type: "AI_CODE_GENERATED", timestamp: Date.now() - 2 * 3600 * 1000 + 30000, details: "Confidence: 87/100" },
  { id: 2, type: "INVARIANT_CHECK_PASSED", timestamp: Date.now() - 2 * 3600 * 1000 + 60000, details: "3/3 invariants passed" },
  { id: 3, type: "SIMULATION_STARTED", timestamp: Date.now() - 2 * 3600 * 1000 + 90000, details: "Fork simulation started" },
  { id: 4, type: "SIMULATION_PASSED", timestamp: Date.now() - 2 * 3600 * 1000 + 120000, details: "All sanity checks passed" },
];

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<"pipeline" | "diff" | "invariants" | "audit">("pipeline");

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: "pipeline", label: "Pipeline" },
    { key: "diff", label: "Code Diff" },
    { key: "invariants", label: "Invariants" },
    { key: "audit", label: "Audit Log" },
  ];

  return (
    <>
      <Head>
        <title>{MOCK_PROPOSAL.title} — ProtocolGuard</title>
      </Head>
      <main style={{ fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        <Link href="/proposals" style={{ color: "#0070f3", textDecoration: "none", fontSize: "0.9rem" }}>
          ← Back to Proposals
        </Link>

        <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h1 style={{ margin: 0 }}>{MOCK_PROPOSAL.title}</h1>
            <span style={{ background: "#d4edda", color: "#155724", padding: "0.25rem 0.75rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              {MOCK_PROPOSAL.status.replace("_", " ")}
            </span>
          </div>
          <p style={{ color: "#666", marginTop: "0.5rem" }}>{MOCK_PROPOSAL.description}</p>
          <div style={{ fontSize: "0.85rem", color: "#888" }}>
            Proposal #{id} · {MOCK_PROPOSAL.protocol} · by {MOCK_PROPOSAL.proposer}
          </div>
        </div>

        <VotingPanel
          votesFor={MOCK_PROPOSAL.votesFor}
          votesAgainst={MOCK_PROPOSAL.votesAgainst}
          votingEnd={MOCK_PROPOSAL.votingEnd}
          status={MOCK_PROPOSAL.status}
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #eee", marginTop: "2rem", marginBottom: "1.5rem" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "0.6rem 1.25rem",
                border: "none",
                background: "none",
                borderBottom: activeTab === t.key ? "2px solid #0070f3" : "2px solid transparent",
                color: activeTab === t.key ? "#0070f3" : "#555",
                fontWeight: activeTab === t.key ? 700 : 400,
                cursor: "pointer",
                fontSize: "0.95rem",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "pipeline" && <PipelineProgress status={MOCK_PROPOSAL.status} />}
        {activeTab === "diff" && <CodeDiffViewer diff={MOCK_DIFF} />}
        {activeTab === "invariants" && <InvariantResults results={MOCK_INVARIANTS} />}
        {activeTab === "audit" && <AuditLogTimeline entries={MOCK_AUDIT_ENTRIES} />}
      </main>
    </>
  );
}
