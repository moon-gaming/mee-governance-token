import {expect} from "chai";
import {ethers, upgrades} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { days } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration";
import { formatEther, parseEther } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";

enum LockType {
    LOTTERY_V1_LAND,
    LOTTERY_V2_LAND,
    LOTTERY_V3_LAND,
    LOTTERY_V4_LAND,
    LOTTERY_V5_LAND,
    LOCK_V1_LAND,
    LOCK_V2_LAND,
    LOCK_V3_LAND,
    LOCK_V4_LAND,
    LOCK_V5_LAND
}

const getDays = (day: number) => {
    return 24 * 60 * 60 * day;
}

describe("StakingRewards contract", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let stakingRewardsFactory: ContractFactory;
    let stakingRewards: Contract;
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

        stakingRewardsFactory = await ethers.getContractFactory("StakingRewards");
        stakingRewards = await upgrades.deployProxy(stakingRewardsFactory, [
            governanceToken.address
        ]);
    });

    describe("Check Configuration", () => {

        it("Should set the right owner", async () => {
            expect(await stakingRewards.owner()).to.equal(owner.address);
        });

        it("Check Lock Type and Peroid, Tokens to stake", async () => {
            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V1_LAND);
            expect(v1_lock_info.minAmount).to.equal(parseEther("300"));
            expect(v1_lock_info.period).to.equal(getDays(90));

            const v2_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V2_LAND);
            expect(v2_lock_info.minAmount).to.equal(parseEther("500"));
            expect(v2_lock_info.period).to.equal(getDays(90));

            const v3_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V3_LAND);
            expect(v3_lock_info.minAmount).to.equal(parseEther("1000"));
            expect(v3_lock_info.period).to.equal(getDays(90));

            const v4_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V4_LAND);
            expect(v4_lock_info.minAmount).to.equal(parseEther("2000"));
            expect(v4_lock_info.period).to.equal(getDays(90));

            const v5_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V5_LAND);
            expect(v5_lock_info.minAmount).to.equal(parseEther("5000"));
            expect(v5_lock_info.period).to.equal(getDays(90));

        });
    });

    describe("Check Owner Functions", () => {

        it("Should update lock period", async () => {
            await stakingRewards.updateLockPeriod(LockType.LOCK_V1_LAND, getDays(60));
            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V1_LAND);
            expect(v1_lock_info.minAmount).to.equal(parseEther("300"));
            expect(v1_lock_info.period).to.equal(getDays(60));
        });

        it("Should update staking amount for land early access", async () => {
            await stakingRewards.updateLockLimitation(LockType.LOCK_V1_LAND, parseEther("400"));
            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_V1_LAND);
            expect(v1_lock_info.minAmount).to.equal(parseEther("400"));
            expect(v1_lock_info.period).to.equal(getDays(90));
        });

        it("Should update ticket price for lottery lucky draw", async () => {
            await stakingRewards.updateLockLimitation(LockType.LOTTERY_V1_LAND, parseEther("20"));
            const v1_lottery_info = await stakingRewards.lockPeriod(LockType.LOTTERY_V1_LAND);
            expect(v1_lottery_info.minAmount).to.equal(parseEther("20"));
            expect(v1_lottery_info.period).to.equal(getDays(30));
        });
    });

    describe("Check Lottery Staking", () => {
        it("Should revert the transaction on zero ticket amount", async () => {
            await expect(stakingRewards.stake(0, LockType.LOTTERY_V1_LAND)).to.be.rejectedWith('Invalid Amount');
        });

        it("Should purchase 3 tickets", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.LOTTERY_V1_LAND)).to.be.equal(parseEther("30"));
        });

        it("Should purchase same tier tickets serveral times", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.LOTTERY_V1_LAND)).to.be.equal(parseEther("30"));

            // Purchase 2 tickets for V1 Land again
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("20"));
            await expect(stakingRewards.connect(addrs[1]).stake(2, LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.LOTTERY_V1_LAND)).to.be.equal(parseEther("50"));
        });

        it("Should revert tx for withdrawing tokens after 20 days for Lottery staking", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 20 days.
            await time.increase(getDays(20));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.LOTTERY_V1_LAND)).to.be.rejectedWith('Still in the lock period');
        });

        it("Should withdraw tokens after the lock period", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 30 days.
            await time.increase(getDays(30));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.LOTTERY_V1_LAND)).to.emit(stakingRewards, 'Withdrawn');
        });
    });

    describe("Check Early Access Staking", () => {
        it("Should revert the transaction on zero amount", async () => {
            await expect(stakingRewards.stake(0, LockType.LOCK_V1_LAND)).to.be.rejectedWith('Invalid Amount');
        });

        it("Should revert the transaction for wrong amount", async () => {
            await expect(stakingRewards.stake(2, LockType.LOCK_V1_LAND)).to.be.rejectedWith('Wrong amount for Early Access');
        });

        it("Should stake 300 MEE tokens for Land Tier 1 Early access", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.LOCK_V1_LAND)).to.be.equal(parseEther("300"));
        });

        it("Should reverted with Nothing to Withdraw for non-stakers", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 90 days.
            await time.increase(getDays(90));

            await expect(stakingRewards.connect(addrs[0]).withdraw(LockType.LOCK_V1_LAND)).to.be.revertedWith('Nothing to withdraw');
        });

        it("Should withdraw tokens after the lock period", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_V1_LAND)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 90 days.
            await time.increase(getDays(90));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.LOCK_V1_LAND)).to.emit(stakingRewards, 'Withdrawn');
        });
    });
});
