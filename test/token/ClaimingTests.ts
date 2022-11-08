import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const {time} = require("@openzeppelin/test-helpers");

const pow18 = BigNumber.from("10").pow(18);

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}


describe("Claiming Tests", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let outsider: SignerWithAddress;
    let addrs: SignerWithAddress[];

    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;

    let vesting_rounds: RoundType[] = [RoundType.SEED, RoundType.PRIVATE];

    async function deployToken(purpose: string)
    {
        // Get the ContractFactory and Signers here.
        var factory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);

        var governanceToken = await factory.deploy(purpose, 18, "MEE", gameOwner.address, addressList);

        return governanceToken;
    }


    describe("Exchange Wallet Claiming", () => {  
        // Deploy contract once, and make some quick assumptions.
        before(async () => {
            const accounts = await ethers.getSigners();
            [owner, gameOwner, outsider,/* signer,*/ ...addrs] = accounts;

            publicWallet = addrs[0];
            exchangesWallet = addrs[1];    

            // Get the ContractFactory and Signers here.
            governanceToken = await deployToken("Exchange Claiming Tests");
            await governanceToken.connect(gameOwner).beginVesting();
        });

        it("Exchanges Wallet successfully claims first 30M after 1 month, and 60M are remaining.", async () => {
            var contract = governanceToken;

            var oldbalance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            time.increase(time.duration.days(30));

            await contract.connect(exchangesWallet).claimTokens(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            var balance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance.sub(oldbalance)).to.equal(pow18.mul(30_000_000), "New Tokens in Wallet.");

            var pending = await contract.connect(exchangesWallet).getTotalUnclaimed(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(pending).to.equal(pow18.mul(60_000_000), "Remaining Unclaimed Tokens.");
        });                            

        it("Exchanges Wallet successfully claims remainder, and nothing is left unclaimed.", async () => {
            var contract = governanceToken;
            time.increase(time.duration.days(200));

            await contract.connect(exchangesWallet).claimTokens(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            var balance = await contract.connect(exchangesWallet).balanceOf(exchangesWallet.address);
            expect(balance).to.equal(pow18.mul(150_000_000), "Total Tokens in Wallet.");

            var pending = await contract.connect(exchangesWallet).getTotalUnclaimed(RoundType[RoundType.EXCHANGES], exchangesWallet.address);
            expect(pending).to.equal(0, "Remaining Unclaimed Tokens.");
        });                
    });        

        
    describe("General Claiming", () =>
    {
        // Deploy contract once, and make some quick assumptions.
        beforeEach(async () => {
            const accounts = await ethers.getSigners();
            [owner, gameOwner, outsider,/* signer,*/ ...addrs] = accounts;

            publicWallet = addrs[0];
            exchangesWallet = addrs[1];    

            // Get the ContractFactory and Signers here.
            governanceToken = await deployToken("Generic Claiming Tests");
        
            const reserve = pow18.mul(1_000);

            //Reserve some tokens for a bunch of users.
            for (var i = 0; i < vesting_rounds.length; i++)
            {
                await governanceToken.connect(gameOwner).reserveTokens(RoundType[vesting_rounds[i]], addrs[i].address, reserve);
            }
        });

        it("cannot claim before vesting has begun.", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
            ).to.be.revertedWith("Token vesting has not yet begun.");
        });

        it("cannot claim before vesting has begun.", async () => {
            governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
        });

        it("cannot claim without having a balance", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
            ).to.be.revertedWith("Nothing to claim.");
        });

        it("cannot claim before tokens are claimable", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], addrs[0].address)
            ).to.be.revertedWith("Nothing to claim.");
        });

        it("claiming token without having a balance - 0", async () => {
            // Transfer 50 tokens from owner to addr1
            const tokenAmount = BigNumber.from(0).mul(BigNumber.from("10").pow(18));
            await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], outsider.address, tokenAmount);

            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
            ).to.be.revertedWith("Token vesting has not yet begun");
        });
    });
});

