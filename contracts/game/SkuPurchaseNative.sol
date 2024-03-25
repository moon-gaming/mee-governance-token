// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.19;

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
    address payable vaultAddress;

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
        vaultAddress = payable(address(0xb8B405ffB4741f72a22AD44E595D3F1dC004BB29));
        // USDC decimals : 6 
        // 10 USDC for 10,000 Silver
        packageInfo["silver-10k"] = PackageInfo(10e6, 100000);
        // 50 USDC for 50,000 Silver
        packageInfo["silver-50k"] = PackageInfo(50e6, 500000);
        // 100 USDC for 100,000 Silver
        packageInfo["silver-100k"] = PackageInfo(100e6, 1000000);
        // 200 USDC for 200,000 Silver
        packageInfo["silver-200k"] = PackageInfo(200e6, 2000000);
        // 450 USDC for 500,000 Silver
        packageInfo["silver-500k"] = PackageInfo(450e6, 5000000);
    }

    function purchase(string memory sku, uint256 skuAmount) external payable whenNotPaused {
        PackageInfo memory package = packageInfo[sku];
        uint256 totalPaid = msg.value;
        require(package.price > 0 && package.amount > 0, "Package is not purchasable");

        uint256 maticPrice = getMaticPrice(sku);
        uint256 maticValue = maticPrice * skuAmount;
        uint256 amount = package.amount * skuAmount;
        require(totalPaid >= maticValue, "Insufficient Matic Sent");
        
        (bool sent0, ) = vaultAddress.call{value: maticValue}("");
        require(sent0, "Failed to send");
        if(totalPaid - maticValue > 0) {
            (bool sent1, ) = payable(msg.sender).call{value: totalPaid - maticValue}("");
            require(sent1, "Failed to refund");
        }
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

    function batchUpdatePackage(string[] calldata sku, uint256[] calldata price, uint256[] calldata amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for(uint i = 0 ; i < price.length; i ++) {
            packageInfo[sku[i]].price = price[i];
            packageInfo[sku[i]].amount = amount[i];
        } 
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getMaticPrice(string memory sku) public view returns (uint256) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = maticPriceFeed.latestRoundData();
        PackageInfo memory package = packageInfo[sku];
        uint256 maticPrice = (package.price * 1e20 / uint256(price));
        return maticPrice;
    }
}