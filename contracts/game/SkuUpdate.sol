// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ISkuPurchase {
    function updatePackage(string memory sku, uint256 price, uint256 amount) external;
}

contract SkuUpdate is AccessControlUpgradeable {

    bytes32 public constant UPDATE_ROLE = keccak256("UPDATE_ROLE");
    address[] public contractList;

    event PriceUpdated(string sku, uint256 price, uint256 amount);

    function initialize(address[] memory _contractList) public initializer {
        __AccessControl_init_unchained();
        __SkuUpdate_init_unchained(_contractList);
    }

    function __SkuUpdate_init_unchained(address[] memory _contractList)
        internal
        onlyInitializing
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(UPDATE_ROLE, _msgSender());
        contractList = _contractList;
    }

    function grantUpdateRole(address account) onlyRole(DEFAULT_ADMIN_ROLE) external{
        _grantRole(UPDATE_ROLE, account);
    }
    
    function revokeUpdateRole(address account) onlyRole(DEFAULT_ADMIN_ROLE) external{
        _revokeRole(UPDATE_ROLE, account);
    }

    function updatePackagePrice(string memory sku, uint256 price, uint256 amount) external onlyRole(UPDATE_ROLE) {
        for(uint256 i = 0 ; i < contractList.length ; i ++) {
            ISkuPurchase(contractList[i]).updatePackage(sku, price, amount);
        }
        emit PriceUpdated(sku, price, amount);
    }
}