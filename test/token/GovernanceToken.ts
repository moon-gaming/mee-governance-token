import {expect, use} from 'chai';
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {solidity} from "ethereum-waffle";
const {time} = require('@openzeppelin/test-helpers');

use(solidity);

const pow18 = BigNumber.from("10").pow(18);
const maxSupply = 3000000000;

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

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

const seedDistribution: Distribution = {
    type: RoundType[RoundType.SEED],
    vestingPeriod: 22 * DAY_TO_SECONDS,
    cliff: 2 * DAY_TO_SECONDS,
    totalRemaining: BigNumber.from("420000000").mul(pow18),
    supply: BigNumber.from("420000000").mul(pow18),
    vestingGranularity: DAY_TO_SECONDS,
    externalReserve: true,
}

const privateDistribution: Distribution = {
    type: RoundType[RoundType.PRIVATE],
    vestingPeriod: 22 * DAY_TO_SECONDS,
    cliff: 2 * DAY_TO_SECONDS,
    totalRemaining: BigNumber.from("210000000").mul(pow18),
    supply: BigNumber.from("210000000").mul(pow18),
    vestingGranularity: DAY_TO_SECONDS,
    externalReserve: true
}

const publicDistribution: Distribution = {
    type: RoundType[RoundType.PUBLIC],
    vestingPeriod: 6 * DAY_TO_SECONDS,
    cliff: 0,
    totalRemaining: BigNumber.from("120000000").mul(pow18),
    supply: BigNumber.from("120000000").mul(pow18),
    vestingGranularity: DAY_TO_SECONDS,
    externalReserve: true
}

const playAndEarnDistribution: Distribution = {
    type: RoundType[RoundType.PLAYANDEARN],
    vestingPeriod: 35 * DAY_TO_SECONDS,
    cliff: 2 * DAY_TO_SECONDS,
    totalRemaining: BigNumber.from("6000000000").mul(pow18),
    supply: BigNumber.from("6000000000").mul(pow18),
    vestingGranularity: DAY_TO_SECONDS,
    externalReserve: false
}

const socialDistribution: Distribution = {
    type: RoundType[RoundType.SOCIAL],
    vestingPeriod: 22 * MONTH_TO_SECONDS,
    cliff: 2 * MONTH_TO_SECONDS,
    totalRemaining: BigNumber.from("30000000").mul(pow18),
    supply: BigNumber.from("30000000").mul(pow18),
    vestingGranularity: MONTH_TO_SECONDS,
    externalReserve: false
}

const teamDistribution: Distribution = {
    type: RoundType[RoundType.TEAM],
    vestingPeriod: 24 * MONTH_TO_SECONDS,
    cliff: 12 * MONTH_TO_SECONDS,
    totalRemaining: BigNumber.from("4500000000").mul(pow18),
    supply: BigNumber.from("4500000000").mul(pow18),
    vestingGranularity: MONTH_TO_SECONDS,
    externalReserve: false
}

const treasuryDistribution: Distribution = {
    type: RoundType[RoundType.TREASURY],
    vestingPeriod: 30 * MONTH_TO_SECONDS,
    cliff: 4 * MONTH_TO_SECONDS,
    totalRemaining: BigNumber.from("8700000000").mul(pow18),
    supply: BigNumber.from("8700000000").mul(pow18),
    vestingGranularity: MONTH_TO_SECONDS,
    externalReserve: false
}

const exchangesDistribution: Distribution = {
    type: RoundType[RoundType.EXCHANGES],
    vestingPeriod: 30 * MONTH_TO_SECONDS,
    cliff: 4 * MONTH_TO_SECONDS,
    totalRemaining: BigNumber.from("8700000000").mul(pow18),
    supply: BigNumber.from("8700000000").mul(pow18),
    vestingGranularity: MONTH_TO_SECONDS,
    externalReserve: false
}

