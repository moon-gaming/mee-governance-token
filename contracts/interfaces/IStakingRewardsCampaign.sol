// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

interface IStakingRewardsCampaign {
    // enum, structs
    enum LockType {
        STAKE_0, 
        STAKE_1, 
        STAKE_2, 
        STAKE_3, 
        STAKE_4, 
        STAKE_5, 
        STAKE_6, 
        STAKE_7, 
        STAKE_8, 
        STAKE_9, 
        STAKE_A, 
        STAKE_B, 
        STAKE_C, 
        STAKE_D, 
        STAKE_E, 
        STAKE_F,
        LOCK_0, 
        LOCK_1, 
        LOCK_2, 
        LOCK_3, 
        LOCK_4, 
        LOCK_5, 
        LOCK_6, 
        LOCK_7, 
        LOCK_8, 
        LOCK_9, 
        LOCK_A, 
        LOCK_B, 
        LOCK_C, 
        LOCK_D, 
        LOCK_E, 
        LOCK_F
    }

    struct StakeInfo {
        uint256 balance;
        uint64 unlockTime;
    }

    struct LockInfo {
        uint64 period;
        uint256 minAmount;
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 amount, uint256 ticketAmount, uint64 campaignType, LockType lockType, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount, uint64 campaignType, LockType lockType);
    event Recovered(address token, uint256 amount);

    // Views

    function balanceOf(address account, uint64 campaignType, LockType lockType) external view returns (uint256);

    // Mutative

    function stake(uint256 amount, uint64 campaignType, LockType lockType) external;

    function withdraw(uint64 campaignType, LockType lockType) external;
}
