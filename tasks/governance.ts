import { getAccount, initGovernanceToken } from "../config/init";
import { task, types } from "hardhat/config";

task("buyHeroByGovernance")
    .addParam("tokenid", "Token Id")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.OWNER_PK_PK!);
        // const signer = await getSigner(ethers, process.env.BUYER!);
        const signer = await getAccount(ethers, process.env.SIGNATORY_PK!);
        const sender = await getAccount(ethers, process.env.OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("TOKEN ID", args.tokenid);

        // let message = ethers.utils.solidityPack(["address", "address", "uint128"], [governanceToken?.address, signer?.address, args.tokenid.toString()]);
        // const messageHash = ethers.utils.solidityKeccak256(['bytes'], [message]);
        // let signature = await signer?.signMessage(ethers.utils.arrayify(messageHash));

        const nonceNumber = await ethers.provider.getTransactionCount(sender.address);
        console.log("NONCE NUMBER:", nonceNumber);

        let message = ethers.utils.solidityPack(["string", "address", "uint128", "uint256"],
         ["buyHeroByGovernance", sender?.address, args.tokenid.toString(), nonceNumber.toString()]);

        console.log("MESSAGE PACKED", message); 

        const messageHash = ethers.utils.solidityKeccak256(['bytes'], [message]);
        let signature = await signer?.signMessage(ethers.utils.arrayify(messageHash));
    
        await governanceToken?.buyHeroByGovernance(signature, args.tokenid, nonceNumber, {gasLimit: 500000});
    }catch(err){
      console.error("BUY HERO BY TOKEN ERR:", err);
    }
})

task("getGameOwner")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
    
        console.log("GAME OWNER ADDRESS", await governanceToken?.callStatic.getGameOwnerAddress());
    }catch(err){
      console.error("GET GAME OWNER ERR:", err);
    }
})

task("getSignatory")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
    
        console.log("GAME SIGNATORY", await governanceToken?.callStatic.getSignatory());
    }catch(err){
      console.error("GET SIGNATORY ERR:", err);
    }
})

task("setTokenPrice")
    .addParam("round", "round type")
    .addParam("price", "MEE token price")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
        console.log("PRICE", args.price);
    
        await governanceToken?.setTokenPriceMap(args.round, args.price);
    }catch(err){
      console.error("SET TOKEN PRICE ERR:", err);
    }
})

task("getTokenPrice")
    .addParam("round", "round type")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
    
        console.log("TOKEN PRICE", await governanceToken?.callStatic.getTokenPriceMap(args.round));
    }catch(err){
      console.error("GET TOKEN PRICE ERR:", err);
    }
})

task("setActiveRound")
    .addParam("round", "round type")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
    
        await governanceToken?.setActiveRound(args.round);
    }catch(err){
      console.error("SET ACTIVE ROUND ERR:", err);
    }
})

task("addAddress")
    .addParam("round", "round type")
    .addParam("address", "address", "", types.string)
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
        console.log("ADDRESS", args.address);
    
        console.log("RESULT:", await governanceToken?.addAddressForDistribution(args.round, args.address));
    }catch(err){
      console.error("ADD ADDRESS ERR:", err);
    }
})

task("deleteAddress")
    .addParam("round", "round type")
    .addParam("address", "address")
    .addParam("index", "address index")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
    
        console.log("RESULT:", await governanceToken?.deleteAddressForDistribution(args.round, args.address, args.index));
    }catch(err){
      console.error("DELETE ADDRESS ERR:", err);
    }
})

task("getAddressList")
    .addParam("round", "round type")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
    
        console.log("ADDRESS LIST:", await governanceToken?.getAddressList(args.round));
    }catch(err){
      console.error("GET ADDRESS LIST ERR:", err);
    }
})

task("reserveTokens")
    .addParam("round", "round type")
    .addParam("to", "address")
    .addParam("amount", "address index", '', types.int)
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
        console.log("TO", args.to);
        console.log("AMOUNT", args.amount);
    
        console.log("RESULT:", await governanceToken?.reserveTokens(args.round, args.to, args.amount));
    }catch(err){
      console.error("RESERVE TOKENS ERR:", err);
    }
})

task("totalPending")
    .addParam("round", "round type")
    .addParam("to", "address")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
        console.log("TO", args.to);
    
        console.log("RESULT:", await governanceToken?.getTotalPending(args.round, args.to));
    }catch(err){
      console.error("GET TOTAL PENDING ERR:", err);
    }
})

task("totalRemainingForSpecificRound")
    .addParam("round", "round type")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
        console.log("ROUND TYPE", args.round);
    
        console.log("RESULT:", await governanceToken?.getTotalRemainingForSpecificRound(args.round));
    }catch(err){
      console.error("GET TOTAL REMAINING FOR SPECIFIC ROUND ERR:", err);
    }
})

task("totalRemainingForAllRounds")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
    
        console.log("RESULT:", await governanceToken?.getTotalRemainingForAllRounds());
    }catch(err){
      console.error("GET TOTAL REMAINING FOR ALL ROUNDS ERR:", err);
    }
})

task("totalClaimedForAllRounds")
    .setAction(async(args, {ethers}) => {
        
    try{
        const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

        console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
    
        console.log("RESULT:", await governanceToken?.getTotalClaimedForAllRounds());
    }catch(err){
      console.error("GET TOTAL CLAIMED FOR ALL ROUNDS ERR:", err);
    }
})

task("initialReservAndMint")
  .setAction(async(args, {ethers}) => {
    
  try{
      const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER_PK!);

      console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

      const addressList = [process.env.EXCHANGES_WALLET_ADDRESS, process.env.PLAYANDEARN_WALLET_ADDRESS,
      process.env.SOCIAL_WALLET_ADDRESS, process.env.TEAM_WALLET_ADDRESS, process.env.TREASURY_WALLET_ADDRESS ];

      await governanceToken?.initialReservAndMint(addressList);
  }catch(err){
    console.error("initialReservAndMint ERR:", err);
  }
})

