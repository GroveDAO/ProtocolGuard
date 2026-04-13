// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IProtocolGuardRegistry {
    struct ProtocolInfo {
        string name;
        string description;
        address governanceToken;
        uint256 proposalThreshold;
        uint16 quorumBps;
        uint256 timelockSeconds;
        address admin;
        bool active;
        uint256 registeredAt;
        uint256 totalProposals;
        uint256 executedUpgrades;
    }

    struct Invariant {
        uint256 id;
        string text;
        bytes32 textHash;
        string testFunctionSig;
        bool active;
        uint256 addedAt;
    }

    event ProtocolRegistered(address indexed protocol, string name, address indexed admin);
    event InvariantAdded(address indexed protocol, uint256 indexed invariantId, string text);
    event InvariantRemoved(address indexed protocol, uint256 indexed invariantId);
    event UpgradeTargetSet(address indexed protocol, address indexed target, bool canUpgrade);

    function registerProtocol(address protocol, string calldata name, string calldata description, address governanceToken, uint256 proposalThreshold, uint16 quorumBps, uint256 timelockSeconds) external;
    function addInvariant(address protocol, string calldata invariantText, string calldata testFunctionSig) external returns (uint256 invariantId);
    function removeInvariant(address protocol, uint256 invariantId) external;
    function setUpgradeTarget(address protocol, address targetContract, bool canUpgrade) external;
    function getProtocol(address protocol) external view returns (ProtocolInfo memory);
    function getInvariants(address protocol) external view returns (Invariant[] memory);
    function getUpgradeTargets(address protocol) external view returns (address[] memory);
    function isRegistered(address protocol) external view returns (bool);
}
