// Pante — Wallet Connect with Arc Chain support
// Chain logos via SVG icons (no text in chain button)
const CHAIN_ICONS = {
  arcTestnet: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff6a00;stop-opacity:1"/><stop offset="100%" style="stop-color:#ff9500;stop-opacity:1"/></linearGradient></defs><circle cx="16" cy="16" r="15" fill="url(#arcGrad)"/><path d="M16 6 A10 10 0 0 1 26 16" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M26 16 A10 10 0 0 1 16 26" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/><circle cx="16" cy="16" r="3" fill="#fff"/></svg>',
  arcMainnet: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="arcMainGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0066ff;stop-opacity:1"/><stop offset="100%" style="stop-color:#00aaff;stop-opacity:1"/></linearGradient></defs><circle cx="16" cy="16" r="15" fill="url(#arcMainGrad)"/><path d="M16 6 A10 10 0 0 1 26 16" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M26 16 A10 10 0 0 1 16 26" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/><circle cx="16" cy="16" r="3" fill="#fff"/></svg>',
  ethereum: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#627eea"/><path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fill-opacity=".602"/><path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/><path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fill-opacity=".602"/><path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/><path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#fff" fill-opacity=".2"/><path d="M9 16.22l7.498 4.353v-7.701z" fill="#fff" fill-opacity=".602"/></svg>',
  polygon: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#8247e5"/><path d="M21.5 11.5L17 9l-4.5 2.5v5L17 19l4.5-2.5v-5zM12 14l-3 1.7v3.4l3 1.7 3-1.7v-3.4L12 14zm6 0l-3 1.7v3.4l3 1.7 3-1.7v-3.4L18 14z" fill="#fff"/></svg>',
  arbitrum: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#28a0f0"/><path d="M16 6L9 10v6l7 4 7-4v-6l-7-4zm0 2.5l5 2.5v4l-5 2.5-5-2.5v-4l5-2.5z" fill="#fff"/><path d="M13 14v4l3 2 3-2v-4l-3 2-3-2z" fill="#28a0f0"/></svg>',
  base: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#0052ff"/><path d="M16 6C10.5 6 6 10.5 6 16s4.5 10 10 10c2.5 0 4.8-1 6.5-2.5L20 21c-1.1 1-2.5 1.5-4 1.5-3.6 0-6.5-2.9-6.5-6.5S12.4 9.5 16 9.5c1.5 0 2.9.5 4 1.5l2.5-2.5C20.8 7 18.5 6 16 6z" fill="#fff"/></svg>',
  optimism: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#ff0420"/><path d="M16 6L6 22h4l2-3h8l2 3h4L16 6zm0 6l3 5h-6l3-5z" fill="#fff"/></svg>'
}

// Chain configuration with proper AppKit support
const CHAINS = {
  arcTestnet: {
    chainId: '0x1B3', // 4387
    chainIdDecimal: 4387,
    chainName: 'Arc Testnet',
    caipNetworkId: 'eip155:4387',
    nativeCurrency: { name: 'tARC', symbol: 'tARC', decimals: 18 },
    rpcUrls: ['https://rpc.testnet.arc.io'],
    blockExplorerUrls: ['https://testnet.arc.io'],
    testnet: true
  },
  arcMainnet: {
    chainId: '0x1B2', // 4386
    chainIdDecimal: 4386,
    chainName: 'Arc Network',
    caipNetworkId: 'eip155:4386',
    nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
    rpcUrls: ['https://rpc.arc.io'],
    blockExplorerUrls: ['https://arc.io'],
    testnet: false
  },
  ethereum: {
    chainId: '0x1',
    chainIdDecimal: 1,
    chainName: 'Ethereum',
    caipNetworkId: 'eip155:1',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    testnet: false
  },
  polygon: {
    chainId: '0x89',
    chainIdDecimal: 137,
    chainName: 'Polygon',
    caipNetworkId: 'eip155:137',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    testnet: false
  },
  arbitrum: {
    chainId: '0xa4b1',
    chainIdDecimal: 42161,
    chainName: 'Arbitrum One',
    caipNetworkId: 'eip155:42161',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    testnet: false
  },
  base: {
    chainId: '0x2105',
    chainIdDecimal: 8377,
    chainName: 'Base',
    caipNetworkId: 'eip155:8453',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    testnet: false
  },
  optimism: {
    chainId: '0xa',
    chainIdDecimal: 10,
    chainName: 'Optimism',
    caipNetworkId: 'eip155:10',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    testnet: false
  }
}

