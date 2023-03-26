import {expect} from "chai";
import {ethers, upgrades} from "hardhat";
import {BigNumber, Contract, ContractFactory} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { days } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration";
import { formatEther, parseEther } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";

enum LockType {
    STAKE_0, 
    STAKE_1, 
    STAKE_2, 
    STAKE_3, 
    STAKE_4, 
    STAKE_5, 
    STAKE_6, 
    STAKE_7, 
    STAKE_8, 
    STAKE_9, 
    STAKE_A, 
    STAKE_B, 
    STAKE_C, 
    STAKE_D, 
    STAKE_E, 
    STAKE_F,
    LOCK_0, 
    LOCK_1, 
    LOCK_2, 
    LOCK_3, 
    LOCK_4, 
    LOCK_5, 
    LOCK_6, 
    LOCK_7, 
    LOCK_8, 
    LOCK_9, 
    LOCK_A, 
    LOCK_B, 
    LOCK_C, 
    LOCK_D, 
    LOCK_E, 
    LOCK_F
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

        //Distribute some coins from the exchanges wallet to the other testers
        await Promise.all([
            governanceToken.connect(addrs[1]).transfer(addrs[2].address, parseEther("654321")),
            governanceToken.connect(addrs[1]).transfer(addrs[3].address, parseEther("200000")),
            governanceToken.connect(addrs[1]).transfer(addrs[4].address, parseEther("50000")),
            governanceToken.connect(addrs[1]).transfer(addrs[5].address, parseEther("123456"))
            ]);
    });

    describe("Check Configuration", () => {

        it("Should set the right owner", async () => {
            expect(await stakingRewards.owner()).to.equal(owner.address);
        });

        it("Check Lock Type and Peroid, Tokens to stake", async () => {
            const v0_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_0);
            expect(v0_lock_info.minAmount).to.equal(parseEther("300"));
            expect(v0_lock_info.period).to.equal(getDays(90));

            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_1);
            expect(v1_lock_info.minAmount).to.equal(parseEther("500"));
            expect(v1_lock_info.period).to.equal(getDays(90));

            const v2_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_2);
            expect(v2_lock_info.minAmount).to.equal(parseEther("1000"));
            expect(v2_lock_info.period).to.equal(getDays(90));

            const v3_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_3);
            expect(v3_lock_info.minAmount).to.equal(parseEther("2000"));
            expect(v3_lock_info.period).to.equal(getDays(90));

            const v4_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_4);
            expect(v4_lock_info.minAmount).to.equal(parseEther("5000"));
            expect(v4_lock_info.period).to.equal(getDays(90));
        });

        it("Initializes unspecified Locktypes to 0,0", async () => {
            const v5_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_5);
            expect(v5_lock_info.minAmount).to.equal(0);
            expect(v5_lock_info.period).to.equal(0);

            const sa_lock_info = await stakingRewards.lockPeriod(LockType.STAKE_A);
            expect(sa_lock_info.minAmount).to.equal(0);
            expect(sa_lock_info.period).to.equal(0);
        });

    });

    describe("Check Owner Functions", () => {

        it("Should update lock period", async () => {
            await stakingRewards.updateLockPeriod(LockType.LOCK_0, getDays(60));
            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_0);
            expect(v1_lock_info.minAmount).to.equal(parseEther("300"));
            expect(v1_lock_info.period).to.equal(getDays(60));
        });

        it("Should update staking amount for land early access", async () => {
            await stakingRewards.updateLockLimitation(LockType.LOCK_0, parseEther("400"));
            const v1_lock_info = await stakingRewards.lockPeriod(LockType.LOCK_0);
            expect(v1_lock_info.minAmount).to.equal(parseEther("400"));
            expect(v1_lock_info.period).to.equal(getDays(90));
        });

        it("Should update ticket price for raffle lucky draw", async () => {
            await stakingRewards.updateLockLimitation(LockType.STAKE_0, parseEther("20"));
            const v1_raffle_info = await stakingRewards.lockPeriod(LockType.STAKE_0);
            expect(v1_raffle_info.minAmount).to.equal(parseEther("20"));
            expect(v1_raffle_info.period).to.equal(getDays(30));
        });

        it("Initializes Unused LockTypes to 0", async () => {
            const v1_raffle_info = await stakingRewards.lockPeriod(LockType.STAKE_F);
            expect(v1_raffle_info.minAmount).to.equal(0);
            expect(v1_raffle_info.period).to.equal(0);
        });

        it("Can update ticket price for a new lucky draw", async () => {
            await stakingRewards.updateLockLimitation(LockType.STAKE_C, parseEther("69"));
            const v1_raffle_info = await stakingRewards.lockPeriod(LockType.STAKE_C);
            expect(v1_raffle_info.minAmount).to.equal(parseEther("69"));
            expect(v1_raffle_info.period).to.equal(0);
        });

        it("Can update staking period for a new lucky draw", async () => {
            await stakingRewards.updateLockPeriod(LockType.STAKE_D, getDays(42));
            const v1_raffle_info = await stakingRewards.lockPeriod(LockType.STAKE_D);
            expect(v1_raffle_info.minAmount).to.equal(0);
            expect(v1_raffle_info.period).to.equal(getDays(42));
        });
    });

    describe("Check Raffle Staking", () => {
        it("Should revert the transaction on zero ticket amount", async () => {
            await expect(stakingRewards.stake(0, LockType.STAKE_0)).to.be.rejectedWith('Invalid Amount');
        });

        it("Should purchase 3 tickets", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.STAKE_0)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.STAKE_0)).to.be.equal(parseEther("30"));
        });

        it("Should purchase same tier tickets serveral times", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.STAKE_0)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.STAKE_0)).to.be.equal(parseEther("30"));

            // Purchase 2 tickets for V1 Land again
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("20"));
            await expect(stakingRewards.connect(addrs[1]).stake(2, LockType.STAKE_0)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.STAKE_0)).to.be.equal(parseEther("50"));
        });

        it("Should revert tx for withdrawing tokens after 20 days for Raffle staking", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.STAKE_0)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 20 days.
            await time.increase(getDays(20));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.STAKE_0)).to.be.rejectedWith('Still in the lock period');
        });

        it("Should withdraw tokens after the lock period", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.STAKE_0)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 30 days.
            await time.increase(getDays(30));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.STAKE_0)).to.emit(stakingRewards, 'Withdrawn');
        });

        it("Disallows Staking into a Zero minAmount LockType", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("30"));

            // Attempt to purchase 3 tickets for Stake
            await expect(stakingRewards.connect(addrs[1]).stake(3, LockType.STAKE_C)).to.be.rejectedWith("LockType is inactive.");
        });

        it("Disallows Staking More Tokens than Approved", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("3000"));

            // Attempt to exceed approved amount
            await expect(stakingRewards.connect(addrs[1]).stake(9001, LockType.STAKE_0)).to.be.rejectedWith("ERC20: insufficient allowance");
        });

        it("Disallows Staking More Tokens than Available", async () => {
            // Approve MEE token for staking Contract            
            const everything = await governanceToken.connect(addrs[3]).balanceOf(addrs[3].address);
            expect(everything).to.be.greaterThan(0, "Test wallet has no MEE.");

            await governanceToken.connect(addrs[3]).approve(stakingRewards.address, everything+parseEther("100"));

            // Attempt to exceed available amount, NB: hardcoded price from test fixture, is set to 20 MEE per ticket
            await expect(stakingRewards.connect(addrs[3]).stake(everything.div(20)+1, LockType.STAKE_0)).to.be.rejectedWith("ERC20: transfer amount exceeds balance");
        });
    });

    describe("Check Early Access Staking", () => {
        it("Should revert the transaction on zero amount", async () => {
            await expect(stakingRewards.stake(0, LockType.LOCK_0)).to.be.rejectedWith('Invalid Amount');
        });

        it("Should revert the transaction for wrong amount", async () => {
            await expect(stakingRewards.stake(2, LockType.LOCK_0)).to.be.rejectedWith('Can only lock exactly one');
        });

        it("Should stake 300 MEE tokens for Land Tier 1 Early access", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_0)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, LockType.LOCK_0)).to.be.equal(parseEther("300"));
        });

        it("Will deduct the correct amount", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[4]).approve(stakingRewards.address, parseEther("300"));

            //Note down previous balance
            const previous = await governanceToken.connect(addrs[4]).balanceOf(addrs[4].address);

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[4]).stake(1, LockType.LOCK_0)).to.emit(stakingRewards, "Staked");

            //Verify correct amount deducted
            expect(await governanceToken.connect(addrs[4]).balanceOf(addrs[4].address)).to.be.equal(previous.sub(parseEther("300")));        
        });

        it("Should reverted with Nothing to Withdraw for non-stakers", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_0)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 90 days.
            await time.increase(getDays(90));

            await expect(stakingRewards.connect(addrs[0]).withdraw(LockType.LOCK_0)).to.be.revertedWith('Nothing to withdraw');
        });

        it("Can withdraw tokens after the lock period", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            //Note down previous balance
            const previous = await governanceToken.connect(addrs[1]).balanceOf(addrs[1].address);

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_0)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 90 days.
            await time.increase(getDays(90));

            await expect(stakingRewards.connect(addrs[1]).withdraw(LockType.LOCK_0)).to.emit(stakingRewards, 'Withdrawn');

            //Ensure correct amount was transferred
            expect(await governanceToken.connect(addrs[1]).balanceOf(addrs[1].address)).to.be.equal(previous);        
        });

        it("Withdraw the entire balance", async () => {
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther("300"));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, LockType.LOCK_0)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 123 days.
            await time.increase(getDays(123));
            await stakingRewards.connect(addrs[1]).withdraw(LockType.LOCK_0);

            //Ensure zero tokens remain staked.
            expect(await stakingRewards.connect(addrs[1]).balanceOf(addrs[1].address, LockType.LOCK_0)).to.be.equal(0);        
        });
    });
});
