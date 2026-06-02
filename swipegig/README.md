# 🌌 SwipeGig: Web3-Powered Career Matching Platform

SwipeGig is a premium, gamified career matching platform built on the **Celo Network**. It combines swipe-based job matching (Tinder-style deck), an AI Career Coach powered by Claude, dynamic ERC-20 rewards, holographic achievement NFT badges, and a robust admin dashboard for platform metrics and on-chain contract monitoring.

---

## ✨ Features

### 1. 🎴 Swipe-to-Apply Feed
*   **Physics-Based Deck**: Smooth Tinder-like card swiping powered by `@react-spring/web` and `@use-gesture/react` with micro-animations and stable, jitter-free pseudo-random rotations.
*   **Smart Auto-Reset**: Automatically resets the deck after all cards are swiped, allowing users to review jobs again.
*   **Live Aggregator Sync**: Fetches real-time software engineering and Web3 developer listings from the Remotive API, parses salary ranges, detects Web3 job tags, and saves them to the database.

### 2. 🤖 AI Career Coach
*   **Advanced Assistant**: Chat with a Claude-powered career coach for resume reviews, interview prep, and career strategy.
*   **Rich Markdown Rendering**: Beautifully formats headers, bold text, bullet points, and code blocks with tailored Tailwind styles.
*   **Smart Scroll Behavior**: Dynamically auto-scrolls responses while permitting manual overrides if you scroll up.

### 3. 💳 Web3 Wallet & NFT Gallery
*   **Multi-Asset Balance Checks**: Live on-chain balance lookups for native `CELO` and `GoodDollar (G$)` rewards tokens on Celo Sepolia.
*   **On-Chain Transfers**: Trigger secure native or ERC-20 transfers using Privy's embedded wallet clients (`useWallets`).
*   **Receive QR Code**: Interactive receive modal generating a QR code of your address dynamically.
*   **Holographic NFTs**: Display your Genesis Pass and skill badges (Solidity, AI, Web3) with premium hover reflections and links to the Blockscout explorer.

### 4. 🛡️ Admin Dashboard (`/admin`)
*   **Overview Stats**: Platform metrics (users, job feeds, application rates, total distributed rewards).
*   **Contract Deployment Status**: Displays live deployment addresses and statuses of Celo Sepolia contracts.
*   **User Directory**: Query registered users and edit roles (`SEEKER`, `RECRUITER`, `ADMIN`) or verification status.
*   **Auto-Promotion Fallback**: Automatically promotes users listed in `ADMIN_EMAILS` (such as `anzzuel@gmail.com`) to `ADMIN` upon browser login.

---

## 🛠️ Tech Stack

*   **Framework**: Next.js 16 (App Router), React 19
*   **Styling**: Tailwind CSS (customized for glassmorphism, glowing text gradients, and dark mode UI)
*   **State Management**: Zustand (stores for user profiles and onboarding state)
*   **Database & ORM**: PostgreSQL (Neon), Prisma ORM
*   **Web3 & Smart Contracts**: Hardhat (v2.22.0), Viem, Ethers.js (v6), Privy Auth (embedded wallets)
*   **AI**: Anthropic SDK (Claude 3.5 Sonnet)

---

## ⛓️ Smart Contracts (Celo Sepolia Testnet)

All smart contracts have been compiled and successfully deployed to Celo Sepolia using the deployer wallet `0xB30504e21CcaD1E47337F86090CcD84b1fbEc727`:

*   **MockGoodDollar (testnet G$ token)**: [`0xc410bB4dA033C24a9095Af025D58D9aa9941F4f7`](https://celo-sepolia.blockscout.com/address/0xc410bB4dA033C24a9095Af025D58D9aa9941F4f7)
*   **SwipeGigRewards**: [`0x1460148478dA10bC4d2874da7017546acD7090A8`](https://celo-sepolia.blockscout.com/address/0x1460148478dA10bC4d2874da7017546acD7090A8)
*   **SwipeGigApplications**: [`0x4aBf8e44Eda5E145C5F0eaFE975F0ced4ce22b7e`](https://celo-sepolia.blockscout.com/address/0x4aBf8e44Eda5E145C5F0eaFE975F0ced4ce22b7e)
*   **SwipeGigPool**: [`0x81E1228CE9693491580E459DF6880725E30b1C7F`](https://celo-sepolia.blockscout.com/address/0x81E1228CE9693491580E459DF6880725E30b1C7F)
    *   *Note: SwipeGigPool is funded with 10,000 mG$ to handle on-chain reward distributions.*

---

## ⚙️ Environment Setup

Create a `.env.local` file in the root folder with the following variables:

```env
# Auth - Privy
NEXT_PUBLIC_PRIVY_APP_ID=cmpvip1x5008l0cl4ar3titky
PRIVY_APP_SECRET=your_privy_app_secret
PRIVY_CLIENT_ID=your_privy_client_id

# AI
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key

# Database
DATABASE_URL=postgresql://...

# Redis (for queues)
REDIS_URL=redis://localhost:6379

# Blockchain - Celo Sepolia
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=your_celo_sepolia_private_key
DEPLOYER_ADDRESS=0xB30504e21CcaD1E47337F86090CcD84b1fbEc727

# Deployed Smart Contracts
REWARDS_CONTRACT_ADDRESS=0x1460148478dA10bC4d2874da7017546acD7090A8
APPLICATIONS_CONTRACT_ADDRESS=0x4aBf8e44Eda5E145C5F0eaFE975F0ced4ce22b7e
POOL_CONTRACT_ADDRESS=0x81E1228CE9693491580E459DF6880725E30b1C7F
MOCK_GD_TOKEN_ADDRESS=0xc410bB4dA033C24a9095Af025D58D9aa9941F4f7

# Celoscan API Key (for verification)
CELOSCAN_API_KEY=UU35WFJKISTSXU59VUSCDNQJ6YX5VY5WY9

# Admin Configuration
ADMIN_EMAILS=anzzuel@gmail.com
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Database Migrations
```bash
npx prisma db push
```

### 3. Deploy Smart Contracts (Optional)
If you want to re-deploy the contracts to Celo Sepolia using the private key configured in `.env.local`:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Promote User to Admin
Ensure the user has logged in at least once (to create their profile record in the database), then run:
```bash
npx tsx scripts/make-admin.ts
```

### 5. Run the Local Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔒 Verification & Security Checks
*   **Role Protection**: Accessing `/admin` checks the Privy header and database roles. Non-admins receive an instant `403 Forbidden` response.
*   **API Middleware**: API routes (`/api/admin/*`) are protected by the `requireAdmin` helper, validating active session tokens on each fetch request.
