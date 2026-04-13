import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

interface Protocol {
  address: string;
  name: string;
  description: string;
  totalProposals: number;
  executedUpgrades: number;
  active: boolean;
}

// Mock data — in production this would come from the registry contract
const mockProtocols: Protocol[] = [
  {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    name: "HashSwap V2",
    description: "Decentralized exchange protocol on HashKey Chain",
    totalProposals: 12,
    executedUpgrades: 4,
    active: true,
  },
  {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    name: "HashLend",
    description: "Lending and borrowing protocol",
    totalProposals: 7,
    executedUpgrades: 2,
    active: true,
  },
];

export default function Protocols() {
  const [filter, setFilter] = useState("");

  const filtered = mockProtocols.filter(
    p => p.name.toLowerCase().includes(filter.toLowerCase()) ||
         p.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Protocols — ProtocolGuard</title>
      </Head>
      <main style={{ fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0 }}>Registered Protocols</h1>
          <Link
            href="/register"
            style={{ background: "#0070f3", color: "#fff", padding: "0.6rem 1.5rem", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}
          >
            + Register New
          </Link>
        </div>

        <input
          placeholder="Search protocols..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 8, border: "1px solid #ddd", fontSize: "1rem", marginBottom: "1.5rem", boxSizing: "border-box" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {filtered.map(p => (
            <div key={p.address} style={{ border: "1px solid #eee", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <span style={{ background: p.active ? "#d4edda" : "#f8d7da", color: p.active ? "#155724" : "#721c24", padding: "0.2rem 0.6rem", borderRadius: 4, fontSize: "0.8rem" }}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p style={{ color: "#666", margin: "0.5rem 0 1rem", fontSize: "0.9rem" }}>{p.description}</p>
              <code style={{ fontSize: "0.75rem", color: "#888", display: "block", marginBottom: "1rem" }}>
                {p.address.slice(0, 10)}...{p.address.slice(-8)}
              </code>
              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem", color: "#555" }}>
                <span>📋 {p.totalProposals} proposals</span>
                <span>✅ {p.executedUpgrades} upgrades</span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", marginTop: "3rem" }}>No protocols found.</p>
        )}
      </main>
    </>
  );
}
