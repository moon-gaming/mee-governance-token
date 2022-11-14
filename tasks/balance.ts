import {initGovernanceToken} from "../config/init";
import {task} from "hardhat/config";

task("balance").setAction(async (args, {ethers}) => {
    let balance;
    try {
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);
        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken.address);
        balance = await governanceToken?.balanceOf(process.env.OWNER_ADDRESS);
        console.log("BALANCE:", balance);
    } catch (err) {
        console.error("BALANCE ERR:", err);
    }
})
