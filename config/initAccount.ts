const getAccount = async (ethers: any, privateKey: string) => {

    let provider;
    if (process.env.ENV === "dev") {
        provider = new ethers.providers.JsonRpcProvider();
    } else {
        provider = new ethers.providers.AlchemyProvider("matic");
    }

    try {
        console.log("PROVIDER:", (await provider.getNetwork()).name);
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
