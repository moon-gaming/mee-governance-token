// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory } from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
// import { solidity } from "ethereum-waffle";

// chai.use(solidity);
const pow18 = BigNumber.from("10").pow(18);
const maxSupply = 8000000000;
enum RoundType{
  SEED, PRIVATE, PUBLIC, PLAYANDEARN, EXCHANGES, TREASURY, ADVISOR, TEAM, SOCIAL
}

const DAY_TO_SECONDS = 24 * 60 * 60;
const MONTH_TO_SECONDS = 30 * DAY_TO_SECONDS;

interface Distribution {
  type: string;
  vesting: number;
  cliff: number;
  totalRemaining: BigNumber;
  supply: BigNumber;
  vestingGranularity: number;
  externalReserv: boolean;
}

interface ClaimObj {
  totalClaimedAmount: BigNumber;
  claimedAmount: BigNumber;
}

const seedDistribution: Distribution = {
  type: RoundType[RoundType.SEED],
  vesting: 24 * DAY_TO_SECONDS,
  cliff: 2 * DAY_TO_SECONDS,
  totalRemaining: BigNumber.from("560000000").mul(pow18),
  supply: BigNumber.from("560000000").mul(pow18),
  vestingGranularity: DAY_TO_SECONDS,
  externalReserv: true,
}

const privateDistribution: Distribution = {
  type: RoundType[RoundType.PRIVATE],
  vesting: 22 * DAY_TO_SECONDS,
  cliff: 2 * DAY_TO_SECONDS,
  totalRemaining: BigNumber.from("320000000").mul(pow18),
  supply: BigNumber.from("320000000").mul(pow18),
  vestingGranularity: DAY_TO_SECONDS,
  externalReserv: true
}

const playAndEarnDistribution: Distribution = {
  type: RoundType[RoundType.PLAYANDEARN],
  vesting: 36 * DAY_TO_SECONDS,
  cliff: 1 * DAY_TO_SECONDS,
  totalRemaining: BigNumber.from("2000000000").mul(pow18),
  supply: BigNumber.from("2000000000").mul(pow18),
  vestingGranularity: DAY_TO_SECONDS,
  externalReserv: false
}

const socialDistribution: Distribution = {
  type: RoundType[RoundType.SOCIAL],
  vesting: 26 * MONTH_TO_SECONDS,
  cliff: 4 * MONTH_TO_SECONDS,
  totalRemaining: BigNumber.from("80000000").mul(pow18),
  supply: BigNumber.from("80000000").mul(pow18),
  vestingGranularity: MONTH_TO_SECONDS,
  externalReserv: false
}

const teamDistribution: Distribution = {
  type: RoundType[RoundType.TEAM],
  vesting: 36 * MONTH_TO_SECONDS,
  cliff: 12 * MONTH_TO_SECONDS,
  totalRemaining: BigNumber.from("1200000000").mul(pow18),
  supply: BigNumber.from("1200000000").mul(pow18),
  vestingGranularity: MONTH_TO_SECONDS,
  externalReserv: false
}

const treasuryDistribution: Distribution = {
  type: RoundType[RoundType.TREASURY],
  vesting: 34 * MONTH_TO_SECONDS,
  cliff: 4 * MONTH_TO_SECONDS,
  totalRemaining: BigNumber.from("2400000000").mul(pow18),
  supply: BigNumber.from("2400000000").mul(pow18),
  vestingGranularity: MONTH_TO_SECONDS,
  externalReserv: false
}

