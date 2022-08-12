import { ethers } from "hardhat";

async function main() {
    enum RoundType{
      SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
    }

    const [deployer, gameOwner, ...addrs] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const governanceTokenFactory = await ethers.getContractFactory("GovernanceToken");

    const governanceToken = await governanceTokenFactory.deploy(
      8000000000000000, "AoE Governance Token", 18, "MEE", process.env.GAME_OWNER_ADRESS, process.env.SIGNATORY_ADDRESS, { gasLimit: 6e6 });

    console.log("Governance Token deployment in Progress:", governanceToken.address);
    await governanceToken.deployed();
    
    console.log("Governance Token deployment completed");
    console.log("Governance Token balance of deployer:", await governanceToken.balanceOf(deployer.address));

    const addressList = [process.env.EXCHANGES_WALLET_ADDRESS, process.env.PLAYANDEARN_WALLET_ADDRESS,
      process.env.SOCIAL_WALLET_ADDRESS, process.env.TEAM_WALLET_ADDRESS, process.env.TREASURY_WALLET_ADDRESS ];

    await governanceToken.connect(gameOwner).initialReservAndMint(addressList, {gasLimit: 5e5});
    console.log("Governance token initial reserv and minting has been completed");

    await governanceToken.connect(gameOwner).setMEEPrice(1, {gasLimit: 4e4});
    console.log("Governance token MEE Price has been setted");
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  