// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

interface IStakingRewards {
    // enum, structs
    enum LockType {
        LOTTERY,
        LAND
    }

    enum LandTier {
        V1_LAND,
        V2_LAND,
        V3_LAND,
        V4_LAND,
        V5_LAND
    }

    struct StakeInfo {
        uint256 balance;
        uint64 unlockTime;
        LandTier landTier;
    }

    struct LockInfo {
        uint64 period;
        uint256 minAmount;
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 amount, uint256 ticketAmount, LockType lockType, LandTier landTier);
    event Withdrawn(address indexed user, uint256 amount, LockType lockType, LandTier landTier);
    event Recovered(address token, uint256 amount);

    // Views

    function balanceOf(address account, LockType lockType, LandTier landTier) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    // Mutative

    function stake(uint256 amount, LockType lockType, LandTier landTier) external;

    function withdraw(LockType lockType, LandTier landTier) external;
}
