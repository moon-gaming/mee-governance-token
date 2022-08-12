Governance Token(MEE) to trade in AoE

COMPILE

> npx hardhat compile

RUN TESTS

> npx hardhat test  
> npm run coverage:local `with coverage`

DEPLOY CONTRACTS TO SPECIFIED NETWORK

> npx hardhat run scripts/deploy.js --network #network-name  `sample: ropsten, matic, look at networks in hardhat.config.js`

SAMPLE COMMANDS

> npx hardhat accounts  
> npx hardhat setGameOwner --address 0x41F30b058ec6aff3d858eE16FC16B9275affdb81 `optional command`  
> npx hardhat getGameOwner `optional command`
> npx hardhat getsignatory
> npx hardhat balance  
> npx hardhat setTokenPrice --round seed --price 150
> npx hardhat setActiveRound --round exhange  
> npx hardhat addAddress --round seed --address 0x00..
> npx hardhat deleteAddress --round seed --address 0x00.. --index 0
> npx hardhat setActiveRound --round private  
> npx hardhat addAddress --round private --address '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199,0xdD2FD4581271e230360230F9337D5c0430Bf44C0'  
> npx hardhat getAddressList --round private  
> npx hardhat deleteAddress --round private --address 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --index 0  
> npx hardhat reserveTokens --round private --to 0xBcd4042DE499D14e55001CcbB24a551F3b954096 --amount 10  
> npx hardhat totalPending  --round private --to 0xBcd4042DE499D14e55001CcbB24a551F3b954096  
> npx hardhat totalRemainingForSpecificRound --round private  
> npx hardhat totalRemainingForAllRounds  
> npx hardhat totalClaimedForAllRounds  
