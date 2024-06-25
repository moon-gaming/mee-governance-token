// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.19;

import '@imtbl/contracts/contracts/token/erc721/preset/ImmutableERC721.sol';

contract LandToken is ImmutableERC721 {
    bytes32 public constant SETTER_ROLE = bytes32("SETTER_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        string memory contractURI,
        address royaltyAllowlist,
        address royaltyReceiver,
        uint96 _feeNumerator
    )
        ImmutableERC721(
            _msgSender(),
            name,
            symbol,
            baseURI,
            contractURI,
            royaltyAllowlist,
            royaltyReceiver,
            _feeNumerator
        )
    {
        _grantRole(SETTER_ROLE, _msgSender());
    }

    function setBaseURIByOperator(string memory baseURI_) public onlyRole(SETTER_ROLE) {
        baseURI = baseURI_;
    }

    function setContractURIByOperator(string memory _contractURI) public onlyRole(SETTER_ROLE) {
        contractURI = _contractURI;
    }

    function setDefaultRoyaltyReceiverByOperator(address receiver, uint96 feeNumerator) public onlyRole(SETTER_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
}