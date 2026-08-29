// Pante — Reown AppKit wallet connection with Arc Chain support
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
// Supports: Arc Mainnet, Arc Testnet, Ethereum, Polygon, Arbitrum, Base, etc.

let appKitModal = null
let initPromise = null
let isAutoInitialized = false

// Arc Chain Configuration
const CHAINS = {
  arcMainnet: {
    chainId: '0x1B2', // 4386 in hex
    chainIdDecimal: 4386,
    chainName: 'Arc Network',
    nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
    rpcUrls: ['https://rpc.arc.io'],
    blockExplorerUrls: ['https://arc.io'],
    iconUrls: ['https://arc.io/icon.png']
  },
  arcTestnet: {
    chainId: '0x1B3', // 4387 in hex
    chainIdDecimal: 4387,
    chainName: 'Arc Testnet',
    nativeCurrency: { name: 'tARC', symbol: 'tARC', decimals: 18 },
    rpcUrls: ['https://rpc.testnet.arc.io'],
    blockExplorerUrls: ['https://testnet.arc.io'],
    iconUrls: ['https://arc.io/icon.png']
  },
  ethereum: {
    chainId: '0x1',
    chainIdDecimal: 1,
    chainName: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  polygon: {
    chainId: '0x89',
    chainIdDecimal: 137,
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  arbitrum: {
    chainId: '0xa4b1',
    chainIdDecimal: 42161,
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  },
  base: {
    chainId: '0x2105',
    chainIdDecimal: 8377,
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
  },
  optimism: {
    chainId: '0xa',
    chainIdDecimal: 10,
    chainName: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io']
  }
}

let currentChain = 'arcTestnet' // Default to Arc Testnet

function paintConnected(account) {
  const btn = document.getElementById('walletBtn')
  if (!btn) return
  if (account && account.isConnected && account.address) {
    btn.textContent = account.address.slice(0, 6) + '…' + account.address.slice(-4)
    btn.classList.add('connected')
    window.dispatchEvent(new CustomEvent('walletConnected', { detail: account }))
  } else {
    btn.textContent = 'Connect Wallet'
    btn.classList.remove('connected')
  }
}

// Check MetaMask connection state immediately
function checkMetaMaskState() {
  if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
    console.log('[Pante] MetaMask already connected:', window.ethereum.selectedAddress)
    paintConnected({ isConnected: true, address: window.ethereum.selectedAddress })
    return true
  }
  return false
}

// Get current chain ID from MetaMask
async function getCurrentChainId() {
  if (typeof window.ethereum === 'undefined') return null
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    return parseInt(chainId, 16)
  } catch (err) {
    console.error('[Pante] Failed to get chain ID:', err)
    return null
  }
}

// Switch to Arc chain
async function switchToArcChain(chainName = 'arcTestnet') {
  if (typeof window.ethereum === 'undefined') {
    console.warn('[Pante] MetaMask not available')
    return false
  }
  
  const chain = CHAINS[chainName]
  if (!chain) {
    console.error('[Pante] Unknown chain:', chainName)
    return false
  }
  
  try {
    // Try to switch chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainId }]
    })
    currentChain = chainName
    console.log('[Pante] Switched to', chain.chainName)
    return true
  } catch (switchErr) {
    // Chain not added, try to add it
    if (switchErr.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.chainId,
            chainName: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: chain.blockExplorerUrls
          }]
        })
        currentChain = chainName
        console.log('[Pante] Added and switched to', chain.chainName)
        return true
      } catch (addErr) {
        console.error('[Pante] Failed to add chain:', addErr)
        return false
      }
    }
    console.error('[Pante] Failed to switch chain:', switchErr)
    return false
  }
}

// Try Reown AppKit (WalletConnect + Auth)
async function connectAppKit() {
  try {
    const mod = await import('./appkit-bundle.js')
    console.log('[Pante] AppKit bundle loaded, keys:', Object.keys(mod))
    
    // Handle different possible export structures
    const modal = mod.modal || mod.default?.modal || mod.default || null
    
    if (!modal) {
      throw new Error('AppKit modal not found in bundle')
    }
    
    if (typeof modal.open !== 'function') {
      throw new Error('AppKit modal missing open() method')
    }
    
    // Subscribe to account changes
    if (typeof modal.subscribeAccount === 'function') {
      modal.subscribeAccount(paintConnected)
    }
    
    // Sync existing session
    if (typeof modal.sync === 'function') {
      try { modal.sync() } catch (_) {}
    }
    
    // Check if already connected
    if (typeof modal.getIsConnected === 'function' && typeof modal.getAddress === 'function') {
      const connected = modal.getIsConnected()
      const addr = modal.getAddress()
      if (connected && addr) {
        console.log('[Pante] AppKit already connected:', addr)
        paintConnected({ isConnected: true, address: addr })
        appKitModal = modal
        return true
      }
    }
    
    appKitModal = modal
    return true
  } catch (err) {
    console.warn('[Pante] AppKit init failed, will use MetaMask fallback:', err.message)
    appKitModal = null
    return false
  }
}

