Governance Token(OTEM) to trade in AoE

COMPILE

> npx hardhat compile

RUN TESTS

> npx hardhat test

DEPLOY CONTRACTS TO SPECIFIED NETWORK

> npx hardhat run scripts/deploy.js --network #network-name  `sample: ropsten, matic, look at networks in hardhat.config.js`

SAMPLE COMMANDS

> hh accounts
> hh setGameOwner --address 0x41F30b058ec6aff3d858eE16FC16B9275affdb81 `optional command`
> hh getGameOwner `optional command`
> hh balance
> hh setTokenPrice --round seed --price 150
> hh getHeroTokenPrice --round seed
> hh setMEEPrice --price 10
> hh setActiveRound --round exhange
> hh addAddress --round seed --address 0x00.. 0x01.. 0x02..
> hh deleteAddress --round seed --address 0x00..
> hh setActiveRound --round private
> hh addAddress --round private --address '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199,0xdD2FD4581271e230360230F9337D5c0430Bf44C0'
> hh getAddressList --round private
> hh deleteAddress --round private --address 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --index 0
> hh reserveTokens --round private --to 0xBcd4042DE499D14e55001CcbB24a551F3b954096 --amount 10
> hh totalPending  --round private --to 0xBcd4042DE499D14e55001CcbB24a551F3b954096
> hh totalRemainingForSpecificRound --round private
> hh totalRemainingForAllRounds
> hh totalClaimedForAllRounds
