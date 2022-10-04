import path from 'path';
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import './tasks/accounts'
import './tasks/balance'
import './tasks/governance'

//require solidity-coverage for unit test coverage
require('solidity-coverage');
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');

require("dotenv").config();

process.env.ENV = process.env.ENV || "dev";
const envPath = require("fs").existsSync(`${process.env.ENV}.env`)
    ? `${process.env.ENV}.env` : `${process.env.ENV}.env.local`

require("dotenv").config({ path: path.resolve(__dirname, envPath)});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
export default {
  defaultNetwork: "hardhat",
  networks: {
    // run this with hh node
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      chainId: 31337, // added for metamask as it looks specific chain id being 1337 for local network
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 18000
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.OWNER, process.env.GAME_OWNER],
      allowUnlimitedContractSize: true,
      chainId: 80001,
    },
    matic: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.OWNER, process.env.GAME_OWNER],
      chainId: 137,
    }
  },
  etherscan: {
    apiKey: {
      polygon: "G6MUHJ3TSMX1RI15W4WC366VD54CXZD2XM",
      polygonMumbai: "G6MUHJ3TSMX1RI15W4WC366VD54CXZD2XM"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    //tasks: "./tasks"
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
    gameOwner: 1,
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [],
  }
};
