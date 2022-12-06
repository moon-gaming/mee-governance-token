import {initGovernanceToken} from "../config/init";
import {abi} from "../config/initGovernanceToken";

import {task, types} from "hardhat/config";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import * as investors from "../utils/test-investors.json";
import {BigNumber} from "ethers";
import {readFile} from 'fs/promises';

task("getGameOwner")
    .setAction(async (args, {ethers}) => {

        try {
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("GAME OWNER ADDRESS", await governanceToken?.callStatic.getGameOwnerAddress());
        } catch (err) {
            console.error("GET GAME OWNER ERR:", err);
        }
    })

task("makeAllocationsForInvestors")
    .setAction(async (args, {ethers}) => {
        try {
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            enum RoundType {
                SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
            }

            let vesting_rounds: RoundType[] = [RoundType.SEED, RoundType.PRIVATE, RoundType.PUBLIC, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL];

            const users: any = investors.wallets;

            const pow18 = BigNumber.from("10").pow(18);

            for (let i = 0; i < users.length; i++) {
                let round = RoundType[vesting_rounds[parseInt(RoundType[users[i].round])]];
                console.log("ROUND TYPE: ", round);
                console.log("TO: ", users[i].address);
                console.log("AMOUNT: ", pow18.mul(users[i].amount));
                await governanceToken.reserveTokens(round, users[i].address, pow18.mul(users[i].amount));
            }
        } catch (err) {
            console.error("RESERVE TOKENS ERR: ", err);
        }
    })

task("makeAllocationsForInvestorsFromUrl")
    .addParam("investorsListUrl", "round type")
    .setAction(async (args, {ethers}) => {
        try {
            const governanceToken = await initGovernanceToken(ethers);

            console.log("GOVERNANCE TOKEN ADDRESS: ", governanceToken?.address);

            enum RoundType {
                SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
            }

            let vesting_rounds: RoundType[] = [RoundType.SEED, RoundType.PRIVATE/*, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL*/];


            const pow18 = BigNumber.from("10").pow(18);

            // @ts-ignore
            const importList = JSON.parse(await readFile(args.investorsListUrl));

            const users: any = importList.wallets;

            for (let i = 0; i < users.length; i++) {
                let round = RoundType[vesting_rounds[parseInt(RoundType[users[i].round])]];
                console.log("ROUND TYPE: ", round);
                console.log("TO: ", users[i].address);
                console.log("AMOUNT: ", pow18.mul(users[i].amount));
                await governanceToken.reserveTokens(round, users[i].address, pow18.mul(users[i].amount));
            }
        } catch (err) {
            console.error("RESERVE TOKENS ERR: ", err);
        }
    })

task("reserveTokens")
    .addParam("round", "round type")
    .addParam("to", "address")
    .addParam("amount", "address index", '', types.int)
    .setAction(async (args, {ethers}) => {

        try {
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            const pow18 = BigNumber.from("10").pow(18);

            console.log("ROUND TYPE", args.round);
            console.log("TO", args.to);
            console.log("AMOUNT", pow18.mul(args.amount));

            console.log("RESULT:", await governanceToken?.reserveTokens(args.round, args.to, pow18.mul(args.amount)));
        } catch (err) {
            console.error("RESERVE TOKENS ERR:", err);
        }
    })

task("totalPending")
    .addParam("round", "round type")
    .addParam("to", "address")
    .setAction(async (args, {ethers}) => {

        try {
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
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
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
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
            const [owner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);
            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("RESULT:", await governanceToken?.getTotalRemainingForAllRounds());
        } catch (err) {
            console.error("GET TOTAL REMAINING FOR ALL ROUNDS ERR:", err);
        }
    })

task("totalClaimedForAllRounds")
    .setAction(async (args, {ethers}) => {

        try {
            const [owner, gameOwner] = await ethers.getSigners();
            const governanceToken = new ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, gameOwner);
            console.log("GOVERNANCE TOKEN ADDRESS", governanceToken?.address);

            console.log("RESULT:", await governanceToken?.getTotalClaimedForAllRounds());
        } catch (err) {
            console.error("GET TOTAL CLAIMED FOR ALL ROUNDS ERR:", err);
        }
    })

