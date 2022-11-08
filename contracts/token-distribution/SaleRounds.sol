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

    struct ClaimInfo {
        uint cliff;
        uint vestingPeriod;
        uint balance;
        uint claimedBalance;
        uint periodGranularity;
        uint secondsVested;
        uint vestingForUserPerSecond;
    }

    bool public tokensClaimable = false;
    uint public vestingStartTime = 9999999999; // very big value to represent some very far date in the future (ex: year 2286);
    mapping(RoundType => Distribution) public roundDistribution;

    mapping(RoundType => address[]) internal addressList;
    mapping(RoundType => mapping(address => uint256)) internal reservedBalances;
    mapping(RoundType => mapping(address => uint256)) internal claimedBalances;

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

    event ReserveTokensEvent(string indexed roundType, uint resserveAmount, address indexed to);
    event ClaimTokensEvent(string indexed roundType, uint balanceToRelease, address indexed to);

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

        require(roundType != RoundType.PUBLIC, "Claiming is not supported for this round");
        _;
    }

    constructor(string memory _tokenName, string memory _tokenSymbol, uint _decimalUnits,
                 address _gameOwnerAddress, address[] memory _walletAddresses)
            ERC20(_tokenName, _tokenSymbol)
            GameOwner(_gameOwnerAddress) {

        // FUNDING ROUNDS
        seedDistribution = Distribution(
        { vestingPeriod:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:420_000_000 * (10 ** _decimalUnits), supply:420_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        privateDistribution = Distribution(
        { vestingPeriod:22 * MONTH_TO_SECONDS, cliff: 2 * MONTH_TO_SECONDS, totalRemaining:210_000_000 * (10 ** _decimalUnits), supply:210_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        publicDistribution = Distribution(
        { vestingPeriod:6 * MONTH_TO_SECONDS, cliff:0, totalRemaining:120_000_000 * (10 ** _decimalUnits), supply:120_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        // ALLOCATIONS
        advisorsDistribution = Distribution(
        { vestingPeriod:20 * MONTH_TO_SECONDS, cliff:4 * MONTH_TO_SECONDS, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        exchangesDistribution = Distribution(
        { vestingPeriod:3 * MONTH_TO_SECONDS, cliff:0, totalRemaining:150_000_000 * (10 ** _decimalUnits), supply:150_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        playAndEarnDistribution = Distribution(
        { vestingPeriod:35 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:600_000_000 * (10 ** _decimalUnits), supply:600_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        socialDistribution = Distribution(
        { vestingPeriod:22 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:30_000_000 * (10 ** _decimalUnits), supply:30_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        teamDistribution = Distribution(
        { vestingPeriod:24 * MONTH_TO_SECONDS, cliff:12 * MONTH_TO_SECONDS, totalRemaining:450_000_000 * (10 ** _decimalUnits), supply:450_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        treasuryDistribution = Distribution(
        { vestingPeriod:30 * MONTH_TO_SECONDS, cliff:2 * MONTH_TO_SECONDS, totalRemaining:870_000_000 * (10 ** _decimalUnits), supply:870_000_000 * (10 ** _decimalUnits), vestingGranularity: MONTH_TO_SECONDS });

        roundDistribution[RoundType.SEED] = seedDistribution;
        roundDistribution[RoundType.PRIVATE] = privateDistribution;
        roundDistribution[RoundType.PUBLIC] = publicDistribution;
        roundDistribution[RoundType.PLAYANDEARN] = playAndEarnDistribution;
        roundDistribution[RoundType.SOCIAL] = socialDistribution;
        roundDistribution[RoundType.EXCHANGES] = exchangesDistribution;
        roundDistribution[RoundType.TEAM] = teamDistribution;
        roundDistribution[RoundType.TREASURY] = treasuryDistribution;
        roundDistribution[RoundType.ADVISOR] = advisorsDistribution;

        maxSupply = 3_000_000_000 * (10 ** _decimalUnits);

        initialReserveAndMint(_walletAddresses, _decimalUnits);
    }

    function setTokensToClaimable(bool _claimable) external
    onlyGameOwner {
        tokensClaimable = _claimable;
    }

    function beginVesting() external
    onlyGameOwner {
        require(vestingStartTime > block.timestamp, "Start vesting time was already set");
        vestingStartTime = block.timestamp;
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
    function reserveTokens(string calldata _roundType, address _to, uint _amount) external
    isInvestRound(_roundType) isEligibleToReserveToken(_roundType) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        reserveTokensInternal(roundType, _to, _amount);
        emit ReserveTokensEvent(_roundType, _amount, _to);
    }

    function claimTokens(string calldata _roundType, address _to) external
    claimableRound(_roundType) {
        require(tokensClaimable, "Token vesting has not yet begun");
        require(_msgSender() == _to, "Sender is not a recipient");

        RoundType roundType = getRoundTypeByKey(_roundType);

        uint balanceToRelease = getClaimableBalance(_roundType, _to);
        require(balanceToRelease > 0, "already claimed everything");

        //Perform actual minting of tokens, updating internal balance first.
        claimedBalances[roundType][_to] += balanceToRelease;
        //minting after internal balance update to avoid potential free minting exploits
        _mint(_to, balanceToRelease); 
        emit ClaimTokensEvent(_roundType, balanceToRelease, _to);
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

    // @_amount is going be decimals() == default(18) digits
    function mintTokensForPublic(address _to, uint _amount) private
    onlyGameOwner {
        require(roundDistribution[RoundType.PUBLIC].totalRemaining >= _amount, "total remaining amount is not enough");

        roundDistribution[RoundType.PUBLIC].totalRemaining -= _amount;
        _mint(_to, _amount);
    }

    // @_amount is going be decimals() == default(18) digits
    function reserveTokensInternal(RoundType _roundType, address _to, uint _amount) private {
        require(roundDistribution[_roundType].supply >= _amount, "given amount is bigger than max supply for the round");
        require(roundDistribution[_roundType].totalRemaining >= _amount, "total remaining round amount is not enough");
        require(_to != address(0), "Reservation address is 0x0 address");
        roundDistribution[_roundType].totalRemaining -= _amount;
        reservedBalances[_roundType][_to] += _amount;
    }

    function initialReserveAndMint(address[] memory walletAddresses, uint _decimalUnits) private {
        require(walletAddresses.length == 7, "walletAddresses array is not the correct length");
        address publicWalletAddress = walletAddresses[0];
        address exchangesWalletAddress = walletAddresses[1];
        address playAndEarnWalletAddress = walletAddresses[2];
        address socialWalletAddress = walletAddresses[3];
        address teamWalletAddress = walletAddresses[4];
        address treasuryWalletAddress = walletAddresses[5];
        address advisorsWalletAddress = walletAddresses[6];

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
        uint256 initialExchangesSupply = 60_000_000 * (10 ** _decimalUnits);
        _mint(exchangesWalletAddress, initialExchangesSupply);
        roundDistribution[RoundType.EXCHANGES].totalRemaining -= initialExchangesSupply;

        // Reserving rest of the 60% of the supply for exchanges distribution
        reserveTokensInternal(RoundType.EXCHANGES, exchangesWalletAddress, exchangesDistribution.supply - initialExchangesSupply);

        // Initial minting of 100% of total supply for public distribution
        uint256 initialPublicSupply = 120_000_000 * (10 ** _decimalUnits);
        roundDistribution[RoundType.PUBLIC].totalRemaining -= initialPublicSupply;
        _mint(publicWalletAddress, initialPublicSupply);
    }

    function calculateCliffTimeDiff(ClaimInfo memory claimInfo) private view returns(uint) {
        //How many seconds since the cliff? (negative if before cliff)
        if (block.timestamp < vestingStartTime) return 0;
        if (block.timestamp - vestingStartTime < claimInfo.cliff) return 0;
        return block.timestamp - vestingStartTime - claimInfo.cliff;
    }

    function calculateVestingForUserPerSecond(ClaimInfo memory claimInfo) private pure returns(uint) {
        if (claimInfo.vestingPeriod <= 0) return claimInfo.balance;
        //We divide the total balance by the number of seconds in the entire vesting period (vesting unit is seconds!).
        //Unless a tiny fractional total balance is reserved - below 10^-9 tokens for 3 years.
        return claimInfo.balance / claimInfo.vestingPeriod;
    }

    function calculateMaximumRelease(ClaimInfo memory claimInfo) private pure returns(uint256) {
        // 1 for each fully spent period - if period is months, 1 per month, if period is days, 1 per day, etc. sample: 10 days or 2 months
        ( , uint periodsVested) = claimInfo.secondsVested.tryDiv(claimInfo.periodGranularity);

        ( , uint releasePerFullPeriod) = claimInfo.vestingForUserPerSecond.tryMul(claimInfo.periodGranularity);
        return periodsVested * releasePerFullPeriod; //this is like "4.55%"
    }

    function getClaimableBalance(string calldata _roundType, address _to) view public 
    claimableRound(_roundType) returns(uint256) {
        RoundType roundType = getRoundTypeByKey(_roundType);

        ClaimInfo memory claimInfo = ClaimInfo({
        cliff : roundDistribution[roundType].cliff,
        vestingPeriod : roundDistribution[roundType].vestingPeriod,
        balance : reservedBalances[roundType][_to],
        claimedBalance : claimedBalances[roundType][_to],
        periodGranularity : roundDistribution[roundType].vestingGranularity, //e.g. Days or Months (in seconds!)
        secondsVested : 0,
        vestingForUserPerSecond : 0
        });

        if(claimInfo.balance <= claimInfo.claimedBalance) return 0;

        claimInfo.secondsVested = calculateCliffTimeDiff(claimInfo);
        if(claimInfo.secondsVested <= 0) return 0;

        claimInfo.vestingForUserPerSecond = calculateVestingForUserPerSecond(claimInfo);

        uint maximumRelease = calculateMaximumRelease(claimInfo);
    
        ( , uint unClaimedBalance) = claimInfo.balance.trySub(claimInfo.claimedBalance);
        return Math.min(unClaimedBalance, maximumRelease);
    }
}
