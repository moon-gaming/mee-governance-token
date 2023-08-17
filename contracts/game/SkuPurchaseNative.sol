// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract SkuPurchaseNative is AccessControlUpgradeable, PausableUpgradeable {

    struct PackageInfo {
        uint256 price;
        uint256 amount;
    }
    AggregatorV3Interface internal maticPriceFeed;

    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
    mapping(string => PackageInfo) public packageInfo;

    event Purchased(address indexed sender, string sku, uint256 skuAmount, uint256 price, uint256 amount);
    event Withdrawn(address indexed sender, address token, uint256 amount);

    function initialize() public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __SkuPurchaseERC20_init_unchained();
    }

    function __SkuPurchaseERC20_init_unchained()
        internal
        onlyInitializing
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(WITHDRAW_ROLE, _msgSender());
        maticPriceFeed = AggregatorV3Interface(0xAB594600376Ec9fD91F8e885dADF0CE036862dE0);

        // USDC decimals : 6 
        // 10 USDC for 10,000 Silver
        packageInfo["silver-10k"] = PackageInfo(10e6, 10000);
        // 50 USDC for 50,000 Silver
        packageInfo["silver-50k"] = PackageInfo(50e6, 50000);
        // 100 USDC for 100,000 Silver
        packageInfo["silver-100k"] = PackageInfo(100e6, 100000);
        // 200 USDC for 200,000 Silver
        packageInfo["silver-200k"] = PackageInfo(200e6, 200000);
        // 450 USDC for 500,000 Silver
        packageInfo["silver-500k"] = PackageInfo(450e6, 500000);
    }

    function purchase(string memory sku, uint256 skuAmount) external payable whenNotPaused {
        PackageInfo memory package = packageInfo[sku];
        require(package.price > 0 && package.amount > 0, "Package is not purchasable");

        uint256 maticPrice = getMaticPrice();
        uint256 maticValue = package.price * 1e20 / maticPrice;
        uint256 amount = package.amount * skuAmount;
        require(msg.value >= maticValue, "Insufficient Balance");
        
        (bool sent, bytes memory data) = payable(msg.sender).call{value: msg.value - maticValue}("");
        require(sent, "Failed to re-pay");
        emit Purchased(msg.sender, sku, skuAmount, maticValue, amount);
    }

    function withdraw(address tokenAddress, address valutAddress) external onlyRole(WITHDRAW_ROLE) {
        uint256 balance = IERC20Upgradeable(tokenAddress).balanceOf(address(this));
        IERC20Upgradeable(tokenAddress).transfer(valutAddress, balance);
        emit Withdrawn(valutAddress, tokenAddress, balance);
    }

    function withdrawNative(address payable valutAddress) external onlyRole(WITHDRAW_ROLE) payable {
        uint256 balance = address(this).balance;
        (bool sent, bytes memory data) = valutAddress.call{value: balance}("");
        require(sent, "Failed to send Ether");
        emit Withdrawn(valutAddress, address(0), balance);
    }

    function updatePackage(string memory sku, uint256 price, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        packageInfo[sku].price = price;
        packageInfo[sku].amount = amount;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getMaticPrice() public view returns (uint256) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = maticPriceFeed.latestRoundData();
        return uint256(price);
    }
}