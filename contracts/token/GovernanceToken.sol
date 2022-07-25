// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../token-distribution/SaleRounds.sol";
import "./GameToken.sol";
import "../token-distribution/TokenDistribution.sol";
import "hardhat/console.sol";

contract GovernanceToken is IERC165, SaleRounds {
    using ERC165Checker for address; 

    bytes4 public constant IID_IERC20 = type(IERC20).interfaceId;
    bytes4 public constant IID_IERC165 = type(IERC165).interfaceId;

    uint256 private meePrice;
    uint8 private decimalUnits;
    uint constant private MAX_UINT256 = type(uint256).max;

    constructor(uint256 _initialAmount, string memory _tokenName,
                uint8 _decimalUnits, string memory _tokenSymbol,
                address _gameOwnerAddress, address _signatory, address[] memory walletAddresses )
                ERC20(_tokenName, _tokenSymbol)
                SaleRounds(_initialAmount, _decimalUnits, walletAddresses)
                GameToken(_gameOwnerAddress, _signatory){

        decimalUnits = _decimalUnits;
    }

    function decimals() public view virtual override returns (uint8) {
        return decimalUnits;
    }

    function setMEEPrice(uint256 _newPrice) public onlyGameOwner {
       meePrice = _newPrice;
    }

    function getMEEPrice() external onlyGameOwner view returns (uint256){
        return meePrice;
    }
    function isERC20() external view returns (bool) {
        return address(this).supportsInterface(IID_IERC20);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == IID_IERC20 || interfaceId == IID_IERC165;
    }
}
