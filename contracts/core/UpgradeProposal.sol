// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IUpgradeProposal.sol";
import "../interfaces/IProtocolGuardRegistry.sol";
import "../interfaces/ITimelockExecutor.sol";

/**
 * @title UpgradeProposal
 * @notice Manages the full lifecycle of AI-governed protocol upgrade proposals
 */
contract UpgradeProposal is AccessControl, IUpgradeProposal {
    bytes32 public constant AI_ENGINE_ROLE = keccak256("AI_ENGINE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant VOTING_DURATION = 7 days;

    IProtocolGuardRegistry public immutable registry;
    ITimelockExecutor public immutable timelockExecutor;

    uint256 private _nextProposalId;
    mapping(uint256 => Proposal) private _proposals;
    /// @notice voter => proposalId => hasVoted
    mapping(address => mapping(uint256 => bool)) private _hasVoted;

    constructor(address registryAddress, address timelockAddress) {
        require(registryAddress != address(0), "Invalid registry");
        require(timelockAddress != address(0), "Invalid timelock");
        registry = IProtocolGuardRegistry(registryAddress);
        timelockExecutor = ITimelockExecutor(timelockAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @inheritdoc IUpgradeProposal
    function createProposal(
        address protocol,
        string calldata title,
        string calldata description,
        string[] calldata constraints
    ) external override returns (uint256 proposalId) {
        require(registry.isRegistered(protocol), "Protocol not registered");
        require(bytes(title).length > 0, "Title required");

        IProtocolGuardRegistry.ProtocolInfo memory info = registry.getProtocol(protocol);
        uint256 voterWeight = IERC20(info.governanceToken).balanceOf(msg.sender);
        require(voterWeight >= info.proposalThreshold, "Below proposal threshold");

        proposalId = _nextProposalId++;
        uint256 start = block.timestamp;
        uint256 end = start + VOTING_DURATION;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            protocol: protocol,
            proposer: msg.sender,
            title: title,
            description: description,
            constraints: constraints,
            votingStart: start,
            votingEnd: end,
            votesFor: 0,
            votesAgainst: 0,
            status: ProposalStatus.VOTING,
            aiReportHash: bytes32(0),
            solidityDiffHash: bytes32(0),
            simulationResultHash: "",
            timelockEnd: 0,
            createdAt: block.timestamp,
            executedAt: 0
        });

        emit ProposalCreated(proposalId, protocol, msg.sender, title);
    }

    /// @inheritdoc IUpgradeProposal
    function castVote(uint256 proposalId, bool support) external override {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(p.status == ProposalStatus.VOTING, "Not in voting period");
        require(block.timestamp >= p.votingStart, "Voting not started");
        require(block.timestamp <= p.votingEnd, "Voting ended");
        require(!_hasVoted[msg.sender][proposalId], "Already voted");

        uint256 weight = getVoterWeight(msg.sender, p.protocol);
        require(weight > 0, "No voting power");

        _hasVoted[msg.sender][proposalId] = true;

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Finalizes voting after the voting period has ended.
     *         Checks quorum and majority; transitions to APPROVED or REJECTED.
     */
    function finalizeVoting(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(p.status == ProposalStatus.VOTING, "Not in voting period");
        require(block.timestamp > p.votingEnd, "Voting still active");

        IProtocolGuardRegistry.ProtocolInfo memory info = registry.getProtocol(p.protocol);
        uint256 totalSupply = IERC20(info.governanceToken).totalSupply();
        uint256 totalVotes = p.votesFor + p.votesAgainst;

        // Check quorum: totalVotes must be >= quorumBps of total supply
        uint256 quorumVotes = (totalSupply * info.quorumBps) / 10000;
        bool quorumMet = totalVotes >= quorumVotes;
        bool majorityFor = p.votesFor > p.votesAgainst;

        if (quorumMet && majorityFor) {
            p.status = ProposalStatus.APPROVED;
            emit ProposalApproved(proposalId, p.votesFor, p.votesAgainst);
            // Automatically trigger AI processing
            p.status = ProposalStatus.AI_PROCESSING;
            emit AIProcessingStarted(proposalId);
        } else {
            p.status = ProposalStatus.REJECTED;
            emit ProposalRejected(proposalId);
        }
    }

    /// @inheritdoc IUpgradeProposal
    function submitAIReport(
        uint256 proposalId,
        bytes32 reportHash,
        bytes32 solidityDiffHash,
        bool simulationPassed,
        bytes32 simulationSnapshotHash
    ) external override onlyRole(AI_ENGINE_ROLE) {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(p.status == ProposalStatus.AI_PROCESSING, "Not in AI processing");

        p.aiReportHash = reportHash;
        p.solidityDiffHash = solidityDiffHash;
        p.simulationResultHash = abi.encodePacked(simulationSnapshotHash);

        if (simulationPassed) {
            p.status = ProposalStatus.SIMULATION_PASS;
        } else {
            p.status = ProposalStatus.SIMULATION_FAIL;
        }

        emit AIReportSubmitted(proposalId, reportHash, simulationPassed);
    }

    /// @inheritdoc IUpgradeProposal
    function queueExecution(uint256 proposalId) external override {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(p.status == ProposalStatus.SIMULATION_PASS, "Simulation not passed");

        IProtocolGuardRegistry.ProtocolInfo memory info = registry.getProtocol(p.protocol);
        uint256 eta = block.timestamp + info.timelockSeconds;
        p.timelockEnd = eta;
        p.status = ProposalStatus.QUEUED;

        // Queue in timelock executor using proposal data as payload
        bytes memory payload = abi.encodeWithSignature(
            "executeUpgrade(uint256,bytes32)",
            proposalId,
            p.solidityDiffHash
        );
        address[] memory targets = registry.getUpgradeTargets(p.protocol);
        address target = targets.length > 0 ? targets[0] : p.protocol;
        timelockExecutor.queue(proposalId, target, payload, eta);

        emit ProposalQueued(proposalId, eta);
    }

    /// @inheritdoc IUpgradeProposal
    function execute(uint256 proposalId) external override {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(p.status == ProposalStatus.QUEUED, "Not queued");
        require(block.timestamp >= p.timelockEnd, "Timelock not elapsed");

        p.status = ProposalStatus.EXECUTED;
        p.executedAt = block.timestamp;

        timelockExecutor.execute(proposalId);

        bytes32 upgradeHash = keccak256(abi.encodePacked(proposalId, p.solidityDiffHash, block.timestamp));
        emit ProposalExecuted(proposalId, upgradeHash);
    }

    /// @inheritdoc IUpgradeProposal
    function cancel(uint256 proposalId, string calldata reason) external override {
        Proposal storage p = _proposals[proposalId];
        require(p.createdAt != 0, "Proposal not found");
        require(
            p.status != ProposalStatus.EXECUTED && p.status != ProposalStatus.CANCELLED,
            "Cannot cancel"
        );
        require(
            hasRole(ADMIN_ROLE, msg.sender) || p.proposer == msg.sender,
            "Not authorized"
        );

        p.status = ProposalStatus.CANCELLED;

        if (p.timelockEnd != 0) {
            timelockExecutor.cancel(proposalId, reason);
        }

        emit ProposalCancelled(proposalId, reason);
    }

    /// @inheritdoc IUpgradeProposal
    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        require(_proposals[proposalId].createdAt != 0, "Proposal not found");
        return _proposals[proposalId];
    }

    /// @inheritdoc IUpgradeProposal
    function getVoterWeight(address voter, address protocol) public view override returns (uint256) {
        IProtocolGuardRegistry.ProtocolInfo memory info = registry.getProtocol(protocol);
        return IERC20(info.governanceToken).balanceOf(voter);
    }

    /// @notice Returns whether a voter has already voted on a proposal
    function hasVoted(address voter, uint256 proposalId) external view returns (bool) {
        return _hasVoted[voter][proposalId];
    }

    /// @notice Returns the total number of proposals created
    function totalProposals() external view returns (uint256) {
        return _nextProposalId;
    }
}
