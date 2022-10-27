// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GameOwner is Ownable {
    address private gameOwnerAddress;

    using Address for address;

    /**
     * Constructor method which calls initial setters for all the contracts
     */
    constructor(address _gameOwnerAddress) {
        gameOwnerAddress = _gameOwnerAddress;
    }

    /**
     * Setter method for gameOwnerAddress variable
     */
    function setGameOwnerAddress(address _newAddress) public onlyOwner {
        gameOwnerAddress = _newAddress;
    }

    /**
     * Getter method for gameOwnerAddress variable which returns address
     * @return address
     */
    function getGameOwnerAddress() public view onlyOwner returns(address) {
        return gameOwnerAddress;
    }

    /**
     * Method which checks if the address is game owner address
     * @return bool
     **/
    function isGameOwnerAddress() internal view returns(bool) {
        return gameOwnerAddress == _msgSender();
    }

    /**
     * Modifier which restricts method execution to onlyGameOwner address
     */
    modifier onlyGameOwner() {
        require(isGameOwnerAddress(), "GameOwner: caller is not the game address");
        _;
    }
}
