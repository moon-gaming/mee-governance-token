import getAccount from './initAccount'

export async function initGovernanceToken(ethers: any, privateKey: string) {
    // call smart contract top mirror the record on blockchain
    const abi = [
        "function setTokenPriceMap(string _roundType, uint256 _tokenPrice) public",
        "function getTokenPriceMap(string _roundType) public view returns(uint256)",
        "function balanceOf(address _address) public view returns(uint256)",
        "function setActiveRound(string _roundType) public",
        "function addAddressForDistribution(string _roundType, address _address) public returns(bool)",
        "function deleteAddressForDistribution(string _roundType, address _address, uint _index) public returns(bool)",
        "function getAddressList(string _roundType) public view returns(address[])",
        "function reserveTokens(string _roundType, address _to, uint _amount) public",
        "function getTotalClaimedForAllRounds() public view returns(uint256)",
        "function getTotalRemainingForAllRounds() public view returns(uint256)",
        "function getTotalRemainingForSpecificRound(string _roundType) public view returns(uint256)",
        "function getTotalPending(string _roundType, address _to) public view returns(uint256)",
        "function getGameOwnerAddress() public view returns(address)",
        "function getSignatory() public view returns(address)",
        "function initialReserveAndMint() public"
    ];

    let governanceTokenContract;
    try {
        governanceTokenContract = new ethers.Contract(process.env.GOVERNANCE_TOKEN, abi, await getAccount(ethers, privateKey));
    } catch (err) {
        console.error("Governance Contract init err:", err);
    }

    return governanceTokenContract;
}

export default initGovernanceToken;
