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

    // Total staked
    uint256 private _totalSupply;

    // User address => staked amount
    mapping(address => mapping(LockType => StakeInfo[])) private stakeInfo;

    mapping(LockType => mapping(LandTier => LockInfo)) private lockPeriod;

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
        lockPeriod[LockType.LAND][LandTier.V1_LAND] = LockInfo(
            90 days,
            300 ether
        );
        lockPeriod[LockType.LAND][LandTier.V2_LAND] = LockInfo(
            90 days,
            300 ether
        );
        lockPeriod[LockType.LAND][LandTier.V3_LAND] = LockInfo(
            90 days,
            300 ether
        );
        lockPeriod[LockType.LAND][LandTier.V4_LAND] = LockInfo(
            90 days,
            300 ether
        );
        lockPeriod[LockType.LAND][LandTier.V5_LAND] = LockInfo(
            90 days,
            300 ether
        );
        lockPeriod[LockType.LOTTERY][LandTier.V1_LAND] = LockInfo(
            90 days,
            1 ether
        );
        lockPeriod[LockType.LOTTERY][LandTier.V2_LAND] = LockInfo(
            90 days,
            1 ether
        );
        lockPeriod[LockType.LOTTERY][LandTier.V3_LAND] = LockInfo(
            90 days,
            1 ether
        );
        lockPeriod[LockType.LOTTERY][LandTier.V4_LAND] = LockInfo(
            90 days,
            1 ether
        );
        lockPeriod[LockType.LOTTERY][LandTier.V5_LAND] = LockInfo(
            90 days,
            1 ether
        );
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(
        address account,
        LockType lockType,
        LandTier landTier
    ) external view returns (uint256) {
        uint256 balance = 0;
        for (uint8 i = 0; i < stakeInfo[account][lockType].length; i++) {
            if (stakeInfo[account][lockType][i].landTier == landTier) {
                balance = balance.add(stakeInfo[account][lockType][i].balance);
            }
        }
        return balance;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(
        uint256 amount,
        LockType lockType,
        LandTier landTier
    ) external nonReentrant whenNotPaused {
        require(
            (lockType == LockType.LOTTERY && amount > 0) ||
                (lockType == LockType.LAND && amount == 1),
            "Wrong amount for Lottery or Land"
        );
        StakeInfo[] storage info = stakeInfo[msg.sender][lockType];
        LockInfo memory lockInfo = lockPeriod[lockType][landTier];
        require(
            lockType == LockType.LOTTERY || info.length == 0,
            "Cannot stake for multiple lands"
        );

        _totalSupply = _totalSupply.add(amount);

        info.push(
            StakeInfo(
                lockInfo.minAmount * amount,
                uint64(block.timestamp) + lockInfo.period,
                landTier
            )
        );

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(
            msg.sender,
            lockInfo.minAmount * amount,
            amount,
            lockType,
            landTier
        );
    }

    function withdraw(LockType lockType, LandTier landTier)
        public
        nonReentrant
        lockPeriodCheck(lockType, landTier)
    {
        StakeInfo[] storage info = stakeInfo[msg.sender][lockType];
        uint256 balance = 0;
        _totalSupply = _totalSupply.sub(balance);
        for (uint8 i = uint8(info.length) - 1; i >= 0; i--) {
            if (info[i].landTier == landTier) {
                balance = balance.add(info[i].balance);
                info[info.length - 1] = info[i];
                info.pop();
            }
        }
        stakingToken.safeTransfer(msg.sender, balance);
        emit Withdrawn(msg.sender, balance, lockType, landTier);
    }

    // Update lock period & ticket price
    function updateLockPeriod(LockType lockType, LandTier landTier, uint64 period) external onlyOwner {
        require(period > 0, "Lock period is 0");
        lockPeriod[lockType][landTier].period = period;
    }

    function updateLockLimitation(LockType lockType, LandTier landTier, uint256 limit) external onlyOwner {
        require(limit > 0, "Limit should be bigger than 0");
        lockPeriod[lockType][landTier].minAmount = limit;
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

    modifier lockPeriodCheck(LockType lockType, LandTier landTier) {
        StakeInfo[] storage info = stakeInfo[msg.sender][lockType];
        for (uint8 i = 0; i < info.length; i++) {
            if (info[i].landTier == landTier) {
                require(
                    info[i].unlockTime > block.timestamp,
                    "Lock period was not ended yet"
                );
            }
        }
        _;
    }
}
