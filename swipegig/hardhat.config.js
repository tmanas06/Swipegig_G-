const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");

// Load .env.local first, then .env as fallback
dotenv.config({ path: ".env.local" });
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11142220,
    },
  },
};
