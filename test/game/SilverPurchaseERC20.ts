import {expect} from "chai";
import {ethers, upgrades} from "hardhat";
import {BigNumber, Contract, ContractFactory, utils} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { days } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { parse } from "path";

const getDays = (day: number) => {
    return 24 * 60 * 60 * day;
}

const tier_first = ethers.utils.formatBytes32String("Lottery_3_202305")
const tier_second = ethers.utils.formatBytes32String("Lottery_4_202305")
const tier_exploit = ethers.utils.formatBytes32String("exploit_attempt")


describe("SilverPurchaseERC20 contract", function () {
    let SilverPurchaseERC20Factory: ContractFactory;
    let silverPurchase: Contract;
    let mockupToken: Contract;
    let owner: SignerWithAddress;
    let gameOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let withdrawer: SignerWithAddress;
    let addrs: SignerWithAddress[];

    before(async () => {
        const accounts = await ethers.getSigners();
        [owner, gameOwner, buyer, withdrawer, ...addrs] = accounts;
    });

    beforeEach(async () => {
        // Get the ContractFactory and Signers here.
        const mockupTokenFactory = await ethers.getContractFactory("GovernanceToken");
        const addressList = addrs.filter((_, index) => index < 7).map((addr) => addr.address);
        mockupToken = await mockupTokenFactory.deploy(
            "USDC", 18, "USDC", gameOwner.address, addressList);

        SilverPurchaseERC20Factory = await ethers.getContractFactory("SilverPurchaseERC20");
        silverPurchase = await upgrades.deployProxy(SilverPurchaseERC20Factory, [
            mockupToken.address        
        ]);

        //Distribute some coins from the exchanges wallet to the buyer wallet
        await Promise.all([
            mockupToken.connect(addrs[1]).transfer(buyer.address, parseUnits("10000", 6)),
        ]);
    });

    describe("Check Configuration", () => {

        it("should initialize the contract correctly", async function () {       
            // USDC Token Contract address configuration
            expect(await silverPurchase.usdcTokenAddress()).to.equal(mockupToken.address);
            // Owner Role Configuration
            expect(await silverPurchase.hasRole(await silverPurchase.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            // Withdrawer Role Configuration
            expect(await silverPurchase.hasRole(await silverPurchase.WITHDRAW_ROLE(), owner.address)).to.be.true;
        });

        it("should add 5 packages properly", async function () {        
            // Check 1 package (100 USD for 100,000 Silvers)
            const packageIndex: string = "100USD";
            const packageInfo = await silverPurchase.packageInfo(packageIndex);

            expect(packageInfo.price).to.equal(100e6);
            expect(packageInfo.silver).to.equal(100000);
        });

    });

    describe("Check Silver Purchase", () => {
        it("should purchase a package successfully", async function () {
            const packageIndex: string = "10USD";
            const expectedPrice: number = 10e6;
            const expectedSilverAmount: number = 10000;
        
            await mockupToken.connect(buyer).approve(silverPurchase.address, 10e6);
            await expect(silverPurchase.connect(buyer).purchase(packageIndex))
                .to.emit(silverPurchase, "Purchased")
                .withArgs(buyer.address, expectedPrice, expectedSilverAmount);
        });

        it("should revert when purchasing an invalid package", async function () {
            const packageIndex: string = "InvalidPackage";
            // Approve USDC transfer
            await mockupToken.connect(buyer).approve(silverPurchase.address, 100e6); // Approve a sufficient amount for any package
        
            // Attempt to purchase an invalid package
            await expect(silverPurchase.connect(buyer).purchase(packageIndex)).to.be.revertedWith("Package is not purchasable");
        });

        it("should revert when purchasing when the contract is paused", async function () {
            const packageIndex: string = "10USD";
            // Approve USDC transfer
            await mockupToken.connect(buyer).approve(silverPurchase.address, 100e6); // Approve a sufficient amount for any package

            await silverPurchase.connect(owner).pause();

            // Attempt to purchase when the contract was paused
            await expect(silverPurchase.connect(buyer).purchase(packageIndex)).to.be.revertedWith("Pausable: paused");
        });
        
    });

    describe("Check Withdraw Function", () => {
        it("should withdraw tokens successfully", async function () {
            const packageIndex: string = "10USD";
            const expectedPrice: number = 10e6;
            const expectedSilverAmount: number = 10000;


            // Purchase using 10 USDC
            await mockupToken.connect(buyer).approve(silverPurchase.address, 10e6);
            await expect(silverPurchase.connect(buyer).purchase(packageIndex))
                .to.emit(silverPurchase, "Purchased")
                .withArgs(buyer.address, expectedPrice, expectedSilverAmount);

            // Send 20 USDC to the contract without purchase
            await mockupToken.connect(buyer).transfer(silverPurchase.address, 20e6);


            // Withdraw 30 USDC
            await expect(silverPurchase.connect(owner).withdraw(mockupToken.address))
                .to.emit(silverPurchase, "Withdrawn")
                .withArgs(owner.address, mockupToken.address, 30e6);
        });
        
    });

    describe("Owner Admin Interface", () => {
        it("Should pause & unpause the contract", async () => {
            const packageIndex: string = "10USD";
            const expectedPrice: number = 10e6;
            const expectedSilverAmount: number = 10000;

            // Approve USDC transfer
            await mockupToken.connect(buyer).approve(silverPurchase.address, 100e6); // Approve a sufficient amount for any package

            await silverPurchase.connect(owner).pause();
            await expect(silverPurchase.connect(buyer).purchase(packageIndex)).to.be.revertedWith("Pausable: paused");

            await silverPurchase.connect(owner).unpause();
            await expect(silverPurchase.connect(buyer).purchase(packageIndex)).to.emit(silverPurchase, "Purchased")
                .withArgs(buyer.address, expectedPrice, expectedSilverAmount);
        });

        it("Should revert pause when the caller is not the owner", async () => {
            await expect(silverPurchase.connect(withdrawer).pause()).to.be.rejectedWith(`AccessControl: account ${withdrawer.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);
        });

        it("Should update the package", async () => {
            const packageIndex: string = "500USD";
            const expectedPrice: number = 500e6;
            const expectedSilverAmount: number = 1000000;

            await silverPurchase.connect(owner).updatePackage(packageIndex, expectedPrice, expectedSilverAmount);
            const packageInfo = await silverPurchase.packageInfo(packageIndex);

            expect(packageInfo.price).to.equal(expectedPrice);
            expect(packageInfo.silver).to.equal(expectedSilverAmount);
        });

        it("Should grant the withdrawer role to the withdrawer", async () => {
            const WITHDRAW_ROLE = await silverPurchase.WITHDRAW_ROLE();
            await silverPurchase.connect(owner).grantRole(WITHDRAW_ROLE, withdrawer.address);
            
            const packageIndex: string = "10USD";
            const expectedPrice: number = 10e6;
            const expectedSilverAmount: number = 10000;


            // Purchase using 10 USDC
            await mockupToken.connect(buyer).approve(silverPurchase.address, 10e6);
            await expect(silverPurchase.connect(buyer).purchase(packageIndex))
                .to.emit(silverPurchase, "Purchased")
                .withArgs(buyer.address, expectedPrice, expectedSilverAmount);

            // Send 20 USDC to the contract without purchase
            await mockupToken.connect(buyer).transfer(silverPurchase.address, 20e6);


            // Withdraw 30 USDC
            await expect(silverPurchase.connect(withdrawer).withdraw(mockupToken.address))
                .to.emit(silverPurchase, "Withdrawn")
                .withArgs(withdrawer.address, mockupToken.address, 30e6);
        });
    });

});
