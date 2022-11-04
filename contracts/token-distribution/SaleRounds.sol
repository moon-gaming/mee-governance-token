// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./TokenDistribution.sol";
import "../utils/GameOwner.sol";

contract SaleRounds is TokenDistribution, GameOwner, ERC20 {
    using SafeMath for uint;
    using Math for uint;

    mapping(RoundType => Distribution) public roundDistribution;

    mapping(RoundType => address[]) internal addressList;
    mapping(RoundType => mapping(address => uint256)) internal reservedBalances;
    mapping(RoundType => mapping(address => uint256)) internal claimedBalances;

    event ReserveTokensEvent(string indexed roundType, uint resserveAmount, address indexed to);
    event ClaimTokensEvent(string indexed roundType, uint balanceToRelease, address indexed to);

    Distribution private advisorsDistribution;
    Distribution private exchangesDistribution;
    Distribution private playAndEarnDistribution;
    Distribution private privateDistribution;
    Distribution private publicDistribution;
    Distribution private seedDistribution;
    Distribution private socialDistribution;
    Distribution private teamDistribution;
    Distribution private treasuryDistribution;

    uint constant private DAY_TO_SECONDS = 24 * 60 * 60;
    uint constant private MONTH_TO_SECONDS = 30 * DAY_TO_SECONDS;

    struct ClaimInfo {
        uint cliff;
        uint vesting;
        uint balance;
        uint claimedBalance;
        uint periodGranularity;
        uint startTime;
        uint secondsVested;
        uint vestingForUserPerSecond;
    }

    constructor(string memory _tokenName, string memory _tokenSymbol, uint _maxSupply, uint _decimalUnits,
                 address _gameOwnerAddress, address[] memory _walletAddresses)
            ERC20(_tokenName, _tokenSymbol)
            GameOwner(_gameOwnerAddress) {

        // FUNDING ROUNDS
        seedDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:420_000_000 * (10 ** _decimalUnits), supply:420_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        privateDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:210_000_000 * (10 ** _decimalUnits), supply:210_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        publicDistribution = Distribution(
        { vesting:6 * MONTH_TO_SECONDS, cliff:0, totalRemaining:120_000_000 * (10 ** _decimalUnits), supply:120_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        // ALLOCATIONS
        advisorsDistribution = Distribution(
        { vesting:20 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        exchangesDistribution = Distribution(
        { vesting:3 * MONTH_TO_SECONDS, cliff:0, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        playAndEarnDistribution = Distribution(
        { vesting:35 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:600_000_000 * (10 ** _decimalUnits), supply:600_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS });

        socialDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:30_000_000 * (10 ** _decimalUnits), supply:30_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        teamDistribution = Distribution(
        { vesting:24 * MONTH_TO_SECONDS, cliff:12 * MONTH_TO_SECONDS, totalRemaining:450_000_000 * (10 ** _decimalUnits), supply:450_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS });

        treasuryDistribution = Distribution(
        { vesting:30 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:870_000_000 * (10 ** _decimalUnits), supply:870_000_000 * (10 ** _decimalUnits), startTime: 0, vestingGranularity: MONTH_TO_SECONDS});

        roundDistribution[RoundType.SEED] = seedDistribution;
        roundDistribution[RoundType.PRIVATE] = privateDistribution;
        roundDistribution[RoundType.PUBLIC] = publicDistribution;
        roundDistribution[RoundType.PLAYANDEARN] = playAndEarnDistribution;
        roundDistribution[RoundType.SOCIAL] = socialDistribution;
        roundDistribution[RoundType.EXCHANGES] = exchangesDistribution;
        roundDistribution[RoundType.TEAM] = teamDistribution;
        roundDistribution[RoundType.TREASURY] = treasuryDistribution;
        roundDistribution[RoundType.ADVISOR] = advisorsDistribution;

        maxSupply = _maxSupply * (10 ** _decimalUnits);

        initialReserveAndMint(_walletAddresses);
    }

    function initialReserveAndMint(address[] memory walletAddresses) private {
        require(walletAddresses.length == 6, "walletAddresses array is not the correct length");
        address exchangesWalletAddress = walletAddresses[0];
        address playAndEarnWalletAddress = walletAddresses[1];
        address socialWalletAddress = walletAddresses[2];
        address teamWalletAddress = walletAddresses[3];
        address treasuryWalletAddress = walletAddresses[4];
        address advisorsWalletAddress = walletAddresses[5];

        //ALLOCATIONS WITH WALLET CONSTANT
        require(playAndEarnWalletAddress != address(0), "Play and earn wallet address is 0x0");
        reserveTokensInternal(RoundType.PLAYANDEARN, playAndEarnWalletAddress, playAndEarnDistribution.supply);

        require(socialWalletAddress != address(0), "Social wallet address is 0x0");
        reserveTokensInternal(RoundType.SOCIAL, socialWalletAddress, socialDistribution.supply);

        require(teamWalletAddress != address(0), "Team wallet address is 0x0");
        reserveTokensInternal(RoundType.TEAM, teamWalletAddress, teamDistribution.supply);

        require(treasuryWalletAddress != address(0), "Treasury wallet address is 0x0");
        reserveTokensInternal(RoundType.TREASURY, treasuryWalletAddress, treasuryDistribution.supply);

        require(advisorsWalletAddress != address(0), "Advisors wallet address is 0x0");
        reserveTokensInternal(RoundType.ADVISOR, advisorsWalletAddress, advisorsDistribution.supply);

        require(exchangesWalletAddress != address(0), "Exchanges wallet address is 0x0");

        // Initial minting of 40% of total supply for exchanges distribution
        uint256 initialExchangesSupply = 60_000_000;
        _mint(exchangesWalletAddress, initialExchangesSupply);
        roundDistribution[RoundType.EXCHANGES].totalRemaining -= initialExchangesSupply;
        claimedBalances[RoundType.EXCHANGES][exchangesWalletAddress] += initialExchangesSupply;

        // Reserving rest of the 60% of the supply for exchanges distribution
        reserveTokensInternal(RoundType.EXCHANGES, exchangesWalletAddress, exchangesDistribution.supply - initialExchangesSupply);
    }

    modifier isEligibleToReserveToken(string calldata _roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType != RoundType.PUBLIC, "reservation is not supported for this round");
        require(isGameOwnerAddress(), "only GameOwner can reserve the token");
        _;
    }

    modifier isInvestRound(string calldata _roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType == RoundType.SEED ||
        roundType == RoundType.PRIVATE ||
            roundType == RoundType.PUBLIC , "round is not invest round");
        _;
    }

    modifier claimableRound(string calldata _roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType != RoundType.PUBLIC && roundType != RoundType.EXCHANGES && roundType != RoundType.ADVISOR, "Claiming is not supported for this round");
        _;
    }

    function addAddressForDistribution(string calldata _roundType, address _address) external
        onlyGameOwner returns(bool) {

        RoundType roundType = getRoundTypeByKey(_roundType);
        addressList[roundType].push(_address);

        return true;
    }

    function deleteAddressForDistribution(string calldata _roundType, address _address, uint _index) external
        onlyGameOwner returns(bool) {

        RoundType roundType = getRoundTypeByKey(_roundType);
        require(_index < addressList[roundType].length, "index is out of distribution address array bounds");
        require(_address == addressList[roundType][_index], "Address does not match!");

        addressList[roundType][_index] = addressList[roundType][addressList[roundType].length - 1];
        addressList[roundType].pop();
        return true;
    }

    function getAddressList(string calldata _roundType) external onlyGameOwner view returns(address[] memory){
        RoundType roundType = getRoundTypeByKey(_roundType);
        return addressList[roundType];
    }

    // @_amount is going be decimals() == default(18) digits
    function reserveTokensInternal(RoundType _roundType, address _to, uint _amount) private {
        require(roundDistribution[_roundType].supply >= _amount, "given amount is bigger than max supply for the round");
        require(roundDistribution[_roundType].totalRemaining >= _amount, "total remaining round amount is not enough");
        roundDistribution[_roundType].totalRemaining -= _amount;
        roundDistribution[_roundType].startTime = block.timestamp;
        reservedBalances[_roundType][_to] += _amount;
    }

    // @_amount is going be decimals() == default(18) digits
    function reserveTokens(string calldata _roundType, address _to, uint _amount) external
        isInvestRound(_roundType) isEligibleToReserveToken(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        if(reservedBalances[RoundType.SEED][_to] > 0 && roundType != RoundType.SEED){
            revert("User has already registered for different round");
        }

        if(reservedBalances[RoundType.PRIVATE][_to] > 0 && roundType != RoundType.PRIVATE){
            revert("User has already registered for different round");
        }

        reserveTokensInternal(roundType, _to, _amount);
        emit ReserveTokensEvent(_roundType, _amount, _to);
    }

    // @_amount is going be decimals() == default(18) digits
    function mintTokensForPublic(string calldata _roundType, address _to, uint _amount) external
        onlyOwner {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType == RoundType.PUBLIC , "round type is not valid");
        require(roundDistribution[roundType].totalRemaining >= _amount, "total remaining amount is not enough");

        roundDistribution[roundType].totalRemaining -= _amount;
        _mint(_to, _amount);
    }

    function mintTokensForExchanges(address _to, uint _amount) public onlyOwner {
        RoundType roundType = RoundType.EXCHANGES;
        require(reservedBalances[roundType][_to] >= _amount, "amount is grater then total reserved balance");

        ClaimInfo memory exchangesClaimInfo = ClaimInfo({
                            cliff: roundDistribution[roundType].cliff,
                            vesting: roundDistribution[roundType].vesting,
                            balance: reservedBalances[roundType][_to],
                            claimedBalance: claimedBalances[roundType][_to],
                            periodGranularity: roundDistribution[roundType].vestingGranularity,
                            startTime: roundDistribution[roundType].startTime,
                            secondsVested: 0,
                            vestingForUserPerSecond: 0
        });

        require(exchangesClaimInfo.balance > 0, "don't have a reserved balance");
        exchangesClaimInfo.secondsVested = calculateCliffTimeDiff(exchangesClaimInfo);
        require(exchangesClaimInfo.secondsVested > 0, string.concat("Exchanges round cliff time didn't expired"));
        exchangesClaimInfo.vestingForUserPerSecond = calculateVestingForUserPerSecond(exchangesClaimInfo);

        uint maximumRelease = getMaximumRelease(exchangesClaimInfo);

        (uint balanceToRelease, uint unClaimedBalance) = getBalanceToRelease(maximumRelease, exchangesClaimInfo);

        if (exchangesClaimInfo.vestingForUserPerSecond == 0) {
            balanceToRelease = unClaimedBalance;
        }
        _mint(_to, balanceToRelease);
    }

    function claimTokens(string calldata _roundType, address _to) external
    claimableRound(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);
        require(_msgSender() == _to, "Sender is not a recipient");

        ClaimInfo memory claimInfo = ClaimInfo({cliff: roundDistribution[roundType].cliff,
                                                vesting: roundDistribution[roundType].vesting,
                                                balance: reservedBalances[roundType][_to],
                                                claimedBalance: claimedBalances[roundType][_to],
                                                //granularity can be 30 * 24 * 60 * 60 for monthly or 24 * 60 * 60 for daily? add a field and make constants
                                                periodGranularity: roundDistribution[roundType].vestingGranularity, //e.g. Days or Months (in seconds!)
                                                startTime: roundDistribution[roundType].startTime,
                                                secondsVested: 0,
                                                vestingForUserPerSecond: 0
                                            });

        require(claimInfo.balance > 0, "don't have a reserved balance");

        claimInfo.secondsVested = calculateCliffTimeDiff(claimInfo);
        // abi.encodePacked() method can be used for gas efficiency, compare the gas costs for both usage
        require(claimInfo.secondsVested > 0, string.concat(_roundType, " round is still locked"));

        claimInfo.vestingForUserPerSecond = calculateVestingForUserPerSecond(claimInfo);

        uint maximumRelease = getMaximumRelease(claimInfo);

        (uint balanceToRelease, uint unClaimedBalance) = getBalanceToRelease(maximumRelease, claimInfo);

        //Maybe we don't care, but there may be a fractional holding and we want people to be able to just collect that. It's a tiny, tiny value (31.5*10^-12 tokens on 18 decimals)
        //So maybe remove.
        if (claimInfo.vestingForUserPerSecond == 0) balanceToRelease = unClaimedBalance;
        _mint(_to, balanceToRelease);
        claimedBalances[roundType][_to] += balanceToRelease;
        emit ClaimTokensEvent(_roundType, balanceToRelease, _to);
    }

    function calculateCliffTimeDiff(ClaimInfo memory claimInfo) private view returns(uint) {
        //How many seconds since the cliff? (negative if before cliff)
        (, uint timeDiff) = (block.timestamp - claimInfo.startTime).trySub(claimInfo.cliff);
        return timeDiff;
    }

    function calculateVestingForUserPerSecond(ClaimInfo memory claimInfo) private pure returns(uint) {
        //We divide the balance by the number of seconds in the entire vesting period (vesting unit is seconds!).
        (, uint vestingForUserPerSecond) = claimInfo.balance.tryDiv(claimInfo.vesting);
        return vestingForUserPerSecond;
    }

    function getMaximumRelease(ClaimInfo memory claimInfo) private pure returns(uint256) {
        // 1 for each fully spent period - if period is months, 1 per month, if period is days, 1 per day, etc. sample: 10 days or 2 months
        ( , uint periodsVested) = claimInfo.secondsVested.tryDiv(claimInfo.periodGranularity);

        //By calculating it this way instead of directly, we don't pay out any incomplete periods. instead of: secondsVested * vestingForUserPerSecond
        ( , uint releasePerFullPeriod) = claimInfo.vestingForUserPerSecond.tryMul(claimInfo.periodGranularity);
        return periodsVested * releasePerFullPeriod; //this is like "4.55%"
    }

    function getBalanceToRelease(uint maximumRelease, ClaimInfo memory claimInfo) private pure returns(uint256, uint256) {
        //technically the precondition / postcondions of the contract prevent this overflow - maybe investigate?
        require(claimInfo.claimedBalance < claimInfo.balance, "already claimed everything");
        ( , uint unClaimedBalance) = claimInfo.balance.trySub(claimInfo.claimedBalance);
        return (unClaimedBalance.min(maximumRelease), unClaimedBalance);
    }

    function getTotalClaimedForAllRounds() external view returns(uint256) {
       return totalSupply();
    }

    function getTotalRemainingForAllRounds() external view returns(uint256) {
       (, uint val) = maxSupply.trySub(totalSupply());
       return val;
    }

    function getTotalRemainingForSpecificRound(string calldata _roundType) external view returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);
        return roundDistribution[roundType].totalRemaining;
    }

    function getTotalPending(string calldata _roundType, address _to) external view returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        return reservedBalances[roundType][_to];
    }

    function getCliffTime(string calldata _roundType) external view onlyGameOwner returns(uint256) {
        RoundType roundType =  getRoundTypeByKey(_roundType);

        return roundDistribution[roundType].cliff;
    }

}
