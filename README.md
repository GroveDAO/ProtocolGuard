# 🛡️ ProtocolGuard

> **AI-governed protocol upgrade engine for DeFi on HashKey Chain.**

ProtocolGuard combines token-weighted governance, Claude AI code generation, on-chain invariant verification, fork simulation, and a mandatory timelock into a single end-to-end pipeline that makes smart contract upgrades safe, auditable, and community-owned.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?logo=solidity)](https://soliditylang.org)
[![HashKey Chain](https://img.shields.io/badge/HashKey%20Chain-Testnet%20133-blue)](https://testnet.hsk.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

1. [Problem & Solution](#-problem--solution)
2. [Live Deployment — HashKey Testnet](#-live-deployment--hashkey-testnet)
3. [Architecture](#-architecture)
4. [Smart Contracts](#-smart-contracts)
5. [AI Pipeline](#-ai-pipeline)
6. [Proposal Lifecycle](#-proposal-lifecycle)
7. [Repository Structure](#-repository-structure)
8. [Quick Start](#-quick-start)
9. [Environment Variables](#-environment-variables)
10. [Deploying Contracts](#-deploying-contracts)
11. [AI Engine API](#-ai-engine-api)
12. [SDK Usage](#-sdk-usage)
13. [Frontend](#-frontend)
14. [Testing](#-testing)
15. [Security Model](#-security-model)
16. [HashKey Chain Configuration](#-hashkey-chain-configuration)
17. [Contributing](#-contributing)
18. [License](#-license)

---

## 🔑 Problem & Solution

### The Problem

DeFi protocol upgrades are one of the highest-risk operations in Web3:

- Teams rush changes under competitive pressure
- Protocol invariants break silently with no automated checks
- Timelocks are configured incorrectly or bypassed
- Audit trails are off-chain and easily lost
- Human reviewers miss subtle reentrancy and logic bugs in complex diffs

### The Solution

ProtocolGuard wraps every upgrade in a **seven-layer safety pipeline**:

| Layer | Mechanism | Guarantee |
|---|---|---|
| 1 | Token-weighted governance | Only GUARD holders with sufficient stake can propose |
| 2 | Natural-language constraints | Proposers define safety rules in plain English |
| 3 | Claude AI code generation | Minimal, targeted Solidity diffs — never overrides existing access controls |
| 4 | AI invariant verification | Every protocol invariant checked per diff before simulation |
| 5 | Fork simulation | Applied diff compiled and tested against a live state fork |
| 6 | Mandatory timelock | 48 h minimum delay for community veto window |
| 7 | On-chain audit log | Append-only permanent record of every AI decision and human action |

---

## 🚀 Live Deployment — HashKey Testnet

All contracts are deployed and verified on **HashKey Chain Testnet** (Chain ID `133`).

| Contract | Address |
|---|---|
| **GuardToken** (GUARD) | [`0x48D2311C32FECB3F36103140D26D66DffF8016d2`](https://testnet-explorer.hsk.xyz/address/0x48D2311C32FECB3F36103140D26D66DffF8016d2) |
| **ProtocolGuardRegistry** | [`0x6cf44eE0db9C7beAEBeFBcfA79c3C68a8b0f9F16`](https://testnet-explorer.hsk.xyz/address/0x6cf44eE0db9C7beAEBeFBcfA79c3C68a8b0f9F16) |
| **TimelockExecutor** | [`0x642eC9F1A7340bB607b5d065641aa3ba8A916E47`](https://testnet-explorer.hsk.xyz/address/0x642eC9F1A7340bB607b5d065641aa3ba8A916E47) |
| **UpgradeAuditLog** | [`0xd3950fAcC537EbacfE5B99A08187DBCd5892d7eE`](https://testnet-explorer.hsk.xyz/address/0xd3950fAcC537EbacfE5B99A08187DBCd5892d7eE) |
| **InvariantVault** | [`0x19a72A19785aA1b3D7011a763fD66b33Ce6BfEFD`](https://testnet-explorer.hsk.xyz/address/0x19a72A19785aA1b3D7011a763fD66b33Ce6BfEFD) |
| **UpgradeProposal** | [`0x0785bf217aD3da39aDbE61eC2fB1C94f3250C634`](https://testnet-explorer.hsk.xyz/address/0x0785bf217aD3da39aDbE61eC2fB1C94f3250C634) |
| **ProposalVoting** | [`0x32B75d3708273a71A10A19DF5595e50175704d5B`](https://testnet-explorer.hsk.xyz/address/0x32B75d3708273a71A10A19DF5595e50175704d5B) |

> **Deployer:** `0x9f2EdCE3a34e42eaf8f965d4E14aDDd12Cf865f4`  
> **Deployment file:** [`deployments/hashkeyTestnet.json`](deployments/hashkeyTestnet.json)

**Post-deployment state:**
- `UpgradeProposal` holds `GUARDIAN_ROLE` on `TimelockExecutor` — enables automatic queueing of approved upgrades
- AI engine wallet holds `AI_ENGINE_ROLE` on `UpgradeAuditLog` and `UpgradeProposal` — permits audit log writes and AI report submission
- A demo protocol has been registered at the deployer address with two invariants:
  - _"Total supply must not decrease"_
  - _"Owner address must not be zero address"_

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend  (Next.js 14)                       │
│   /         /proposals    /proposals/[id]    /register           │
│   PipelineProgress  CodeDiffViewer  VotingPanel  AuditLogTimeline│
└─────────────────────────┬────────────────────────────────────────┘
                          │  HTTP  (localhost:3000 → localhost:3001)
┌─────────────────────────▼────────────────────────────────────────┐
│               AI Engine  (Express 4 + TypeScript)                │
│                                                                  │
│  POST /api/proposals/:id/run-pipeline                            │
│    ├─ PromptBuilder      (system + user prompt assembly)         │
│    ├─ SolidityGenerator  (Claude: generate minimal diff)         │
│    ├─ InvariantChecker   (Claude: per-invariant verdict)         │
│    ├─ ForkSimulator      (patch + compile + sanity checks)       │
│    ├─ AuditLogger        (on-chain UpgradeAuditLog writes)       │
│    └─ ReportGenerator    (Markdown / HTML report)                │
└─────────────────────────┬────────────────────────────────────────┘
                          │  ethers.js  (JSON-RPC)
┌─────────────────────────▼────────────────────────────────────────┐
│          Smart Contracts  (Solidity 0.8.26, EVM: cancun)         │
│                                                                  │
│  ProtocolGuardRegistry ──►  UpgradeProposal                      │
│          │                         │                             │
│          ▼                         ▼                             │
│  InvariantVault          TimelockExecutor ──► target.call()      │
│                                                                  │
│  GuardToken (ERC20Votes)   ProposalVoting   UpgradeAuditLog      │
└──────────────────────────────────────────────────────────────────┘
                 HashKey Chain  (mainnet 177 / testnet 133)
```

### Data Flow for a Single Upgrade

```
token holder          frontend          AI engine          blockchain
     │                   │                  │                  │
     │── create proposal──►                 │                  │
     │                   │── POST /pipeline──►                 │
     │                   │                  │── generate diff──►(Claude)
     │                   │                  │◄─ diff + score───│
     │                   │                  │── check invariants►(Claude)
     │                   │                  │◄─ PASS/FAIL ─────│
     │                   │                  │── simulate diff───►(ForkSimulator)
     │                   │                  │◄─ SimulationReport│
     │                   │                  │── log entry ─────►UpgradeAuditLog
     │                   │                  │── submitAiReport─►UpgradeProposal
     │◄── pipeline result─────────────────── │                  │
     │                   │                  │                  │
     │── cast votes ──────────────────────────────────────────►UpgradeProposal
     │── queue execution ──────────────────────────────────────►TimelockExecutor
     │   (48h later)                                           │
     │── execute ──────────────────────────────────────────────►target.call()
```

---

## 📜 Smart Contracts

### `GuardToken` — `contracts/governance/GuardToken.sol`

ERC-20 governance token with on-chain vote delegation (ERC20Votes) and EIP-2612 gasless permits.

| Constant | Value |
|---|---|
| Name | ProtocolGuard Token |
| Symbol | GUARD |
| Initial supply | 100,000,000 GUARD |
| Decimals | 18 |

**Key functions:**

```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE);
function delegate(address delegatee) external;                    // ERC20Votes
function permit(address owner, address spender, ...) external;   // EIP-2612
```

---

### `ProtocolGuardRegistry` — `contracts/core/ProtocolGuardRegistry.sol`

Central on-chain directory for DeFi protocols enrolled in ProtocolGuard governance.

**Register a protocol:**

```solidity
function registerProtocol(
    address protocol,
    string calldata name,
    string calldata description,
    address governanceToken,
    uint256 proposalThreshold,   // minimum GUARD to create a proposal
    uint16  quorumBps,           // e.g. 500 = 5% quorum
    uint256 timelockSeconds      // 172800 (48h) – 2592000 (30d)
) external;
```

**Manage invariants:**

```solidity
function addInvariant(address protocol, string calldata text, string calldata sig) external returns (uint256);
function deactivateInvariant(address protocol, uint256 invariantId) external;
function getInvariants(address protocol) external view returns (Invariant[] memory);
```

**Constraints enforced on-chain:**
- `timelockSeconds` must be between `MIN_TIMELOCK` (48 h) and `MAX_TIMELOCK` (30 days)
- Quorum BPS must be 1–10000
- A protocol address can only be registered once

---

### `UpgradeProposal` — `contracts/core/UpgradeProposal.sol`

Manages the complete lifecycle of every upgrade proposal.

```solidity
// Anyone above proposalThreshold can create
function createProposal(address protocol, string title, string description, string[] constraints)
    external returns (uint256 proposalId);

// Token-weighted voting (1 GUARD = 1 vote)
function castVote(uint256 proposalId, bool support) external;

// After VOTING_DURATION (7 days), transition to APPROVED or REJECTED
function finalizeVoting(uint256 proposalId) external;

// After AI pipeline completes
function submitAiReport(uint256 proposalId, bytes32 aiReportHash, bytes32 solidityDiffHash, bytes calldata simulationResultHash) external onlyRole(AI_ENGINE_ROLE);

// Queue on TimelockExecutor
function queueExecution(uint256 proposalId) external;

// Execute after timelock
function execute(uint256 proposalId) external;

// Emergency cancellation
function cancel(uint256 proposalId, string calldata reason) external;
```

---

### `TimelockExecutor` — `contracts/core/TimelockExecutor.sol`

Queues and executes approved upgrades after a mandatory delay.

| Constant | Value |
|---|---|
| `MIN_TIMELOCK` | 172800 s (48 hours) |
| `MAX_TIMELOCK` | 2592000 s (30 days) |
| `GRACE_PERIOD` | 1209600 s (14 days) — upgrade expires if not executed |

```solidity
function queue(uint256 proposalId, address target, bytes calldata payload, uint256 eta)
    external onlyRole(GUARDIAN_ROLE);

function execute(uint256 proposalId) external;   // calls target.call(payload)
function cancel(uint256 proposalId, string calldata reason) external onlyRole(GUARDIAN_ROLE);
function isExpired(uint256 proposalId) external view returns (bool);
```

---

### `UpgradeAuditLog` — `contracts/core/UpgradeAuditLog.sol`

Append-only on-chain audit log. Once written, entries cannot be modified or deleted.

**Entry types:**

```solidity
enum LogEntryType {
    AI_GENERATION_STARTED,    // 0
    AI_CODE_GENERATED,        // 1
    INVARIANT_CHECK_PASSED,   // 2
    INVARIANT_CHECK_FAILED,   // 3
    SIMULATION_STARTED,       // 4
    SIMULATION_PASSED,        // 5
    SIMULATION_FAILED,        // 6
    HUMAN_OVERRIDE,           // 7
    EXECUTION_SUBMITTED       // 8
}
```

Each entry stores: `proposalId`, `entryType`, ABI-encoded `data`, `aiReasoningHash` (keccak256 of the full Claude reasoning), `timestamp`, `blockNumber`.

---

### `InvariantVault` — `contracts/core/InvariantVault.sol`

Stores keccak256 hashes of invariant texts on-chain so they cannot be silently changed after registration.

```solidity
function storeInvariantHash(address protocol, uint256 invariantId, bytes32 hash)
    external onlyRole(REGISTRY_ROLE);

function verifyInvariant(address protocol, uint256 invariantId, string calldata text)
    external view returns (bool);      // keccak256(text) == stored hash
```

---

### `ProposalVoting` — `contracts/governance/ProposalVoting.sol`

Utility contract for querying token-weighted voting power.

```solidity
function getVotingWeight(address voter, address token) external view returns (uint256);
function hasVotingPower(address voter, address token, uint256 threshold) external view returns (bool);
function getDefaultVotingWeight(address voter) external view returns (uint256);
```

---

## 🤖 AI Pipeline

The AI engine (`ai-engine/`) orchestrates a multi-step pipeline powered by **Anthropic Claude** (`claude-opus-4-5`).

### Pipeline Steps (`UpgradePipeline.ts`)

```
1. FETCHING_CONTEXT    → Gather proposal details, invariants, current source
2. GENERATING_CODE     → Claude generates unified diff
3. CHECKING_INVARIANTS → Claude validates each invariant against the diff
4. SIMULATING          → ForkSimulator applies patch, runs sanity checks
5. LOGGING             → AuditLogger writes entries to UpgradeAuditLog
6. REPORTING           → ReportGenerator produces Markdown + HTML reports
7. COMPLETE / FAILED
```

### 1. Solidity Code Generation (`SolidityGenerator.ts`)

Claude receives the full protocol source, invariant list, and upgrade description. It is strictly prompted to:

- Generate only a **minimal unified diff** — no large rewrites
- Never remove access control modifiers
- Never introduce storage collisions or reentrancy
- Return structured JSON: `{ diff, changedFunctions, newVariables, reasoning, confidence, warnings }`
- Score its own confidence from 0–100; the pipeline rejects scores below **60**

The generator retries up to **3 times** with exponential back-off if parsing fails or confidence is too low.

### 2. Invariant Checking (`InvariantChecker.ts`)

For each registered invariant, Claude returns:

```json
{
  "invariantId": 0,
  "invariantText": "Total supply must not decrease",
  "verdict": "PASS",
  "riskLevel": "LOW",
  "reasoning": "The diff does not touch the _mint or _burn paths..."
}
```

Verdicts: `PASS` | `FAIL` | `UNCERTAIN`  
Risk levels: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

Any `FAIL` or `CRITICAL` result aborts the pipeline before simulation.

### 3. Fork Simulation (`ForkSimulator.ts`)

1. Writes current source to a temp directory
2. Applies the diff via system `patch`
3. Runs structural sanity checks (storage layout, function selectors, inherited functions)
4. Runs `InvariantRunner` (static assertions on the patched code)
5. Cleans up temp directory

### 4. Report Generation (`ReportGenerator.ts`)

Produces a human-readable Markdown/HTML report containing:
- Executive summary (PASS / FAIL)
- Per-invariant results with AI reasoning
- Simulation sanity check results
- State diff before/after
- AI confidence and warnings
- Links to on-chain audit log entries

---

## 📋 Proposal Lifecycle

```
                        ┌─────────────────────────────┐
                        │         DRAFT (unused)       │
                        └───────────────┬─────────────┘
                                        │ createProposal()
                        ┌───────────────▼─────────────┐
                        │           VOTING             │  7 days
                        └────────┬──────────┬──────────┘
                   finalizeVoting│           │finalizeVoting
                      (approved) │           │ (rejected)
              ┌──────────────────▼─┐   ┌────▼──────────┐
              │     APPROVED       │   │   REJECTED     │
              └────────┬───────────┘   └───────────────┘
                       │ submitAiReport (AI engine)
          ┌────────────▼────────────────────────────┐
          │           AI_PROCESSING                  │
          └──────────┬──────────────────┬────────────┘
          (success)  │                  │ (invariant/simulation fail)
  ┌────────────────▼──┐          ┌──────▼─────────────────┐
  │  SIMULATION_PASS  │          │   SIMULATION_FAIL       │
  └─────────┬─────────┘          └────────────────────────┘
            │ queueExecution()
  ┌─────────▼─────────┐
  │      QUEUED        │  48h+ timelock
  └─────────┬─────────┘
            │ execute()
  ┌─────────▼─────────┐
  │     EXECUTED       │
  └───────────────────┘

  Any state → CANCELLED  (proposer or admin)
```

---

## 📁 Repository Structure

```
ProtocolGuard/
├── contracts/
│   ├── core/
│   │   ├── InvariantVault.sol          # Keccak hash store for invariants
│   │   ├── ProtocolGuardRegistry.sol   # Protocol directory + invariant registry
│   │   ├── TimelockExecutor.sol        # 48-hour mandatory delay executor
│   │   ├── UpgradeAuditLog.sol         # Append-only on-chain audit log
│   │   └── UpgradeProposal.sol         # Proposal lifecycle manager
│   ├── governance/
│   │   ├── GuardToken.sol              # ERC20Votes governance token (GUARD)
│   │   └── ProposalVoting.sol          # Voting weight resolver
│   └── interfaces/
│       ├── IProtocolGuardRegistry.sol
│       ├── ITimelockExecutor.sol
│       └── IUpgradeProposal.sol
│
├── ai-engine/
│   └── src/
│       ├── api/
│       │   ├── server.ts               # Express app entry point (port 3001)
│       │   └── routes/proposals.ts     # REST routes for pipeline
│       ├── codegen/
│       │   ├── InvariantChecker.ts     # Per-invariant Claude analysis
│       │   ├── PromptBuilder.ts        # System + user prompt construction
│       │   └── SolidityGenerator.ts    # Claude Solidity diff generation
│       ├── pipeline/
│       │   ├── PipelineState.ts        # State machine (7 states)
│       │   └── UpgradePipeline.ts      # Orchestrates all pipeline steps
│       ├── simulation/
│       │   ├── ForkSimulator.ts        # Patch + compile + sanity checks
│       │   ├── InvariantRunner.ts      # Static invariant assertions
│       │   └── SimulationReport.ts     # Report data types
│       ├── audit/
│       │   ├── AuditLogger.ts          # Writes entries to UpgradeAuditLog
│       │   └── ReportGenerator.ts      # Produces Markdown/HTML reports
│       └── utils/logger.ts             # Structured console logger
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── index.tsx               # Landing page
│       │   ├── proposals.tsx           # Proposal list
│       │   ├── proposals/[id].tsx      # Proposal detail + pipeline status
│       │   ├── protocols.tsx           # Registered protocols list
│       │   └── register.tsx            # Register new protocol
│       ├── components/
│       │   ├── AuditLogTimeline.tsx    # Visual audit trail
│       │   ├── CodeDiffViewer.tsx      # Syntax-highlighted diff viewer
│       │   ├── InvariantResults.tsx    # Per-invariant verdict cards
│       │   ├── PipelineProgress.tsx    # Step-by-step pipeline progress
│       │   └── VotingPanel.tsx         # Cast vote + live tally
│       └── hooks/
│           ├── useProposalPipeline.ts  # Pipeline polling hook
│           └── useVoting.ts            # Vote submission hook
│
├── sdk/
│   └── src/
│       ├── ProtocolGuardClient.ts      # Typed contract wrapper
│       ├── ProposalBuilder.ts          # Fluent proposal builder
│       └── index.ts                    # Public exports
│
├── scripts/
│   ├── deploy.ts                       # Full deployment + role grants
│   └── register-protocol.ts           # Register a new protocol via CLI
│
├── test/
│   └── UpgradeProposal.test.ts        # Hardhat unit + integration tests
│
├── deployments/
│   └── hashkeyTestnet.json            # Live contract addresses
│
├── hardhat.config.ts
├── tsconfig.json
└── .env
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (workspaces support)
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
- **HSK** for gas on HashKey Chain — [get testnet HSK](https://faucet.hsk.xyz)

### 1. Clone & install

```bash
git clone https://github.com/your-org/ProtocolGuard.git
cd ProtocolGuard
npm install                   # installs root + all workspaces
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — minimum required fields:

```env
DEPLOYER_PRIVATE_KEY=0x...
AI_ENGINE_PRIVATE_KEY=0x...     # can be same wallet as deployer on testnet
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Compile contracts

```bash
npm run compile
# → Compiled 41 Solidity files successfully (evm target: cancun)
```

### 4. Run tests

```bash
npm test
```

### 5. Deploy (contracts already live on testnet — see above)

```bash
npm run deploy:testnet     # HashKey Testnet (chain 133)
npm run deploy:mainnet     # HashKey Mainnet (chain 177)
```

### 6. Start the AI Engine

```bash
cd ai-engine && npm run dev
# Listening on http://localhost:3001
```

### 7. Start the Frontend

```bash
cd frontend && npm run dev
# Open http://localhost:3000
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | ✅ | Wallet used to deploy contracts and pay gas |
| `AI_ENGINE_PRIVATE_KEY` | ✅ | Wallet granted `AI_ENGINE_ROLE` for on-chain writes |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for Claude code generation |
| `HASHKEY_TESTNET_RPC` | — | Testnet RPC (default: `https://testnet.hsk.xyz`) |
| `HASHKEY_MAINNET_RPC` | — | Mainnet RPC (default: `https://mainnet.hsk.xyz`) |
| `DATABASE_URL` | — | PostgreSQL connection string (optional off-chain storage) |
| `FORK_RPC_URL` | — | RPC for fork simulation (default: mainnet) |
| `SIMULATION_TEMP_DIR` | — | Temp dir for simulation artifacts (default: `./sim-tmp`) |
| `PORT` | — | AI Engine HTTP port (default: `3001`) |
| `PROTOCOL_GUARD_REGISTRY_ADDRESS` | — | Auto-populated after deploy |
| `UPGRADE_PROPOSAL_ADDRESS` | — | Auto-populated after deploy |
| `TIMELOCK_EXECUTOR_ADDRESS` | — | Auto-populated after deploy |
| `AUDIT_LOG_ADDRESS` | — | Auto-populated after deploy |
| `INVARIANT_VAULT_ADDRESS` | — | Auto-populated after deploy |
| `GUARD_TOKEN_ADDRESS` | — | Auto-populated after deploy |
| `PROPOSAL_VOTING_ADDRESS` | — | Auto-populated after deploy |
| `NEXT_PUBLIC_*` | — | Mirror of contract addresses for the Next.js frontend |

---

## 🛠️ Deploying Contracts

The deploy script (`scripts/deploy.ts`) performs the following in one transaction sequence:

1. Deploy `GuardToken` — mints 100 M GUARD to deployer
2. Deploy `ProtocolGuardRegistry`
3. Deploy `TimelockExecutor`
4. Deploy `UpgradeAuditLog`
5. Deploy `InvariantVault`
6. Deploy `UpgradeProposal(registry, timelock)`
7. Deploy `ProposalVoting(guardToken)`
8. Grant `GUARDIAN_ROLE` on TimelockExecutor → UpgradeProposal
9. Grant `AI_ENGINE_ROLE` on AuditLog + UpgradeProposal → AI engine wallet
10. Register a demo protocol with two example invariants
11. Save all addresses to `deployments/<network>.json`

```bash
npm run deploy:testnet
# Saves to deployments/hashkeyTestnet.json
```

To register an additional protocol via CLI:

```bash
npx ts-node scripts/register-protocol.ts \
  --name "My DeFi Protocol" \
  --description "Description..." \
  --protocol 0xYourProtocolAddress \
  --token 0xYourGovernanceToken \
  --threshold 1000000000000000000000 \
  --quorum 500 \
  --timelock 172800 \
  --network hashkeyTestnet
```

---

## 🌐 AI Engine API

Base URL: `http://localhost:3001`

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-04-15T00:00:00.000Z" }
```

### `POST /api/proposals/:id/run-pipeline`

Trigger the full AI pipeline for a proposal.

**Request body:**
```json
{
  "protocolAddress": "0x...",
  "protocolName": "My DeFi Protocol",
  "currentSourceCode": "// SPDX-License-Identifier: MIT\n...",
  "currentStateValues": { "totalSupply": "1000000", "owner": "0x..." },
  "invariants": [
    { "id": 0, "text": "Total supply must not decrease", "testFunctionSig": "invariant_totalSupplyNotDecrease()" }
  ],
  "networkId": 133,
  "compilerVersion": "0.8.26"
}
```

**Response (success):**
```json
{
  "success": true,
  "diff": "--- a/Contract.sol\n+++ b/Contract.sol\n...",
  "diffHash": "0xabc...",
  "reportHash": "0xdef...",
  "simulationReport": { "passed": true, "sanityChecks": [...] },
  "invariantResults": [
    { "invariantId": 0, "verdict": "PASS", "riskLevel": "LOW", "reasoning": "..." }
  ],
  "reasoning": "The change adds a cap on...",
  "warnings": [],
  "report": "# ProtocolGuard Upgrade Report\n..."
}
```

### `GET /api/proposals/:id/status`

Returns the current pipeline state machine status for a proposal.

### `GET /api/proposals/:id/report`

Returns the full Markdown/HTML report for a completed pipeline run.

---

## 📦 SDK Usage

Install the SDK in your project:

```bash
npm install ./sdk       # local workspace reference
# or publish to npm and: npm install @protocolguard/sdk
```

### Basic Setup

```typescript
import { ethers } from "ethers";
import { ProtocolGuardClient } from "@protocolguard/sdk";

const provider = new ethers.JsonRpcProvider("https://testnet.hsk.xyz");
const signer   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ProtocolGuardClient({
  registryAddress:  "0x6cf44eE0db9C7beAEBeFBcfA79c3C68a8b0f9F16",
  proposalAddress:  "0x0785bf217aD3da39aDbE61eC2fB1C94f3250C634",
  auditLogAddress:  "0xd3950fAcC537EbacfE5B99A08187DBCd5892d7eE",
  signerOrProvider: signer,
});
```

### Register a Protocol

```typescript
const tx = await client.registerProtocol(
  "0xYourProtocolAddress",       // protocol
  "My DeFi Protocol",            // name
  "A yield aggregator protocol", // description
  "0xYourGovernanceToken",       // governance token
  ethers.parseEther("1000"),     // 1000 GUARD proposal threshold
  500,                           // 5% quorum (BPS)
  172800                         // 48h timelock
);
await tx.wait();
```

### Create & Vote on a Proposal

```typescript
// Create
const proposalId = await client.createProposal(
  "0xYourProtocolAddress",
  "Add withdrawal rate limiter",
  "Cap hourly withdrawals at 10% of total TVL to prevent drain attacks",
  ["TVL must never decrease by more than 10% per hour"]
);

// Vote
await (await client.castVote(proposalId, true)).wait();   // support
await (await client.castVote(proposalId, false)).wait();  // against
```

### Fluent Proposal Builder

```typescript
import { ProposalBuilder } from "@protocolguard/sdk";

const tx = await new ProposalBuilder(client)
  .forProtocol("0xYourProtocolAddress")
  .withTitle("Add withdrawal rate limiter")
  .withDescription("Cap hourly withdrawals at 10% of total TVL...")
  .withConstraint("TVL must never decrease by more than 10% per hour")
  .withConstraint("Owner address must remain non-zero")
  .submit();
```

### Read Audit Log

```typescript
const entries = await client.getAuditEntries(proposalId);
entries.forEach(e => {
  console.log(e.entryType, new Date(Number(e.timestamp) * 1000).toISOString());
});
```

---

## 🖥️ Frontend

The Next.js frontend lives in `frontend/` and runs on port 3000.

### Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, feature highlights, how-it-works |
| `/protocols` | List of all registered protocols |
| `/register` | Register a new protocol (requires wallet) |
| `/proposals` | All active and past proposals |
| `/proposals/[id]` | Proposal detail: pipeline progress, diff viewer, voting panel, audit log |

### Key Components

| Component | Description |
|---|---|
| `PipelineProgress` | Step-by-step visual display of the AI pipeline state |
| `CodeDiffViewer` | Syntax-highlighted unified diff viewer |
| `InvariantResults` | Per-invariant verdict cards with color-coded risk levels |
| `VotingPanel` | Cast vote, view live tally, token balance check |
| `AuditLogTimeline` | Scrollable timeline of on-chain audit log entries |

### Configuration

The frontend reads contract addresses and chain from environment variables prefixed with `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_REGISTRY_ADDRESS=0x6cf44eE0db9C7beAEBeFBcfA79c3C68a8b0f9F16
NEXT_PUBLIC_PROPOSAL_ADDRESS=0x0785bf217aD3da39aDbE61eC2fB1C94f3250C634
NEXT_PUBLIC_TIMELOCK_ADDRESS=0x642eC9F1A7340bB607b5d065641aa3ba8A916E47
NEXT_PUBLIC_AUDIT_LOG_ADDRESS=0xd3950fAcC537EbacfE5B99A08187DBCd5892d7eE
NEXT_PUBLIC_CHAIN_ID=133
NEXT_PUBLIC_RPC_URL=https://testnet.hsk.xyz
```

---

## 🧪 Testing

```bash
# All tests (Hardhat)
npm test

# With gas report
REPORT_GAS=true npm test

# Coverage
npx hardhat coverage
```

`test/UpgradeProposal.test.ts` covers:

- Protocol registration and invariant management
- Proposal creation (threshold checks, duplicate guards)
- Full voting lifecycle (for / against / quorum)
- `finalizeVoting` for both approved and rejected outcomes
- AI report submission (role-gated)
- Timelock queue + execute + cancel + expiry
- Role-based access control on all privileged functions
- Edge cases: zero addresses, empty titles, invalid timelock durations

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
| `REGISTRY_ROLE` | Deployer | Write invariant hashes to InvariantVault |

### Safety Properties

1. **Timelock is non-bypassable** — `TimelockExecutor.execute()` enforces `block.timestamp >= eta`; no role can skip it
2. **Upgrade expiry** — An upgrade queued but not executed within 14 days post-eta is permanently expired via `GRACE_PERIOD`
3. **AI confidence gate** — The pipeline refuses to submit diffs with AI confidence < 60/100
4. **Invariant hard rejection** — Any `FAIL` or `CRITICAL` invariant verdict aborts the pipeline before on-chain state changes
5. **Append-only audit log** — `UpgradeAuditLog` has no delete or update functions; entries are immutable once written
6. **Immutable invariant hashes** — `InvariantVault` stores keccak256 hashes; invariant texts cannot be silently changed after registration
7. **Quorum protection** — Proposals require configurable minimum token participation to pass
8. **Proposal threshold** — Creating proposals requires holding `proposalThreshold` GUARD, preventing spam

### Known Limitations

- The AI engine wallet (`AI_ENGINE_ROLE`) is a hot wallet; for production, consider a multi-sig or TEE
- Fork simulation patches source files locally — it does not execute bytecode against a live fork
- The `execute()` function in `UpgradeProposal` calls `target.call(payload)` — the target contract must be explicitly allowlisted in the registry via `setUpgradeTarget()`

---

## 🌐 HashKey Chain Configuration

| Network | Chain ID | RPC Endpoint | Explorer |
|---|---|---|---|
| **Mainnet** | `177` | `https://mainnet.hsk.xyz` | `https://explorer.hsk.xyz` |
| **Testnet** | `133` | `https://testnet.hsk.xyz` | `https://testnet-explorer.hsk.xyz` |

**Add to MetaMask (Testnet):**

```
Network name:  HashKey Chain Testnet
RPC URL:       https://testnet.hsk.xyz
Chain ID:      133
Currency:      HSK
Explorer:      https://testnet-explorer.hsk.xyz
```

**Get testnet HSK:** [https://faucet.hsk.xyz](https://faucet.hsk.xyz)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run `npm test` and ensure all tests pass
5. Open a pull request with a clear description

### Code Style

- Solidity: follow existing NatSpec comments; all public functions must have `@notice`
- TypeScript: strict mode enabled; no `any` unless truly necessary
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, `test:`)

---

## 📄 License

MIT — see [LICENSE](LICENSE)

