import {expect} from 'chai'
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

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
    let users: SignerWithAddress[];

    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;

    let vesting_rounds: RoundType[] = [RoundType.SEED, RoundType.PRIVATE, RoundType.SEED, RoundType.PRIVATE];

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
            [owner, gameOwner, ...addrs] = accounts;

            outsider = accounts[9];
            users = accounts.slice(10);
            
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
        //Reserved value that multiple users use.        
        const reserve = pow18.mul(1_000);

        // Deploy contract once, and make some quick assumptions.
        before(async () => {
            const accounts = await ethers.getSigners();
            [owner, gameOwner, ...addrs] = accounts;

            outsider = accounts[9];
            users = accounts.slice(10);
            
            publicWallet = addrs[0];
            exchangesWallet = addrs[1];    

            // Get the ContractFactory and Signers here.
            governanceToken = await deployToken("Generic Claiming Tests");
        

            //Reserve some tokens for a bunch of users.
            for (var i = 0; i < vesting_rounds.length; i++)
            {
                await governanceToken.connect(gameOwner).reserveTokens(RoundType[vesting_rounds[i]], accounts[10+i].address, reserve);
            }
        });

        it("cannot claim before vesting has begun.", async () => {
            await expect(
                governanceToken.connect(outsider).claimTokens(RoundType[RoundType.SEED], outsider.address)
                ).to.be.revertedWith("Token vesting has not yet begun.");
            });

        it("cannot claim before tokens are claimable", async () => {
            await expect(
                governanceToken.connect(users[0]).claimTokens(RoundType[RoundType.SEED], users[0].address)
            ).to.be.revertedWith("Token vesting has not yet begun.");
        });

        it("non-owners may not start vesting", async () => {
        await expect(
            governanceToken.connect(outsider).beginVesting()
            ).to.be.revertedWith("GameOwner: caller is not the game address");
        });

        it("owner can start vesting.", async () => {
            governanceToken.connect(gameOwner).beginVesting();
        });

        it("owner can start vesting only once", async () => {
            await expect(
                governanceToken.connect(gameOwner).beginVesting()
            ).to.be.revertedWith("Start vesting time was already set.")
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

        it("all users can claim all tokens in the distant future", async () => {
            time.increase(time.duration.years(10));

            for (var i = 0; i < vesting_rounds.length; i++)
            {
                var user = users[i];
                var connection = governanceToken.connect(user);
                await connection.claimTokens(RoundType[vesting_rounds[i]], user.address)
                var balance = await connection.balanceOf(user.address)                
                expect(balance).to.equal(reserve);
            }
        });
    });
});

