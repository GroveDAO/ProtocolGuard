import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  ProtocolGuardRegistry,
  UpgradeProposal,
  TimelockExecutor,
  UpgradeAuditLog,
  GuardToken,
} from "../typechain-types";

const SEVEN_DAYS = 7 * 24 * 3600;
const MIN_TIMELOCK = 172800; // 48h
const AI_ENGINE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_ENGINE_ROLE"));
const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));
const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

describe("UpgradeProposal", () => {
  let registry: ProtocolGuardRegistry;
  let proposal: UpgradeProposal;
  let timelock: TimelockExecutor;
  let auditLog: UpgradeAuditLog;
  let token: GuardToken;

  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let aiEngine: SignerWithAddress;

  const PROTOCOL_ADDRESS = "0x0000000000000000000000000000000000000001";
  const QUORUM_BPS = 500; // 5%

  beforeEach(async () => {
    [deployer, alice, bob, carol, aiEngine] = await ethers.getSigners();

    // Deploy contracts
    token = await (await ethers.getContractFactory("GuardToken")).deploy();
    registry = await (await ethers.getContractFactory("ProtocolGuardRegistry")).deploy();
    timelock = await (await ethers.getContractFactory("TimelockExecutor")).deploy();
    auditLog = await (await ethers.getContractFactory("UpgradeAuditLog")).deploy();
    proposal = await (await ethers.getContractFactory("UpgradeProposal")).deploy(
      await registry.getAddress(),
      await timelock.getAddress()
    );

    // Grant roles
    await timelock.grantRole(GUARDIAN_ROLE, await proposal.getAddress());
    await proposal.grantRole(AI_ENGINE_ROLE, aiEngine.address);

    // Distribute tokens: deployer already has 100M, send to alice and bob
    await token.transfer(alice.address, ethers.parseEther("5000000")); // 5M
    await token.transfer(bob.address, ethers.parseEther("2000000"));   // 2M

    // Register protocol
    await registry.registerProtocol(
      PROTOCOL_ADDRESS,
      "Test Protocol",
      "Test description",
      await token.getAddress(),
      ethers.parseEther("1000"), // 1000 GUARD threshold
      QUORUM_BPS,
      MIN_TIMELOCK
    );
  });

  // ── Unit Tests ────────────────────────────────────────────────────────────

  describe("createProposal", () => {
    it("creates a proposal when caller has enough tokens", async () => {
      const tx = await proposal.connect(alice).createProposal(
        PROTOCOL_ADDRESS,
        "Increase fee",
        "Increase protocol fee to 0.5%",
        []
      );
      await expect(tx).to.emit(proposal, "ProposalCreated").withArgs(0, PROTOCOL_ADDRESS, alice.address, "Increase fee");
      const p = await proposal.getProposal(0);
      expect(p.title).to.equal("Increase fee");
      expect(p.status).to.equal(1); // VOTING
    });

    it("reverts when caller has insufficient tokens", async () => {
      await expect(
        proposal.connect(carol).createProposal(PROTOCOL_ADDRESS, "Test", "Test desc", [])
      ).to.be.revertedWith("Below proposal threshold");
    });

    it("reverts for unregistered protocol", async () => {
      await expect(
        proposal.connect(alice).createProposal(
          "0x0000000000000000000000000000000000000002",
          "Test", "Desc", []
        )
      ).to.be.revertedWith("Protocol not registered");
    });

    it("reverts with empty title", async () => {
      await expect(
        proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "", "Desc", [])
      ).to.be.revertedWith("Title required");
    });
  });

  describe("castVote", () => {
    let proposalId: number;

    beforeEach(async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
    });

    it("records a FOR vote with correct weight", async () => {
      await expect(proposal.connect(alice).castVote(proposalId, true))
        .to.emit(proposal, "VoteCast")
        .withArgs(proposalId, alice.address, true, ethers.parseEther("5000000"));

      const p = await proposal.getProposal(proposalId);
      expect(p.votesFor).to.equal(ethers.parseEther("5000000"));
    });

    it("records an AGAINST vote", async () => {
      await proposal.connect(bob).castVote(proposalId, false);
      const p = await proposal.getProposal(proposalId);
      expect(p.votesAgainst).to.equal(ethers.parseEther("2000000"));
    });

    it("prevents double voting", async () => {
      await proposal.connect(alice).castVote(proposalId, true);
      await expect(proposal.connect(alice).castVote(proposalId, false)).to.be.revertedWith("Already voted");
    });

    it("reverts after voting period ends", async () => {
      await time.increase(SEVEN_DAYS + 1);
      await expect(proposal.connect(alice).castVote(proposalId, true)).to.be.revertedWith("Voting ended");
    });

    it("reverts for voter with zero tokens", async () => {
      await expect(proposal.connect(carol).castVote(proposalId, true)).to.be.revertedWith("No voting power");
    });

    it("reverts for non-existent proposal", async () => {
      await expect(proposal.connect(alice).castVote(999, true)).to.be.revertedWith("Proposal not found");
    });
  });

  describe("finalizeVoting", () => {
    let proposalId: number;

    beforeEach(async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
    });

    it("transitions to APPROVED and then AI_PROCESSING when quorum and majority met", async () => {
      await proposal.connect(alice).castVote(proposalId, true);  // 5M for
      await proposal.connect(bob).castVote(proposalId, false);   // 2M against

      await time.increase(SEVEN_DAYS + 1);
      await expect(proposal.connect(deployer).finalizeVoting(proposalId))
        .to.emit(proposal, "ProposalApproved")
        .and.to.emit(proposal, "AIProcessingStarted");

      const p = await proposal.getProposal(proposalId);
      expect(p.status).to.equal(4); // AI_PROCESSING
    });

    it("transitions to REJECTED when quorum not met", async () => {
      // No votes — quorum of 5% not met
      await time.increase(SEVEN_DAYS + 1);
      await expect(proposal.connect(deployer).finalizeVoting(proposalId))
        .to.emit(proposal, "ProposalRejected");
      const p = await proposal.getProposal(proposalId);
      expect(p.status).to.equal(3); // REJECTED
    });

    it("reverts when voting still active", async () => {
      await expect(proposal.connect(deployer).finalizeVoting(proposalId)).to.be.revertedWith("Voting still active");
    });
  });

  describe("submitAIReport", () => {
    let proposalId: number;

    beforeEach(async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
      // Fast-forward to after voting, finalize
      await proposal.connect(alice).castVote(proposalId, true);
      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);
    });

    it("transitions to SIMULATION_PASS on success", async () => {
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("report"));
      const diffHash = ethers.keccak256(ethers.toUtf8Bytes("diff"));
      const snapHash = ethers.keccak256(ethers.toUtf8Bytes("snapshot"));

      await expect(proposal.connect(aiEngine).submitAIReport(proposalId, reportHash, diffHash, true, snapHash))
        .to.emit(proposal, "AIReportSubmitted")
        .withArgs(proposalId, reportHash, true);

      expect((await proposal.getProposal(proposalId)).status).to.equal(6); // SIMULATION_PASS
    });

    it("transitions to SIMULATION_FAIL on failure", async () => {
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("report"));
      const diffHash = ethers.keccak256(ethers.toUtf8Bytes("diff"));
      const snapHash = ethers.keccak256(ethers.toUtf8Bytes("snapshot"));

      await proposal.connect(aiEngine).submitAIReport(proposalId, reportHash, diffHash, false, snapHash);
      expect((await proposal.getProposal(proposalId)).status).to.equal(7); // SIMULATION_FAIL
    });

    it("reverts when called by non-AI engine", async () => {
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await expect(
        proposal.connect(alice).submitAIReport(proposalId, h, h, true, h)
      ).to.be.reverted;
    });
  });

  describe("queueExecution", () => {
    let proposalId: number;

    async function advanceToSimulationPass() {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
      await proposal.connect(alice).castVote(proposalId, true);
      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await proposal.connect(aiEngine).submitAIReport(proposalId, h, h, true, h);
    }

    it("queues execution after simulation pass", async () => {
      await advanceToSimulationPass();
      await expect(proposal.queueExecution(proposalId))
        .to.emit(proposal, "ProposalQueued");
      expect((await proposal.getProposal(proposalId)).status).to.equal(8); // QUEUED
    });

    it("reverts if simulation has not passed", async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      await expect(proposal.queueExecution(0)).to.be.revertedWith("Simulation not passed");
    });
  });

  describe("execute", () => {
    let proposalId: number;

    beforeEach(async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
      await proposal.connect(alice).castVote(proposalId, true);
      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await proposal.connect(aiEngine).submitAIReport(proposalId, h, h, true, h);
      await proposal.queueExecution(proposalId);
    });

    it("reverts before timelock elapses", async () => {
      await expect(proposal.execute(proposalId)).to.be.revertedWith("Timelock not elapsed");
    });

    it("executes after timelock", async () => {
      await time.increase(MIN_TIMELOCK + 1);
      // Low-level call to a non-contract address (PROTOCOL_ADDRESS = 0x0001) succeeds
      // because EVM always succeeds when calling an address with no code.
      // The important thing is the status updates correctly.
      await expect(proposal.execute(proposalId))
        .to.emit(proposal, "ProposalExecuted");
      expect((await proposal.getProposal(proposalId)).status).to.equal(9); // EXECUTED
    });
  });

  describe("cancel", () => {
    let proposalId: number;

    beforeEach(async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Test", "Desc", []);
      proposalId = 0;
    });

    it("allows proposer to cancel", async () => {
      await expect(proposal.connect(alice).cancel(proposalId, "Changed my mind"))
        .to.emit(proposal, "ProposalCancelled")
        .withArgs(proposalId, "Changed my mind");
      expect((await proposal.getProposal(proposalId)).status).to.equal(10); // CANCELLED
    });

    it("allows admin to cancel", async () => {
      await expect(proposal.connect(deployer).cancel(proposalId, "Admin override"))
        .to.emit(proposal, "ProposalCancelled");
    });

    it("reverts when non-admin, non-proposer tries to cancel", async () => {
      await expect(proposal.connect(bob).cancel(proposalId, "No")).to.be.revertedWith("Not authorized");
    });
  });

  // ── Integration Tests ─────────────────────────────────────────────────────

  describe("Full lifecycle: create → vote pass → AI pass → queue", () => {
    it("processes a full successful upgrade pipeline", async () => {
      // 1. Create
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Major upgrade", "desc", ["no reentrancy"]);
      const proposalId = 0;

      // 2. Vote
      await proposal.connect(alice).castVote(proposalId, true);
      await proposal.connect(bob).castVote(proposalId, true);

      // 3. Finalize voting
      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);
      expect((await proposal.getProposal(proposalId)).status).to.equal(4); // AI_PROCESSING

      // 4. Submit AI report — simulation pass
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("full report"));
      const diffHash = ethers.keccak256(ethers.toUtf8Bytes("full diff"));
      const snapHash = ethers.keccak256(ethers.toUtf8Bytes("snapshot"));
      await proposal.connect(aiEngine).submitAIReport(proposalId, reportHash, diffHash, true, snapHash);
      expect((await proposal.getProposal(proposalId)).status).to.equal(6); // SIMULATION_PASS

      // 5. Queue
      await proposal.queueExecution(proposalId);
      expect((await proposal.getProposal(proposalId)).status).to.equal(8); // QUEUED
    });
  });

  describe("Vote failure → REJECTED", () => {
    it("rejects when against votes dominate", async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Bad upgrade", "desc", []);
      const proposalId = 0;

      await proposal.connect(alice).castVote(proposalId, false); // 5M against
      await proposal.connect(bob).castVote(proposalId, false);   // 2M against
      // deployer has 93M but no vote — quorum still met via alice+bob = 7M > 5% of 100M = 5M

      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);
      expect((await proposal.getProposal(proposalId)).status).to.equal(3); // REJECTED
    });
  });

  describe("AI failure → AI_FAILED-like state", () => {
    it("sets SIMULATION_FAIL when AI reports failure", async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "Risky upgrade", "desc", []);
      const proposalId = 0;
      await proposal.connect(alice).castVote(proposalId, true);
      await time.increase(SEVEN_DAYS + 1);
      await proposal.finalizeVoting(proposalId);

      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await proposal.connect(aiEngine).submitAIReport(proposalId, h, h, false, h);
      expect((await proposal.getProposal(proposalId)).status).to.equal(7); // SIMULATION_FAIL
    });
  });

  describe("Multiple proposals independence", () => {
    it("two proposals have independent state", async () => {
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "P1", "d1", []);
      await proposal.connect(alice).createProposal(PROTOCOL_ADDRESS, "P2", "d2", []);

      await proposal.connect(alice).castVote(0, true);
      await proposal.connect(bob).castVote(1, false);

      const p0 = await proposal.getProposal(0);
      const p1 = await proposal.getProposal(1);

      expect(p0.votesFor).to.equal(ethers.parseEther("5000000"));
      expect(p0.votesAgainst).to.equal(0n);
      expect(p1.votesFor).to.equal(0n);
      expect(p1.votesAgainst).to.equal(ethers.parseEther("2000000"));
    });
  });
});
