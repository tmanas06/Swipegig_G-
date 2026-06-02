'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Send,
  Download,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  RefreshCw,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createWalletClient, custom, parseEther } from 'viem';
import { celoSepolia } from 'viem/chains';

// GoodDollar is not deployed on Celo Sepolia testnet — placeholder for future
const GOOD_DOLLAR_ADDRESS = '0xC12D1c73a457c1c5cd70eE8B790c50F46ec563Fa';

interface NFTItem {
  id: string;
  name: string;
  description: string;
  image: string;
  tokenId: string;
  rarity: 'Legendary' | 'Epic' | 'Rare' | 'Common';
  mintDate: string;
  color: string;
}

const nftsData: NFTItem[] = [
  {
    id: 'genesis',
    name: 'SwipeGig Genesis Pass',
    description: 'Exclusive genesis pass awarded to early adopters of SwipeGig platform.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    tokenId: '0812',
    rarity: 'Legendary',
    mintDate: 'May 20, 2026',
    color: 'from-amber-500 to-purple-600',
  },
  {
    id: 'solidity',
    name: 'Solidity Veteran Badge',
    description: 'Recognizes advanced smart contract development capabilities and clean code practices.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&auto=format&fit=crop&q=80',
    tokenId: '3941',
    rarity: 'Epic',
    mintDate: 'May 28, 2026',
    color: 'from-emerald-400 to-cyan-500',
  },
  {
    id: 'ai-coach',
    name: 'AI Coach Certification',
    description: 'Awarded for completing extensive career roadmap sessions with Claude AI.',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&auto=format&fit=crop&q=80',
    tokenId: '9211',
    rarity: 'Rare',
    mintDate: 'June 01, 2026',
    color: 'from-pink-500 to-rose-500',
  },
];

