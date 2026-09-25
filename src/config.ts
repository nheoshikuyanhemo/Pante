/**
 * Reown AppKit + wagmi — Arc Mainnet (chain 5042)
 * Pakai WalletConnect v2 — UI modal sama dengan Synthra
 */

import { http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit'
import { registerChain } from './tracing'

// ── Arc Mainnet ─────────────────────────────────────────────────────────────
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.arc.io'] },
    public:  { http: ['https://rpc.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
})

registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])
export const ARC_MAINNET_CHAIN_ID = 5042

// ── WalletConnect projectId ──────────────────────────────────────────────────
// Registered at cloud.reown.com for pante.vercel.app
const WC_PROJECT_ID = '17e1a3b695d76f2fe901e769d20b1a86'

// ── Reown AppKit networks ────────────────────────────────────────────────────
// AppKit requires @reown/appkit/networks shape — wrap our custom chain
const arcNetwork = {
  id:            arcMainnet.id,
  name:          arcMainnet.name,
  network:       'arc',
  nativeCurrency: arcMainnet.nativeCurrency,
  rpcUrls:       arcMainnet.rpcUrls,
  blockExplorers: arcMainnet.blockExplorers,
  caipNetworkId: `eip155:${arcMainnet.id}` as `eip155:${number}`,
  chainNamespace: 'eip155' as const,
}

const networks = [arcNetwork] as [typeof arcNetwork, ...typeof arcNetwork[]]

// ── WagmiAdapter ─────────────────────────────────────────────────────────────
export const wagmiAdapter = new WagmiAdapter({
  projectId: WC_PROJECT_ID,
  networks,
  transports: {
    [arcMainnet.id]: http('https://rpc.arc.io'),
    [mainnet.id]:   http(),
  },
})

// ── AppKit modal — same WalletConnect v2 UI as Synthra ───────────────────────
createAppKit({
  adapters:  [wagmiAdapter],
  networks,
  projectId: WC_PROJECT_ID,
  metadata: {
    name:        'Pante',
    description: 'Pante — Meme with Utility on Arc',
    url:         'https://pante.vercel.app',
    icons:       ['https://pante.vercel.app/pante-logo.png'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent':           '#ff9500',
    '--w3m-border-radius-master': '4px',
    '--w3m-font-family':      '"Courier New", Courier, monospace',
    '--w3m-color-mix':        '#0d0d1a',
    '--w3m-color-mix-strength': 30,
  },
  defaultNetwork: arcNetwork,
  allowUnsupportedChain: false,
  features: {
    analytics: false,
    email:     false,
    socials:   false,
  },
})

// ── Export wagmi config for WagmiProvider ────────────────────────────────────
export const config = wagmiAdapter.wagmiConfig
