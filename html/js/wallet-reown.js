// Pante — Reown AppKit wallet connection (local bundled build, lazy-loaded on first click)
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
// The heavy AppKit+wagmi+viem+auth bundle lives in js/appkit-bundle.js so the page loads
// light, and only fetches it when the user clicks "Connect Wallet". Works in ANY browser
// via the WalletConnect QR modal (scan with phone) + email/social login (AppKit Auth).

let appKitModal = null
let initPromise = null
let isAutoInitialized = false

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

// Try MetaMask connection directly (works in all browsers with MetaMask installed)
async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    return false
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts[0]) {
      paintConnected({ isConnected: true, address: accounts[0] })
      console.log('[Pante] Connected via MetaMask:', accounts[0])
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

// Auto-init on page load - check existing wallet state
async function autoInitWallet() {
  if (isAutoInitialized) return
  isAutoInitialized = true
  
  console.log('[Pante] Auto-init wallet on page load...')
  
  // 1. First check MetaMask (instant, no async needed)
  if (checkMetaMaskState()) {
    console.log('[Pante] Restored MetaMask session')
    return
  }
  
  // 2. Then try AppKit for WalletConnect sessions
  const appKitReady = await connectAppKit()
  if (appKitReady && appKitModal) {
    // Check if AppKit has an existing connection
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
    // Small delay to ensure modal is ready
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
    // Both failed - show install instructions
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

// Listen for MetaMask account changes
if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length > 0) {
      paintConnected({ isConnected: true, address: accounts[0] })
    } else {
      paintConnected({ isConnected: false, address: null })
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
  checkState: autoInitWallet,
  getIsConnected: () => appKitModal?.getIsConnected?.() || typeof window.ethereum?.selectedAddress === 'string',
  getAddress: () => appKitModal?.getAddress?.() || window.ethereum?.selectedAddress || null
}

// AUTO-INIT on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autoInitWallet())
} else {
  autoInitWallet()
}
