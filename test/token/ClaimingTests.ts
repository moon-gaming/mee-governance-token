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
    let buyer: SignerWithAddress;
    let addrs: SignerWithAddress[];

    let publicWallet: SignerWithAddress;
    let exchangesWallet: SignerWithAddress;


    async function deployToken(purpose: string)
    {
        // Get the ContractFactory and Signers here.
        var factory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);

        var governanceToken = await factory.deploy(
            purpose, 18, "MEE", gameOwner.address, addressList);

        return governanceToken;
    }

    // Deploy contract once, and make some quick assumptions.
    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, buyer,/* signer,*/ ...addrs] = accounts;

        publicWallet = addrs[0];
        exchangesWallet = addrs[1];    

        // Get the ContractFactory and Signers here.
        governanceToken = await deployToken("Claiming Tests");
        await governanceToken.connect(gameOwner).beginVesting();
        await governanceToken.connect(gameOwner).setTokensToClaimable(true);
    });

    describe("Exchange Wallet Claiming", () => {
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
 });