// Try MetaMask connection directly
async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    return false
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts[0]) {
      paintConnected({ isConnected: true, address: accounts[0] })
      console.log('[Pante] Connected via MetaMask:', accounts[0])
      
      // Auto-switch to Arc chain after connection
      const chainId = await getCurrentChainId()
      if (chainId !== CHAINS[currentChain]?.chainIdDecimal) {
        console.log('[Pante] Auto-switching to', currentChain)
        await switchToArcChain(currentChain)
      }
      
      return true
    }
  } catch (err) {
    if (err.code === 4001) {
      console.log('[Pante] MetaMask connection rejected by user')
    } else {
      console.error('[Pante] MetaMask connection failed:', err)
    }
  }
  return false
}

// Auto-init on page load
async function autoInitWallet() {
  if (isAutoInitialized) return
  isAutoInitialized = true
  
  console.log('[Pante] Auto-init wallet on page load...')
  
  // 1. First check MetaMask (instant)
  if (checkMetaMaskState()) {
    console.log('[Pante] Restored MetaMask session')
    return
  }
  
  // 2. Then try AppKit for WalletConnect sessions
  const appKitReady = await connectAppKit()
  if (appKitReady && appKitModal) {
    if (typeof appKitModal.getIsConnected === 'function' && typeof appKitModal.getAddress === 'function') {
      const connected = appKitModal.getIsConnected()
      const addr = appKitModal.getAddress()
      if (connected && addr) {
        console.log('[Pante] Restored AppKit session')
        return
      }
    }
  }
  
  console.log('[Pante] No existing wallet session found')
}

async function openWallet() {
  console.log('[Pante] openWallet() called')
  
  // First try AppKit (WalletConnect + Auth)
  const appKitReady = await connectAppKit()
  
  if (appKitReady && appKitModal) {
    console.log('[Pante] AppKit ready, opening modal...')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (typeof appKitModal.open === 'function') {
      appKitModal.open()
      console.log('[Pante] AppKit modal opened')
      return
    }
  }
  
  // Fallback to MetaMask
  console.log('[Pante] Falling back to MetaMask...')
  const connected = await connectMetaMask()
  
  if (!connected) {
    if (typeof window.ethereum === 'undefined') {
      alert('No wallet detected.\n\nOptions:\n1. Install MetaMask: https://metamask.io/download.html\n2. Use WalletConnect on mobile')
    }
  }
}

// Bind the Connect Wallet button
const walletBtn = document.getElementById('walletBtn')
if (walletBtn) {
  walletBtn.addEventListener('click', (e) => {
    e.preventDefault()
    console.log('[Pante] Wallet button clicked')
    openWallet()
  })
}

// Listen for MetaMask account and chain changes
if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length > 0) {
      paintConnected({ isConnected: true, address: accounts[0] })
    } else {
      paintConnected({ isConnected: false, address: null })
    }
  })
  
  window.ethereum.on('chainChanged', (chainId) => {
    console.log('[Pante] Chain changed to:', chainId)
    const decimalChainId = parseInt(chainId, 16)
    // Update currentChain based on the new chain ID
    for (const [name, config] of Object.entries(CHAINS)) {
      if (config.chainIdDecimal === decimalChainId) {
        currentChain = name
        console.log('[Pante] Detected chain:', name)
        break
      }
    }
  })
}

// Cross-tab sync via storage events
window.addEventListener('storage', (e) => {
  const k = e.key || ''
  if (k.includes('walletconnect') || k.includes('wagmi') || k.includes('appkit')) {
    console.log('[Pante] Storage event detected, re-checking wallet state...')
    autoInitWallet()
  }
})

// Expose API for other modules
window.PanteWallet = {
  open: openWallet,
  paint: paintConnected,
  connectMetaMask: connectMetaMask,
  switchToArcChain: (chain) => switchToArcChain(chain),
  getCurrentChain: () => currentChain,
  getAvailableChains: () => Object.keys(CHAINS),
  getChainInfo: (name) => CHAINS[name],
  checkState: autoInitWallet,
  getIsConnected: () => appKitModal?.getIsConnected?.() || typeof window.ethereum?.selectedAddress === 'string',
  getAddress: () => appKitModal?.getAddress?.() || window.ethereum?.selectedAddress || null,
  getChainId: () => CHAINS[currentChain]?.chainIdDecimal
}

// AUTO-INIT on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autoInitWallet())
} else {
  autoInitWallet()
}
