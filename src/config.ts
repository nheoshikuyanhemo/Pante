/**
 * wagmi configuration — Arc Mainnet (chain 5042)
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'
import { injected, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Arc Mainnet — chain 5042
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

// Pre-register for trace events
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])

export const ARC_MAINNET_CHAIN_ID = 5042

// Build connectors — walletConnect wrapped defensively
const connectors = (() => {
  try {
    return [
      injected({ shimDisconnect: true }),
      walletConnect({
        projectId: '2f05ae7f1116030fde2d36508f472bfb',
        showQrModal: true,
        metadata: {
          name: 'Pante',
          description: 'Pante — Meme with Utility on Arc',
          url: 'https://pante.vercel.app',
          icons: ['https://pante.vercel.app/pante-logo.png'],
        },
      }),
    ]
  } catch {
    return [injected({ shimDisconnect: true })]
  }
})()

export const config = createConfig({
  chains: [arcMainnet, mainnet],
  connectors,
  transports: {
    [arcMainnet.id]: http('https://rpc.arc.io'),
    [mainnet.id]:   http(),
  },
  ssr: false,
})
