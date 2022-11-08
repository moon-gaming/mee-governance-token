import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {time} from "@nomicfoundation/hardhat-network-helpers";

const pow18 = BigNumber.from("10").pow(18);

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

const rounds = [RoundType.SEED, RoundType.PRIVATE, RoundType.PUBLIC, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL];

describe("Auxiliary Tests", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let addrs: SignerWithAddress[];

    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;


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

        publicWallet = addrs[0];
        exchangesWallet = addrs[1];

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

        it("Exchanges Wallet holds 60M tokens after Deploy", async () => {
            let balance = await governanceToken.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance).to.equal(pow18.mul(60_000_000));
        });

        it("Exchanges Wallet has 90M reserved after Deploy", async () => {
            let reserved = await governanceToken.connect(exchangesWallet).getTotalPending(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(pow18.mul(90_000_000));
        });


        it("Exchanges Wallet may claim nothing after only a half month", async () => {
            let contract = await deployToken("Exchanges half-monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(15));
            let reserved = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(0);
        });

        it("Exchanges Wallet may claim 30M each 30 days", async () => {
            let contract = await deployToken("Exchanges Monthly Vesting Test");

            await contract.connect(gameOwner).beginVesting();

            for (let i = 1; i <= 3; i++)
            {
                time.increase(time.duration.days(30));
                let reserved = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
                expect(reserved).to.equal(pow18.mul(30_000_000).mul(i), "Month" + i);
            }
        });

        it("Exchanges Wallet may claim 90M after 3 months or more", async () => {
            let contract = await deployToken("Exchanges 90 Day Test");
            await contract.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(90));

            let reservedExactly = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reservedExactly).to.equal(pow18.mul(90_000_000), "After exactly 90 days.");

            time.increase(time.duration.days(1234));

            let reserved = await contract.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(pow18.mul(90_000_000), "After longer time.");
        });

    });
});

