// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.19;

import '@imtbl/contracts/contracts/token/erc721/preset/ImmutableERC721.sol';

contract LandToken is ImmutableERC721 {
     constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        string memory contractURI,
        address royaltyAllowlist,
        uint96 _feeNumerator
    )
        ImmutableERC721(
            _msgSender(),
            name,
            symbol,
            baseURI,
            contractURI,
            royaltyAllowlist,
            _msgSender(),
            _feeNumerator
        )
    {}
}