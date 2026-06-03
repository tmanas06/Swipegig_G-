const { createPublicClient, http } = require('viem');
const { celo } = require('viem/chains');

const GOODDOLLAR_IDENTITY_CONTRACT = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42';
const IDENTITY_CONTRACT_ABI = [
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'lastAuthenticated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'authenticationPeriod',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

async function main() {
  const address = '0x56Fb5c0cfc733E9e25A16D4eB5ce4c6F8a209c4C';
  console.log('Checking GD Verification on Celo Mainnet for address:', address);

  const client = createPublicClient({
    chain: celo,
    transport: http('https://forno.celo.org'),
  });

  try {
    const isWhitelisted = await client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'isWhitelisted',
      args: [address],
    });
    console.log('isWhitelisted:', isWhitelisted);

    const lastAuthenticated = await client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'lastAuthenticated',
      args: [address],
    });
    console.log('lastAuthenticated:', Number(lastAuthenticated));

    const authenticationPeriod = await client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'authenticationPeriod',
    });
    console.log('authenticationPeriod (days):', Number(authenticationPeriod));
  } catch (err) {
    console.error('Error reading contract:', err.message);
  }
}

main();
