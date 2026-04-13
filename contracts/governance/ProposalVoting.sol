// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ProposalVoting
 * @notice Wrapper that resolves token-weighted voting power for governance proposals
 */
contract ProposalVoting {
    address public immutable governanceToken;

    event VotingWeightQueried(address indexed voter, address indexed token, uint256 weight);

    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid token");
        governanceToken = _governanceToken;
    }

    /**
     * @notice Returns the voting weight (token balance) of a voter for a given token
     * @param voter Address of the voter
     * @param token Address of the governance token
     * @return weight Token balance of the voter
     */
    function getVotingWeight(address voter, address token) external view returns (uint256 weight) {
        weight = IERC20(token).balanceOf(voter);
    }

    /**
     * @notice Checks whether a voter has at least `threshold` tokens
     * @param voter Address of the voter
     * @param token Address of the governance token
     * @param threshold Minimum token balance required
     * @return true if voter's balance >= threshold
     */
    function hasVotingPower(
        address voter,
        address token,
        uint256 threshold
    ) external view returns (bool) {
        return IERC20(token).balanceOf(voter) >= threshold;
    }

    /**
     * @notice Convenience function using the default governance token
     */
    function getDefaultVotingWeight(address voter) external view returns (uint256) {
        return IERC20(governanceToken).balanceOf(voter);
    }
}
