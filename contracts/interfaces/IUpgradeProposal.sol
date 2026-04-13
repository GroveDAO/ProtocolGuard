// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IUpgradeProposal {
    enum ProposalStatus {
        DRAFT,
        VOTING,
        APPROVED,
        REJECTED,
        AI_PROCESSING,
        AI_FAILED,
        SIMULATION_PASS,
        SIMULATION_FAIL,
        QUEUED,
        EXECUTED,
        CANCELLED
    }

    struct Proposal {
        uint256 id;
        address protocol;
        address proposer;
        string title;
        string description;
        string[] constraints;
        uint256 votingStart;
        uint256 votingEnd;
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalStatus status;
        bytes32 aiReportHash;
        bytes32 solidityDiffHash;
        bytes simulationResultHash;
        uint256 timelockEnd;
        uint256 createdAt;
        uint256 executedAt;
    }

    event ProposalCreated(uint256 indexed id, address indexed protocol, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalApproved(uint256 indexed id, uint256 votesFor, uint256 votesAgainst);
    event ProposalRejected(uint256 indexed id);
    event AIProcessingStarted(uint256 indexed id);
    event AIReportSubmitted(uint256 indexed id, bytes32 reportHash, bool simulationPassed);
    event ProposalQueued(uint256 indexed id, uint256 timelockEnd);
    event ProposalExecuted(uint256 indexed id, bytes32 upgradeHash);
    event ProposalCancelled(uint256 indexed id, string reason);

    function createProposal(address protocol, string calldata title, string calldata description, string[] calldata constraints) external returns (uint256 proposalId);
    function castVote(uint256 proposalId, bool support) external;
    function submitAIReport(uint256 proposalId, bytes32 reportHash, bytes32 solidityDiffHash, bool simulationPassed, bytes32 simulationSnapshotHash) external;
    function queueExecution(uint256 proposalId) external;
    function execute(uint256 proposalId) external;
    function cancel(uint256 proposalId, string calldata reason) external;
    function getProposal(uint256 proposalId) external view returns (Proposal memory);
    function getVoterWeight(address voter, address protocol) external view returns (uint256);
}
