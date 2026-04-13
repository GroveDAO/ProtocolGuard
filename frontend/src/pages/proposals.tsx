import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

type Status =
  | "VOTING"
  | "APPROVED"
  | "REJECTED"
  | "AI_PROCESSING"
  | "SIMULATION_PASS"
  | "SIMULATION_FAIL"
  | "QUEUED"
  | "EXECUTED"
  | "CANCELLED";

interface Proposal {
  id: number;
  title: string;
  protocol: string;
  status: Status;
  votesFor: number;
  votesAgainst: number;
  votingEnd: number;
  createdAt: number;
}

const mockProposals: Proposal[] = [
  {
    id: 0,
    title: "Increase max swap fee to 0.5%",
    protocol: "HashSwap V2",
    status: "VOTING",
    votesFor: 450000,
    votesAgainst: 120000,
    votingEnd: Date.now() + 3 * 86400 * 1000,
    createdAt: Date.now() - 4 * 86400 * 1000,
  },
  {
    id: 1,
    title: "Add WBTC as collateral",
    protocol: "HashLend",
    status: "SIMULATION_PASS",
    votesFor: 700000,
    votesAgainst: 50000,
    votingEnd: Date.now() - 1 * 86400 * 1000,
    createdAt: Date.now() - 8 * 86400 * 1000,
  },
  {
    id: 2,
    title: "Lower liquidation threshold to 75%",
    protocol: "HashLend",
    status: "QUEUED",
    votesFor: 550000,
    votesAgainst: 200000,
    votingEnd: Date.now() - 3 * 86400 * 1000,
    createdAt: Date.now() - 10 * 86400 * 1000,
  },
  {
    id: 3,
    title: "Upgrade router to V3",
    protocol: "HashSwap V2",
    status: "EXECUTED",
    votesFor: 900000,
    votesAgainst: 30000,
    votingEnd: Date.now() - 10 * 86400 * 1000,
    createdAt: Date.now() - 20 * 86400 * 1000,
  },
];

const statusColors: Record<Status, { bg: string; color: string }> = {
  VOTING: { bg: "#cce5ff", color: "#004085" },
  APPROVED: { bg: "#d4edda", color: "#155724" },
  REJECTED: { bg: "#f8d7da", color: "#721c24" },
  AI_PROCESSING: { bg: "#fff3cd", color: "#856404" },
  SIMULATION_PASS: { bg: "#d4edda", color: "#155724" },
  SIMULATION_FAIL: { bg: "#f8d7da", color: "#721c24" },
  QUEUED: { bg: "#e2d9f3", color: "#432874" },
  EXECUTED: { bg: "#d1ecf1", color: "#0c5460" },
  CANCELLED: { bg: "#e2e3e5", color: "#383d41" },
};

const ALL_STATUSES: Array<Status | "ALL"> = ["ALL", "VOTING", "QUEUED", "EXECUTED", "REJECTED", "AI_PROCESSING"];

export default function Proposals() {
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");

  const filtered = mockProposals.filter(p => statusFilter === "ALL" || p.status === statusFilter);

  return (
    <>
      <Head>
        <title>Proposals — ProtocolGuard</title>
      </Head>
      <main style={{ fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ marginBottom: "1.5rem" }}>Upgrade Proposals</h1>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 20,
                border: "1px solid #ddd",
                background: statusFilter === s ? "#0070f3" : "#fff",
                color: statusFilter === s ? "#fff" : "#333",
                cursor: "pointer",
                fontWeight: statusFilter === s ? 600 : 400,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(p => {
            const total = p.votesFor + p.votesAgainst;
            const forPct = total > 0 ? (p.votesFor / total) * 100 : 0;
            const sc = statusColors[p.status];
            return (
              <Link key={p.id} href={`/proposals/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: "1.25rem 1.5rem", boxShadow: "0 2px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{p.title}</span>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: "0.75rem", padding: "0.15rem 0.6rem", borderRadius: 4, fontWeight: 600 }}>
                        {p.status.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#888" }}>
                      {p.protocol} · #{p.id}
                    </div>
                  </div>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.3rem" }}>
                      {forPct.toFixed(0)}% For · {(100 - forPct).toFixed(0)}% Against
                    </div>
                    <div style={{ background: "#f0f0f0", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ background: "#28a745", width: `${forPct}%`, height: "100%" }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", marginTop: "3rem" }}>No proposals found.</p>
        )}
      </main>
    </>
  );
}
