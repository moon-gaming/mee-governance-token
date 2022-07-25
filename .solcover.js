module.exports ={
    port: 8555,
    //copyPackages: ['openzeppelin-solidity'],
    skipFiles: [],
    providerOptions: {total_accounts: 20, default_balance_ether: 10000}, // to align same account config as in hardhat
    norpc: true
}