const rounds = [seedDistribution, privateDistribution]; //playAndEarnDistribution, socialDistribution, teamDistribution, treasuryDistribution];

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
  let governanceToken :Contract;
  let owner :SignerWithAddress;
  let gameOwner :SignerWithAddress;
  let buyer :SignerWithAddress;
  let signer :SignerWithAddress;
  let addrs :SignerWithAddress[];

  before(async () => {
    const accounts = await ethers.getSigners();
    [owner, gameOwner, buyer, signer, ...addrs] = accounts;

    for (const account of accounts) {
      console.log(await account.address, (await account.getBalance()).toBigInt());
    }
  });

  beforeEach(async () => {

    // Get the ContractFactory and Signers here.
    governanceTokenFactory = await ethers.getContractFactory("GovernanceToken");

    const addressList = addrs.filter((_, index) => index < 6).map((addr) => addr.address);
    governanceToken = await governanceTokenFactory.deploy(
      maxSupply, "AoE Governance Token", 18, "MEE", gameOwner.address, signer.address);
    await governanceToken.connect(gameOwner).initialReservAndMint(addressList);

    // await governanceToken.connect(gameOwner).setMEEPrice(1);
  });

  describe("Deployment", () => {
    it("Decimal control", async () => {
      expect(await governanceToken.decimals()).to.equal(18);
    });

    it("Should set the right owner", async () => {
      expect(await governanceToken.owner()).to.equal(owner.address);
    });

    it("owner blaance should be 0 during deployment", async () => {
      const ownerBalance = await governanceToken.balanceOf(owner.address);
      expect(0).to.equal(ownerBalance);
    });

    it("supports interface", async () => {
      expect(await governanceToken.decimals()).to.equal(18);
    });

    it("game owner check", async () => {
      await expect(governanceToken.connect(addrs[0]).getGameOwnerAddress()).to.be.revertedWith("Ownable: caller is not the owner");
      expect(await governanceToken.connect(owner).getGameOwnerAddress()).to.be.eq(gameOwner.address);
    });

    it("signatory check", async () => {
      await expect(governanceToken.connect(addrs[0]).getSignatory()).to.be.revertedWith("Ownable: caller is not the owner");
      expect(await governanceToken.connect(owner).getSignatory()).to.be.eq(signer.address);
    });

  });

  describe("Governance Token ERC20 check", async () => {

    it("is it ERC20 token", async () => {
      expect(await governanceToken.connect(addrs[0]).isERC20()).to.be.true;
    });
  })

  /*describe("initial setters", async () => {
    it("Should set MEE price with only gameowner", async () => {
      await expect(governanceToken.connect(addrs[0]).setMEEPrice(10)).to.be.revertedWith("GameToken: caller is not the game adress");
      await expect(governanceToken.connect(gameOwner).setMEEPrice(10)).to.be.not.reverted;
      await expect(governanceToken.connect(addrs[0]).getMEEPrice()).to.be.revertedWith("GameToken: caller is not the game adress");
      expect(await governanceToken.connect(gameOwner).getMEEPrice()).to.eq(10);
    });
  })*/

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async () => {
      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);
      // await governanceToken.connect(gameOwner).setTokenPriceMap(RoundType[RoundType.PUBLIC], 1);

      const tokenAmount = BigNumber.from("100").mul(pow18);

      await governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], addrs[6].address, tokenAmount);

      await governanceToken.connect(addrs[6]).transfer(addrs[7].address, 50);
      const addr1Balance = await governanceToken.balanceOf(addrs[7].address);
      expect(addr1Balance).to.equal(50);

      await governanceToken.connect(addrs[6]).transfer(addrs[8].address, 50);
      const addr2Balance = await governanceToken.balanceOf(addrs[8].address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn’t have enough tokens", async () => {
      const initialOwnerBalance = await governanceToken.balanceOf(owner.address);

      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);
      // await governanceToken.connect(gameOwner).setTokenPriceMap(RoundType[RoundType.PUBLIC], 1);

      const tokenAmount = BigNumber.from("1").mul(pow18);

      await governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], addrs[9].address, tokenAmount);

      // Try to send 1/10**18 token from addr1 (0 tokens) to owner (1000000 tokens).
      // `require` will evaluate false and revert the transaction.
      await expect(
        governanceToken.connect(addrs[9]).transfer(owner.address, BigNumber.from("2").mul(pow18))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed.
      expect(await governanceToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async () => {
      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);
      // await governanceToken.connect(gameOwner).setTokenPriceMap(RoundType[RoundType.PUBLIC], 1);

      const tokenAmount = BigNumber.from("150").mul(pow18);

      await governanceToken.connect(gameOwner).mintTokensForPublic(RoundType[RoundType.PUBLIC], owner.address, tokenAmount);

      const initialOwnerBalance = await governanceToken.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1.
      await governanceToken.transfer(gameOwner.address, 100);

      // Transfer another 50 tokens from owner to addr2.
      await governanceToken.transfer(buyer.address, 50);

      // Check balances.
      const finalOwnerBalance = await governanceToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

      const addr1Balance = await governanceToken.balanceOf(gameOwner.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await governanceToken.balanceOf(buyer.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("Reserve and claim token",  () => {

    describe("Reserve token", function () {

      /*it("reserv token set Token Price", async () => {
        const keys = Object.keys(RoundType).filter((v) => isNaN(Number(v)));
        keys.forEach(async (round) => {
          await governanceToken.connect(gameOwner).setTokenPriceMap(round, 120);
          expect(await governanceToken.connect(gameOwner).getTokenPriceMap(round)).to.be.equal(120);
        })
      });*/

      it("reserv token set Active round multiple times", async () => {
        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);

        await expect( governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE])).to.be.revertedWith("Round is already active");
      });

      it("reserve token with whitelisted user", async () => {
        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);

        await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);

        const tokenAmount = BigNumber.from(10).mul(pow18);

        await governanceToken.connect(addrs[0]).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount);

        await governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 0);

        await expect(governanceToken.connect(addrs[0]).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount)).to.be.revertedWith("address is not confirmed to reserv the token");
      });

      it("reserve token with [private] round for a user who is already registered [seed] round", async () => {
        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);

        const tokenAmount = BigNumber.from(10).mul(pow18);

        await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);
        await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount)).to.be.revertedWith("User has already registered for different round");
      });

      it("reserve token with [seed] round for a user who is already registered [private] round", async () => {
        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);

        const tokenAmount = BigNumber.from(10).mul(pow18);

        await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount);
        await expect(governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount)).to.be.revertedWith("User has already registered for different round");
      });

      describe("reserv token address control", async () => {

        describe("Add Address", () => {
          it("with not game owner user", async () => {
            await expect( governanceToken.connect(addrs[0]).addAddressForDistribution(RoundType[RoundType.PRIVATE],
               addrs[0].address)).to.be.revertedWith("GameToken: caller is not the game adress");
          });

          it("with not activated round", async () => {
            await expect( governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE],
               addrs[0].address)).to.be.revertedWith("round is not active");
          });
        });

        describe("Delete Address", () => {
          it("with not game owner user", async () => {
            await expect( governanceToken.connect(addrs[0]).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 0)).to.be.revertedWith("GameToken: caller is not the game adress");
          });

          it("with not activated round", async () => {
            await expect( governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 0)).to.be.revertedWith("round is not active");
          });

          it("index out of bound", async () => {
            await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);
            await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);
            await expect( governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 5)).to.be.revertedWith("index is out of distribution address array bounds");
          });

          it("index and address don't match", async () => {
            await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);
            await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address);
            await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[1].address);

            await expect( governanceToken.connect(gameOwner).deleteAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[0].address, 1)).to.be.revertedWith("Address does not match");
          });
        });

        describe("Get Address List", () => {
          it("with not game owner user", async () => {
            await expect( governanceToken.connect(addrs[0]).getAddressList(RoundType[RoundType.PRIVATE])).to.be.revertedWith("GameToken: caller is not the game adress");
          });

          it("with not activated round", async () => {
            await expect( governanceToken.connect(gameOwner).getAddressList(RoundType[RoundType.PRIVATE])).to.be.revertedWith("round is not active");
          });

          it("success", async () => {
            await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);
            await governanceToken.connect(gameOwner).addAddressForDistribution(RoundType[RoundType.PRIVATE], addrs[1].address);
            expect(await governanceToken.connect(gameOwner).getAddressList(RoundType[RoundType.PRIVATE])).to.be.eql([addrs[1].address]);
          });
        });

      });

      it("reserv token over supply", async () => {
        const tokenAmount = BigNumber.from(560_000_001).mul(BigNumber.from("10").pow(18));
        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount)).to.be.revertedWith("given amount is bigger than max supply for the round");

        expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(0);
      });

      it("reserv token over remaining token", async () => {
        const tokenAmount = BigNumber.from(560_000_000).mul(BigNumber.from("10").pow(18));
        await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);
        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, 1)).to.be.revertedWith("total remaining seed amount is not enough");

        expect(await governanceToken.connect(gameOwner).getTotalPending(RoundType[RoundType.SEED], buyer.address)).to.be.equal(tokenAmount);
      });

      it("reserv token for inactivated round type", async () => {
        const tokenAmount = BigNumber.from(560_000_000).mul(BigNumber.from("10").pow(18));
        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("round is not active");
      });

      it("reserv token for unsupported round type", async () => {
        const tokenAmount = BigNumber.from(560_000_000).mul(BigNumber.from("10").pow(18));

        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);

        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount)).to.be.revertedWith("reservation is not supported for this round");
      });

      it("reserv token for non-invest round type", async () => {
        const tokenAmount = BigNumber.from(560_000_000).mul(BigNumber.from("10").pow(18));

        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.EXCHANGES]);
        await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.ADVISOR]);

        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.EXCHANGES], buyer.address, tokenAmount)).to.be.revertedWith("round is not invest round");
        await expect( governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.ADVISOR], buyer.address, tokenAmount)).to.be.revertedWith("round is not invest round");
      });
    });

    describe("claim token", function () {
      const sevenDays = 7 * 24 * 60 * 60;

      it("claiming token without having a balance", async () => {

        await expect(
          governanceToken.connect(buyer).claimTokens(RoundType[RoundType.SEED], buyer.address)
        ).to.be.revertedWith("don't have a reserved balance");

      });

      it("claiming token without having a balance - 0", async () => {
        // Transfer 50 tokens from owner to addr1
        const tokenAmount = BigNumber.from(0).mul(BigNumber.from("10").pow(18));
        await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);

        await expect(
          governanceToken.connect(buyer).claimTokens(RoundType[RoundType.SEED], buyer.address)
        ).to.be.revertedWith("don't have a reserved balance");

      });

      it("claiming token before cliff time", async () => {
        // Transfer 50 tokens from owner to addr1
        const tokenAmount = BigNumber.from(10).mul(BigNumber.from("10").pow(18));
        await governanceToken.connect(gameOwner).reserveTokens(RoundType[RoundType.SEED], buyer.address, tokenAmount);

        await expect(
          governanceToken.connect(buyer).claimTokens(RoundType[RoundType.SEED], buyer.address)
        ).to.be.revertedWith("SEED round is still locked");

      });

      it("mocking block time test", async() => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const timestampBefore = blockBefore.timestamp;

        await ethers.provider.send('evm_increaseTime', [sevenDays]);
        await ethers.provider.send('evm_mine', [timestampBefore+sevenDays]);

        const blockNumAfter = await ethers.provider.getBlockNumber();
        const blockAfter = await ethers.provider.getBlock(blockNumAfter);
        const timestampAfter = blockAfter.timestamp;

        //expect(blockNumAfter).to.be.equal(blockNumBefore + 1);
        expect(timestampAfter).to.be.equal(timestampBefore + sevenDays);
      });

      it("claiming token after cliff time has passed", async () => {
        const tokenAmount = BigNumber.from("10").mul(pow18);
        const claimObj: ClaimObj = {
          totalClaimedAmount: BigNumber.from("560000000").mul(pow18),
          claimedAmount: BigNumber.from(0)
        }

        let index = 10;
        for(let round of rounds){
          claimObj.claimedAmount = BigNumber.from(0);
          if(round.type != RoundType[RoundType.SEED]) // already active
            await governanceToken.connect(gameOwner).setActiveRound(round.type);
          await mockBlockTimestamp(round.cliff + 5 * round.vestingGranularity);
          await claimToken(tokenAmount, 0, round, claimObj, addrs[index]);
          index++;
        }
      });

      it("additional claiming token without reserving after cliff time has passed", async () => {
        const tokenAmount = BigNumber.from("416666666666620800").mul(5);
        const claimObj: ClaimObj = {
          totalClaimedAmount: BigNumber.from("560000000").mul(pow18),
          claimedAmount: BigNumber.from(0)
        }

        let index = 10;
        for(let round of rounds){
          claimObj.claimedAmount = BigNumber.from(0);
          if(round.type != RoundType[RoundType.SEED]) // already active
            await governanceToken.connect(gameOwner).setActiveRound(round.type);
          await mockBlockTimestamp(round.cliff + 5 * round.vestingGranularity);
          await claimToken(tokenAmount, 4, round, claimObj, addrs[index]);
          index++;
        }
      });

      it("claiming token having vestingForUserPerSecond == 0 after cliff time has passed", async () => {
        const tokenAmount = BigNumber.from("1");
        const claimObj: ClaimObj = {
          totalClaimedAmount: BigNumber.from("560000000").mul(pow18),
          claimedAmount: BigNumber.from(0)
        }

        let index = 10;
        for(let round of rounds){
          claimObj.claimedAmount = BigNumber.from(0);
          if(round.type != RoundType[RoundType.SEED]) // already active
            await governanceToken.connect(gameOwner).setActiveRound(round.type);
          await mockBlockTimestamp(round.cliff + 5 * round.vestingGranularity);
          await claimToken(tokenAmount, 0, round, claimObj, addrs[index]);
          await expect(
            governanceToken.connect(addrs[index]).claimTokens(round.type, addrs[index].address)
          ).to.be.revertedWith("already claimed everything");
          index++;
        }
      });

      const claimToken = async (tokenAmount: BigNumber, claimingTryWithoutReservation: number, round: Distribution, claimObj: ClaimObj, user: SignerWithAddress) => {
        const vestingForUserPerSecond = tokenAmount.div(round.vesting);
        const releasePerFullPeriod = vestingForUserPerSecond.mul(round.vestingGranularity);
        // for SEED round over 1 week with 2 days cliff time off - 5 days left - that's vested time  in second
        let maximalRelease = releasePerFullPeriod.mul(5);
        let balanceToRelease = BigNumber.from(0);

        for (let index = 0; index <= claimingTryWithoutReservation; index++) {
          if(index == 0 && round.externalReserv){
            await governanceToken.connect(gameOwner).reserveTokens(round.type, user.address, tokenAmount);
            expect( await governanceToken.connect(user).getTotalRemainingForSpecificRound(round.type)).to.be.equal(round.supply.sub(tokenAmount));
          }
          expect( await governanceToken.connect(user).claimTokens(round.type, user.address));

          // reserved balance(token Amount) - claimed balance = unclaimed balance
          if(maximalRelease.sub(tokenAmount.sub(claimObj.claimedAmount)).isNegative() ){
            balanceToRelease = maximalRelease;
          } else {
            balanceToRelease = tokenAmount.sub(claimObj.claimedAmount);
          }

          if(vestingForUserPerSecond.isZero()){
            balanceToRelease = tokenAmount.sub(claimObj.claimedAmount);
          }

          claimObj.totalClaimedAmount = claimObj.totalClaimedAmount.add(balanceToRelease);

          claimObj.claimedAmount = claimObj.claimedAmount.add(balanceToRelease);

          expect( await governanceToken.connect(user).balanceOf(user.address)).to.be.equal(claimObj.claimedAmount);

          expect( await governanceToken.connect(user).getTotalClaimedForAllRounds()).to.be.equal(claimObj.totalClaimedAmount);

          expect( await governanceToken.connect(user).getTotalRemainingForAllRounds()).to.be.equal(BigNumber.from(maxSupply).mul(pow18).sub(claimObj.totalClaimedAmount));
        }
      }

    });
  });

  describe("Mint Token for public", () => {
    it("caller should be gameowner", async () => {
      const tokenAmount = BigNumber.from(10).mul(pow18);

      await expect(governanceToken.connect(addrs[0])
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount))
      .to.be.revertedWith("GameToken: caller is not the game adress");
    });

    it("Round is not active", async () => {
      const tokenAmount = BigNumber.from(10).mul(pow18);

      await expect(governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount))
      .to.be.revertedWith("round is not active");
    });

    it("Round is not public round", async () => {
      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PRIVATE]);
      const tokenAmount = BigNumber.from(10).mul(pow18);

      await expect(governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PRIVATE], buyer.address, tokenAmount))
      .to.be.revertedWith("round type is not valid");
    });

    it("remaning amount is not enough", async () => {
      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);
      // await governanceToken.connect(gameOwner).setTokenPriceMap(RoundType[RoundType.PUBLIC], 1);

      const tokenAmount = BigNumber.from("480000001").mul(pow18);

      await expect(governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount))
      .to.be.revertedWith("total remaining amount is not enough");
    });

    it("success", async () => {
      await governanceToken.connect(gameOwner).setActiveRound(RoundType[RoundType.PUBLIC]);
      // await governanceToken.connect(gameOwner).setTokenPriceMap(RoundType[RoundType.PUBLIC], 1);

      const tokenAmount = BigNumber.from("100").mul(pow18);

      const prevBalance = await governanceToken.connect(gameOwner).balanceOf(buyer.address);

      await governanceToken.connect(gameOwner)
      .mintTokensForPublic(RoundType[RoundType.PUBLIC], buyer.address, tokenAmount);

      const newBalance = await governanceToken.connect(gameOwner).balanceOf(buyer.address);

      expect(Number(newBalance.sub(prevBalance))).eql(Number(tokenAmount));
    });
  });
});
