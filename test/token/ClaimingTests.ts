import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {time} from "@nomicfoundation/hardhat-network-helpers";

import * as investors from '../../utils/test-investors.json';

const pow18 = BigNumber.from("10").pow(18);

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

describe("Claiming Tests", function () {
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let outsider: SignerWithAddress;
    let addrs: SignerWithAddress[];
    let users: any[];

    let exchangesWallet: SignerWithAddress;

    let vesting_rounds: RoundType[] = [RoundType.SEED, RoundType.PRIVATE/*, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL*/];

    async function deployToken(purpose: string)
    {
        // Get the ContractFactory and Signers here.
        let factory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);

        let governanceToken = await factory.deploy(purpose, 18, "MEE", gameOwner.address, addressList);

        return governanceToken;
    }

    describe("Exchange Wallet Claiming", () => {
        // Deploy contract once, and make some quick assumptions.
        before(async () => {
            const accounts = await ethers.getSigners();
            [owner, gameOwner, ...addrs] = accounts;

            exchangesWallet = addrs[1];

            // Get the ContractFactory and Signers here.
            governanceToken = await deployToken("Exchange Claiming Tests");
            await governanceToken.connect(gameOwner).beginVesting();
        });

        it("Exchanges Wallet successfully claims first 30M after 1 month, and 60M are remaining", async () => {
            let contract = governanceToken;

            let oldbalance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            time.increase(time.duration.days(30));

            await contract.connect(exchangesWallet).claimTokens(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            let balance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance.sub(oldbalance)).to.equal(pow18.mul(30_000_000), "New Tokens in Wallet.");

            let pending = await contract.connect(exchangesWallet).getTotalUnclaimed(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(pending).to.equal(pow18.mul(60_000_000), "Remaining Unclaimed Tokens.");
        });

        it("Exchanges Wallet successfully claims remainder, and nothing is left unclaimed", async () => {
            let contract = governanceToken;
            time.increase(time.duration.days(200));

            await contract.connect(exchangesWallet).claimTokens(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            let balance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance).to.equal(pow18.mul(150_000_000), "Total Tokens in Wallet.");

            let pending = await contract.connect(exchangesWallet).getTotalUnclaimed(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(pending).to.equal(0, "Remaining Unclaimed Tokens.");
        });
    });

    describe("General Claiming", () =>
    {
        //Reserved value that multiple users use.
        const reserve = pow18.mul(1_000);

        // Deploy contract once, and make some quick assumptions.
        before(async () => {
            const accounts = await ethers.getSigners();
            [owner, gameOwner, ...addrs] = accounts;

            outsider = accounts[99];
            users = investors.wallets;

            exchangesWallet = addrs[1];

            // Get the ContractFactory and Signers here.
            governanceToken = await deployToken("Generic Claiming Tests");

            for (let i = 0; i < users.length; i++) {
                let round = RoundType[vesting_rounds[parseInt(RoundType[users[i].round])]];
                await governanceToken.connect(gameOwner).reserveTokens(round, users[i].address, reserve);
            }
        });

        it("cannot claim before vesting has begun.", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
                ).to.be.revertedWith("Token vesting has not yet begun.");
            });

        it("cannot claim before tokens are claimable", async () => {
            await expect(
                governanceToken.claimTokens(RoundType[RoundType.SEED], users[0].address)
            ).to.be.revertedWith("Token vesting has not yet begun.");
        });

        it("non-owners may not start vesting", async () => {
        await expect(
            governanceToken.connect(outsider).beginVesting()
            ).to.be.revertedWith("GameOwner: caller is not the game address");
        });

        it("owner can start vesting", async () => {
            governanceToken.connect(gameOwner).beginVesting();
        });

        it("owner can start vesting only once", async () => {
            await expect(
                governanceToken.connect(gameOwner).beginVesting()
            ).to.be.revertedWith("Start vesting time was already set.")
        });

        it("vestingStartTime is equal to the latest block time after starting vesting", async () => {
            governanceToken.connect(gameOwner).beginVesting();
            const vestingStartTime = await governanceToken.connect(gameOwner).getVestingTime();
            const latestTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
            // beginVesting() set the vestingStartTime to a current block.timestamp
            // but while calling next method execution - getVestingTime() block.timestamp increased for 1 second
            // hence we need to subtract 1 second from the timestamp calculation in order to have correct comparison
            const timestampToCompare = BigNumber.from(latestTimeStamp - 1);
            expect(vestingStartTime).to.be.equal(timestampToCompare);
        });

        it("cannot claim without having a balance", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
            ).to.be.revertedWith("Nothing to claim.");
        });

        it("cannot claim for someone else", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[vesting_rounds[0]], users[0].address)
            ).to.be.revertedWith("Cannot claim for another account.");
        });

        it("all users can claim entirety of their tokens in the distant future", async () => {
            time.increase(time.duration.years(10));

            const accounts = await ethers.getSigners();

            for (let i = 0; i < users.length; i++) {
                let user = users[i];
                let userSigner = accounts.filter(account => account.address === user.address);
                let connection = governanceToken.connect(userSigner[0]);
                console.log("Account which is claiming: ", user.address);
                let round = RoundType[vesting_rounds[parseInt(RoundType[user.round])]];
                let claimBalance = await connection.getClaimableBalance(round, user.address);
                console.log("Account's claimable balance: ", claimBalance.div(pow18).toString());
                await connection.claimTokens(round, user.address);
                let balance = await connection.balanceOf(user.address);
                expect(balance).to.equal(reserve);

                //Ensure user has no balance left!
                let remainder = await connection.getClaimableBalance(round, user.address);
                expect(remainder).to.equal(0);
            }
        });

        it("after claiming, users have no claimable balances left", async () => {
            time.increase(time.duration.years(10));

            const accounts = await ethers.getSigners();

            for (let i = 0; i < users.length; i++) {
                let user = users[i];
                let userSigner = accounts.filter(account => account.address === user.address);
                let connection = governanceToken.connect(userSigner[0]);
                let round = RoundType[vesting_rounds[parseInt(RoundType[user.round])]];
                let remainder = await connection.getClaimableBalance(round, user.address);
                expect(remainder).to.equal(0);
            }
        });
    });
});

