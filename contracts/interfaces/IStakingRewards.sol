// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

interface IStakingRewards {
    // enum, structs
    enum LockType {
        LOTTERY_V1_LAND,
        LOTTERY_V2_LAND,
        LOTTERY_V3_LAND,
        LOTTERY_V4_LAND,
        LOTTERY_V5_LAND,
        LOCK_V1_LAND,
        LOCK_V2_LAND,
        LOCK_V3_LAND,
        LOCK_V4_LAND,
        LOCK_V5_LAND
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

    event Staked(address indexed user, uint256 amount, uint256 ticketAmount, LockType lockType, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount, LockType lockType);
    event Recovered(address token, uint256 amount);

    // Views

    function balanceOf(address account, LockType lockType) external view returns (uint256);

    // Mutative

    function stake(uint256 amount, LockType lockType) external;

    function withdraw(LockType lockType) external;
}
