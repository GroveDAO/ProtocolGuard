// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/ITimelockExecutor.sol";

/**
 * @title TimelockExecutor
 * @notice Queues and executes approved protocol upgrades after a mandatory timelock delay
 */
contract TimelockExecutor is AccessControl, ITimelockExecutor {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant MIN_TIMELOCK = 172800;  // 48 hours
    uint256 public constant MAX_TIMELOCK = 2592000; // 30 days
    uint256 public constant GRACE_PERIOD = 1209600; // 14 days — upgrade expires if not executed

    mapping(uint256 => QueuedUpgrade) private _queue;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    /// @inheritdoc ITimelockExecutor
    function queue(
        uint256 proposalId,
        address target,
        bytes calldata payload,
        uint256 eta
    ) external override onlyRole(GUARDIAN_ROLE) {
        require(target != address(0), "Invalid target");
        require(!_queue[proposalId].executed, "Already executed");
        require(!_queue[proposalId].cancelled, "Already cancelled");
        require(_queue[proposalId].queuedAt == 0, "Already queued");
        uint256 delay = eta - block.timestamp;
        require(delay >= MIN_TIMELOCK, "Delay too short");
        require(delay <= MAX_TIMELOCK, "Delay too long");

        _queue[proposalId] = QueuedUpgrade({
            proposalId: proposalId,
            target: target,
            payload: payload,
            eta: eta,
            executed: false,
            cancelled: false,
            queuedAt: block.timestamp
        });

        emit UpgradeQueued(proposalId, target, eta);
    }

    /// @inheritdoc ITimelockExecutor
    function execute(uint256 proposalId) external override {
        QueuedUpgrade storage upgrade = _queue[proposalId];
        require(upgrade.queuedAt != 0, "Not queued");
        require(!upgrade.executed, "Already executed");
        require(!upgrade.cancelled, "Cancelled");
        require(block.timestamp >= upgrade.eta, "Timelock not elapsed");
        require(!isExpired(proposalId), "Upgrade expired");

        upgrade.executed = true;

        (bool success, ) = upgrade.target.call(upgrade.payload);
        require(success, "Execution failed");

        emit UpgradeExecuted(proposalId, upgrade.target);
    }

    /// @inheritdoc ITimelockExecutor
    function cancel(uint256 proposalId, string calldata reason) external override onlyRole(GUARDIAN_ROLE) {
        QueuedUpgrade storage upgrade = _queue[proposalId];
        require(upgrade.queuedAt != 0, "Not queued");
        require(!upgrade.executed, "Already executed");
        require(!upgrade.cancelled, "Already cancelled");

        upgrade.cancelled = true;

        emit UpgradeCancelled(proposalId, reason);
    }

    /// @inheritdoc ITimelockExecutor
    function getQueuedUpgrade(uint256 proposalId) external view override returns (QueuedUpgrade memory) {
        return _queue[proposalId];
    }

    /// @inheritdoc ITimelockExecutor
    function isExpired(uint256 proposalId) public view override returns (bool) {
        QueuedUpgrade storage upgrade = _queue[proposalId];
        if (upgrade.queuedAt == 0) return false;
        return block.timestamp > upgrade.eta + GRACE_PERIOD;
    }

    /// @inheritdoc ITimelockExecutor
    function isExecutable(uint256 proposalId) public view override returns (bool) {
        QueuedUpgrade storage upgrade = _queue[proposalId];
        if (upgrade.queuedAt == 0) return false;
        if (upgrade.executed || upgrade.cancelled) return false;
        if (block.timestamp < upgrade.eta) return false;
        if (isExpired(proposalId)) return false;
        return true;
    }
}
