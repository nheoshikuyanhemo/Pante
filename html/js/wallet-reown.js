// Pante — Wallet Connect with Arc Chain support (UNIFIED)
// Uses ONLY Arc Testnet (5042002) - MetaMask + AppKit as ONE

const CHAIN_ICONS = {
  arcTestnet: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff6a00;stop-opacity:1"/><stop offset="100%" style="stop-color:#ff9500;stop-opacity:1"/></linearGradient></defs><circle cx="16" cy="16" r="15" fill="url(#arcGrad)"/><path d="M16 6 A10 10 0 0 1 26 16" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M26 16 A10 10 0 0 1 16 26" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/><circle cx="16" cy="16" r="3" fill="#fff"/></svg>',
  ethereum: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#627eea"/><path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fill-opacity=".602"/><path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/><path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fill-opacity=".602"/><path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/></svg>'
}

// ONLY Arc Testnet (5042002)
const CHAINS = {
  arcTestnet: {
    chainId: '0x4CF8A2', // 5042002 in hex
    chainIdDecimal: 5042002,
    chainName: 'Arc Testnet',
    caipNetworkId: 'eip155:5042002',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: ['https://rpc.testnet.arc.io'],
    blockExplorerUrls: ['https://testnet.arcscan.app'],
    testnet: true
  }
}

let currentChain = 'arcTestnet'
let chainButton = null

