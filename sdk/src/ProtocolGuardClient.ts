import { ethers } from "ethers";

// Minimal ABIs
const REGISTRY_ABI = [
  "function registerProtocol(address protocol, string name, string description, address governanceToken, uint256 proposalThreshold, uint16 quorumBps, uint256 timelockSeconds) external",
  "function addInvariant(address protocol, string invariantText, string testFunctionSig) external returns (uint256)",
  "function setUpgradeTarget(address protocol, address targetContract, bool canUpgrade) external",
  "function getProtocol(address protocol) external view returns (tuple(string name, string description, address governanceToken, uint256 proposalThreshold, uint16 quorumBps, uint256 timelockSeconds, address admin, bool active, uint256 registeredAt, uint256 totalProposals, uint256 executedUpgrades))",
  "function isRegistered(address protocol) external view returns (bool)",
  "function getInvariants(address protocol) external view returns (tuple(uint256 id, string text, bytes32 textHash, string testFunctionSig, bool active, uint256 addedAt)[])",
];

const PROPOSAL_ABI = [
  "function createProposal(address protocol, string title, string description, string[] constraints) external returns (uint256)",
  "function castVote(uint256 proposalId, bool support) external",
  "function finalizeVoting(uint256 proposalId) external",
  "function queueExecution(uint256 proposalId) external",
  "function execute(uint256 proposalId) external",
  "function cancel(uint256 proposalId, string reason) external",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address protocol, address proposer, string title, string description, string[] constraints, uint256 votingStart, uint256 votingEnd, uint256 votesFor, uint256 votesAgainst, uint8 status, bytes32 aiReportHash, bytes32 solidityDiffHash, bytes simulationResultHash, uint256 timelockEnd, uint256 createdAt, uint256 executedAt))",
  "function totalProposals() external view returns (uint256)",
  "function hasVoted(address voter, uint256 proposalId) external view returns (bool)",
];

const AUDIT_LOG_ABI = [
  "function getEntries(uint256 proposalId) external view returns (tuple(uint256 entryId, uint256 proposalId, uint8 entryType, bytes data, bytes32 aiReasoningHash, uint256 timestamp, uint256 blockNumber)[])",
  "function totalEntries() external view returns (uint256)",
];

export interface SDKConfig {
  registryAddress: string;
  proposalAddress: string;
  auditLogAddress: string;
  signerOrProvider: ethers.Signer | ethers.Provider;
}

export class ProtocolGuardClient {
  private registry: ethers.Contract;
  private proposal: ethers.Contract;
  private auditLog: ethers.Contract;

  constructor(config: SDKConfig) {
    this.registry = new ethers.Contract(config.registryAddress, REGISTRY_ABI, config.signerOrProvider);
    this.proposal = new ethers.Contract(config.proposalAddress, PROPOSAL_ABI, config.signerOrProvider);
    this.auditLog = new ethers.Contract(config.auditLogAddress, AUDIT_LOG_ABI, config.signerOrProvider);
  }

  // ── Registry ─────────────────────────────────────────────────────────────

  async registerProtocol(
    protocolAddress: string,
    name: string,
    description: string,
    governanceToken: string,
    proposalThreshold: bigint,
    quorumBps: number,
    timelockSeconds: number
  ): Promise<ethers.TransactionResponse> {
    return this.registry.registerProtocol(
      protocolAddress, name, description, governanceToken,
      proposalThreshold, quorumBps, timelockSeconds
    );
  }

  async addInvariant(
    protocolAddress: string,
    text: string,
    testFunctionSig: string
  ): Promise<ethers.TransactionResponse> {
    return this.registry.addInvariant(protocolAddress, text, testFunctionSig);
  }

  async isRegistered(protocolAddress: string): Promise<boolean> {
    return this.registry.isRegistered(protocolAddress);
  }

  async getProtocolInfo(protocolAddress: string) {
    return this.registry.getProtocol(protocolAddress);
  }

  async getInvariants(protocolAddress: string) {
    return this.registry.getInvariants(protocolAddress);
  }

  // ── Proposals ─────────────────────────────────────────────────────────────

  async createProposal(
    protocolAddress: string,
    title: string,
    description: string,
    constraints: string[]
  ): Promise<ethers.TransactionResponse> {
    return this.proposal.createProposal(protocolAddress, title, description, constraints);
  }

  async castVote(proposalId: number, support: boolean): Promise<ethers.TransactionResponse> {
    return this.proposal.castVote(proposalId, support);
  }

  async finalizeVoting(proposalId: number): Promise<ethers.TransactionResponse> {
    return this.proposal.finalizeVoting(proposalId);
  }

  async queueExecution(proposalId: number): Promise<ethers.TransactionResponse> {
    return this.proposal.queueExecution(proposalId);
  }

  async execute(proposalId: number): Promise<ethers.TransactionResponse> {
    return this.proposal.execute(proposalId);
  }

  async cancel(proposalId: number, reason: string): Promise<ethers.TransactionResponse> {
    return this.proposal.cancel(proposalId, reason);
  }

  async getProposal(proposalId: number) {
    return this.proposal.getProposal(proposalId);
  }

  async totalProposals(): Promise<bigint> {
    return this.proposal.totalProposals();
  }

  async hasVoted(voter: string, proposalId: number): Promise<boolean> {
    return this.proposal.hasVoted(voter, proposalId);
  }

  // ── Audit Log ─────────────────────────────────────────────────────────────

  async getAuditEntries(proposalId: number) {
    return this.auditLog.getEntries(proposalId);
  }

  async totalAuditEntries(): Promise<bigint> {
    return this.auditLog.totalEntries();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  static fromRpc(
    rpcUrl: string,
    registryAddress: string,
    proposalAddress: string,
    auditLogAddress: string
  ): ProtocolGuardClient {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ProtocolGuardClient({ registryAddress, proposalAddress, auditLogAddress, signerOrProvider: provider });
  }

  static fromPrivateKey(
    rpcUrl: string,
    privateKey: string,
    registryAddress: string,
    proposalAddress: string,
    auditLogAddress: string
  ): ProtocolGuardClient {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    return new ProtocolGuardClient({ registryAddress, proposalAddress, auditLogAddress, signerOrProvider: signer });
  }
}
