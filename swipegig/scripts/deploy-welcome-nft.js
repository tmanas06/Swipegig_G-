const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       SwipeGig Welcome NFT Deployment               ║");
  console.log("║       Network: Celo Sepolia Testnet                 ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");
  console.log("");

  console.log("━━━ Deploying SwipeGigWelcomeNFT ━━━");
  const SwipeGigWelcomeNFT = await ethers.getContractFactory("SwipeGigWelcomeNFT");
  const welcomeNFT = await SwipeGigWelcomeNFT.deploy();
  await welcomeNFT.waitForDeployment();
  const welcomeNFTAddress = await welcomeNFT.getAddress();
  
  console.log("✅ SwipeGigWelcomeNFT deployed to:", welcomeNFTAddress);
  console.log("");
  console.log("📋 Copy this to your .env.local:");
  console.log(`WELCOME_NFT_CONTRACT_ADDRESS=${welcomeNFTAddress}`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
