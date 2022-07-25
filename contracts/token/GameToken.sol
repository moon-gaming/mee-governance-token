// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract GameToken is Ownable {
    address private gameOwnerAddress;
    address private signatory;

    using Address for address;

    constructor(address _gameOwnerAddress, address _signatory) {
        gameOwnerAddress = _gameOwnerAddress;
        signatory = _signatory;
    }

    function getGameOwnerAddress() public view onlyOwner returns(address){
        return gameOwnerAddress;
    }

    function getSignatory() public view onlyOwner returns(address){
        return signatory;
    }

    function isGameOwnerAddress() internal view returns(bool){
        return gameOwnerAddress == _msgSender();
    }

    modifier onlyGameOwner() {
        require(isGameOwnerAddress(), "GameToken: caller is not the game adress");
        _;
    }
}