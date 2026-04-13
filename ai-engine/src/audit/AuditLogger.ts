import { ethers } from "ethers";
import { InvariantCheckResult } from "../codegen/InvariantChecker";
import { SimulationReport } from "../simulation/SimulationReport";
import logger from "../utils/logger";

// Minimal ABI for the UpgradeAuditLog contract
const AUDIT_LOG_ABI = [
  "function addEntry(uint256 proposalId, uint8 entryType, bytes calldata data, bytes32 aiReasoningHash) external returns (uint256 entryId)",
];

enum LogEntryType {
  AI_GENERATION_STARTED = 0,
  AI_CODE_GENERATED = 1,
  INVARIANT_CHECK_PASSED = 2,
  INVARIANT_CHECK_FAILED = 3,
  SIMULATION_STARTED = 4,
  SIMULATION_PASSED = 5,
  SIMULATION_FAILED = 6,
  HUMAN_OVERRIDE = 7,
  EXECUTION_SUBMITTED = 8,
}

export class AuditLogger {
  private contract: ethers.Contract | null = null;

  constructor() {
    const rpcUrl = process.env.HASHKEY_MAINNET_RPC ?? process.env.HASHKEY_TESTNET_RPC;
    const privateKey = process.env.AI_ENGINE_PRIVATE_KEY;
    const contractAddress = process.env.AUDIT_LOG_ADDRESS;

    if (rpcUrl && privateKey && contractAddress) {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);
      this.contract = new ethers.Contract(contractAddress, AUDIT_LOG_ABI, signer);
      logger.info("[AuditLogger] Connected to on-chain UpgradeAuditLog");
    } else {
      logger.warn("[AuditLogger] On-chain audit logging disabled — missing env vars");
    }
  }

  async logAiGenerationStarted(proposalId: number, title: string): Promise<void> {
    const data = ethers.toUtf8Bytes(JSON.stringify({ title }));
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(`Starting AI generation for: ${title}`));
    await this.addEntry(proposalId, LogEntryType.AI_GENERATION_STARTED, data, reasoningHash);
  }

  async logAiCodeGenerated(
    proposalId: number,
    diff: string,
    reasoning: string,
    confidence: number
  ): Promise<void> {
    const data = ethers.toUtf8Bytes(JSON.stringify({ confidence, diffLength: diff.length }));
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(reasoning));
    await this.addEntry(proposalId, LogEntryType.AI_CODE_GENERATED, data, reasoningHash);
  }

  async logInvariantCheckPassed(
    proposalId: number,
    results: InvariantCheckResult[]
  ): Promise<void> {
    const data = ethers.toUtf8Bytes(JSON.stringify({ passed: results.length, failed: 0 }));
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(results)));
    await this.addEntry(proposalId, LogEntryType.INVARIANT_CHECK_PASSED, data, reasoningHash);
  }

  async logInvariantCheckFailed(
    proposalId: number,
    results: InvariantCheckResult[]
  ): Promise<void> {
    const failed = results.filter(r => r.verdict !== "PASS");
    const data = ethers.toUtf8Bytes(JSON.stringify({ failed: failed.length }));
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(failed)));
    await this.addEntry(proposalId, LogEntryType.INVARIANT_CHECK_FAILED, data, reasoningHash);
  }

  async logSimulationStarted(proposalId: number): Promise<void> {
    const data = ethers.toUtf8Bytes(JSON.stringify({ started: true }));
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(`Simulation started for proposal ${proposalId}`));
    await this.addEntry(proposalId, LogEntryType.SIMULATION_STARTED, data, reasoningHash);
  }

  async logSimulationPassed(
    proposalId: number,
    report: SimulationReport
  ): Promise<void> {
    const data = ethers.toUtf8Bytes(
      JSON.stringify({ durationMs: report.durationMs, gasUsedDeploy: report.gasUsedDeploy.toString() })
    );
    const reasoningHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(report.sanityChecks))
    );
    await this.addEntry(proposalId, LogEntryType.SIMULATION_PASSED, data, reasoningHash);
  }

  async logSimulationFailed(
    proposalId: number,
    report: SimulationReport
  ): Promise<void> {
    const data = ethers.toUtf8Bytes(
      JSON.stringify({ failureReason: report.failureReason })
    );
    const reasoningHash = ethers.keccak256(
      ethers.toUtf8Bytes(report.failureReason ?? "unknown failure")
    );
    await this.addEntry(proposalId, LogEntryType.SIMULATION_FAILED, data, reasoningHash);
  }

  async logExecutionSubmitted(proposalId: number, success: boolean): Promise<void> {
    const data = ethers.toUtf8Bytes(JSON.stringify({ success }));
    const reasoningHash = ethers.keccak256(
      ethers.toUtf8Bytes(`Execution submitted: ${success ? "PASS" : "FAIL"}`)
    );
    await this.addEntry(proposalId, LogEntryType.EXECUTION_SUBMITTED, data, reasoningHash);
  }

  private async addEntry(
    proposalId: number,
    entryType: LogEntryType,
    data: Uint8Array,
    reasoningHash: string
  ): Promise<void> {
    if (!this.contract) {
      logger.debug(`[AuditLogger] (offline) entry type=${LogEntryType[entryType]} proposal=${proposalId}`);
      return;
    }
    try {
      const tx = await this.contract.addEntry(proposalId, entryType, data, reasoningHash);
      await tx.wait();
      logger.info(`[AuditLogger] Entry logged on-chain: type=${LogEntryType[entryType]}`);
    } catch (err) {
      logger.error(`[AuditLogger] Failed to log entry: ${String(err)}`);
    }
  }
}
