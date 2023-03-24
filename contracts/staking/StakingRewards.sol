// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IStakingRewards.sol";

contract StakingRewards is
    IStakingRewards,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    using SafeMath for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /* ========== STATE VARIABLES ========== */

    // Token which is being staked
    IERC20Upgradeable stakingToken;

    // User address => Lock Type => Staked Information
    mapping(address => mapping(LockType => StakeInfo)) private stakeInfo;

    mapping(LockType => LockInfo) public lockPeriod;

    /* ========== Initializer ========== */

    function initialize(address _stakingToken) public initializer {
        __Ownable_init_unchained();
        __Pausable_init_unchained();
        __ReentrancyGuard_init_unchained();
        __StakingRewards_init_unchained(_stakingToken);
    }

    function __StakingRewards_init_unchained(address _stakingToken)
        internal
        onlyInitializing
    {
        stakingToken = IERC20Upgradeable(_stakingToken);

        // Initializing Lock Period and Amount to stake for Land Ownership - Staking Option 2
        lockPeriod[LockType.LOCK_0] = LockInfo(90 days, 300 ether);
        lockPeriod[LockType.LOCK_1] = LockInfo(90 days, 500 ether);
        lockPeriod[LockType.LOCK_2] = LockInfo(90 days, 1000 ether);
        lockPeriod[LockType.LOCK_3] = LockInfo(90 days, 2000 ether);
        lockPeriod[LockType.LOCK_4] = LockInfo(90 days, 5000 ether);
        // Initializing Lock Period and Ticket Price for Raffle - Staking Option 1
        lockPeriod[LockType.STAKE_0] = LockInfo(30 days, 10 ether);
        lockPeriod[LockType.STAKE_1] = LockInfo(30 days, 15 ether);
        lockPeriod[LockType.STAKE_2] = LockInfo(30 days, 20 ether);
        lockPeriod[LockType.STAKE_3] = LockInfo(30 days, 30 ether);
        lockPeriod[LockType.STAKE_4] = LockInfo(30 days, 45 ether);
    }

    /* ========== VIEWS ========== */

    // Staked Amount of MEE token into specific Raffle or the second staking optioin
    function balanceOf(address account, LockType lockType)
        external
        view
        returns (uint256)
    {
        return stakeInfo[account][lockType].balance;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount, LockType lockType)
        external
        nonReentrant
        whenNotPaused
    {
        // In case of Staking Option 1(Raffle), amount just represents the ticket amount
        // In case of Staking Option 2(Land), we don't use the amount variable but it should be 1 always
        require(amount > 0, "Invalid Amount");
        if(lockType >= LockType.LOCK_0) {
            require(amount == 1, "Can only lock exactly one");
        }

        // Stake Information for the specific Staking Option for the user. Raffle or Land Option
        StakeInfo storage info = stakeInfo[msg.sender][lockType];

        LockInfo memory lockInfo = lockPeriod[lockType];
        require(lockInfo.minAmount > 0, "LockType is inactive.");

        info.balance = info.balance + lockInfo.minAmount * amount;
        info.unlockTime = uint64(block.timestamp) + lockInfo.period;

        // Lock MEE tokens into the staking contract
        stakingToken.safeTransferFrom(
            msg.sender,
            address(this),
            lockInfo.minAmount * amount
        );

        emit Staked(
            msg.sender, // Owner
            lockInfo.minAmount * amount, // Token Amount
            amount, // Ticket Amount for Staking Option 1 or 1 for Staking Option 2
            lockType, // Lock Type
            info.unlockTime
        );
    }

    function withdraw(LockType lockType)
        public
        nonReentrant
        lockPeriodCheck(lockType)
    {
        StakeInfo storage info = stakeInfo[msg.sender][lockType];
        // Calcaulate the balance to withdraw for the specific Land Tier and the Staking Option
        uint256 balance = info.balance;

        require(balance > 0, "Nothing to withdraw");
        // Unlock Mee Token after lock period.
        stakingToken.safeTransfer(msg.sender, balance);

        delete stakeInfo[msg.sender][lockType];

        emit Withdrawn(msg.sender, balance, lockType);
    }

    // Update lock period for different tiers from Staking Option 1 & 2
    function updateLockPeriod(LockType lockType, uint64 period)
        external
        onlyOwner
    {
        require(period > 0, "Lock period is 0");
        lockPeriod[lockType].period = period;
    }

    // Update the ticket price for Staking Option 1, and the minAmount limitation for Staking Option 2
    function updateLockLimitation(LockType lockType, uint256 limit)
        external
        onlyOwner
    {
        require(limit > 0, "Limit should be bigger than 0");
        lockPeriod[lockType].minAmount = limit;
    }

    // Added to support recovering LP Rewards from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        require(
            tokenAddress != address(stakingToken),
            "Cannot withdraw the staking token"
        );
        IERC20Upgradeable(tokenAddress).safeTransfer(msg.sender, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== MODIFIERS ========== */

    // Modifier for checking if the lock period has ended or not
    modifier lockPeriodCheck(LockType lockType) {
        StakeInfo memory info = stakeInfo[msg.sender][lockType];
        require(info.unlockTime < block.timestamp, "Still in the lock period");
        _;
    }
}
