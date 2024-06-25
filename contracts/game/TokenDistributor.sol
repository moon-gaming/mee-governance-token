// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TokenDistributor is AccessControlUpgradeable {
    struct EventDetail {
        uint256 expirePeriod;
        uint256 amount;
    }

    struct Allocations {
        uint256 amount;
        uint256 expireAt;
        bytes32 eventType;
    }

    IERC20 public token;

    mapping(bytes32 => Allocations[]) public userAllocation;
    mapping(bytes32 => EventDetail) public eventInfo;
    mapping(address => bytes32) public walletToUser;

    bytes32 public constant BACK_OFFICE_ROLE = keccak256("BACK_OFFICE_ROLE");

    event TokensAllocated(bytes32[] userHash, address[][] walletList, bytes32 eventType);
    event TokensClaimed(bytes32 userHash, address indexed wallet, bytes32[] eventList);
    event EventAdded(bytes32 eventType, uint256 amount, uint256 period);

    function initialize(IERC20 _token) public initializer {
        __AccessControl_init_unchained();
        __SkuPurchaseERC20_init_unchained(_token);
    }

    function __SkuPurchaseERC20_init_unchained(IERC20 _token)
        internal
        onlyInitializing
    {
        token = _token;

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(BACK_OFFICE_ROLE, _msgSender());
    }

    function addEvent(bytes32 eventType, uint256 amount, uint256 expirePeriod) external onlyRole(BACK_OFFICE_ROLE) { 
        require(amount > 0, "Zero value");
        eventInfo[eventType] = EventDetail(expirePeriod, amount);

        emit EventAdded(eventType, amount, expirePeriod);
    }

    // Allocate tokens to multiple users
    function allocateTokens(address[][] calldata walletsList, bytes32 eventType) external onlyRole(BACK_OFFICE_ROLE) {
        require(eventInfo[eventType].amount > 0, "Event was not created yet");
        bytes32[] memory userHash = new bytes32[](walletsList.length);

        for (uint256 i = 0; i < walletsList.length; i++) {
            address[] calldata wallets = walletsList[i];
            uint256 amount = eventInfo[eventType].amount;

            require(wallets.length > 0, "Wallet list is empty");
            userHash[i] = getUserHash(wallets);

            for (uint256 j = 0; j < wallets.length; j++) {
                require(wallets[j] != address(0), "Invalid wallet address");
                if(walletToUser[wallets[j]] != bytes32(0) && userHash[i] != walletToUser[wallets[j]]) {
                    require(userAllocation[walletToUser[wallets[j]]].length == 0, "User not claimed the pending rewards");
                }
                walletToUser[wallets[j]] = userHash[i];
            }

            userAllocation[userHash[i]].push(Allocations({
                amount: amount,
                expireAt: block.timestamp + eventInfo[eventType].expirePeriod,
                eventType: eventType
            }));
        }
        emit TokensAllocated(userHash, walletsList, eventType);
    }

    // Claim allocated tokens
    function claimTokens() external {
        address wallet = msg.sender;
        bytes32 userHash = walletToUser[wallet];
        require(userHash != bytes32(0), "Wallet not registered");

        bytes32[] memory eventList;

        require(userAllocation[userHash].length > 0, "No tokens allocated");
        uint256 amount = 0;
        for(uint i = 0 ; i < userAllocation[userHash].length ; i ++) {
            if(userAllocation[userHash][i].expireAt <= block.timestamp) {
                amount += userAllocation[userHash][i].amount;
            }
            eventList[i] = userAllocation[userHash][i].eventType;
        }

        delete userAllocation[userHash];

        require(token.transfer(wallet, amount), "Token transfer failed");

        emit TokensClaimed(userHash, wallet, eventList);
    }

    // Compute a unique hash for a user based on their wallets
    function getUserHash(address[] memory wallets) private pure returns (bytes32) {
        return keccak256(abi.encode(wallets));
    }

    // Owner can withdraw unclaimed tokens after a certain period
    function withdrawUnclaimedTokens(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token.transfer(msg.sender, amount), "Token transfer failed");
    }

    function grantAccess(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BACK_OFFICE_ROLE, account);
    }
}
