const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       SwipeGig Smart Contract Deployment            ║");
  console.log("║       Network: Celo Mainnet                         ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "CELO");
  console.log("");

  // Dev G$ token on Celo mainnet (from GoodDollar team)
  const DEV_G_TOKEN = "0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475";

  // Use deployer as backend signer (rotate after buildathon)
  const BACKEND_SIGNER = deployer.address;

  // Base URI for NFT metadata
  const NFT_BASE_URI = "https://swipegig-g.vercel.app/api/nft/metadata/";

  // 1. Deploy SwipeGigRewards
  console.log("━━━ [1/4] Deploying SwipeGigRewards ━━━");
  const SwipeGigRewards = await hre.ethers.getContractFactory("SwipeGigRewards");
  const rewards = await SwipeGigRewards.deploy(DEV_G_TOKEN, BACKEND_SIGNER);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ SwipeGigRewards deployed to:", rewardsAddress);
  console.log("   G$ Token:", DEV_G_TOKEN);
  console.log("   Backend Signer:", BACKEND_SIGNER);
  console.log("");

  // 2. Deploy SwipeGigApplications
  console.log("━━━ [2/4] Deploying SwipeGigApplications ━━━");
  const SwipeGigApplications = await hre.ethers.getContractFactory("SwipeGigApplications");
  const applications = await SwipeGigApplications.deploy(BACKEND_SIGNER);
  await applications.waitForDeployment();
  const applicationsAddress = await applications.getAddress();
  console.log("✅ SwipeGigApplications deployed to:", applicationsAddress);
  console.log("");

  // 3. Deploy SwipeGigPool
  console.log("━━━ [3/4] Deploying SwipeGigPool ━━━");
  const SwipeGigPool = await hre.ethers.getContractFactory("SwipeGigPool");
  const pool = await SwipeGigPool.deploy(DEV_G_TOKEN, BACKEND_SIGNER);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ SwipeGigPool deployed to:", poolAddress);
  console.log("   G$ Token:", DEV_G_TOKEN);
  console.log("");

  // 4. Deploy SwipeGigWelcomeNFT
  console.log("━━━ [4/5] Deploying SwipeGigWelcomeNFT ━━━");
  const SwipeGigWelcomeNFT = await hre.ethers.getContractFactory("SwipeGigWelcomeNFT");
  const nft = await SwipeGigWelcomeNFT.deploy(BACKEND_SIGNER, NFT_BASE_URI);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ SwipeGigWelcomeNFT deployed to:", nftAddress);
  console.log("");

  // 5. Deploy SwipeGigCreatorPool
  console.log("━━━ [5/5] Deploying SwipeGigCreatorPool ━━━");
  const SwipeGigCreatorPool = await hre.ethers.getContractFactory("SwipeGigCreatorPool");
  const creatorPool = await SwipeGigCreatorPool.deploy(DEV_G_TOKEN, BACKEND_SIGNER);
  await creatorPool.waitForDeployment();
  const creatorPoolAddress = await creatorPool.getAddress();
  console.log("✅ SwipeGigCreatorPool deployed to:", creatorPoolAddress);
  console.log("");

  // Summary
  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              DEPLOYMENT COMPLETE ✅                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Copy these to your .env.local:");
  console.log("─────────────────────────────────────────────────────");
  console.log(`REWARDS_CONTRACT_ADDRESS=${rewardsAddress}`);
  console.log(`APPLICATIONS_CONTRACT_ADDRESS=${applicationsAddress}`);
  console.log(`POOL_CONTRACT_ADDRESS=${poolAddress}`);
  console.log(`WELCOME_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`CREATOR_POOL_CONTRACT_ADDRESS=${creatorPoolAddress}`);
  console.log(`NEXT_PUBLIC_DEV_G_TOKEN=${DEV_G_TOKEN}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("");
  console.log("🔗 Verify on Celoscan:");
  console.log(`   SwipeGigRewards:      https://celoscan.io/address/${rewardsAddress}`);
  console.log(`   SwipeGigApplications: https://celoscan.io/address/${applicationsAddress}`);
  console.log(`   SwipeGigPool:         https://celoscan.io/address/${poolAddress}`);
  console.log(`   SwipeGigWelcomeNFT:   https://celoscan.io/address/${nftAddress}`);
  console.log(`   SwipeGigCreatorPool:  https://celoscan.io/address/${creatorPoolAddress}`);
  console.log("");
  console.log("💰 Next steps:");
  console.log("   1. Claim dev G$ at: https://dev.gooddapp.org");
  console.log("   2. Bridge Fuse→Celo: https://dev.gooddapp.org/#/microbridge");
  console.log("   3. Fund the rewards contract and pool with dev G$");
  console.log("");
  console.log("Gas used:", hre.ethers.formatEther(balance - finalBalance), "CELO");
  console.log("Remaining balance:", hre.ethers.formatEther(finalBalance), "CELO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
