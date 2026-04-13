import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const hre: HardhatRuntimeEnvironment = require("hardhat");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "HSK");

  // 1. Deploy GuardToken
  console.log("\n1. Deploying GuardToken...");
  const GuardToken = await hre.ethers.getContractFactory("GuardToken");
  const guardToken = await GuardToken.deploy();
  await guardToken.waitForDeployment();
  const guardTokenAddr = await guardToken.getAddress();
  console.log("   GuardToken:", guardTokenAddr);

  // 2. Deploy ProtocolGuardRegistry
  console.log("2. Deploying ProtocolGuardRegistry...");
  const Registry = await hre.ethers.getContractFactory("ProtocolGuardRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("   ProtocolGuardRegistry:", registryAddr);

  // 3. Deploy TimelockExecutor
  console.log("3. Deploying TimelockExecutor...");
  const Timelock = await hre.ethers.getContractFactory("TimelockExecutor");
  const timelock = await Timelock.deploy();
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log("   TimelockExecutor:", timelockAddr);

  // 4. Deploy UpgradeAuditLog
  console.log("4. Deploying UpgradeAuditLog...");
  const AuditLog = await hre.ethers.getContractFactory("UpgradeAuditLog");
  const auditLog = await AuditLog.deploy();
  await auditLog.waitForDeployment();
  const auditLogAddr = await auditLog.getAddress();
  console.log("   UpgradeAuditLog:", auditLogAddr);

  // 5. Deploy InvariantVault
  console.log("5. Deploying InvariantVault...");
  const Vault = await hre.ethers.getContractFactory("InvariantVault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("   InvariantVault:", vaultAddr);

  // 6. Deploy UpgradeProposal
  console.log("6. Deploying UpgradeProposal...");
  const Proposal = await hre.ethers.getContractFactory("UpgradeProposal");
  const proposal = await Proposal.deploy(registryAddr, timelockAddr);
  await proposal.waitForDeployment();
  const proposalAddr = await proposal.getAddress();
  console.log("   UpgradeProposal:", proposalAddr);

  // 7. Deploy ProposalVoting
  console.log("7. Deploying ProposalVoting...");
  const Voting = await hre.ethers.getContractFactory("ProposalVoting");
  const voting = await Voting.deploy(guardTokenAddr);
  await voting.waitForDeployment();
  const votingAddr = await voting.getAddress();
  console.log("   ProposalVoting:", votingAddr);

  // 8. Grant roles
  console.log("\n8. Granting roles...");
  const AI_ENGINE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_ENGINE_ROLE"));
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

  // Grant GUARDIAN_ROLE on TimelockExecutor to UpgradeProposal
  await (await (timelock as any).grantRole(GUARDIAN_ROLE, proposalAddr)).wait();
  console.log("   GUARDIAN_ROLE granted to UpgradeProposal on TimelockExecutor");

  // If AI_ENGINE_PRIVATE_KEY is set, grant AI_ENGINE_ROLE
  if (process.env.AI_ENGINE_PRIVATE_KEY) {
    const aiWallet = new hre.ethers.Wallet(process.env.AI_ENGINE_PRIVATE_KEY);
    await (await (auditLog as any).grantRole(AI_ENGINE_ROLE, aiWallet.address)).wait();
    await (await (proposal as any).grantRole(AI_ENGINE_ROLE, aiWallet.address)).wait();
    console.log("   AI_ENGINE_ROLE granted to", aiWallet.address);
  }

  // 9. Register demo protocol
  console.log("\n9. Registering demo protocol...");
  const DEMO_PROTOCOL = deployer.address; // Use deployer as demo protocol address
  const MIN_TIMELOCK = 172800; // 48h
  await (await (registry as any).registerProtocol(
    DEMO_PROTOCOL,
    "Demo DeFi Protocol",
    "A demonstration protocol for ProtocolGuard",
    guardTokenAddr,
    ethers.parseEther("1000"), // 1000 GUARD proposal threshold
    500,                        // 5% quorum
    MIN_TIMELOCK
  )).wait();
  console.log("   Demo protocol registered at", DEMO_PROTOCOL);

  // 10. Add demo invariants
  await (await (registry as any).addInvariant(
    DEMO_PROTOCOL,
    "Total supply must not decrease",
    "invariant_totalSupplyNotDecrease()"
  )).wait();
  await (await (registry as any).addInvariant(
    DEMO_PROTOCOL,
    "Owner address must not be zero address",
    "invariant_ownerNotZero()"
  )).wait();
  console.log("   Demo invariants added");

  // 11. Save deployment addresses
  const network = hre.network.name;
  const deployments = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      GuardToken: guardTokenAddr,
      ProtocolGuardRegistry: registryAddr,
      TimelockExecutor: timelockAddr,
      UpgradeAuditLog: auditLogAddr,
      InvariantVault: vaultAddr,
      UpgradeProposal: proposalAddr,
      ProposalVoting: votingAddr,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const outFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployments, null, 2));
  console.log(`\n✅ Deployment addresses saved to ${outFile}`);
  console.log("\nDeployment complete!");
  console.log(JSON.stringify(deployments.contracts, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
