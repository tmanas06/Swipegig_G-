const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       SwipeGig Smart Contract Deployment            ║");
  console.log("║       Network: Celo Sepolia Testnet                 ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");
  console.log("");

  // 1. Deploy MockGoodDollar (testnet G$ substitute)
  console.log("━━━ [1/4] Deploying MockGoodDollar (testnet G$) ━━━");
  const MockGoodDollar = await ethers.getContractFactory("MockGoodDollar");
  const initialSupply = ethers.parseEther("1000000"); // 1M mG$
  const mockGD = await MockGoodDollar.deploy(initialSupply);
  await mockGD.waitForDeployment();
  const mockGDAddress = await mockGD.getAddress();
  console.log("✅ MockGoodDollar deployed to:", mockGDAddress);
  console.log("   Initial supply: 1,000,000 mG$");
  console.log("");

  // 2. Deploy SwipeGigRewards
  console.log("━━━ [2/4] Deploying SwipeGigRewards ━━━");
  const SwipeGigRewards = await ethers.getContractFactory("SwipeGigRewards");
  const rewards = await SwipeGigRewards.deploy(deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ SwipeGigRewards deployed to:", rewardsAddress);
  console.log("   Backend signer:", deployer.address);
  console.log("");

  // 3. Deploy SwipeGigApplications
  console.log("━━━ [3/4] Deploying SwipeGigApplications ━━━");
  const SwipeGigApplications = await ethers.getContractFactory("SwipeGigApplications");
  const applications = await SwipeGigApplications.deploy();
  await applications.waitForDeployment();
  const applicationsAddress = await applications.getAddress();
  console.log("✅ SwipeGigApplications deployed to:", applicationsAddress);
  console.log("");

  // 4. Deploy SwipeGigPool
  console.log("━━━ [4/4] Deploying SwipeGigPool ━━━");
  const SwipeGigPool = await ethers.getContractFactory("SwipeGigPool");
  const weeklyClaimAmount = ethers.parseEther("10"); // 10 mG$ per week
  const activityThreshold = 3; // 3 activities required
  const pool = await SwipeGigPool.deploy(mockGDAddress, weeklyClaimAmount, activityThreshold);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ SwipeGigPool deployed to:", poolAddress);
  console.log("   GoodDollar token:", mockGDAddress);
  console.log("   Weekly claim: 10 mG$");
  console.log("   Activity threshold: 3");
  console.log("");

  // Fund the pool with 10,000 mG$
  console.log("━━━ Funding SwipeGigPool with 10,000 mG$ ━━━");
  const fundAmount = ethers.parseEther("10000");
  const approveTx = await mockGD.approve(poolAddress, fundAmount);
  await approveTx.wait();
  
  // Call fundPool on the pool contract
  const poolContract = await ethers.getContractAt("SwipeGigPool", poolAddress);
  const fundTx = await poolContract.fundPool(fundAmount);
  await fundTx.wait();
  console.log("✅ Pool funded with 10,000 mG$");
  console.log("");

  // Summary
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              DEPLOYMENT COMPLETE ✅                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Copy these to your .env.local:");
  console.log("─────────────────────────────────────────────────────");
  console.log(`REWARDS_CONTRACT_ADDRESS=${rewardsAddress}`);
  console.log(`APPLICATIONS_CONTRACT_ADDRESS=${applicationsAddress}`);
  console.log(`POOL_CONTRACT_ADDRESS=${poolAddress}`);
  console.log(`MOCK_GD_TOKEN_ADDRESS=${mockGDAddress}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("");
  console.log("🔗 Verify on Blockscout:");
  console.log(`   MockGoodDollar:       https://celo-sepolia.blockscout.com/address/${mockGDAddress}`);
  console.log(`   SwipeGigRewards:      https://celo-sepolia.blockscout.com/address/${rewardsAddress}`);
  console.log(`   SwipeGigApplications: https://celo-sepolia.blockscout.com/address/${applicationsAddress}`);
  console.log(`   SwipeGigPool:         https://celo-sepolia.blockscout.com/address/${poolAddress}`);
  console.log("");
  console.log("Gas used:", ethers.formatEther(balance - finalBalance), "CELO");
  console.log("Remaining balance:", ethers.formatEther(finalBalance), "CELO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