// ============ UNIFIED WALLET CONNECT MODAL ============
function createWalletModal() {
  const existing = document.getElementById('panteWalletModal')
  if (existing) existing.remove()

  // Backdrop
  const backdrop = document.createElement('div')
  backdrop.id = 'panteWalletModal'
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;'

  // Modal
  const modal = document.createElement('div')
  modal.style.cssText = 'background:linear-gradient(145deg,#1a1a2e,#14141f);border:1px solid rgba(255,149,0,0.4);border-radius:16px;padding:24px;width:90%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.6);position:relative;'

  // Header
  const header = document.createElement('div')
  header.style.cssText = 'text-align:center;margin-bottom:24px;'

  const title = document.createElement('h3')
  title.textContent = 'Connect Wallet'
  title.style.cssText = 'margin:0 0 8px;font-size:20px;color:#fff;font-weight:600;'

  // Chain badge
  const chainBadge = document.createElement('div')
  chainBadge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(255,149,0,0.15);border:1px solid rgba(255,149,0,0.4);border-radius:20px;padding:4px 12px;'
  chainBadge.innerHTML = `<span style="width:18px;height:18px;display:inline-flex;">${CHAIN_ICONS.arcTestnet}</span><span style="color:#ff9500;font-size:12px;font-weight:500;">Arc Testnet</span>`
  header.appendChild(title)
  header.appendChild(chainBadge)

  // Wallet buttons - UNIFIED (MetaMask dan WalletConnect SATU)
  const wallets = document.createElement('div')
  wallets.style.cssText = 'display:flex;flex-direction:column;gap:12px;'

  // MetaMask button
  const mmBtn = document.createElement('button')
  mmBtn.style.cssText = 'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;cursor:pointer;color:#fff;font-size:15px;transition:all 0.2s;width:100%;'
  mmBtn.innerHTML = `<svg viewBox="0 0 35 33" style="width:32px;height:32px;flex-shrink:0;"><path d="M32.9 1L19.4 10.5 21.8 6.1z" fill="#E2761B" stroke="#E2761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.1 1l13.4 9.7L15.7 6.3z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M28.6 23.5l-3.3 5 7.4 2.1 1.9-6.2z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M.5 24.6l1.8 6.2 7.4-2.1L4.8 23.5z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.6 14.4l-1.8 2.8 6.4 1.5-.2-4.2z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M25.3 14.5l-.3 4.1 6.5-1.5-1.9-2.7z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.1 28.5l3.1-1.5-2.7-2.1z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M21.7 27l3.2 1.5-.5-3.6z" fill="#E4761B" stroke="#E4761B" stroke-linecap="round" stroke-linejoin="round"/><path d="M24.9 28.5l-3.1-1.5.5 3.5-.1.1z" fill="#D7C1B3" stroke="#D7C1B3" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 28.5l.3 3.6L7.1 27z" fill="#233447" stroke="#233447" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="flex:1;text-align:left;">MetaMask</span><span style="color:#ff9500;font-size:11px;background:rgba(255,149,0,0.15);padding:2px 8px;border-radius:10px;">Recommended</span>`
  mmBtn.onmouseenter = () => { mmBtn.style.background = 'rgba(255,149,0,0.1)'; mmBtn.style.borderColor = 'rgba(255,149,0,0.5)' }
  mmBtn.onmouseleave = () => { mmBtn.style.background = 'rgba(255,255,255,0.05)'; mmBtn.style.borderColor = 'rgba(255,255,255,0.1)' }
  mmBtn.onclick = async () => {
    closeWalletModal()
    await connectWallet()
  }

  // WalletConnect button - SATU dengan MetaMask
  const wcBtn = document.createElement('button')
  wcBtn.style.cssText = 'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;cursor:pointer;color:#fff;font-size:15px;transition:all 0.2s;width:100%;'
  wcBtn.innerHTML = `<svg viewBox="0 0 32 32" style="width:32px;height:32px;flex-shrink:0;"><circle cx="16" cy="16" r="15" fill="#3B99FC"/><path d="M9.5 11.8c3.5-3.5 9.3-3.5 12.8 0l.5.5c.2.2.2.6 0 .8l-1.3 1.3c-.1.1-.3.1-.4 0l-.5-.5c-2.3-2.3-6.1-2.3-8.4 0l-.8.8c-.1.1-.3.1-.4 0l-1.3-1.3c-.2-.2-.2-.6 0-.8l.8-.8zm16.2 3.2l1.1 1.1c.2.2.2.6 0 .8l-6.4 6.4c-.2.2-.6.2-.8 0l-4.5-4.5c-.1-.1-.3-.1-.4 0l-4.5 4.5c-.2.2-.6.2-.8 0l-6.4-6.4c-.2-.2-.2-.6 0-.8l1.1-1.1c.2-.2.6-.2.8 0l4.5 4.5c.1.1.3.1.4 0l4.5-4.5c.2-.2.6-.2.8 0l4.5 4.5c.1.1.3.1.4 0l4.5-4.5c.2-.2.6-.2.8 0z" fill="#fff"/></svg><span style="flex:1;text-align:left;">WalletConnect</span><span style="color:#888;font-size:12px;">Mobile</span>`
  wcBtn.onmouseenter = () => { wcBtn.style.background = 'rgba(255,255,255,0.1)'; wcBtn.style.borderColor = 'rgba(255,149,0,0.5)' }
  wcBtn.onmouseleave = () => { wcBtn.style.background = 'rgba(255,255,255,0.05)'; wcBtn.style.borderColor = 'rgba(255,255,255,0.1)' }
  wcBtn.onclick = async () => {
    closeWalletModal()
    await connectWallet()
  }

  wallets.appendChild(mmBtn)
  wallets.appendChild(wcBtn)

  // Footer
  const footer = document.createElement('div')
  footer.style.cssText = 'margin-top:20px;text-align:center;color:rgba(255,255,255,0.4);font-size:12px;'
  footer.innerHTML = `Connecting to <span style="color:#ff9500;">Arc Testnet</span> (Chain ID: 5042002)`

  // Close
  const closeBtn = document.createElement('button')
  closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:transparent;border:none;color:#666;font-size:24px;cursor:pointer;line-height:1;padding:0;'
  closeBtn.textContent = '×'
  closeBtn.onclick = closeWalletModal

  backdrop.onclick = (e) => { if (e.target === backdrop) closeWalletModal() }

  modal.appendChild(closeBtn)
  modal.appendChild(header)
  modal.appendChild(wallets)
  modal.appendChild(footer)
  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)
}

function closeWalletModal() {
  const modal = document.getElementById('panteWalletModal')
  if (modal) modal.remove()
}

// ============ UNIFIED CONNECT FUNCTION ============
// Connect wallet - supports MetaMask AND WalletConnect as ONE
async function connectWallet() {
  const chain = CHAINS.arcTestnet

  // Check MetaMask first
  if (typeof window.ethereum !== 'undefined') {
    console.log('[Pante] Connecting via MetaMask to Arc Testnet...')
    try {
      // Step 1: Add Arc chain to wallet
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
      } catch (err) {
        if (err.code !== 4902 && err.code !== -32602) console.warn('[Pante] Add chain error:', err.message)
      }

      // Step 2: Switch to Arc chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chain.chainId }]
        })
      } catch (switchErr) {
        if (switchErr.code !== 4001) console.warn('[Pante] Switch error:', switchErr.message)
      }

      // Step 3: Request accounts (MetaMask shows Arc chain)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        paintConnected({ isConnected: true, address: accounts[0] })
        console.log('[Pante] Connected:', accounts[0], 'on Arc Testnet')
        updateChainButton('arcTestnet')
        return true
      }
    } catch (err) {
      if (err.code === 4001) {
        console.log('[Pante] Connection rejected')
      } else {
        console.error('[Pante] MetaMask error:', err)
      }
    }
  }

  // Try WalletConnect via AppKit
  try {
    const mod = await import('./appkit-bundle.js')
    const modal = mod.modal || mod.default?.modal || mod.default
    if (modal && typeof modal.open === 'function') {
      console.log('[Pante] Opening WalletConnect...')
      if (typeof modal.subscribeAccount === 'function') {
        modal.subscribeAccount(paintConnected)
      }
      modal.open()
      return true
    }
  } catch (err) {
    console.warn('[Pante] WalletConnect error:', err.message)
  }

  // No wallet
  if (typeof window.ethereum === 'undefined') {
    alert('No wallet detected.\n\nPlease install MetaMask:\nhttps://metamask.io/download.html')
  }
  return false
}