let appKitModal = null
let currentChain = 'arcTestnet' // Default to Arc Testnet
let isAutoInitialized = false
let chainButton = null

// Get current chain ID from wallet
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

// Switch to specific chain (handles both switch and add)
async function switchToArcChain(chainName) {
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
    // Try to switch first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainId }]
    })
    currentChain = chainName
    console.log('[Pante] Switched to', chain.chainName)
    return true
  } catch (switchErr) {
    // If chain not added (error 4902), add it first
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
    console.error('[Pante] Chain switch failed:', switchErr)
    return false
  }
}

// Add Arc chain to wallet (called on connect)
async function ensureArcChainAdded() {
  if (typeof window.ethereum === 'undefined') return
  
  // Try to add Arc Testnet (always available)
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: CHAINS.arcTestnet.chainId,
        chainName: CHAINS.arcTestnet.chainName,
        nativeCurrency: CHAINS.arcTestnet.nativeCurrency,
        rpcUrls: CHAINS.arcTestnet.rpcUrls,
        blockExplorerUrls: CHAINS.arcTestnet.blockExplorerUrls
      }]
    })
  } catch (err) {
    // 4902 = already added, -32602 = user rejected, ignore
    if (err.code !== 4902 && err.code !== -32602) {
      console.warn('[Pante] Could not pre-add Arc Testnet:', err.message)
    }
  }
  
  // Also try Arc Mainnet
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: CHAINS.arcMainnet.chainId,
        chainName: CHAINS.arcMainnet.chainName,
        nativeCurrency: CHAINS.arcMainnet.nativeCurrency,
        rpcUrls: CHAINS.arcMainnet.rpcUrls,
        blockExplorerUrls: CHAINS.arcMainnet.blockExplorerUrls
      }]
    })
  } catch (err) {
    if (err.code !== 4902 && err.code !== -32602) {
      console.warn('[Pante] Could not pre-add Arc Mainnet:', err.message)
    }
  }
}

// Paint connected account to UI
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

// Check MetaMask state
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
    console.log('[Pante] AppKit bundle loaded')
    
    const modal = mod.modal || mod.default?.modal || mod.default || null
    if (!modal) throw new Error('AppKit modal not found')
    if (typeof modal.open !== 'function') throw new Error('AppKit modal missing open()')
    
    if (typeof modal.subscribeAccount === 'function') {
      modal.subscribeAccount(paintConnected)
    }
    if (typeof modal.sync === 'function') {
      try { modal.sync() } catch (_) {}
    }
    
    // Check existing connection
    if (typeof modal.getIsConnected === 'function' && typeof modal.getAddress === 'function') {
      const connected = modal.getIsConnected()
      const addr = modal.getAddress()
      if (connected && addr) {
        paintConnected({ isConnected: true, address: addr })
        appKitModal = modal
        return true
      }
    }
    
    appKitModal = modal
    return true
  } catch (err) {
    console.warn('[Pante] AppKit failed:', err.message)
    appKitModal = null
    return false
  }
}

// Try MetaMask directly
async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    return false
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts[0]) {
      paintConnected({ isConnected: true, address: accounts[0] })
      console.log('[Pante] Connected via MetaMask:', accounts[0])
      // Pre-add Arc chains so user can switch easily
      await ensureArcChainAdded()
      return true
    }
  } catch (err) {
    if (err.code === 4001) {
      console.log('[Pante] MetaMask connection rejected')
    } else {
      console.error('[Pante] MetaMask failed:', err)
    }
  }
  return false
}

