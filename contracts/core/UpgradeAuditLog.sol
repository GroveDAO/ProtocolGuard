// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UpgradeAuditLog
 * @notice Append-only on-chain audit log for all AI-governed upgrade decisions
 */
contract UpgradeAuditLog is AccessControl {
    bytes32 public constant AI_ENGINE_ROLE = keccak256("AI_ENGINE_ROLE");

    enum LogEntryType {
        AI_GENERATION_STARTED,
        AI_CODE_GENERATED,
        INVARIANT_CHECK_PASSED,
        INVARIANT_CHECK_FAILED,
        SIMULATION_STARTED,
        SIMULATION_PASSED,
        SIMULATION_FAILED,
        HUMAN_OVERRIDE,
        EXECUTION_SUBMITTED
    }

    struct LogEntry {
        uint256 entryId;
        uint256 proposalId;
        LogEntryType entryType;
        bytes data;
        bytes32 aiReasoningHash;
        uint256 timestamp;
        uint256 blockNumber;
    }

    LogEntry[] private _entries;
    mapping(uint256 => uint256[]) private _proposalEntryIds;
    mapping(LogEntryType => uint256[]) private _typeEntryIds;

    event EntryAdded(
        uint256 indexed entryId,
        uint256 indexed proposalId,
        LogEntryType indexed entryType,
        bytes32 aiReasoningHash
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AI_ENGINE_ROLE, msg.sender);
    }

    /**
     * @notice Add an audit log entry — only callable by the AI engine
     * @param proposalId The proposal this entry relates to
     * @param entryType Type of log entry
     * @param data Arbitrary ABI-encoded data for this entry
     * @param aiReasoningHash keccak256 hash of the AI's full reasoning text
     */
    function addEntry(
        uint256 proposalId,
        LogEntryType entryType,
        bytes calldata data,
        bytes32 aiReasoningHash
    ) external onlyRole(AI_ENGINE_ROLE) returns (uint256 entryId) {
        entryId = _entries.length;
        _entries.push(LogEntry({
            entryId: entryId,
            proposalId: proposalId,
            entryType: entryType,
            data: data,
            aiReasoningHash: aiReasoningHash,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        _proposalEntryIds[proposalId].push(entryId);
        _typeEntryIds[entryType].push(entryId);

        emit EntryAdded(entryId, proposalId, entryType, aiReasoningHash);
    }

    /// @notice Returns all log entries for a proposal
    function getEntries(uint256 proposalId) external view returns (LogEntry[] memory) {
        uint256[] storage ids = _proposalEntryIds[proposalId];
        LogEntry[] memory result = new LogEntry[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _entries[ids[i]];
        }
        return result;
    }

    /// @notice Returns a single log entry by its global ID
    function getEntry(uint256 entryId) external view returns (LogEntry memory) {
        require(entryId < _entries.length, "Entry not found");
        return _entries[entryId];
    }

    /// @notice Returns all log entries of a given type
    function getEntriesByType(LogEntryType entryType) external view returns (LogEntry[] memory) {
        uint256[] storage ids = _typeEntryIds[entryType];
        LogEntry[] memory result = new LogEntry[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _entries[ids[i]];
        }
        return result;
    }

    /// @notice Total number of audit log entries ever recorded
    function totalEntries() external view returns (uint256) {
        return _entries.length;
    }
}
