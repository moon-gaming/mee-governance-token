const getAccount = async (ethers: any, privateKey: string) => {
    let provider;
    if (process.env.ENV === "dev") {
        provider = new ethers.providers.JsonRpcProvider();
    } else if (process.env.ENV === "mumbai") {
        const netObj = {
            name: 'maticmum',
            chainId: 80001
        };
        provider = new ethers.providers.AlchemyProvider(netObj, process.env.ALCHEMY_API_KEY);
    } else {
        provider = new ethers.providers.AlchemyProvider("matic");
    }

    try {
        console.log("PROVIDER:", (await provider.getNetwork()));
    } catch (err) {
        console.error("PROVIDER err:", err);
    }

    let account;
    try {
        account = new ethers.Wallet(
            privateKey,
            provider
        );
        console.log("Account:", await account.getAddress());
    } catch (err) {
        console.error("get Account err:", err);
    }

    return account;
};

export default getAccount;