// Show chain switch notification
function showChainNotification(chainName) {
  const chain = CHAINS[chainName]
  if (!chain) return
  
  let notif = document.getElementById('chainNotif')
  if (!notif) {
    notif = document.createElement('div')
    notif.id = 'chainNotif'
    notif.style.cssText = 'position:fixed;top:80px;right:20px;background:linear-gradient(135deg,#ff9500,#ff5500);color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(255,149,0,0.4);transition:opacity 0.3s;'
    document.body.appendChild(notif)
  }
  notif.innerHTML = `<span style="margin-right:8px;">${CHAIN_ICONS[chainName] || ''}</span> Switched to ${chain.chainName}`
  notif.style.opacity = '1'
  setTimeout(() => {
    notif.style.opacity = '0'
    setTimeout(() => notif.remove(), 300)
  }, 3000)
}

// Create chain selector button (logo only, no text)
function createChainSelector() {
  // Remove old selector if exists
  const old = document.getElementById('chainSelect')
  if (old) old.remove()
  
  // Create wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'chain-selector'
  wrapper.id = 'chainSelectWrap'
  wrapper.style.cssText = 'position:relative;display:inline-block;'
  
  // Create button (logo only)
  chainButton = document.createElement('button')
  chainButton.id = 'chainSelect'
  chainButton.className = 'chain-icon-btn'
  chainButton.type = 'button'
  chainButton.title = 'Select Chain'
  chainButton.setAttribute('aria-label', 'Select Chain')
  chainButton.innerHTML = CHAIN_ICONS[currentChain] || CHAIN_ICONS.arcTestnet
  chainButton.style.cssText = 'background:transparent;border:1px solid rgba(255,149,0,0.3);border-radius:6px;padding:4px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 0.2s,background 0.2s;'
  
  chainButton.onmouseenter = () => {
    chainButton.style.borderColor = '#ff9500'
    chainButton.style.background = 'rgba(255,149,0,0.1)'
  }
  chainButton.onmouseleave = () => {
    chainButton.style.borderColor = 'rgba(255,149,0,0.3)'
    chainButton.style.background = 'transparent'
  }
  
  // Create dropdown menu
  const menu = document.createElement('div')
  menu.id = 'chainMenu'
  menu.style.cssText = 'position:absolute;top:44px;right:0;background:#14141f;border:1px solid rgba(255,149,0,0.3);border-radius:8px;padding:6px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:1000;display:none;'
  
  Object.keys(CHAINS).forEach(key => {
    const chain = CHAINS[key]
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'chain-menu-item'
    item.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:none;color:#f0f0ff;padding:8px 10px;cursor:pointer;border-radius:6px;font-family:inherit;font-size:0.85rem;text-align:left;transition:background 0.2s;'
    item.innerHTML = `<span style="width:24px;height:24px;display:inline-flex;">${CHAIN_ICONS[key] || ''}</span><span>${chain.chainName}</span>${key === currentChain ? '<span style="margin-left:auto;color:#ff9500;">✓</span>' : ''}`
    item.onmouseenter = () => { item.style.background = 'rgba(255,149,0,0.15)' }
    item.onmouseleave = () => { item.style.background = 'transparent' }
    item.onclick = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      menu.style.display = 'none'
      const success = await switchToArcChain(key)
      if (success) {
        updateChainButton(key)
        showChainNotification(key)
      }
    }
    menu.appendChild(item)
  })
  
  // Toggle menu on button click
  chainButton.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
  }
  
  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      menu.style.display = 'none'
    }
  })
  
  wrapper.appendChild(chainButton)
  wrapper.appendChild(menu)
  
  // Insert before wallet button
  const walletBtn = document.getElementById('walletBtn')
  if (walletBtn && walletBtn.parentNode) {
    walletBtn.parentNode.insertBefore(wrapper, walletBtn)
  } else {
    document.body.appendChild(wrapper)
  }
}

