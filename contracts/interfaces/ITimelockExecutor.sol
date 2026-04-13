// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ITimelockExecutor {
    struct QueuedUpgrade {
        uint256 proposalId;
        address target;
        bytes payload;
        uint256 eta;
        bool executed;
        bool cancelled;
        uint256 queuedAt;
    }

    event UpgradeQueued(uint256 indexed proposalId, address indexed target, uint256 eta);
    event UpgradeExecuted(uint256 indexed proposalId, address indexed target);
    event UpgradeCancelled(uint256 indexed proposalId, string reason);

    function queue(uint256 proposalId, address target, bytes calldata payload, uint256 eta) external;
    function execute(uint256 proposalId) external;
    function cancel(uint256 proposalId, string calldata reason) external;
    function getQueuedUpgrade(uint256 proposalId) external view returns (QueuedUpgrade memory);
    function isExpired(uint256 proposalId) external view returns (bool);
    function isExecutable(uint256 proposalId) external view returns (bool);
}