export default function WalletPage() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address || user?.wallet?.address;

  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [copied, setCopied] = useState(false);
  
  // Balances
  const [celoBalance, setCeloBalance] = useState('0.00');
  const [gdBalance, setGdBalance] = useState('0.00');
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);

  // Send Form
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendToken, setSendToken] = useState<'CELO' | 'G$'>('CELO');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Receive Modal
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);

  // NFT Modal
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);

  // NFTs state
  const [realNfts, setRealNfts] = useState<any[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [nftFilter, setNftFilter] = useState<'onchain' | 'badges'>('onchain');

  // Fetch balances via server-side API (avoids browser CORS / ad-blocker issues)
  const fetchBalances = async () => {
    if (!walletAddress) return;
    setIsFetchingBalances(true);

    try {
      const res = await fetch(`/api/wallet/balance?address=${walletAddress}`);
      if (!res.ok) throw new Error(`Balance API error: ${res.status}`);

      const data = await res.json();
      setCeloBalance(data.celoBalance ?? '0.0000');
      setGdBalance(data.gdBalance ?? '0.00');

      if (!data.success) {
        toast('Could not reach Celo Sepolia RPC. Balance may be unavailable.', {
          icon: '⚠️',
          duration: 5000,
          style: {
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch wallet balances:', err);
      setCeloBalance('0.0000');
      setGdBalance('0.00');
    } finally {
      setIsFetchingBalances(false);
    }
  };

  // Fetch real Celo NFTs using local API
  const fetchNfts = async () => {
    if (!walletAddress) return;
    setIsLoadingNfts(true);
    try {
      const res = await fetch(`/api/wallet/nfts?address=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setRealNfts(data.nfts || []);
      }
    } catch (e) {
      console.error('Error fetching real NFTs:', e);
    } finally {
      setIsLoadingNfts(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBalances();
      fetchNfts();
    }
  }, [walletAddress]);

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success('Wallet address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Perform on-chain transfer
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWallet) {
      toast.error('Active wallet client not found. Try reconnecting.');
      return;
    }
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      toast.error('Invalid recipient address.');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }

    setIsSending(true);
    const loadingToast = toast.loading(`Sending ${amount} ${sendToken}...`);

    try {
      // Ensure connected to Celo Sepolia
      await activeWallet.switchChain(11142220);

      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: celoSepolia,
        transport: custom(provider),
      });

      let txHash: `0x${string}`;

      if (sendToken === 'CELO') {
        // Native CELO transfer
        txHash = await walletClient.sendTransaction({
          account: activeWallet.address as `0x${string}`,
          to: recipient as `0x${string}`,
          value: parseEther(amount),
        });
      } else {
        // ERC20 GoodDollar transfer
        txHash = await walletClient.writeContract({
          address: GOOD_DOLLAR_ADDRESS,
          abi: [
            {
              inputs: [
                { name: 'recipient', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              name: 'transfer',
              outputs: [{ type: 'bool' }],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          functionName: 'transfer',
          account: activeWallet.address as `0x${string}`,
          args: [recipient as `0x${string}`, parseEther(amount)],
        });
      }

      toast.success(`Sent successfully! Hash: ${txHash.slice(0, 10)}...`, { id: loadingToast });
      setSendModalOpen(false);
      setRecipient('');
      setAmount('');
      setTimeout(() => fetchBalances(), 2000); // Reload balances
    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(error.message || 'Transaction failed.', { id: loadingToast });
    } finally {
      setIsSending(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Wallet Disconnected</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Connect your Privy account to access your Celo wallet, check token balances, and manage your career NFTs.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 page-enter pb-24">
      {/* Header card */}
      <div className="glass rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Web3 Wallet</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  Celo Sepolia
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {walletAddress ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/5 bg-white/5">
                <span className="text-xs font-mono text-muted-foreground">
                  {`${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="text-xs text-yellow-500">Creating wallet...</div>
            )}
            <button
              onClick={fetchBalances}
              disabled={isFetchingBalances}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-white/5 transition-all text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingBalances ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex items-center gap-2.5 px-6 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === 'tokens'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coins className="w-4 h-4" />
          Assets
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          className={`flex items-center gap-2.5 px-6 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === 'nfts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          NFT Gallery
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'tokens' ? (
          <motion.div
            key="tokens"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Balance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CELO Card */}
              <div className="glass rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-yellow-500/5 rounded-full blur-[80px] group-hover:bg-yellow-500/10 transition-all duration-300" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                      Celo Native
                    </p>
                    <h3 className="text-3xl font-extrabold mt-3">{celoBalance} CELO</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~ ${(parseFloat(celoBalance) * 0.65).toFixed(2)} USD
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <span className="font-bold text-sm text-yellow-500">C</span>
                  </div>
                </div>
              </div>

              {/* G$ Card */}
              <div className="glass rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-all duration-300" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                      GoodDollar Rewards
                    </p>
                    <h3 className="text-3xl font-extrabold mt-3">{gdBalance} G$</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~ ${(parseFloat(gdBalance) * 0.00015).toFixed(4)} USD
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="font-bold text-sm text-emerald-400">G$</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-around gap-4">
              <button
                onClick={() => setSendModalOpen(true)}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                Send Tokens
              </button>
              <button
                onClick={() => setReceiveModalOpen(true)}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border hover:bg-white/5 transition-all text-sm font-semibold w-full sm:w-auto cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                Receive Assets
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="nfts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {/* Filter Toggle */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 border border-white/5 rounded-xl max-w-md">
              <button
                onClick={() => setNftFilter('onchain')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'onchain'
                    ? 'bg-primary text-black shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                On-Chain NFTs ({realNfts.length})
              </button>
              <button
                onClick={() => setNftFilter('badges')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'badges'
                    ? 'bg-primary text-black shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Platform Achievement Badges ({nftsData.length})
              </button>
            </div>

            {nftFilter === 'onchain' && isLoadingNfts && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Scanning Celo Sepolia for NFTs...</p>
              </div>
            )}

            {nftFilter === 'onchain' && !isLoadingNfts && realNfts.length === 0 && (
              <div className="glass rounded-2xl p-10 text-center border border-white/5 max-w-lg mx-auto">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h4 className="font-bold text-base mb-2">No On-Chain NFTs Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
                  We scanned Celo Sepolia Testnet but didn&apos;t find any ERC-721 tokens owned by your address. 
                  You can see your simulated accomplishments in the &quot;Platform Achievement Badges&quot; tab!
                </p>
                <button
                  onClick={() => setNftFilter('badges')}
                  className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  View Achievement Badges
                </button>
              </div>
            )}

            {((nftFilter === 'onchain' && realNfts.length > 0 && !isLoadingNfts) || nftFilter === 'badges') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(nftFilter === 'onchain' ? realNfts : nftsData).map((nft) => (
                  <motion.div
                    key={nft.id}
                    whileHover={{ y: -8 }}
                    onClick={() => setSelectedNFT(nft)}
                    className="glass rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/10 hover:shadow-xl transition-all relative group"
                  >
                    {/* holographic reflection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                    
                    <div className="aspect-square w-full relative overflow-hidden bg-black/40">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-bold tracking-wide uppercase border border-white/10">
                        Token #{nft.tokenId}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          {nft.rarity}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{nft.mintDate}</span>
                      </div>
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {nft.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                        {nft.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEND MODAL */}
      <AnimatePresence>
        {sendModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass max-w-md w-full rounded-2xl p-6 relative overflow-hidden"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Send Crypto
              </h3>
              
              <form onSubmit={handleSend} className="space-y-4">
                {/* Token Selector */}
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1.5">
                    Select Token
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendToken('CELO')}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        sendToken === 'CELO'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-white/5 text-muted-foreground'
                      }`}
                    >
                      CELO (Bal: {celoBalance})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendToken('G$')}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        sendToken === 'G$'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-white/5 text-muted-foreground'
                      }`}
                    >
                      GoodDollar (Bal: {gdBalance})
                    </button>
                  </div>
                </div>

                {/* Recipient Input */}
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1.5">
                    Recipient Wallet Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 font-mono"
                  />
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 font-semibold"
                  />
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSendModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 py-3 rounded-xl gradient-hero text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECEIVE MODAL */}
      <AnimatePresence>
        {receiveModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass max-w-xs w-full rounded-2xl p-6 text-center relative overflow-hidden"
            >
              <h3 className="text-lg font-bold mb-5 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Receive Assets
              </h3>

              {/* Simulated QR Code using free API */}
              <div className="w-44 h-44 mx-auto mb-6 bg-white p-3.5 rounded-2xl flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${walletAddress}`}
                  alt="Wallet QR Code"
                  className="w-full h-full"
                />
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Scan QR code or copy address below to receive Celo tokens:
              </p>

              <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl glass border border-white/5 bg-white/5 font-mono text-[10px] text-muted-foreground w-full mb-6">
                <span className="truncate flex-1 pl-1">
                  {walletAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={() => setReceiveModalOpen(false)}
                className="w-full py-3 rounded-xl border border-border hover:bg-white/5 text-sm font-medium transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NFT DETAIL MODAL */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setSelectedNFT(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass max-w-md w-full rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video w-full relative">
                <img
                  src={selectedNFT.image}
                  alt={selectedNFT.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    {selectedNFT.rarity}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1.5">{selectedNFT.name}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {selectedNFT.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-border py-4 my-2">
                  <div>
                    <h5 className="text-[10px] text-muted-foreground uppercase font-semibold">Token ID</h5>
                    <p className="text-sm font-semibold text-foreground mt-0.5">#{selectedNFT.tokenId}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-muted-foreground uppercase font-semibold">Mint Date</h5>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{selectedNFT.mintDate}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-muted-foreground uppercase font-semibold">Network</h5>
                    <p className="text-sm font-semibold text-foreground mt-0.5">Celo Sepolia</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-muted-foreground uppercase font-semibold">Standard</h5>
                    <p className="text-sm font-semibold text-foreground mt-0.5">ERC-721</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <a
                    href={selectedNFT.isReal 
                      ? `https://celo-sepolia.blockscout.com/token/${selectedNFT.contractAddress}?a=${walletAddress}`
                      : `https://celo-sepolia.blockscout.com/address/${GOOD_DOLLAR_ADDRESS}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Blockscout
                  </a>
                  <button
                    onClick={() => setSelectedNFT(null)}
                    className="flex-1 py-3 rounded-xl gradient-hero text-black font-bold text-xs hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
