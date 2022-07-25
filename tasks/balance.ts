import { getAccount, initGovernanceToken } from "../config/init";
import { task } from "hardhat/config";

task("balance").setAction(async(args, {ethers}) => {
  
    let balance;
    try{
      const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);
      const buyer = await getAccount(ethers, process.env.OWNER!);

      console.log("GOVERNANCE TOKEN ADDRESS", governanceToken.address);

      balance = await governanceToken?.balanceOf(await buyer?.getAddress());//ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await signer.getAddress())));
      console.log("BALANCE:", balance);
    }catch(err){
      console.error("BALANCE ERR:", err);
    }
})
  