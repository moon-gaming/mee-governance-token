// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./TokenDistribution.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import 'hardhat/console.sol';

abstract contract SaleRounds is TokenDistribution {

    using SafeMath for uint;
    using Math for uint;

    mapping(RoundType => bool) private activeRound;

    mapping(RoundType => Distribution) public roundDistribution;

    mapping(RoundType => uint256) public tokenPriceMap;

    mapping(RoundType => mapping(address => bool)) internal addressMap;
    mapping(RoundType => address[]) internal addressList;
    mapping(RoundType => mapping(address => uint256)) internal reservedBalances;
    mapping(RoundType => mapping(address => uint256)) internal claimedBalances;

    event ReservEvent(string roundType, uint resservAmount, address to);
    event ClaimEvent(string roundType, uint balanceToRelease, address to);

    Distribution private advisorsDistribution;
    Distribution private exchangesDistribution;
    Distribution private playAndEarnDistribution;
    Distribution private privateDistribution;
    Distribution private publicDistribution;
    Distribution private seedDistribution;
    Distribution private socialDistribution;
    Distribution private teamDistribution;
    Distribution private treasuryDistribution;

    struct WalletAddressInfo {
        address advisorWalletAddress;
        address exhangesWalletAddress; 
        address playAndEarnWalletAddress;
        address socialWalletAdrdress;
        address teamWalletAdrdress;
        address treasuryWalletAddress;
    }

    WalletAddressInfo private walletAddressInfo;

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

    constructor(uint _maxSupply, uint _decimalUnits, address[] memory walletAddresses) {
        setActiveRoundInternally(RoundType.SEED);

        walletAddressInfo = WalletAddressInfo({advisorWalletAddress: walletAddresses[0], exhangesWalletAddress: walletAddresses[1], playAndEarnWalletAddress: walletAddresses[2],
        socialWalletAdrdress: walletAddresses[3], teamWalletAdrdress: walletAddresses[4], treasuryWalletAddress: walletAddresses[5]});

        // FUNDING ROUNDS
        seedDistribution = Distribution(
        { vesting:24 * DAY_TO_SECONDS, cliff: 2 * DAY_TO_SECONDS, totalRemaining:560_000_000 * (10 ** _decimalUnits), supply:560_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS});

        privateDistribution = Distribution(
        { vesting:22 * DAY_TO_SECONDS, cliff: 2 * DAY_TO_SECONDS, totalRemaining:320_000_000 * (10 ** _decimalUnits), supply:320_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS});

        publicDistribution = Distribution(
        { vesting:0, cliff:0, totalRemaining:480_000_000 * (10 ** _decimalUnits), supply:480_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS});

        // ALLOCATIONS
        advisorsDistribution = Distribution(
        { vesting:24 * DAY_TO_SECONDS, cliff:4 * DAY_TO_SECONDS, totalRemaining:400_000_000 * (10 ** _decimalUnits), supply:400_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS});

        exchangesDistribution = Distribution(
        { vesting:0, cliff:0, totalRemaining:560_000_000 * (10 ** _decimalUnits), supply:560_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS});

        playAndEarnDistribution = Distribution(
        { vesting:36 * DAY_TO_SECONDS, cliff:1 * DAY_TO_SECONDS, totalRemaining:2_000_000_000 * (10 ** _decimalUnits), supply:2_000_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: DAY_TO_SECONDS });

        socialDistribution = Distribution(
        { vesting:26 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:80_000_000 * (10 ** _decimalUnits), supply:80_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        teamDistribution = Distribution(
        { vesting:36 * MONTH_TO_SECONDS, cliff:12 * MONTH_TO_SECONDS, totalRemaining:1_200_000_000 * (10 ** _decimalUnits), supply:1_200_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS });

        treasuryDistribution = Distribution(
        { vesting:34 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:2_400_000_000 * (10 ** _decimalUnits), supply:2_400_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

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

        // ALLOCATIONS WITH WALLET CONSTANT
        reserveTokensInternal(RoundType.PLAYANDEARN, walletAddressInfo.playAndEarnWalletAddress, playAndEarnDistribution.supply);
        reserveTokensInternal(RoundType.SOCIAL, walletAddressInfo.socialWalletAdrdress, socialDistribution.supply);
        reserveTokensInternal(RoundType.TEAM, walletAddressInfo.teamWalletAdrdress, teamDistribution.supply);
        reserveTokensInternal(RoundType.TREASURY, walletAddressInfo.treasuryWalletAddress, treasuryDistribution.supply);
        
        // NO VESTING TIME SO DIRECT MINTING -- PUBLIC IS NOT SCOPED HERE
        _mint(walletAddressInfo.exhangesWalletAddress, exchangesDistribution.supply);
    }

    modifier isEligibleToReserveToken(string calldata _roundType){
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType != RoundType.PUBLIC, "reservation is not supported for this round");
        require(isGameOwnerAddress() || addressMap[roundType][_msgSender()] == true, "address is not confirmed to reserv the token");
        _;
    }

    modifier isRoundActive(string calldata _roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(activeRound[roundType] == true , "round is not active");
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

    function setTokenPriceMap(string calldata _roundType, uint256 _tokenPrice) public onlyGameOwner {
        RoundType roundType = getRoundTypeByKey(_roundType);

        tokenPriceMap[roundType] = _tokenPrice;
    }

    function getTokenPriceMap(string calldata _roundType) public view onlyGameOwner returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        return tokenPriceMap[roundType];
    }

    function setActiveRound(string calldata _roundType) public onlyGameOwner {
        RoundType roundType = getRoundTypeByKey(_roundType);
        require(activeRound[roundType] == false, "Round is already active");
        setActiveRoundInternally(roundType);
    }

    function setActiveRoundInternally(RoundType _roundType) private {   
        activeRound[_roundType] = true;
        roundDistribution[_roundType].startTime = block.timestamp;
    }

    function addAddressForDistribution(string calldata _roundType, address[] calldata _addresses) public 
        onlyGameOwner isRoundActive(_roundType) returns(bool) {

        RoundType roundType = getRoundTypeByKey(_roundType);
        uint size = _addresses.length;
        for(uint i=0; i<size; i++){
            addressMap[roundType][_addresses[i]] = true;
            addressList[roundType].push(_addresses[i]);
        }
        return true;
    }

    function deleteAddressForDistribution(string calldata _roundType, address _address, uint _index) public 
        onlyGameOwner isRoundActive(_roundType) returns(bool) {

        RoundType roundType = getRoundTypeByKey(_roundType);
        require(_index < addressList[roundType].length, "index is out of distribution address array bounds");
        require(_address == addressList[roundType][_index], "Address does not match!");
        
        addressMap[roundType][_address] = false;
        addressList[roundType][_index] = addressList[roundType][addressList[roundType].length - 1];
        addressList[roundType].pop();
        return true;
    }

    function getAddressList(string calldata _roundType) public onlyGameOwner isRoundActive(_roundType) view returns(address[] memory){
        RoundType roundType = getRoundTypeByKey(_roundType);
        return addressList[roundType];
    }

    // @_amount is going be decimals() == default(18) digits
    function reserveTokensInternal(RoundType _roundType, address _to, uint _amount) private {
        require(roundDistribution[_roundType].supply >= _amount, "given amount is bigger than max supply for the round" );
        require(roundDistribution[_roundType].totalRemaining >= _amount, "total remaining seed amount is not enough" );
        roundDistribution[_roundType].totalRemaining -= _amount;
        reservedBalances[_roundType][_to] += _amount;
    }

    // @_amount is going be decimals() == default(18) digits
    function reserveTokens(string calldata _roundType, address _to, uint _amount) public 
        isRoundActive(_roundType) isInvestRound(_roundType) isEligibleToReserveToken(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        if(reservedBalances[RoundType.SEED][_to] > 0 && roundType != RoundType.SEED){
            revert("User has already registered for different round");
        }

        if(reservedBalances[RoundType.PRIVATE][_to] > 0 && roundType != RoundType.PRIVATE){
            revert("User has already registered for different round");
        }

        reserveTokensInternal(roundType, _to, _amount);
    }

    // @_amount is going be decimals() == default(18) digits
    function mintTokensForPublic(string calldata _roundType, address _to, uint _amount) public payable 
        isRoundActive(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType == RoundType.PUBLIC , "round type is not valid");
        require(tokenPriceMap[roundType] > 0, "token price is not enough");
        require(roundDistribution[roundType].totalRemaining >= _amount, "total remaining amount is not enough" );
        require(msg.value >= tokenPriceMap[roundType] * _amount, "not enough paid");

        roundDistribution[roundType].totalRemaining -= _amount;
        _mint(_to, _amount);
        payable(owner()).transfer(msg.value);
    }

    function claimTokens(string calldata _roundType, address _to) public 
        isRoundActive(_roundType) claimableRound(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

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
        // abi.encodePacked() method can be used for gas efficiency, campare the gas costs for both usage
        require(claimInfo.secondsVested > 0, string.concat(_roundType, " round is still locked"));
       
        claimInfo.vestingForUserPerSecond = calculateVestingForUserPerSecond(claimInfo);

        uint maximalRelease = getMaximalRelease(claimInfo);

        (uint balanceToRelease, uint unClaimedBalance) = getBalanceToRelease(maximalRelease, claimInfo);
        
        //Maybe we don't care, but there may be a fractional holding and we want people to be able to just collect that. It's a tiny, tiny value (31.5*10^-12 tokens on 18 decimals)
        //So maybe remove.
        if (claimInfo.vestingForUserPerSecond == 0) balanceToRelease = unClaimedBalance;
        console.logString("BALANCE TO RELEASE");
        console.logUint(balanceToRelease);
        _mint(_to, balanceToRelease);
        claimedBalances[roundType][_to] += balanceToRelease;
        emit ClaimEvent(_roundType, balanceToRelease, _to);
    }

    function calculateCliffTimeDiff(ClaimInfo memory claimInfo) private view returns(uint){
        //How many seconds since the cliff? (negative if before cliff)
        (, uint timeDiff) = (block.timestamp - claimInfo.startTime).trySub(claimInfo.cliff);
        console.logString("BLOCK TIME");
        console.logUint(block.timestamp);
        console.logString("START TIME");
        console.logUint(claimInfo.startTime);
        console.logString("CLIFF TIME");
        console.logUint(claimInfo.cliff);
        console.logString("TIME DIFF");
        console.logUint(timeDiff);
        return timeDiff;
    }

    function calculateVestingForUserPerSecond(ClaimInfo memory claimInfo) private view returns(uint){
        //We divide the balance by the number of seconds in the entire vesting period (vesting unit is seconds!).
        // require(claimInfo.vesting > 0, "vesting schedule not configured for this round");
        (, uint vestingForUserPerSecond) = claimInfo.balance.tryDiv(claimInfo.vesting);
        console.logString('VESTING PER SECOND');
        console.logUint(vestingForUserPerSecond);
        return vestingForUserPerSecond;
    }

    function getMaximalRelease(ClaimInfo memory claimInfo) private view returns(uint256) {
        // 1 for each fully spent period - if period is months, 1 per month, if period is days, 1 per day, etc. sample: 10 days or 2 months 
        ( , uint periodsVested) = claimInfo.secondsVested.tryDiv(claimInfo.periodGranularity);
        console.logString("PERIODS VESTED");
        console.logUint(periodsVested);
        
        //By calculating it this way instead of directly, we don't pay out any incompete periods. instead of: secondsVested * vestingForUserPerSecond
        ( , uint releasePerFullPeriod) = claimInfo.vestingForUserPerSecond.tryMul(claimInfo.periodGranularity);
        console.logString("RELEASE PER FULL PERIOD");
        console.logUint(releasePerFullPeriod);
        return periodsVested * releasePerFullPeriod; //this is like "4.55%"
    }

    function getBalanceToRelease(uint maximalRelease, ClaimInfo memory claimInfo) private view returns(uint256, uint256) {
        //technically the precondition / postcondions of the contract prevent this overflow - maybe investigate?
        require(claimInfo.claimedBalance < claimInfo.balance, "already claimed everything");
        (,uint unClaimedBalance) = claimInfo.balance.trySub(claimInfo.claimedBalance);
        console.logString("BALANCE");
        console.logUint(claimInfo.balance);
        console.logString("CLAIMED BALANCE");
        console.logUint(claimInfo.claimedBalance);
        require(unClaimedBalance >= 0 , "unsopported unclamined balance");
        console.logString("UNCLAIMED BALANCE");
        console.logUint(unClaimedBalance);
        console.logString("MAXIMAL RELEASE");
        console.logUint(maximalRelease);
        return (unClaimedBalance.min(maximalRelease), unClaimedBalance);                
    }

    function getTotalClaimedForAllRounds() public view returns(uint256){
       return totalSupply();
    }

    function getTotalRemainingForAllRounds() public view returns(uint256){
       (, uint val) = maxSupply.trySub(totalSupply());
       return val;
    }

    function getTotalRemainingForSpecificRound(string calldata _roundType) public view returns(uint256){
        RoundType roundType = getRoundTypeByKey(_roundType);
        return roundDistribution[roundType].totalRemaining;
    }

    function getTotalPending(string calldata _roundType, address _to) public view returns(uint256){
        RoundType roundType = getRoundTypeByKey(_roundType);

        return reservedBalances[roundType][_to];
    }

}
