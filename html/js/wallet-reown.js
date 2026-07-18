// Pante — Reown AppKit wallet connection (lazy-loaded on first click to avoid heavy initial load)
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
// AppKit is imported ONLY when the user clicks Connect Wallet (dynamic import from esm.sh CDN),
// so the initial page load stays light.

const projectId = '17e1a3b695d76f2fe901e769d20b1a86'
let appKitReady = false
let modal = null

async function initAppKit() {
  if (appKitReady) return modal
  // Dynamic import — does not block initial page render
  const [{ createAppKit }, { WagmiAdapter }, networksMod] = await Promise.all([
    import('https://esm.sh/@reown/appkit@1.8.22'),
    import('https://esm.sh/@reown/appkit-adapter-wagmi@1.8.22'),
    import('https://esm.sh/@reown/appkit@1.8.22/networks'),
  ])
  const { mainnet, base, arbitrum, optimism, polygon, bsc, sepolia } = networksMod
  const networks = [mainnet, base, arbitrum, optimism, polygon, bsc, sepolia]

  const wagmiAdapter = new WagmiAdapter({ networks, projectId })
  modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: 'Pante',
      description: 'Pante — Meme with Utility. Cat-themed Web3 ecosystem.',
      url: 'https://pante.vercel.app',
      icons: ['https://pante.vercel.app/assets/logo.png'],
    },
    features: { analytics: false, email: false, socials: [] },
    allWallets: 'SHOW',
    themeMode: 'dark',
    themeVariables: { '--w3m-color-mix': '#ff9500', '--w3m-accent': '#ff9500' },
  })

  window.__panteAppKit = { modal, wagmiAdapter }

  // Reflect connection state in the header button
  modal.subscribeAccount((account) => {
    const walletBtn = document.getElementById('walletBtn')
    if (!walletBtn) return
    if (account.isConnected && account.address) {
      const addr = account.address
      walletBtn.textContent = addr.slice(0, 6) + '...' + addr.slice(-4)
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

  appKitReady = true
  return modal
}

function bindWalletButton() {
  const walletBtn = document.getElementById('walletBtn')
  if (!walletBtn) return

  walletBtn.addEventListener('click', async () => {
    try {
      const m = await initAppKit()
      if (walletBtn.classList.contains('connected')) {
        m.open({ view: 'Account' })
      } else {
        m.open()
      }
    } catch (err) {
      console.error('Reown AppKit failed to load:', err)
      fallbackConnect(walletBtn)
    }
  })
}

// Simple fallback if CDN/Reown unavailable (e.g. offline)
function fallbackConnect(walletBtn) {
  if (typeof window.ethereum === 'undefined') {
    alert('Wallet not available. Install MetaMask or use a Web3 browser. (Reown AppKit failed to load)')
    return
  }
  window.ethereum.request({ method: 'eth_requestAccounts' })
    .then((accounts) => {
      const addr = accounts[0]
      walletBtn.textContent = addr.slice(0, 6) + '...' + addr.slice(-4)
      walletBtn.classList.add('connected')
      walletBtn.title = addr
    })
    .catch(() => alert('Connection rejected.'))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindWalletButton)
} else {
  bindWalletButton()
}
