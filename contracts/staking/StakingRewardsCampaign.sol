// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IStakingRewardsCampaign.sol";

contract StakingRewardsCampaign is
    IStakingRewardsCampaign,
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
    mapping(address => mapping(bytes32 => StakeInfo)) private stakeInfo;
    mapping(bytes32 => LockInfo) public lockPeriod;

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
    }

    /* ========== VIEWS ========== */

    // Staked Amount of MEE token into specific Raffle or the second staking optioin
    function balanceOf(address account, bytes32 lockType)
        external
        view
        returns (uint256)
    {
        return stakeInfo[account][lockType].balance;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount, bytes32 lockType)
        external
        nonReentrant
        whenNotPaused
    {
        LockInfo memory lockInfo = lockPeriod[lockType];
        // In case of Staking Option 1(Raffle), amount just represents the ticket amount
        // In case of Staking Option 2(Land), we don't use the amount variable but it should be 1 always
        require(amount >= 1, "Invalid Amount");
        require(lockInfo.increment != 0, "Not Active");
        require(amount * lockInfo.increment <= lockInfo.maxAmount || lockInfo.maxAmount == 0, "Invalid Amount");

        // Stake Information for the specific Staking Option for the user. Raffle or Land Option
        StakeInfo storage info = stakeInfo[msg.sender][lockType];

        info.balance = info.balance + lockInfo.increment * amount;
        info.unlockTime = uint64(block.timestamp) + lockInfo.period;

        // Lock MEE tokens into the staking contract
        stakingToken.safeTransferFrom(
            msg.sender,
            address(this),
            lockInfo.increment * amount
        );

        emit Staked(
            msg.sender, // Owner
            lockInfo.increment * amount, // Token Amount
            amount, // Ticket Amount for Staking Option 1 or 1 for Staking Option 2
            lockType, // Lock Type
            info.unlockTime
        );
    }

    function withdraw(bytes32 lockType)
        public
        nonReentrant
        whenNotPaused
        lockPeriodCheck(lockType)
    {
        StakeInfo storage info = stakeInfo[msg.sender][lockType];
        // Calcaulate the balance to withdraw for the specific Land Tier and the Staking Option
        uint256 balance = info.balance;

        require(balance > 0, "Nothing to withdraw");
        // Unlock Mee Token after lock period.
        delete stakeInfo[msg.sender][lockType];

        stakingToken.safeTransfer(msg.sender, balance);
        emit Withdrawn(msg.sender, balance, lockType);
    }

    // Update lock period for different tiers from Staking Option 1 & 2
    function updateLockPeriod(bytes32 lockType, uint64 period)
        external
        onlyOwner
    {
        require(period > 0, "Lock period is 0");
        lockPeriod[lockType].period = period;
    }

    // Update the ticket price for Staking Option 1, and the increment limitation for Staking Option 2
    function updateLockLimitation(bytes32 lockType, uint256 minLimit, uint256 maxLimit)
        external
        onlyOwner
    {
        lockPeriod[lockType].increment = minLimit;
        lockPeriod[lockType].maxAmount = maxLimit;
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

     // Pause from staking and withdrawing tokens
    function pause()
        external
        onlyOwner
    {
        _pause();
    }

    // Un-Pause contract for staking and withdrawing tokens
    function unPause()
        external
        onlyOwner
    {
        _unpause();
    }

    /* ========== MODIFIERS ========== */

    // Modifier for checking if the lock period has ended or not
    modifier lockPeriodCheck(bytes32 lockType) {
        StakeInfo memory info = stakeInfo[msg.sender][lockType];
        require(info.unlockTime < block.timestamp, "Still in the lock period");
        _;
    }
}
