import {expect} from "chai";
import {ethers, upgrades} from "hardhat";
import {BigNumber, Contract, ContractFactory, utils} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { days } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration";
import { formatEther, parseEther } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { parse } from "path";

const getDays = (day: number) => {
    return 24 * 60 * 60 * day;
}

const tier_first = ethers.utils.formatBytes32String("Lottery_3_202305")
const tier_second = ethers.utils.formatBytes32String("Lottery_4_202305")
const tier_exploit = ethers.utils.formatBytes32String("exploit_attempt")


describe("StakingRewards contract", function () {
    let governanceTokenFactory: ContractFactory;
    let governanceToken: Contract;
    let mockupToken: Contract;
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

        mockupToken = await governanceTokenFactory.deploy(
            "MEE Governance Token", 18, "MEE", gameOwner.address, addressList);

        stakingRewardsFactory = await ethers.getContractFactory("StakingRewardsCampaign");
        stakingRewards = await upgrades.deployProxy(stakingRewardsFactory, [
            governanceToken.address        
        ]);

        //Distribute some coins from the exchanges wallet to the other testers
        await Promise.all([
            governanceToken.connect(addrs[1]).transfer(addrs[2].address, parseEther("654321")),
            governanceToken.connect(addrs[1]).transfer(addrs[3].address, parseEther("200000")),
            governanceToken.connect(addrs[1]).transfer(addrs[4].address, parseEther("50000")),
            governanceToken.connect(addrs[1]).transfer(addrs[5].address, parseEther("123456")),
            governanceToken.connect(addrs[1]).transfer(addrs[6].address, parseEther("10"))
        ]);
    });

    describe("Check Configuration", () => {

        it("Should set the right owner", async () => {
            expect(await stakingRewards.owner()).to.equal(owner.address);
        });

        it("Check Lock Type and Peroid, Tokens to stake", async () => {
            const v0_lock_info = await stakingRewards.lockPeriod(tier_first);
            expect(v0_lock_info.increment).to.equal(parseEther("0"));
            expect(v0_lock_info.maxAmount).to.equal(parseEther("0"));
            expect(v0_lock_info.period).to.equal(getDays(0));
        });

    });

    describe("Check Owner Functions", () => {

        it("Should update lock period", async () => {
            await stakingRewards.updateLockPeriod(tier_first, getDays(60));
            const v1_lock_info = await stakingRewards.lockPeriod(tier_first);
            expect(v1_lock_info.increment).to.equal(parseEther("0"));
            expect(v1_lock_info.maxAmount).to.equal(parseEther("0"));
            expect(v1_lock_info.period).to.equal(getDays(60));
        });

        it("Should update staking amount for land early access", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("400"), 0);
            const v1_lock_info = await stakingRewards.lockPeriod(tier_first);
            expect(v1_lock_info.increment).to.equal(parseEther("400"));
            expect(v1_lock_info.maxAmount).to.equal(0);
            expect(v1_lock_info.period).to.equal(getDays(0));
        });

        it("Should update ticket price for raffle lucky draw", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), parseEther("20"));
            const v1_raffle_info = await stakingRewards.lockPeriod(tier_first);
            expect(v1_raffle_info.increment).to.equal(parseEther("20"));
            expect(v1_raffle_info.period).to.equal(0);
        });

        it("Can update ticket price for a new lucky draw", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("69"), 0);
            const v1_raffle_info = await stakingRewards.lockPeriod(tier_first);
            expect(v1_raffle_info.increment).to.equal(parseEther("69"));
            expect(v1_raffle_info.period).to.equal(0);
        });

        it("Can update staking period for a new lucky draw", async () => {
            await stakingRewards.updateLockPeriod(tier_first, getDays(42));
            const v1_raffle_info = await stakingRewards.lockPeriod(tier_first);
            expect(v1_raffle_info.increment).to.equal(0);
            expect(v1_raffle_info.period).to.equal(getDays(42));
        });
    });

    describe("Check Raffle Staking", () => {
        
        it("Should revert the transaction on zero ticket amount", async () => {
            await expect(stakingRewards.stake(0, tier_first)).to.be.rejectedWith('Invalid Amount');
        });

        it("Should revert the transaction on zero ticket amount", async () => {
            await expect(stakingRewards.stake(1, tier_second)).to.be.rejectedWith('Not Active');
        });
            
        it("Should purchase 3 tickets", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            const v1_stake_info = await stakingRewards.lockPeriod(tier_first);
            // Approve MEE token for staking Contract
            const ticketPrice = formatEther(v1_stake_info.increment);

            await governanceToken.connect(addrs[2]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 3).toString()));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[2]).stake(3, tier_first)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[2].address, tier_first)).to.be.equal(parseEther((parseInt(ticketPrice) * 3).toString()));
        });

        it("Should purchase same tier tickets serveral times", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            const v1_stake_info = await stakingRewards.lockPeriod(tier_first);
            const ticketPrice = formatEther(v1_stake_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 3).toString()));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, tier_first)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract
            expect(await stakingRewards.balanceOf(addrs[1].address, tier_first)).to.be.equal(parseEther((parseInt(ticketPrice) * 3).toString()));

            // Purchase 2 tickets for V1 Land again
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 2).toString()));
            await expect(stakingRewards.connect(addrs[1]).stake(2, tier_first)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, tier_first)).to.be.equal(parseEther((parseInt(ticketPrice) * 5).toString()));
        });

        it("Should revert tx for withdrawing tokens after 20 days for Raffle staking", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            await stakingRewards.updateLockPeriod(tier_first, getDays(60));
            const v1_stake_info = await stakingRewards.lockPeriod(tier_first);
            const ticketPrice = formatEther(v1_stake_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 3).toString()));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, tier_first)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 20 days.
            await time.increase(getDays(20));

            await expect(stakingRewards.connect(addrs[1]).withdraw(tier_first)).to.be.rejectedWith('Still in the lock period');
        });

        it("Should withdraw tokens after the lock period", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            const v1_stake_info = await stakingRewards.lockPeriod(tier_first);
            const ticketPrice = formatEther(v1_stake_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 3).toString()));

            // Purchase 3 tickets for V1 Land
            await expect(stakingRewards.connect(addrs[1]).stake(3, tier_first)).to.emit(stakingRewards, "Staked");

            // Withdraw tokens after 30 days.
            await time.increase(getDays(30));

            await expect(stakingRewards.connect(addrs[1]).withdraw(tier_first)).to.emit(stakingRewards, 'Withdrawn');
        });

        it("Disallows Staking More Tokens than Approved", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            const v1_stake_info = await stakingRewards.lockPeriod(tier_first);
            const ticketPrice = formatEther(v1_stake_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(ticketPrice) * 9000).toString()));

            // Attempt to exceed approved amount
            await expect(stakingRewards.connect(addrs[1]).stake(9001, tier_first)).to.be.rejectedWith("ERC20: insufficient allowance");
        });

        it("Disallows Staking More Tokens than Available", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            // Approve MEE token for staking Contract            
            const everything = await governanceToken.connect(addrs[3]).balanceOf(addrs[3].address);
            expect(everything).to.be.greaterThan(0, "Test wallet has no MEE.");

            await governanceToken.connect(addrs[3]).approve(stakingRewards.address, everything+parseEther("100"));

            // Attempt to exceed available amount, NB: hardcoded price from test fixture, is set to 20 MEE per ticket
            await expect(stakingRewards.connect(addrs[3]).stake(everything.div(20)+1, tier_first)).to.be.rejectedWith("ERC20: transfer amount exceeds balance");
        });
    });

    describe("Owner Admin Interface", () => {
        it("Should pause staking MEE tokens(ex: for Land Tier 1 Early access)", async () => {
            // Pause Contract
            await stakingRewards.pause();

            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            const v1_lock_info = await stakingRewards.lockPeriod(tier_first);
            const increment = formatEther(v1_lock_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(increment) * 1).toString()));

            await expect(stakingRewards.connect(addrs[1]).stake(1, tier_first)).to.be.rejectedWith("Pausable: paused");

            await stakingRewards.unPause();
            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, tier_first)).to.emit(stakingRewards, "Staked");

            // Check Locked MEE token balance from the staking contract for the selected lock type
            expect(await stakingRewards.balanceOf(addrs[1].address, tier_first)).to.be.equal(parseEther((parseInt(increment) * 1).toString()));
        });

        it("Pause Withdrawing tokens", async () => {
            await stakingRewards.updateLockLimitation(tier_first, parseEther("20"), 0);
            await stakingRewards.updateLockPeriod(tier_first, getDays(60));
            const v1_lock_info = await stakingRewards.lockPeriod(tier_first);
            const increment = formatEther(v1_lock_info.increment);
            // Approve MEE token for staking Contract
            await governanceToken.connect(addrs[1]).approve(stakingRewards.address, parseEther((parseInt(increment) * 1).toString()));

            // Stake tokens for V1 Land Early Access
            await expect(stakingRewards.connect(addrs[1]).stake(1, tier_first)).to.emit(stakingRewards, "Staked");
            // Pause Contract
            await stakingRewards.pause();

            // Withdraw tokens after 123 days.
            await time.increase(getDays(123));
            await expect(stakingRewards.connect(addrs[1]).withdraw(tier_first)).to.be.rejectedWith("Pausable: paused");
            
            await stakingRewards.unPause();
            await stakingRewards.connect(addrs[1]).withdraw(tier_first);
            //Ensure zero tokens remain staked.
            expect(await stakingRewards.connect(addrs[1]).balanceOf(addrs[1].address, tier_first)).to.be.equal(0);        
        });

        it("Non-Owner may not Recover ERC20", async () => {
            await mockupToken.connect(addrs[1]).transfer(stakingRewards.address, utils.parseEther("10"));
            // Reject if the caller is not the owner
            await expect(stakingRewards.connect(addrs[1]).recoverERC20(mockupToken.address, utils.parseEther("10"))).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Owner can Recover ERC20 in the precise amount", async () => {
            await mockupToken.connect(addrs[1]).transfer(stakingRewards.address, utils.parseEther("10"));

            // Try to recover some of the balance
            const before_contract = await mockupToken.connect(owner).balanceOf(stakingRewards.address);
            const before = await mockupToken.connect(owner).balanceOf(owner.address);
            
            // Recover the tokens
            await expect(stakingRewards.connect(owner).recoverERC20(mockupToken.address, utils.parseEther("10"))).to.emit(stakingRewards, "Recovered");
            
            //Check if the contract balance is reduced by the amount recovered
            const after_contract = await mockupToken.connect(owner).balanceOf(stakingRewards.address);
            expect(after_contract + parseEther("10")).to.be.equal(before_contract);

            //Check if the owner balance is increased by the amount recovered
            const after = await mockupToken.connect(owner).balanceOf(owner.address);
            expect(after).to.be.equal(before + parseEther("10"));
        });
    });


    describe("Order of Operation Tests", () => {

        it("Can only stake if has enough tokens", async () => {
            await stakingRewards.updateLockPeriod(tier_exploit, 1);
            await stakingRewards.updateLockLimitation(tier_exploit, 1, 0);

            //Ensure test is run with correct parameters.
            const balance = await governanceToken.connect(addrs[6]).balanceOf(addrs[6].address);
            expect(balance).to.be.lessThan(parseEther("100"));
            expect(balance).to.be.greaterThanOrEqual(parseEther("10"));

            //Try to stake more than we have.
            await governanceToken.connect(addrs[6]).approve(stakingRewards.address, parseEther("200"));
            await expect(stakingRewards.connect(addrs[6]).stake(parseEther("100"), tier_exploit)).to.be.rejectedWith("ERC20: transfer amount exceeds balance");

            //Verify we still have a zero stake!
            const stake = await stakingRewards.connect(addrs[6]).balanceOf(addrs[6].address, tier_exploit);
            expect(stake).to.be.equal(0);
        });
    });

});
