import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import { Console } from "console";

const pow18 = BigNumber.from("10").pow(18);

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

const rounds = [RoundType.SEED, RoundType.PRIVATE, RoundType.PUBLIC, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL];

describe("Auxiliary Tests", function () {
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let addrs: SignerWithAddress[];
    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;
    let playAndEarnWallet: SignerWithAddress;
    let socialWallet: SignerWithAddress;
    let teamWallet: SignerWithAddress;
    let treasuryWallet: SignerWithAddress;
    let advisorsWallet: SignerWithAddress;

    async function deployToken(purpose: string)
    {
        // Get the ContractFactory and Signers here.
        let factory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);

        let governanceToken = await factory.deploy(
            purpose, 18, "MEE", gameOwner.address, addressList);

        return governanceToken;
    }

    // Deploy contract once, and make some quick assumptions.
    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, ...addrs] = accounts;

        [publicWallet, exchangesWallet, playAndEarnWallet, socialWallet, teamWallet, treasuryWallet, advisorsWallet, ] = addrs;

        // Get the ContractFactory and Signers here.
        governanceToken = await deployToken("MEE Governance Token");
    });

    describe("Pre-Minting", () => {
        it("Public Wallet holds 120M tokens after Deploy", async () => {
            let balance = await governanceToken.connect(publicWallet).balanceOf(publicWallet.address);
            expect(balance).to.equal(pow18.mul(120_000_000));
        });

        it("Public Wallet has no reserve after Deploy", async () => {
            for (const round of rounds) {
                let reserved = await governanceToken.connect(publicWallet).getTotalPending(RoundType[round], publicWallet.address);
                expect(reserved).to.equal(0, RoundType[round]);
            }
        });

        it("Exchanges Wallet holds 34.5M tokens after Deploy", async () => {
            let balance = await governanceToken.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance).to.equal(pow18.mul(34_500_000));
        });

        it("Exchanges Wallet has 115.5M reserved after Deploy", async () => {
            let reserved = await governanceToken.connect(exchangesWallet).getTotalPending(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(pow18.mul(115_500_000));
        });

        it("Exchanges Wallet may claim 19.25M after only a half month", async () => {
            let contract = await deployToken("Exchanges half-monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(15));
            let claimable = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(claimable).to.approximately(pow18.mul(19_250_000), 100);
        });

        it("Exchanges Wallet may claim 38.5M each 30 days", async () => {
            let contract = await deployToken("Exchanges Monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            for (let i = 1; i <= 3; i++)
            {
                time.increase(time.duration.days(30));
                let claimable = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
                expect(claimable).to.approximately(pow18.mul(38_500_000).mul(i), 100, "Month" + i);
            }
        });

        it("Exchanges Wallet can claim 1.283M each day for 30 days straight", async () => {
            let contract = await deployToken("Exchanges Daily Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            var oldbalance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            var cumulative = pow18.mul(0);

            for (let i = 1; i <= 30; i++)
            {
                time.increase(time.duration.days(1));

                var increment = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);

                //We can claim 1M each day except on day 0
                expect(increment).to.approximately(pow18.mul(38_500_000).div(30), 100, "Daily claimed.");
                cumulative = cumulative.add(increment);

                //Actually try to claim.
                await contract.connect(exchangesWallet).claimTokens(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
                var balance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
                expect(balance.sub(oldbalance)).to.equal(cumulative, "Claimed total equals accrued total.");
            }
            expect(cumulative).to.approximately(pow18.mul(38_500_000), 100, "Total claimed daily");
        });

        it("Exchanges Wallet may claim 115.5M after 3 months or more", async () => {
            let contract = await deployToken("Exchanges 90 Day Test");
            await contract.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(90));

            let reservedExactly = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reservedExactly).to.approximately(pow18.mul(115_500_000), 100, "After exactly 90 days.");

            time.increase(time.duration.days(1234));

            let claimable = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(claimable).to.equal(pow18.mul(115_500_000), "After longer time.");
        });

        it("Advisors Wallet has 150M pending", async () => {
            let contract = await deployToken("Advisors pending test");

            await contract.connect(gameOwner).beginVesting();
            
            let claimable = await contract.connect(advisorsWallet).getTotalPending(RoundType[RoundType.ADVISOR], advisorsWallet.address);
            expect(claimable).to.equal(pow18.mul(150_000_000));
        });

        it("Advisors Wallet may claim nothing after half a month", async () => {
            let contract = await deployToken("Advisors half-monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(15));
            let claimable = await contract.connect(advisorsWallet).getClaimableBalance(RoundType[RoundType.ADVISOR], advisorsWallet.address);
            expect(claimable).to.equal(0);
        });

        it("Advisors Wallet may claim 7.5M each 30 days after 120 day cliff", async () => {
            let contract = await deployToken("Advisors Monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();
            let claimable = await contract.connect(advisorsWallet).getClaimableBalance(RoundType[RoundType.ADVISOR], advisorsWallet.address);
            expect(claimable).to.equal(0, "Nothing should be claimable before cliff has passed.");

            time.increase(time.duration.days(121));

            claimable = await contract.connect(advisorsWallet).getClaimableBalance(RoundType[RoundType.ADVISOR], advisorsWallet.address);
            expect(claimable).to.equal(0, "Nothing should be claimable before first month after of cliff passed.");

            for (let i = 1; i <= 3; i++)
            {
                time.increase(time.duration.days(30));
                claimable = await contract.connect(advisorsWallet).getClaimableBalance(RoundType[RoundType.ADVISOR], advisorsWallet.address);
                expect(claimable).to.equal(pow18.mul(7_500_000).mul(i), "Month" + i);
            }
        });
    });
});
