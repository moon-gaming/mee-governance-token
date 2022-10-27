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

    mapping(RoundType => bool) private activeRound;

    mapping(RoundType => Distribution) public roundDistribution;

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
                 address _gameOwnerAddress)
            ERC20(_tokenName, _tokenSymbol)
            GameOwner(_gameOwnerAddress) {

        setActiveRoundInternally(RoundType.SEED);

        // FUNDING ROUNDS
        seedDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:420_000_000 * (10 ** _decimalUnits), supply:420_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        privateDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:210_000_000 * (10 ** _decimalUnits), supply:210_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        publicDistribution = Distribution(
        { vesting:6 * MONTH_TO_SECONDS, cliff:0, totalRemaining:120_000_000 * (10 ** _decimalUnits), supply:120_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        // ALLOCATIONS
        advisorsDistribution = Distribution(
        { vesting:20 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        exchangesDistribution = Distribution(
        { vesting:3 * MONTH_TO_SECONDS, cliff:0, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        playAndEarnDistribution = Distribution(
        { vesting:35 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:600_000_000 * (10 ** _decimalUnits), supply:600_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS });

        socialDistribution = Distribution(
        { vesting:22 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:30_000_000 * (10 ** _decimalUnits), supply:30_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

        teamDistribution = Distribution(
        { vesting:24 * MONTH_TO_SECONDS, cliff:12 * MONTH_TO_SECONDS, totalRemaining:450_000_000 * (10 ** _decimalUnits), supply:450_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS });

        treasuryDistribution = Distribution(
        { vesting:30 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:870_000_000 * (10 ** _decimalUnits), supply:870_000_000 * (10 ** _decimalUnits), startTime: block.timestamp, vestingGranularity: MONTH_TO_SECONDS});

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
    }

    function initialReserveAndMint(address[] memory walletAddresses) onlyGameOwner public {
        address exchangesWalletAddress = walletAddresses[0];
        address playAndEarnWalletAddress = walletAddresses[1];
        address socialWalletAddress = walletAddresses[2];
        address teamWalletAddress = walletAddresses[3];
        address treasuryWalletAddress = walletAddresses[4];
        address advisorsWalletAddress = walletAddresses[5];

        //ALLOCATIONS WITH WALLET CONSTANT
        reserveTokensInternal(RoundType.PLAYANDEARN, playAndEarnWalletAddress, playAndEarnDistribution.supply);
        reserveTokensInternal(RoundType.SOCIAL, socialWalletAddress, socialDistribution.supply);
        reserveTokensInternal(RoundType.TEAM, teamWalletAddress, teamDistribution.supply);
        reserveTokensInternal(RoundType.TREASURY, treasuryWalletAddress, treasuryDistribution.supply);
        reserveTokensInternal(RoundType.ADVISOR, advisorsWalletAddress, advisorsDistribution.supply);

        //NO VESTING TIME SO DIRECT MINTING -- PUBLIC IS NOT SCOPED HERE
        _mint(exchangesWalletAddress, exchangesDistribution.supply);
    }

    modifier isEligibleToReserveToken(string calldata _roundType) {
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

    function setActiveRound(string calldata _roundType) public onlyGameOwner {
        RoundType roundType = getRoundTypeByKey(_roundType);
        require(activeRound[roundType] == false, "Round is already active");
        setActiveRoundInternally(roundType);
    }

    function setActiveRoundInternally(RoundType _roundType) private {
        activeRound[_roundType] = true;
        roundDistribution[_roundType].startTime = block.timestamp;
    }

    function addAddressForDistribution(string calldata _roundType, address _address) public
        onlyGameOwner isRoundActive(_roundType) returns(bool) {

        RoundType roundType = getRoundTypeByKey(_roundType);
        addressMap[roundType][_address] = true;
        addressList[roundType].push(_address);

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
    function mintTokensForPublic(string calldata _roundType, address _to, uint _amount) public
        onlyOwner isRoundActive(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        require(roundType == RoundType.PUBLIC , "round type is not valid");
        require(roundDistribution[roundType].totalRemaining >= _amount, "total remaining amount is not enough" );

        roundDistribution[roundType].totalRemaining -= _amount;
        _mint(_to, _amount);
    }

    function claimTokens(string calldata _roundType, address _to) public
        isRoundActive(_roundType) claimableRound(_roundType) {
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
        // abi.encodePacked() method can be used for gas efficiency, campare the gas costs for both usage
        require(claimInfo.secondsVested > 0, string.concat(_roundType, " round is still locked"));

        claimInfo.vestingForUserPerSecond = calculateVestingForUserPerSecond(claimInfo);

        uint maximalRelease = getMaximalRelease(claimInfo);

        (uint balanceToRelease, uint unClaimedBalance) = getBalanceToRelease(maximalRelease, claimInfo);

        //Maybe we don't care, but there may be a fractional holding and we want people to be able to just collect that. It's a tiny, tiny value (31.5*10^-12 tokens on 18 decimals)
        //So maybe remove.
        if (claimInfo.vestingForUserPerSecond == 0) balanceToRelease = unClaimedBalance;
        _mint(_to, balanceToRelease);
        claimedBalances[roundType][_to] += balanceToRelease;
        emit ClaimEvent(_roundType, balanceToRelease, _to);
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

    function getMaximalRelease(ClaimInfo memory claimInfo) private pure returns(uint256) {
        // 1 for each fully spent period - if period is months, 1 per month, if period is days, 1 per day, etc. sample: 10 days or 2 months
        ( , uint periodsVested) = claimInfo.secondsVested.tryDiv(claimInfo.periodGranularity);

        //By calculating it this way instead of directly, we don't pay out any incompete periods. instead of: secondsVested * vestingForUserPerSecond
        ( , uint releasePerFullPeriod) = claimInfo.vestingForUserPerSecond.tryMul(claimInfo.periodGranularity);
        return periodsVested * releasePerFullPeriod; //this is like "4.55%"
    }

    function getBalanceToRelease(uint maximalRelease, ClaimInfo memory claimInfo) private pure returns(uint256, uint256) {
        //technically the precondition / postcondions of the contract prevent this overflow - maybe investigate?
        require(claimInfo.claimedBalance < claimInfo.balance, "already claimed everything");
        (,uint unClaimedBalance) = claimInfo.balance.trySub(claimInfo.claimedBalance);
        require(unClaimedBalance >= 0 , "unsopported unclamined balance");
        return (unClaimedBalance.min(maximalRelease), unClaimedBalance);
    }

    function getTotalClaimedForAllRounds() public view returns(uint256) {
       return totalSupply();
    }

    function getTotalRemainingForAllRounds() public view returns(uint256) {
       (, uint val) = maxSupply.trySub(totalSupply());
       return val;
    }

    function getTotalRemainingForSpecificRound(string calldata _roundType) public view returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);
        return roundDistribution[roundType].totalRemaining;
    }

    function getTotalPending(string calldata _roundType, address _to) public view returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        return reservedBalances[roundType][_to];
    }

    function setCliffTime(string calldata _roundType, uint256 _amount) public onlyGameOwner {
        RoundType roundType =  getRoundTypeByKey(_roundType);

        roundDistribution[roundType].cliff = _amount;
    }

    function getCliffTime(string calldata _roundType) public view onlyGameOwner returns(uint256) {
        RoundType roundType =  getRoundTypeByKey(_roundType);

        return roundDistribution[roundType].cliff;
    }

}
