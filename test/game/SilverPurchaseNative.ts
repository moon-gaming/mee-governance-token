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

        SilverPurchaseERC20Factory = await ethers.getContractFactory("SkuPurchaseNative");
        silverPurchase = await upgrades.deployProxy(SilverPurchaseERC20Factory, []);
    });

    describe("Check Configuration", () => {

        it("should initialize the contract correctly", async function () { 
            // Owner Role Configuration
            expect(await silverPurchase.hasRole(await silverPurchase.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            // Withdrawer Role Configuration
            expect(await silverPurchase.hasRole(await silverPurchase.WITHDRAW_ROLE(), owner.address)).to.be.true;
        });

        it("should add 5 packages properly", async function () {        
            // Check 1 package (100 USD for 100,000 Silvers)
            const packageIndex: string = "silver-10k";
            const packageInfo = await silverPurchase.packageInfo(packageIndex);

            expect(packageInfo.price).to.equal(10e6);
            expect(packageInfo.amount).to.equal(100000);
        });

    });

    describe("Check Silver Purchase", () => {
        it("should purchase a package successfully", async function () {
            const packageIndex: string = "silver-10k";
            const expectedPrice: number = 10e6;
            const expectedSilverAmount: number = 100000;

            const maticPrice = await silverPurchase.getMaticPrice(packageIndex);
            console.log(maticPrice);
            await expect(silverPurchase.connect(buyer).purchase(packageIndex, 1, {value : BigNumber.from(maticPrice.toString()).sub(BigNumber.from("10000"))}))
                .to.emit(silverPurchase, "Purchased")
                .withArgs(buyer.address, packageIndex, 1, maticPrice, expectedSilverAmount);
        });
        
    });

});
