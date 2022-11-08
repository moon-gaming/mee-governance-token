import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const {time} = require("@openzeppelin/test-helpers");

const pow18 = BigNumber.from("10").pow(18);
const maxSupply = 3000000000;

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}
const rounds = [RoundType.SEED, RoundType.PRIVATE, RoundType.PUBLIC, RoundType.PLAYANDEARN, RoundType.EXCHANGES, RoundType.TREASURY, RoundType.ADVISOR, RoundType.TEAM, RoundType.SOCIAL];

const DAY_TO_SECONDS = 24 * 60 * 60;
const MONTH_TO_SECONDS = 30 * DAY_TO_SECONDS;

interface Distribution {
    type: string;
    vestingPeriod: number;
    cliff: number;
    totalRemaining: BigNumber;
    supply: BigNumber;
    vestingGranularity: number;
    externalReserve: boolean;
}

interface ClaimObj {
    totalClaimedAmount: BigNumber;
    claimedAmount: BigNumber;
}


let defaultTimeStamp: number;

describe("Governance Token contract", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let addrs: SignerWithAddress[];

    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;


    // Deploy contract once, and make some quick assumptions.
    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, buyer,/* signer,*/ ...addrs] = accounts;

        publicWallet = addrs[0];
        exchangesWallet = addrs[1];
    
        for (const account of accounts) {
            console.log(await account.address, (await account.getBalance()).toBigInt());
        }

        // Get the ContractFactory and Signers here.
        governanceTokenFactory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);
        governanceToken = await governanceTokenFactory.deploy(
            "MEE Governance Token", 18, "MEE", gameOwner.address, addressList);
    });

    describe("Pre-Minting", () => {
        it("Public Wallet holds 120M tokens after Deploy", async () => {
            var balance = await governanceToken.connect(publicWallet).balanceOf(publicWallet.address);
            expect(balance).to.equal(pow18.mul(120_000_000));
        });

        it("Public Wallet has no reserve after Deploy", async () => {
            for (const round of rounds) {
                var reserved = await governanceToken.connect(publicWallet).getTotalPending(RoundType[round], publicWallet.address);
                expect(reserved).to.equal(0, RoundType[round]);
            }
        });        

        it("Exchanges Wallet holds 60M tokens after Deploy", async () => {
            var balance = await governanceToken.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance).to.equal(pow18.mul(60_000_000));
        });

        it("Exchanges Wallet has 90M reserved after Deploy", async () => {
            var reserved = await governanceToken.connect(exchangesWallet).getTotalPending(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(pow18.mul(90_000_000));
        });        

        it("Exchanges Wallet can claim 90M after 3 months", async () => {
            await governanceToken.connect(gameOwner).beginVesting();

            time.increase(time.duration.days(90));

            var reserved = await governanceToken.connect(exchangesWallet).getClaimableBalance(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(reserved).to.equal(pow18.mul(90_000_000));
        });                            
    });
});

