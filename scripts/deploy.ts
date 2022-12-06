import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // Governance Token deployment
    console.log("Deploying Governance contract with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const governanceTokenFactory = await hre.ethers.getContractFactory("GovernanceToken");

    const addressList = [process.env.PUBLIC_WALLET_ADDRESS, process.env.EXCHANGES_WALLET_ADDRESS, process.env.PLAYANDEARN_WALLET_ADDRESS,
        process.env.SOCIAL_WALLET_ADDRESS, process.env.TEAM_WALLET_ADDRESS, process.env.TREASURY_WALLET_ADDRESS, process.env.ADVISORS_WALLET_ADDRESS];

    const governanceToken = await governanceTokenFactory.deploy(
        "MEE Governance Token", 18, "MEE", process.env.GAME_OWNER_ADDRESS,
        addressList,
        {gasLimit: 6e6});

    console.log("Governance Token deployment in Progress:", governanceToken.address);
    await governanceToken.deployed();

    console.log("Governance Token deployment completed");
    console.log("Governance Token balance of deployer:", (await governanceToken.balanceOf(deployer.address)).toString());

    /*
    // Staking Contract deployment
    console.log("Deploying Staking contract with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const stakingRewardsFactory = await hre.ethers.getContractFactory("StakingRewards");

    const stakingRewards = await stakingRewardsFactory.deploy(
        governanceToken.address, governanceToken.address, {gasLimit: 6e6});

    console.log("Staking Contract deployment in Progress:", stakingRewards.address);
    await stakingRewards.deployed();

    console.log("Staking Contact deployment completed");
    */
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
