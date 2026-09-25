/**
 * PANTE Token — Arc Mainnet (chain 5042)
 * Contract: 0xafad8536f3511b3f7bee6f3ba4b74dee699d5645
 * Deployed via Synthra Launchpad
 */

export const PANTE_ADDRESS = '0xafad8536f3511b3f7bee6f3ba4b74dee699d5645' as const
export const PANTE_CHAIN_ID = 5042 // Arc Mainnet
export const PANTE_DECIMALS = 18
export const PANTE_SYMBOL = 'PANTE'
export const PANTE_NAME = 'Pante'
export const PANTE_TOTAL_SUPPLY = '1000000000' // 1 billion
export const PANTE_LOGO = '/pante-logo.png'

/** Synthra DEX links */
export const SYNTHRA_LAUNCHPAD_URL =
  'https://app.synthra.org/#/launchpad/5042/0xafad8536f3511b3f7bee6f3ba4b74dee699d5645?chain=arc'
export const SYNTHRA_SWAP_URL =
  'https://app.synthra.org/#/swap?chain=arc&outputCurrency=0xafad8536f3511b3f7bee6f3ba4b74dee699d5645'
export const SYNTHRA_POOL_URL =
  'https://app.synthra.org/#/pools?chain=arc&token=0xafad8536f3511b3f7bee6f3ba4b74dee699d5645'
export const ARC_EXPLORER_URL =
  'https://explorer.arc.io/address/0xafad8536f3511b3f7bee6f3ba4b74dee699d5645'

/** Minimal ERC-20 ABI for balance reads */
export const PANTE_ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const