// Update chain button icon
function updateChainButton(chainName) {
  if (chainButton) {
    chainButton.innerHTML = CHAIN_ICONS[chainName] || CHAIN_ICONS.arcTestnet
    chainButton.title = `Chain: ${CHAINS[chainName]?.chainName || 'Unknown'}`
  }
  currentChain = chainName
}

// Auto-init wallet on page load
async function autoInitWallet() {
  if (isAutoInitialized) return
  isAutoInitialized = true
  
  console.log('[Pante] Auto-init wallet...')
  
  // Check MetaMask first
  if (checkMetaMaskState()) {
    console.log('[Pante] MetaMask session restored')
    // Get current chain
    const chainId = await getCurrentChainId()
    if (chainId) {
      // Map chain ID to our config
      for (const [name, config] of Object.entries(CHAINS)) {
        if (config.chainIdDecimal === chainId) {
          currentChain = name
          updateChainButton(name)
          break
        }
      }
    }
    // Pre-add Arc chains
    await ensureArcChainAdded()
    return
  }
  
  // Try AppKit
  const appKitReady = await connectAppKit()
  if (appKitReady && appKitModal) {
    if (typeof appKitModal.getIsConnected === 'function' && typeof appKitModal.getAddress === 'function') {
      const connected = appKitModal.getIsConnected()
      const addr = appKitModal.getAddress()
      if (connected && addr) {
        console.log('[Pante] AppKit session restored')
        return
      }
    }
  }
  
  console.log('[Pante] No existing session found')
}

// Open wallet modal
async function openWallet() {
  console.log('[Pante] openWallet() called')
  
  const appKitReady = await connectAppKit()
  
  if (appKitReady && appKitModal) {
    console.log('[Pante] Opening AppKit modal...')
    await new Promise(resolve => setTimeout(resolve, 100))
    if (typeof appKitModal.open === 'function') {
      appKitModal.open()
      return
    }
  }
  
  // Fallback to MetaMask
  const connected = await connectMetaMask()
  if (!connected && typeof window.ethereum === 'undefined') {
    alert('No wallet detected.\n\nOptions:\n1. Install MetaMask: https://metamask.io/download.html\n2. Use WalletConnect on mobile')
  }
}

// Auto-init on page load
function init() {
  // Create chain selector (logo only)
  createChainSelector()
  
  // Bind wallet button
  const walletBtn = document.getElementById('walletBtn')
  if (walletBtn) {
    walletBtn.addEventListener('click', (e) => {
      e.preventDefault()
      openWallet()
    })
  }
  
  // Listen for MetaMask events
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
      for (const [name, config] of Object.entries(CHAINS)) {
        if (config.chainIdDecimal === decimalChainId) {
          currentChain = name
          updateChainButton(name)
          break
        }
      }
    })
  }
  
  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    const k = e.key || ''
    if (k.includes('walletconnect') || k.includes('wagmi') || k.includes('appkit')) {
      autoInitWallet()
    }
  })
  
  // Start auto-init
  autoInitWallet()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Expose API
window.PanteWallet = {
  open: openWallet,
  paint: paintConnected,
  connectMetaMask: connectMetaMask,
  switchToArcChain: switchToArcChain,
  getCurrentChain: () => currentChain,
  getAvailableChains: () => Object.keys(CHAINS),
  getChainInfo: (name) => CHAINS[name],
  checkState: autoInitWallet,
  getIsConnected: () => appKitModal?.getIsConnected?.() || typeof window.ethereum?.selectedAddress === 'string',
  getAddress: () => appKitModal?.getAddress?.() || window.ethereum?.selectedAddress || null,
  getChainId: () => CHAINS[currentChain]?.chainIdDecimal
}
