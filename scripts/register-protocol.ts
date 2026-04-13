import { ethers } from "ethers";

/**
 * Script to register a new protocol with ProtocolGuard.
 * 
 * Usage:
 *   npx hardhat run scripts/register-protocol.ts --network hashkeyTestnet
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY, HASHKEY_TESTNET_RPC (or MAINNET)
 *   PROTOCOL_GUARD_REGISTRY_ADDRESS
 */

const REGISTRY_ABI = [
  "function registerProtocol(address protocol, string name, string description, address governanceToken, uint256 proposalThreshold, uint16 quorumBps, uint256 timelockSeconds) external",
  "function addInvariant(address protocol, string invariantText, string testFunctionSig) external returns (uint256)",
  "function setUpgradeTarget(address protocol, address targetContract, bool canUpgrade) external",
  "function isRegistered(address protocol) external view returns (bool)",
];

async function main() {
  const hre = require("hardhat");
  const [deployer] = await hre.ethers.getSigners();

  const registryAddress = process.env.PROTOCOL_GUARD_REGISTRY_ADDRESS;
  if (!registryAddress) throw new Error("PROTOCOL_GUARD_REGISTRY_ADDRESS not set");

  const registry = new hre.ethers.Contract(registryAddress, REGISTRY_ABI, deployer);

  // ── Configure your protocol here ──────────────────────────────────────────
  const PROTOCOL_ADDRESS = process.env.PROTOCOL_ADDRESS ?? deployer.address;
  const PROTOCOL_NAME = process.env.PROTOCOL_NAME ?? "My DeFi Protocol";
  const PROTOCOL_DESCRIPTION = process.env.PROTOCOL_DESCRIPTION ?? "A DeFi protocol on HashKey Chain";
  const GOVERNANCE_TOKEN = process.env.GOVERNANCE_TOKEN_ADDRESS ?? "";
  const PROPOSAL_THRESHOLD = ethers.parseEther(process.env.PROPOSAL_THRESHOLD ?? "1000");
  const QUORUM_BPS = parseInt(process.env.QUORUM_BPS ?? "500"); // 5%
  const TIMELOCK_SECONDS = parseInt(process.env.TIMELOCK_SECONDS ?? "172800"); // 48h

  const INVARIANTS: Array<{ text: string; sig: string }> = [
    { text: "Total supply must never decrease", sig: "invariant_totalSupplyNeverDecreases()" },
    { text: "Owner address must not be zero", sig: "invariant_ownerNotZero()" },
  ];

  const UPGRADE_TARGETS: string[] = process.env.UPGRADE_TARGET
    ? [process.env.UPGRADE_TARGET]
    : [];
  // ──────────────────────────────────────────────────────────────────────────

  if (!GOVERNANCE_TOKEN) throw new Error("GOVERNANCE_TOKEN_ADDRESS not set");

  console.log(`Registering protocol: ${PROTOCOL_NAME}`);
  console.log(`  Address:          ${PROTOCOL_ADDRESS}`);
  console.log(`  Governance token: ${GOVERNANCE_TOKEN}`);
  console.log(`  Quorum:           ${QUORUM_BPS / 100}%`);
  console.log(`  Timelock:         ${TIMELOCK_SECONDS / 3600}h`);

  const alreadyRegistered = await registry.isRegistered(PROTOCOL_ADDRESS);
  if (alreadyRegistered) {
    console.log("Protocol already registered. Skipping registration.");
  } else {
    const tx = await registry.registerProtocol(
      PROTOCOL_ADDRESS,
      PROTOCOL_NAME,
      PROTOCOL_DESCRIPTION,
      GOVERNANCE_TOKEN,
      PROPOSAL_THRESHOLD,
      QUORUM_BPS,
      TIMELOCK_SECONDS
    );
    await tx.wait();
    console.log("✅ Protocol registered. tx:", tx.hash);
  }

  // Add invariants
  for (const inv of INVARIANTS) {
    const tx = await registry.addInvariant(PROTOCOL_ADDRESS, inv.text, inv.sig);
    await tx.wait();
    console.log(`✅ Invariant added: "${inv.text}"`);
  }

  // Set upgrade targets
  for (const target of UPGRADE_TARGETS) {
    const tx = await registry.setUpgradeTarget(PROTOCOL_ADDRESS, target, true);
    await tx.wait();
    console.log(`✅ Upgrade target set: ${target}`);
  }

  console.log("\nProtocol registration complete!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
