import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const pow18 = BigNumber.from("10").pow(18);

enum RoundType {
    SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

describe("Governance Token contract", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let addrs: SignerWithAddress[];

    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, buyer, ...addrs] = accounts;
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

        it("supports interface and has 18 decimals", async () => {
            expect(await governanceToken.decimals()).to.equal(18);
        });

        it("getGameOwnerAddress check possible and valid with caller being either owner or non-owner", async () => {
            expect(await governanceToken.connect(gameOwner).getGameOwnerAddress()).to.be.eq(gameOwner.address);
            expect(await governanceToken.connect(addrs[42]).getGameOwnerAddress()).to.be.eq(gameOwner.address);
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
                const tokenAmount = BigNumber.from(10).mul(pow18);

                await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount);

                await expect(governanceToken.connect(addrs[0]).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount)).to.be.revertedWith("GameOwner: caller is not the game address");
            });

            it("reserve token over supply", async () => {
                const tokenAmount = BigNumber.from(420_000_001).mul(BigNumber.from("10").pow(18));
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount)).to.be.revertedWith("given amount is bigger than max supply for the round");

                expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(0);
            });

            it("reserve token over remaining token", async () => {
                //Claim all seed tokens
                const tokenAmount = BigNumber.from(420_000_000).mul(BigNumber.from("10").pow(18));
                await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, 1)).to.be.revertedWith("total remaining round amount is not enough");

                expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(tokenAmount);
            });

            it("reserve token for inactivated round type", async () => {
                const tokenAmount = BigNumber.from(532).mul(BigNumber.from("10").pow(18));
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("Claiming/Reserving is not supported for this round.");
            });

            it("reserve token for unsupported round type", async () => {
                const tokenAmount = BigNumber.from(69).mul(BigNumber.from("10").pow(18));

                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("Claiming/Reserving is not supported for this round.");
            });

            it("reserving for public not allowed", async () => {
                const tokenAmount = pow18.mul(123);
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("Claiming/Reserving is not supported for this round.");
            });

            it("entire supply for pre-minted round types is fully reserved ", async () => {
                const tokenAmount = BigNumber.from(1); //sic. - smallest possible reservation.
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.EXCHANGES], buyer.address, tokenAmount)).to.be.revertedWith("total remaining round amount is not enough");
                await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.ADVISOR], buyer.address, tokenAmount)).to.be.revertedWith("total remaining round amount is not enough");
            });
        });
    });
});
