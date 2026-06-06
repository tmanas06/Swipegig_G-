const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║    SwipeGigCreatorPool Contract Deployment           ║");
  console.log("║    Network: Celo                                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "CELO");
  console.log("");

  // Dev G$ token on Celo mainnet
  const DEV_G_TOKEN = "0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475";

  // Backend signer (deployer address)
  const BACKEND_SIGNER = deployer.address;

  console.log("Deploying SwipeGigCreatorPool...");
  const CreatorPool = await hre.ethers.getContractFactory("SwipeGigCreatorPool");
  const creatorPool = await CreatorPool.deploy(DEV_G_TOKEN, BACKEND_SIGNER);
  await creatorPool.waitForDeployment();
  const creatorPoolAddress = await creatorPool.getAddress();

  console.log("");
  console.log("✅ SwipeGigCreatorPool deployed to:", creatorPoolAddress);
  console.log("   G$ Token Address:", DEV_G_TOKEN);
  console.log("   Backend Signer:", BACKEND_SIGNER);
  console.log("");
  console.log("Add this to your .env.local file:");
  console.log(`CREATOR_POOL_CONTRACT_ADDRESS=${creatorPoolAddress}`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
