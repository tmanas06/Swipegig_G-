import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy SwipeGigRewards
  const SwipeGigRewards = await ethers.getContractFactory("SwipeGigRewards");
  const rewards = await SwipeGigRewards.deploy(deployer.address);
  await rewards.waitForDeployment();
  console.log("SwipeGigRewards deployed to:", await rewards.getAddress());

  // 2. Deploy SwipeGigApplications
  const SwipeGigApplications = await ethers.getContractFactory("SwipeGigApplications");
  const applications = await SwipeGigApplications.deploy();
  await applications.waitForDeployment();
  console.log("SwipeGigApplications deployed to:", await applications.getAddress());

  // 3. Deploy SwipeGigPool
  const SwipeGigPool = await ethers.getContractFactory("SwipeGigPool");
  // GoodDollar Token Address on Celo Alfajores
  const goodDollarAddress = "0xC12D1c73a457c1c5cd70eE8B790c50F46ec563Fa"; 
  const pool = await SwipeGigPool.deploy(
    goodDollarAddress,
    ethers.parseEther("10"), // Weekly claim amount is 10 G$
    3 // 3 applications/activities minimum weekly threshold
  );
  await pool.waitForDeployment();
  console.log("SwipeGigPool deployed to:", await pool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
