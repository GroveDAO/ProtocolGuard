// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IProtocolGuardRegistry.sol";

/**
 * @title ProtocolGuardRegistry
 * @notice Registry for DeFi protocols using ProtocolGuard upgrade governance
 */
contract ProtocolGuardRegistry is AccessControl, IProtocolGuardRegistry {
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    uint256 public constant MIN_TIMELOCK = 172800;   // 48 hours
    uint256 public constant MAX_TIMELOCK = 2592000;  // 30 days

    mapping(address => ProtocolInfo) private _protocols;
    mapping(address => Invariant[]) private _invariants;
    mapping(address => mapping(uint256 => bool)) private _invariantActive;
    mapping(address => address[]) private _upgradeTargets;
    mapping(address => mapping(address => bool)) private _targetAllowed;
    mapping(address => uint256) private _nextInvariantId;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRY_ADMIN_ROLE, msg.sender);
    }

    /// @inheritdoc IProtocolGuardRegistry
    function registerProtocol(
        address protocol,
        string calldata name,
        string calldata description,
        address governanceToken,
        uint256 proposalThreshold,
        uint16 quorumBps,
        uint256 timelockSeconds
    ) external override {
        require(protocol != address(0), "Invalid protocol address");
        require(bytes(name).length > 0, "Name required");
        require(governanceToken != address(0), "Invalid governance token");
        require(quorumBps > 0 && quorumBps <= 10000, "Invalid quorum BPS");
        require(timelockSeconds >= MIN_TIMELOCK, "Timelock too short");
        require(timelockSeconds <= MAX_TIMELOCK, "Timelock too long");
        require(!_protocols[protocol].active, "Already registered");

        _protocols[protocol] = ProtocolInfo({
            name: name,
            description: description,
            governanceToken: governanceToken,
            proposalThreshold: proposalThreshold,
            quorumBps: quorumBps,
            timelockSeconds: timelockSeconds,
            admin: msg.sender,
            active: true,
            registeredAt: block.timestamp,
            totalProposals: 0,
            executedUpgrades: 0
        });

        emit ProtocolRegistered(protocol, name, msg.sender);
    }

    /// @inheritdoc IProtocolGuardRegistry
    function addInvariant(
        address protocol,
        string calldata invariantText,
        string calldata testFunctionSig
    ) external override returns (uint256 invariantId) {
        _requireProtocolAdmin(protocol);
        require(bytes(invariantText).length > 0, "Invariant text required");

        invariantId = _nextInvariantId[protocol]++;
        bytes32 textHash = keccak256(abi.encodePacked(invariantText));

        _invariants[protocol].push(Invariant({
            id: invariantId,
            text: invariantText,
            textHash: textHash,
            testFunctionSig: testFunctionSig,
            active: true,
            addedAt: block.timestamp
        }));
        _invariantActive[protocol][invariantId] = true;

        emit InvariantAdded(protocol, invariantId, invariantText);
    }

    /// @inheritdoc IProtocolGuardRegistry
    function removeInvariant(address protocol, uint256 invariantId) external override {
        _requireProtocolAdmin(protocol);
        require(_invariantActive[protocol][invariantId], "Invariant not active");

        Invariant[] storage invs = _invariants[protocol];
        for (uint256 i = 0; i < invs.length; i++) {
            if (invs[i].id == invariantId) {
                invs[i].active = false;
                break;
            }
        }
        _invariantActive[protocol][invariantId] = false;

        emit InvariantRemoved(protocol, invariantId);
    }

    /// @inheritdoc IProtocolGuardRegistry
    function setUpgradeTarget(
        address protocol,
        address targetContract,
        bool canUpgrade
    ) external override {
        _requireProtocolAdmin(protocol);
        require(targetContract != address(0), "Invalid target");

        bool currentlyAllowed = _targetAllowed[protocol][targetContract];
        if (canUpgrade && !currentlyAllowed) {
            _upgradeTargets[protocol].push(targetContract);
            _targetAllowed[protocol][targetContract] = true;
        } else if (!canUpgrade && currentlyAllowed) {
            _targetAllowed[protocol][targetContract] = false;
            address[] storage targets = _upgradeTargets[protocol];
            for (uint256 i = 0; i < targets.length; i++) {
                if (targets[i] == targetContract) {
                    targets[i] = targets[targets.length - 1];
                    targets.pop();
                    break;
                }
            }
        }

        emit UpgradeTargetSet(protocol, targetContract, canUpgrade);
    }

    /// @inheritdoc IProtocolGuardRegistry
    function getProtocol(address protocol) external view override returns (ProtocolInfo memory) {
        return _protocols[protocol];
    }

    /// @inheritdoc IProtocolGuardRegistry
    function getInvariants(address protocol) external view override returns (Invariant[] memory) {
        Invariant[] storage all = _invariants[protocol];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active) activeCount++;
        }
        Invariant[] memory result = new Invariant[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active) result[idx++] = all[i];
        }
        return result;
    }

    /// @inheritdoc IProtocolGuardRegistry
    function getUpgradeTargets(address protocol) external view override returns (address[] memory) {
        address[] storage targets = _upgradeTargets[protocol];
        uint256 count = 0;
        for (uint256 i = 0; i < targets.length; i++) {
            if (_targetAllowed[protocol][targets[i]]) count++;
        }
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < targets.length; i++) {
            if (_targetAllowed[protocol][targets[i]]) result[idx++] = targets[i];
        }
        return result;
    }

    /// @inheritdoc IProtocolGuardRegistry
    function isRegistered(address protocol) external view override returns (bool) {
        return _protocols[protocol].active;
    }

    /// @notice Increment total proposals counter (called by UpgradeProposal contract)
    function incrementProposals(address protocol) external onlyRole(REGISTRY_ADMIN_ROLE) {
        _protocols[protocol].totalProposals++;
    }

    /// @notice Increment executed upgrades counter (called by UpgradeProposal contract)
    function incrementExecutedUpgrades(address protocol) external onlyRole(REGISTRY_ADMIN_ROLE) {
        _protocols[protocol].executedUpgrades++;
    }

    function _requireProtocolAdmin(address protocol) internal view {
        require(_protocols[protocol].active, "Protocol not registered");
        require(_protocols[protocol].admin == msg.sender || hasRole(REGISTRY_ADMIN_ROLE, msg.sender), "Not protocol admin");
    }
}
