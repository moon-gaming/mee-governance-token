import {initGovernanceToken} from "../config/init";
import {task, types} from "hardhat/config";
import {ethers} from "hardhat";
import {expect} from "chai";
import {BigNumber} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const pow18 = BigNumber.from("10").pow(18);

let exchangesWallet: SignerWithAddress;
let publicWallet: SignerWithAddress;

task("getGameOwner")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("GAME OWNER ADDRESS", await governanceToken?.callStatic.getGameOwnerAddress());
        } catch (err) {
            console.error("GET GAME OWNER ERR:", err);
        }
    })

task("addAddress")
    .addParam("round", "round type")
    .addParam("address", "address", "", types.string)
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);
            console.log("ADDRESS", args.address);

            console.log("RESULT:", await governanceToken?.addAddressForDistribution(args.round, args.address));
        } catch (err) {
            console.error("ADD ADDRESS ERR:", err);
        }
    })

task("deleteAddress")
    .addParam("round", "round type")
    .addParam("address", "address")
    .addParam("index", "address index")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);

            console.log("RESULT:", await governanceToken?.deleteAddressForDistribution(args.round, args.address, args.index));
        } catch (err) {
            console.error("DELETE ADDRESS ERR:", err);
        }
    })

task("getAddressList")
    .addParam("round", "round type")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);

            console.log("ADDRESS LIST:", await governanceToken?.getAddressList(args.round));
        } catch (err) {
            console.error("GET ADDRESS LIST ERR:", err);
        }
    })

task("reserveTokens")
    .addParam("round", "round type")
    .addParam("to", "address")
    .addParam("amount", "address index", '', types.int)
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);
            console.log("TO", args.to);
            console.log("AMOUNT", args.amount);

            console.log("RESULT:", await governanceToken?.reserveTokens(args.round, args.to, args.amount));
        } catch (err) {
            console.error("RESERVE TOKENS ERR:", err);
        }
    })

task("totalPending")
    .addParam("round", "round type")
    .addParam("to", "address")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);
            console.log("TO", args.to);

            console.log("RESULT:", await governanceToken?.getTotalPending(args.round, args.to));
        } catch (err) {
            console.error("GET TOTAL PENDING ERR:", err);
        }
    })

task("totalRemainingForSpecificRound")
    .addParam("round", "round type")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);
            console.log("ROUND TYPE", args.round);

            console.log("RESULT:", await governanceToken?.getTotalRemainingForSpecificRound(args.round));
        } catch (err) {
            console.error("GET TOTAL REMAINING FOR SPECIFIC ROUND ERR:", err);
        }
    })

task("totalRemainingForAllRounds")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("RESULT:", await governanceToken?.getTotalRemainingForAllRounds());
        } catch (err) {
            console.error("GET TOTAL REMAINING FOR ALL ROUNDS ERR:", err);
        }
    })

task("totalClaimedForAllRounds")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("RESULT:", await governanceToken?.getTotalClaimedForAllRounds());
        } catch (err) {
            console.error("GET TOTAL CLAIMED FOR ALL ROUNDS ERR:", err);
        }
    })

task("initialReserveAndMint")
    .setAction(async (args, {ethers}) => {

        try {
            const governanceToken = await initGovernanceToken(ethers, process.env.GAME_OWNER!);

            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            const accounts = await ethers.getSigners();

            publicWallet = accounts[0];
            exchangesWallet = accounts[1];

            let publicBalance = await governanceToken?.connect(publicWallet).balanceOf(publicWallet.address);
            console.log("Public wallet balance after initial mint and reserve:", publicBalance);

            let exchangesBalance = await governanceToken?.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            console.log("Exchanges wallet balance after initial mint and reserve:", exchangesBalance);

        } catch (err) {
            console.error("initialReserveAndMint ERR:", err);
        }
    })