// ============ UI FUNCTIONS ============
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

function updateChainButton(chainName) {
  if (chainButton) {
    chainButton.innerHTML = CHAIN_ICONS[chainName] || CHAIN_ICONS.arcTestnet
    chainButton.title = CHAINS[chainName]?.chainName || 'Arc Testnet'
  }
  currentChain = chainName
}

// Create chain selector (logo only)
function createChainSelector() {
  const old = document.getElementById('chainSelect')
  if (old) old.remove()

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;display:inline-block;'

  chainButton = document.createElement('button')
  chainButton.id = 'chainSelect'
  chainButton.style.cssText = 'background:transparent;border:1px solid rgba(255,149,0,0.3);border-radius:6px;padding:4px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;'
  chainButton.innerHTML = CHAIN_ICONS.arcTestnet
  chainButton.title = 'Arc Testnet'
  chainButton.onmouseenter = () => { chainButton.style.borderColor = '#ff9500'; chainButton.style.background = 'rgba(255,149,0,0.1)' }
  chainButton.onmouseleave = () => { chainButton.style.borderColor = 'rgba(255,149,0,0.3)'; chainButton.style.background = 'transparent' }

  // Arc chain dropdown (only Arc Testnet)
  const menu = document.createElement('div')
  menu.style.cssText = 'position:absolute;top:44px;right:0;background:#14141f;border:1px solid rgba(255,149,0,0.3);border-radius:8px;padding:6px;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:1000;display:none;'

  const chain = CHAINS.arcTestnet
  const item = document.createElement('button')
  item.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:none;color:#f0f0ff;padding:8px 10px;cursor:pointer;border-radius:6px;font-size:0.85rem;text-align:left;'
  item.innerHTML = `<span style="width:20px;height:20px;display:inline-flex;">${CHAIN_ICONS.arcTestnet}</span><span>${chain.chainName}</span><span style="margin-left:auto;color:#ff9500;">✓</span>`
  item.onclick = () => { menu.style.display = 'none' }
  menu.appendChild(item)

  chainButton.onclick = (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none' }
  document.addEventListener('click', () => { menu.style.display = 'none' })

  wrapper.appendChild(chainButton)
  wrapper.appendChild(menu)

  const walletBtn = document.getElementById('walletBtn')
  if (walletBtn && walletBtn.parentNode) {
    walletBtn.parentNode.insertBefore(wrapper, walletBtn)
  }
}

// ============ INITIALIZATION ============
function init() {
  createChainSelector()

  const walletBtn = document.getElementById('walletBtn')
  if (walletBtn) {
    walletBtn.addEventListener('click', (e) => {
      e.preventDefault()
      createWalletModal()
    })
  }

  // MetaMask events
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
      paintConnected({ isConnected: accounts.length > 0, address: accounts[0] || null })
    })

    window.ethereum.on('chainChanged', (chainId) => {
      const decimal = parseInt(chainId, 16)
      if (decimal === 5042002) {
        updateChainButton('arcTestnet')
        console.log('[Pante] Switched to Arc Testnet')
      }
    })

    // Check if already connected
    if (window.ethereum.selectedAddress) {
      paintConnected({ isConnected: true, address: window.ethereum.selectedAddress })
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Expose API
window.PanteWallet = {
  open: () => createWalletModal(),
  connect: connectWallet,
  paint: paintConnected,
  getChain: () => currentChain,
  getChainInfo: () => CHAINS.arcTestnet,
  getAddress: () => window.ethereum?.selectedAddress || null,
  isConnected: () => !!window.ethereum?.selectedAddress
}
