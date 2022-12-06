import hre from "hardhat";
import {BigNumber} from "ethers";
import {abi} from "../config/initGovernanceToken";
import * as investors from "../utils/test-investors.json";

async function main() {
    const [deployer, owner] = await hre.ethers.getSigners();

    const governanceToken = new hre.ethers.Contract(process.env.GOVERNANCE_TOKEN!, abi, owner);

    console.log("GOVERNANCE TOKEN ADDRESS: ", governanceToken?.address);

    try
    {
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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
