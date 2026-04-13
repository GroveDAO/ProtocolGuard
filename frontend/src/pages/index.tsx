import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>ProtocolGuard — AI-Governed Protocol Upgrades</title>
        <meta
          name="description"
          content="Production-grade AI-governed protocol upgrade engine for DeFi protocols on HashKey Chain"
        />
      </Head>

      <main style={{ fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        {/* Hero */}
        <section style={{ textAlign: "center", padding: "5rem 0 3rem" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 800, margin: 0 }}>
            🛡️ ProtocolGuard
          </h1>
          <p style={{ fontSize: "1.4rem", color: "#555", marginTop: "1rem", maxWidth: 700, margin: "1rem auto" }}>
            AI-governed protocol upgrade engine for DeFi on HashKey Chain.
            Generate, verify, and execute safe upgrades with on-chain audit trails.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
            <Link href="/proposals" style={btnStyle("#0070f3")}>
              View Proposals
            </Link>
            <Link href="/register" style={btnStyle("#333")}>
              Register Protocol
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "3rem" }}>
          {features.map(f => (
            <div key={f.title} style={cardStyle}>
              <div style={{ fontSize: "2.5rem" }}>{f.icon}</div>
              <h3 style={{ margin: "0.75rem 0 0.5rem" }}>{f.title}</h3>
              <p style={{ color: "#555", margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        {/* How It Works */}
        <section style={{ marginTop: "4rem" }}>
          <h2 style={{ textAlign: "center" }}>How It Works</h2>
          <ol style={{ maxWidth: 700, margin: "1.5rem auto", lineHeight: 2 }}>
            <li>Protocol admin registers protocol & defines safety invariants</li>
            <li>Token holders create and vote on upgrade proposals</li>
            <li>Claude AI generates minimal Solidity diffs automatically</li>
            <li>AI verifies all invariants remain satisfied</li>
            <li>Fork simulation validates the change in a safe environment</li>
            <li>After mandatory timelock, upgrade is executed on-chain</li>
            <li>Every decision is recorded in the on-chain audit log</li>
          </ol>
        </section>
      </main>
    </>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI Code Generation",
    desc: "Claude AI generates minimal, safe Solidity diffs from natural-language proposals.",
  },
  {
    icon: "🔒",
    title: "Invariant Verification",
    desc: "Protocol-defined safety invariants are automatically checked before any upgrade.",
  },
  {
    icon: "🧪",
    title: "Fork Simulation",
    desc: "Every upgrade is simulated on a forked network before queuing for execution.",
  },
  {
    icon: "⏱️",
    title: "Timelock Protection",
    desc: "Mandatory 48h–30d timelocks give communities time to review and react.",
  },
  {
    icon: "📋",
    title: "On-Chain Audit Log",
    desc: "Every AI decision, simulation result, and vote is permanently recorded on-chain.",
  },
  {
    icon: "🗳️",
    title: "Token Governance",
    desc: "Token-weighted voting ensures the community controls every upgrade.",
  },
];

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    padding: "0.75rem 2rem",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  };
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};
