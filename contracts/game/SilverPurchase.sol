// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SilverPurchase is Ownable, Pausable {

    struct PackageInfo {
        uint256 price;
        uint256 silver;
    }

    address public immutable usdcTokenAddress;
    PackageInfo[] public packageInfo;

    event Purchased(address indexed sender, uint256 amount);
    event Withdrawn(address indexed sender, uint256 amount);

    constructor(address _usdcTokenAddress) {
        usdcTokenAddress = _usdcTokenAddress;

        // USDC decimals : 6 
        // 10 USDC for 10,000 Silvers
        packageInfo.push(PackageInfo(10e6, 10000));
        // 50 USDC for 50,000 Silvers
        packageInfo.push(PackageInfo(50e6, 50000));
        // 100 USDC for 100,000 Silvers
        packageInfo.push(PackageInfo(100e6, 100000));
        // 200 USDC for 200,000 Silvers
        packageInfo.push(PackageInfo(200e6, 200000));
        // 450 USDC for 500,000 Silvers
        packageInfo.push(PackageInfo(450e6, 500000));
    }

    function purchase(uint256 index) external whenNotPaused {
        PackageInfo memory package = packageInfo[index];
        IERC20(usdcTokenAddress).transferFrom(msg.sender, address(this), package.price);
        emit Purchased(msg.sender, package.silver);
    }

    function withdraw(address tokenAddress) external onlyOwner {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), balance);
        emit Withdrawn(msg.sender, balance);
    }

    function addPackage(uint256 amount, uint256 silver) external onlyOwner {
        packageInfo.push(PackageInfo(amount, silver));
    }

    function updatePackage(uint256 index, uint256 amount, uint256 silver) external onlyOwner {
        packageInfo[index].price = amount;
        packageInfo[index].silver = silver;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}