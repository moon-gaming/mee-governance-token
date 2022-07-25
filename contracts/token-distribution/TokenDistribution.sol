// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../token/GameToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract TokenDistribution is GameToken, ERC20 {

    enum RoundType{
        SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
    }
    struct Distribution {
        uint256 vesting; // seconds
        uint256 cliff; // seconds
        uint256 totalRemaining;
        uint256 supply;
        uint256 startTime;
        uint256 vestingGranularity;
    }

    uint internal maxSupply;

    function getRoundTypeByKey(string memory _roundType) internal pure returns (RoundType) {
        bytes memory roundType = bytes(_roundType);
        bytes32 Hash = keccak256(roundType);

        if (Hash == keccak256("SEED") || Hash == keccak256("seed")) return RoundType.SEED;
        if (Hash == keccak256("PRIVATE") || Hash == keccak256("private")) return RoundType.PRIVATE;
        if (Hash == keccak256("PUBLIC") || Hash == keccak256("public")) return RoundType.PUBLIC;
        if (Hash == keccak256("PLAYANDEARN") || Hash == keccak256("playandearn")) return RoundType.PLAYANDEARN;
        if (Hash == keccak256("EXCHANGES") || Hash == keccak256("exchanges")) return RoundType.EXCHANGES;
        if (Hash == keccak256("TREASURY") || Hash == keccak256("treasury")) return RoundType.TREASURY;
        if (Hash == keccak256("ADVISOR") || Hash == keccak256("advisor")) return RoundType.ADVISOR;
        if (Hash == keccak256("TEAM") || Hash == keccak256("team")) return RoundType.TEAM;
        if (Hash == keccak256("SOCIAL") || Hash == keccak256("social")) return RoundType.SOCIAL;
        revert();
    }
}
