// Pante — Reown AppKit wallet connection (universal modal: MetaMask, WalletConnect QR, Coinbase, Rabby, etc.)
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
import { createAppKit } from 'https://esm.sh/@reown/appkit@1.8.22'
import { WagmiAdapter } from 'https://esm.sh/@reown/appkit-adapter-wagmi@1.8.22'
import { mainnet, base, arbitrum, optimism, polygon, bsc, sepolia } from 'https://esm.sh/@reown/appkit@1.8.22/networks'

const projectId = '17e1a3b695d76f2fe901e769d20b1a86'

const networks = [mainnet, base, arbitrum, optimism, polygon, bsc, sepolia]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
})

const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Pante',
    description: 'Pante — Meme with Utility. Cat-themed Web3 ecosystem.',
    url: 'https://pante.vercel.app',
    icons: ['https://pante.vercel.app/assets/logo.png'],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  allWallets: 'SHOW',
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#ff9500',
    '--w3m-accent': '#ff9500',
  },
})

// Expose for DEX / NFT pages
window.__panteAppKit = { modal, wagmiAdapter }

// ===== Wire up the header Connect Wallet button =====
function bindWalletButton() {
  const walletBtn = document.getElementById('walletBtn')
  if (!walletBtn) return

  // Open Reown universal modal on click
  walletBtn.addEventListener('click', () => {
    if (walletBtn.classList.contains('connected')) {
      // Disconnect: Reown doesn't have a direct disconnect; just reset UI
      // (user can disconnect from the modal's account view)
      modal.open({ view: 'Account' })
    } else {
      modal.open()
    }
  })

  // Reflect connection state in the button
  modal.subscribeAccount((account) => {
    if (account.isConnected && account.address) {
      const addr = account.address
      const short = addr.slice(0, 6) + '...' + addr.slice(-4)
      walletBtn.textContent = short
      walletBtn.classList.add('connected')
      walletBtn.title = addr
      document.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: addr } }))
    } else {
      walletBtn.textContent = 'Connect Wallet'
      walletBtn.classList.remove('connected')
      walletBtn.title = ''
      document.dispatchEvent(new CustomEvent('walletDisconnected'))
    }
  })
}

// Header button exists at DOMContentLoaded; module scripts run after parse, so bind now
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindWalletButton)
} else {
  bindWalletButton()
}
