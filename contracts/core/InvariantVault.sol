// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InvariantVault
 * @notice Stores and verifies keccak256 hashes of protocol invariants on-chain
 */
contract InvariantVault is AccessControl {
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    /// @notice protocol => invariantId => hash
    mapping(address => mapping(uint256 => bytes32)) private _hashes;

    event InvariantHashStored(address indexed protocol, uint256 indexed invariantId, bytes32 hash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRY_ROLE, msg.sender);
    }

    /**
     * @notice Store the hash of an invariant — only callable by the registry
     * @param protocol Protocol address
     * @param invariantId ID of the invariant
     * @param hash keccak256 hash of the invariant text
     */
    function storeInvariantHash(
        address protocol,
        uint256 invariantId,
        bytes32 hash
    ) external onlyRole(REGISTRY_ROLE) {
        require(protocol != address(0), "Invalid protocol");
        require(hash != bytes32(0), "Invalid hash");
        _hashes[protocol][invariantId] = hash;
        emit InvariantHashStored(protocol, invariantId, hash);
    }

    /**
     * @notice Verify that an invariant text matches the stored hash
     * @param protocol Protocol address
     * @param invariantId Invariant ID
     * @param text Full text of the invariant to verify
     * @return true if keccak256(text) matches stored hash
     */
    function verifyInvariant(
        address protocol,
        uint256 invariantId,
        string calldata text
    ) external view returns (bool) {
        bytes32 stored = _hashes[protocol][invariantId];
        if (stored == bytes32(0)) return false;
        return keccak256(abi.encodePacked(text)) == stored;
    }

    /// @notice Returns the stored hash for a given invariant
    function getHash(address protocol, uint256 invariantId) external view returns (bytes32) {
        return _hashes[protocol][invariantId];
    }
}
