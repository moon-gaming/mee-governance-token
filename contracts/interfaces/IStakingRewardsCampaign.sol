// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

interface IStakingRewardsCampaign {
    
    struct StakeInfo {
        uint256 balance;
        uint64 unlockTime;
    }

    struct LockInfo {
        uint64 period;
        uint256 increment;
        uint256 maxAmount;
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 amount, uint256 ticketAmount, bytes32 lockType, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount, bytes32 lockType);
    event Recovered(address token, uint256 amount);

    // Views

    function balanceOf(address account, bytes32 lockType) external view returns (uint256);

    // Mutative

    function stake(uint256 amount, bytes32 lockType) external;

    function withdraw(bytes32 lockType) external;
}
