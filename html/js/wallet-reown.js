// Pante — Reown AppKit wallet connection (local bundled build, lazy-loaded on first click)
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
// The heavy AppKit+wagmi+viem+auth bundle lives in js/appkit-bundle.js so the page loads
// light, and only fetches it when the user clicks "Connect Wallet". Works in ANY browser
// via the WalletConnect QR modal (scan with phone) + email/social login (AppKit Auth).

// Reown credentials (kept in sync with /root/.hermes/.env)
const REOWN_PROJECT_ID = '17e1a3b695d76f2fe901e769d20b1a86'
const REOWN_APPKIT_AUTH_API_KEY = 'e195f364-bda6-412a-8d5e-ee5960b26e85'

let appKitModal = null
let initPromise = null

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

async function initAppKit() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const mod = await import('./appkit-bundle.js')
      appKitModal = mod.modal || null
      if (!appKitModal) throw new Error('AppKit modal not exported from bundle')

      // Keep the button in sync with connection state
      if (typeof appKitModal.subscribeAccount === 'function') {
        appKitModal.subscribeAccount(paintConnected)
      }

      // Re-sync session from storage immediately (so a tab opened while already
      // connected shows the address without the user re-opening the modal)
      if (typeof appKitModal.sync === 'function') {
        try { appKitModal.sync() } catch (_) {}
      }
      // Read current state directly (AppKit exposes getters)
      if (typeof appKitModal.getIsConnected === 'function' &&
          typeof appKitModal.getAddress === 'function') {
        const connected = appKitModal.getIsConnected()
        const addr = appKitModal.getAddress()
        if (connected && addr) paintConnected({ isConnected: true, address: addr })
      }

      return appKitModal
    } catch (err) {
      console.error('[Pante] Reown AppKit failed to load:', err)
      appKitModal = null
      initPromise = null
      throw err
    }
  })()
  return initPromise
}

async function openWallet() {
  try {
    const modal = await initAppKit()
    if (modal && typeof modal.open === 'function') modal.open()
  } catch (err) {
    console.warn('[Pante] Falling back to injected wallet / notice')
    fallbackNotice()
  }
}

function fallbackNotice() {
  const hasMM = typeof window.ethereum !== 'undefined'
  if (hasMM) {
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(accs => {
        if (accs[0]) paintConnected({ isConnected: true, address: accs[0] })
      })
      .catch(() => alert('Wallet connection cancelled.'))
  } else {
    alert('Wallet not available.\n\nInstall MetaMask or use a Web3 browser (Brave, Opera, Trust) to connect.\n\nOn mobile, open this site in the WalletConnect or MetaMask app to scan a QR code.')
  }
}

// Bind the Connect Wallet button (present on every page)
const walletBtn = document.getElementById('walletBtn')
if (walletBtn) {
  walletBtn.addEventListener('click', (e) => { e.preventDefault(); openWallet() })
}

// ===== AUTO-INIT ON PAGE LOAD (deferred, non-blocking) =====
// So a freshly opened page/tab immediately reflects an existing wallet session
// (button shows the connected address without the user re-opening the modal).
// The 5.3MB bundle loads during idle time, not blocking first paint.
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initAppKit().catch(() => {}))
} else {
  setTimeout(() => initAppKit().catch(() => {}), 1200)
}

// ===== CROSS-TAB / CROSS-PAGE SYNC =====
// When the wallet session changes in another tab or another page of this site,
// localStorage keys (walletconnect / wagmi) change → re-init + repaint here.
window.addEventListener('storage', (e) => {
  const k = e.key || ''
  if (k.includes('walletconnect') || k.includes('wagmi') || k.includes('appkit') || k === null) {
    initAppKit().then(() => {
      if (appKitModal && typeof appKitModal.sync === 'function') {
        try { appKitModal.sync() } catch (_) {}
      }
    }).catch(() => {})
  }
})
