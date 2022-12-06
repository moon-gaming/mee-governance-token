import {task} from "hardhat/config";
import {abi} from "../config/initGovernanceToken";

task("balance").setAction(async (args, {ethers}) => {
    let balance;
    try {
        const [owner, game_owner] = await ethers.getSigners();
        console.log("Game Owner", game_owner);
        const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, game_owner);
        balance = await governanceToken?.balanceOf(process.env.OWNER_ADDRESS);
        console.log("BALANCE:", balance);
    } catch (err) {
        console.error("BALANCE ERR:", err);
    }
})
