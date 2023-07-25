// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract SilverPurchaseERC20 is AccessControlUpgradeable, PausableUpgradeable {

    struct PackageInfo {
        uint256 price;
        uint256 silver;
    }

    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
    address public usdcTokenAddress;
    mapping(string => PackageInfo) public packageInfo;

    event Purchased(address indexed sender, string sku, uint256 price, uint256 amount);
    event Withdrawn(address indexed sender, address token, uint256 amount);

    function initialize(address _usdcTokenAddress) public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __SilverPurchaseERC20_init_unchained(_usdcTokenAddress);
    }

    function __SilverPurchaseERC20_init_unchained(address _usdcTokenAddress)
        internal
        onlyInitializing
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(WITHDRAW_ROLE, _msgSender());
        usdcTokenAddress = _usdcTokenAddress;

        // USDC decimals : 6 
        // 10 USDC for 10,000 Silvers
        packageInfo["silver-10k"] = PackageInfo(10e6, 10000);
        // 50 USDC for 50,000 Silvers
        packageInfo["silver-50k"] = PackageInfo(50e6, 50000);
        // 100 USDC for 100,000 Silvers
        packageInfo["silver-100k"] = PackageInfo(100e6, 100000);
        // 200 USDC for 200,000 Silvers
        packageInfo["silver-200k"] = PackageInfo(200e6, 200000);
        // 450 USDC for 500,000 Silvers
        packageInfo["silver-500k"] = PackageInfo(450e6, 500000);
    }

    function purchase(string memory index) external whenNotPaused {
        PackageInfo memory package = packageInfo[index];
        require(package.price > 0 && package.silver > 0, "Package is not purchasable");
        IERC20Upgradeable(usdcTokenAddress).transferFrom(msg.sender, address(this), package.price);
        emit Purchased(msg.sender, index, package.price, package.silver);
    }

    function withdraw(address tokenAddress) external onlyRole(WITHDRAW_ROLE) {
        uint256 balance = IERC20Upgradeable(tokenAddress).balanceOf(address(this));
        IERC20Upgradeable(tokenAddress).transfer(msg.sender, balance);
        emit Withdrawn(msg.sender, tokenAddress, balance);
    }

    function updatePackage(string memory index, uint256 amount, uint256 silver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        packageInfo[index].price = amount;
        packageInfo[index].silver = silver;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}