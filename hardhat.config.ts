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
require("hardhat-gas-reporter");

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
    matic: {
      url: "https://rpc-mumbai.maticvigil.com",
      //url: "https://matic-mumbai.chainstacklabs.com",
      accounts: [process.env.OWNER, process.env.GAME_OWNER, process.env.BUYER, process.env.SIGNATORY,
        process.env.BUYER, process.env.BUYER, process.env.BUYER, process.env.BUYER, process.env.BUYER, process.env.BUYER],
      allowUnlimitedContractSize: true,
      //blockGasLimit: 0x1fffffffffffff,
      // timeout: 180000,
      chainId: 80001,
      gasPrice: 20e9,
      gas: 25e6,
      //gas: 12000000
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    tasks: "./tasks"
  },
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1200,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  }
};
