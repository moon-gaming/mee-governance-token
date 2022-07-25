import { ethers } from "hardhat";

async function main() {
    enum RoundType{
      SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
    }

    const [deployer, gameOwner, buyer, signer, ...addrs] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const governanceTokenFactory = await ethers.getContractFactory("GovernanceToken");

    const addressList = addrs.filter((_, index) => index < 6).map((addr) => addr.address);
    const governanceToken = await governanceTokenFactory.deploy(
      8000000000000000, "AoE Governance Token", 18, "OTEM", gameOwner.address, signer.address, addressList);

    await governanceToken.deployed();                          
    console.log("Governance Token address:", governanceToken.address);
    console.log("Governance Token balance of deployer:", await governanceToken.callStatic.balanceOf(deployer.address));

    await governanceToken.connect(gameOwner).setMEEPrice(1);
    const keys = Object.keys(RoundType).filter((v) => isNaN(Number(v)));
    keys.forEach(async (round) => {
      await governanceToken.connect(gameOwner).setTokenPriceMap(round, 120);
    });
   
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  