const advisorsDistribution: Distribution = {
    type: RoundType[RoundType.ADVISOR],
    vestingPeriod: 30 * MONTH_TO_SECONDS,
    cliff: 4 * MONTH_TO_SECONDS,
    totalRemaining: BigNumber.from("8700000000").mul(pow18),
    supply: BigNumber.from("8700000000").mul(pow18),
    vestingGranularity: MONTH_TO_SECONDS,
    externalReserve: false
}

const rounds = [seedDistribution/*, privateDistribution*/]; //playAndEarnDistribution, socialDistribution, teamDistribution, treasuryDistribution];

let defaultTimeStamp: number;

const mockBlockTimestamp = async (days: number) => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    defaultTimeStamp = timestampBefore;
    //await ethers.provider.send('evm_increaseTime', [days]);
    await ethers.provider.send('evm_mine', [timestampBefore + days]);
}

// const resetBlockTimestamp = async () => {
//   const blockNumBefore = await ethers.provider.getBlockNumber();
//   const blockBefore = await ethers.provider.getBlock(blockNumBefore);
//   const timestampBefore = blockBefore.timestamp;
//   //await ethers.provider.send('evm_increaseTime', [days]);
//   await ethers.provider.send('evm_mine', [defaultTimeStamp]);
// }

describe("Governance Token contract", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let addrs: SignerWithAddress[];

    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, buyer,/* signer,*/ ...addrs] = accounts;

        for (const account of accounts) {
            console.log(await account.address, (await account.getBalance()).toBigInt());
        }
    });

    beforeEach(async () => {
        // Get the ContractFactory and Signers here.
        governanceTokenFactory = await ethers.getContractFactory("GovernanceToken");

        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);
        governanceToken = await governanceTokenFactory.deploy(
            "MEE Governance Token", 18, "MEE", gameOwner.address, addressList);
    });

    describe("Deployment", () => {
        it("Decimal control", async () => {
            expect(await governanceToken.decimals()).to.equal(18);
        });

        it("Should set the right owner", async () => {
            expect(await governanceToken.owner()).to.equal(owner.address);
        });

        it("owner balance should be 0 during deployment", async () => {
            const ownerBalance = await governanceToken.balanceOf(owner.address);
            expect(0).to.equal(ownerBalance);
        });

        it("supports interface", async () => {
            expect(await governanceToken.decimals()).to.equal(18);
        });

        it("game owner check", async () => {
            await expect(governanceToken.connect(addrs[0]).getGameOwnerAddress()).to.be.revertedWith("GameOwner: caller is not the game address");
            expect(await governanceToken.connect(gameOwner).getGameOwnerAddress()).to.be.eq(gameOwner.address);
        });
    });

    describe("Governance Token ERC20 check", async () => {
        it("is it ERC20 token", async () => {
            expect(await governanceToken.connect(addrs[0]).isERC20()).to.be.true;
        });
    })

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async () => {
            const tokenAmount = BigNumber.from("100").mul(pow18);

            await governanceToken.connect(addrs[0]).transfer(addrs[8].address, tokenAmount);
            const addr1Balance = await governanceToken.balanceOf(addrs[8].address);
            expect(addr1Balance).to.equal(tokenAmount);

            await governanceToken.connect(addrs[0]).transfer(addrs[9].address, tokenAmount);
            const addr2Balance = await governanceToken.balanceOf(addrs[9].address);
            expect(addr2Balance).to.equal(tokenAmount);
        });

        it("Should fail if sender doesn’t have enough tokens", async () => {
            const initialOwnerBalance = await governanceToken.balanceOf(owner.address);

            const tokenAmount = BigNumber.from("2").mul(pow18);

            // Try to send 1/10**18 token from addr1 (0 tokens) to owner (1000000 tokens).
            // `require` will evaluate false and revert the transaction.
            await expect(
                governanceToken.connect(addrs[9]).transfer(owner.address, tokenAmount)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

            // Owner balance shouldn't have changed.
            expect(await governanceToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });

        it("Should update balances after transfers", async () => {
            const tokenAmount1 = BigNumber.from("100").mul(pow18);
            const tokenAmount2 = BigNumber.from("50").mul(pow18);

            const initialOwnerBalance = await governanceToken.balanceOf(addrs[1].address);

            // Transfer 100 tokens from addr1 to addr2.
            await governanceToken.connect(addrs[1]).transfer(addrs[2].address, tokenAmount1);

            // Transfer another 50 tokens from addr1 to addr3.
            await governanceToken.connect(addrs[1]).transfer(addrs[3].address, tokenAmount2);

            // Check balances.
            const finalOwnerBalance = await governanceToken.balanceOf(addrs[1].address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(tokenAmount1).sub(tokenAmount2));

            const addr2Balance = await governanceToken.balanceOf(addrs[2].address);
            expect(addr2Balance).to.equal(tokenAmount1);

            const addr3Balance = await governanceToken.balanceOf(addrs[3].address);
            expect(addr3Balance).to.equal(tokenAmount2);
        });
    });

    describe("Reserve and claim token", () => {
        describe("Reserve token", function () {
            it("reserve token with whitelisted user", async () => {
                await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);

                const tokenAmount = BigNumber.from(10).mul(pow18);

                await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount);

                await governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 0);

                await expect(governanceToken.connect(addrs[0]).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount)).to.be.revertedWith("only GameOwner can reserve the token");
            });

            describe("reserve token address control", async () => {
                describe("Add Address", () => {
                    it("with not game owner user", async () => {
                        await expect(governanceToken.connect(addrs[0]).addAddressForDistribution(RoundType[RoundType.PRIVATE],
                            addrs[0].address)).to.be.revertedWith("GameOwner: caller is not the game address");
                    });
                });

                describe("Delete Address", () => {
                    it("with not game owner user", async () => {
                        await expect(governanceToken.connect(addrs[0]).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 0)).to.be.revertedWith("GameOwner: caller is not the game address");
                    });

                    it("index out of bound", async () => {
                        await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);
                        await expect(governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 5)).to.be.revertedWith("index is out of distribution address array bounds");
                    });

                    it("index and address don't match", async () => {
                        await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);
                        await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[1].address);

                        await expect(governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 1)).to.be.revertedWith("Address does not match!");
                    });
                });

                describe("Get Address List", () => {
                    it("with not game owner user", async () => {
                        await expect(governanceToken.connect(addrs[0]).getAddressList(RoundType[RoundType.PRIVATE])).to.be.revertedWith("GameOwner: caller is not the game address");
                    });

                    it("success", async () => {
                        await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[1].address);
                        expect(await governanceToken.connect(gameOwner).getAddressList(RoundType[RoundType.PRIVATE])).to.be.eql([addrs[1].address]);
                    });
                });

            });

            it("reserve token over supply", async () => {
                const tokenAmount = BigNumber.from(420_000_001).mul(BigNumber.from("10").pow(18));
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount)).to.be.revertedWith("given amount is bigger than max supply for the round");

                expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(0);
            });

            it("reserve token over remaining token", async () => {
                const tokenAmount = BigNumber.from(420_000_000).mul(BigNumber.from("10").pow(18));
                await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, 1)).to.be.revertedWith("total remaining round amount is not enough");

                expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(tokenAmount);
            });

            it("reserve token for inactivated round type", async () => {
                const tokenAmount = BigNumber.from(420_000_000).mul(BigNumber.from("10").pow(18));
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("reservation is not supported for this round");
            });

            it("reserve token for unsupported round type", async () => {
                const tokenAmount = BigNumber.from(420_000_000).mul(BigNumber.from("10").pow(18));

                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("reservation is not supported for this round");
            });

            it("reserve token for non-invest round type", async () => {
                const tokenAmount = BigNumber.from(420_000_000).mul(BigNumber.from("10").pow(18));
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.EXCHANGES], buyer.address, tokenAmount)).to.be.revertedWith("round is not invest round");
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.ADVISOR], buyer.address, tokenAmount)).to.be.revertedWith("round is not invest round");
            });
        });        
    });
});
