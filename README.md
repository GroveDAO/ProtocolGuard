# 🛡️ ProtocolGuard

**Production-grade AI-governed protocol upgrade engine for DeFi on HashKey Chain.**

ProtocolGuard uses Claude AI to automatically generate, verify, and safely execute smart contract upgrades — governed by token holders, guarded by on-chain invariants, and recorded in a permanent audit trail.

---

## 🔑 The Problem

DeFi protocol upgrades are dangerous. Teams rush changes, invariants break silently, timelocks are bypassed, and audit trails are lost. Even well-intentioned upgrades introduce critical bugs.

## ✨ The Solution

ProtocolGuard wraps every upgrade in a multi-layered safety pipeline:

1. **Token-weighted governance** — GUARD holders propose and vote on changes in natural language
2. **AI Code Generation** — Claude AI generates minimal, safe Solidity diffs automatically
3. **Invariant Verification** — AI checks that all protocol safety invariants remain satisfied
4. **Fork Simulation** — Changes are tested in an isolated simulation before queuing
5. **Mandatory Timelock** — 48h–30 day window for community review and emergency vetoes
6. **On-chain Audit Log** — Every AI decision, vote, and simulation result recorded permanently

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  Proposals · Voting · Pipeline Progress · Audit Log     │
└───────────────────┬─────────────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────────────┐
│                AI Engine (Express + TypeScript)          │
│  PromptBuilder → SolidityGenerator → InvariantChecker   │
│  ForkSimulator → AuditLogger → ReportGenerator          │
└───────────────────┬─────────────────────────────────────┘
                    │ ethers.js
┌───────────────────▼─────────────────────────────────────┐
│               Smart Contracts (Solidity 0.8.20)          │
│                                                         │
│  ProtocolGuardRegistry   UpgradeProposal                │
│  TimelockExecutor        UpgradeAuditLog                │
│  InvariantVault          GuardToken (ERC20Votes)        │
└─────────────────────────────────────────────────────────┘
         HashKey Chain (mainnet 177 / testnet 133)
```

### Contract Roles

| Contract | Role | Purpose |
|---|---|---|
| `ProtocolGuardRegistry` | Central directory | Stores protocol configs, invariants, upgrade targets |
| `UpgradeProposal` | Lifecycle manager | Proposal creation, voting, status transitions |
| `TimelockExecutor` | Safety layer | Queues and executes upgrades after mandatory delay |
| `UpgradeAuditLog` | Immutable log | Append-only record of every AI decision |
| `InvariantVault` | Hash store | Stores keccak256 hashes of protocol invariants |
| `GuardToken` | Governance token | ERC20Votes token for weighted voting |

---

## 🤖 How Claude AI Is Used

ProtocolGuard uses the **Anthropic Claude API** (`claude-opus-4-5`) for two critical tasks:

### 1. Solidity Code Generation (`SolidityGenerator.ts`)

Given a natural-language upgrade proposal, Claude generates a minimal unified diff:

```typescript
const result = await anthropic.messages.create({
  model: "claude-opus-4-5",
  system: promptBuilder.buildCodegenSystemPrompt(protocolContext), // includes current source, invariants
  messages: [{ role: "user", content: promptBuilder.buildCodegenUserPrompt(proposal) }]
});
// Returns: { diff, changedFunctions, reasoning, confidence, warnings }
```

Claude is instructed to:
- Make ONLY minimal changes necessary
- Never remove access controls
- Never introduce reentrancy
- Return structured JSON with a confidence score (0–100)
- Refuse if the change cannot be safely implemented

### 2. Invariant Checking (`InvariantChecker.ts`)

Claude analyzes the generated diff against each protocol invariant:

```typescript
// Returns per-invariant: { verdict: "PASS"|"FAIL"|"UNCERTAIN", riskLevel, reasoning }
```

If any invariant has `FAIL` or `CRITICAL` risk, the upgrade is rejected before simulation.

---

## 📁 Repository Structure

```
contracts/
├── core/          # Registry, Proposals, Timelock, AuditLog, InvariantVault
├── governance/    # GuardToken (ERC20Votes), ProposalVoting
└── interfaces/    # IUpgradeProposal, IProtocolGuardRegistry, ITimelockExecutor

ai-engine/src/
├── codegen/       # SolidityGenerator, InvariantChecker, PromptBuilder
├── simulation/    # ForkSimulator, InvariantRunner, SimulationReport
├── pipeline/      # UpgradePipeline (orchestrator), PipelineState
├── audit/         # AuditLogger (on-chain), ReportGenerator (Markdown/HTML)
└── api/           # Express REST API

frontend/src/
├── pages/         # index, protocols, proposals, proposals/[id], register
├── components/    # PipelineProgress, CodeDiffViewer, InvariantResults, VotingPanel, AuditLogTimeline
└── hooks/         # useProposalPipeline, useVoting

sdk/src/           # ProtocolGuardClient, ProposalBuilder
scripts/           # deploy.ts, register-protocol.ts
test/              # UpgradeProposal.test.ts (unit + integration)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- An Anthropic API key
- A wallet with HSK for gas (HashKey Chain)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: DEPLOYER_PRIVATE_KEY, ANTHROPIC_API_KEY, AI_ENGINE_PRIVATE_KEY
```

### 3. Compile contracts

```bash
npm run compile
```

### 4. Run tests

```bash
npm test
```

### 5. Deploy to HashKey Testnet

```bash
npm run deploy:testnet
```

### 6. Start the AI Engine

```bash
cd ai-engine && npm install && npm run dev
```

### 7. Start the Frontend

```bash
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

---

## 🔐 Security Model

### Access Control Roles

| Role | Holder | Capabilities |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Deployer | Grant/revoke all roles |
| `REGISTRY_ADMIN_ROLE` | Deployer | Global registry management |
| `AI_ENGINE_ROLE` | AI Engine wallet | Submit AI reports, write audit log |
| `GUARDIAN_ROLE` | UpgradeProposal contract | Queue and cancel timelock transactions |
| `MINTER_ROLE` | Deployer | Mint new GUARD tokens |

### Safety Guarantees

1. **Timelock**: All upgrades wait minimum 48 hours (configurable up to 30 days)
2. **Quorum**: Minimum token participation required (configurable per protocol)
3. **Invariant checks**: AI verifies protocol safety rules before every upgrade
4. **Simulation**: Fork simulation catches runtime failures before on-chain execution
5. **Append-only audit log**: AI decisions cannot be tampered with post-hoc
6. **Confidence threshold**: AI refuses to generate code with confidence < 60/100

---

## 📋 Proposal Lifecycle

```
DRAFT (unused) → VOTING → APPROVED → AI_PROCESSING
                    └──→ REJECTED
                                        ↓
                              SIMULATION_PASS / SIMULATION_FAIL
                                        ↓
                                     QUEUED
                                        ↓ (after timelock)
                                    EXECUTED
                    
Any state → CANCELLED (by proposer or admin)
```

---

## 🌐 HashKey Chain Configuration

| Network | Chain ID | RPC |
|---|---|---|
| Mainnet | 177 | https://mainnet.hsk.xyz |
| Testnet | 133 | https://testnet.hsk.xyz |

---

## 📄 License

MIT

