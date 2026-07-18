// Pante — Reown AppKit wallet connection (local bundled build, lazy-loaded on first click)
// Loaded as <script type="module" src="js/wallet-reown.js"></script>
// The heavy AppKit+wagmi+viem+auth bundle lives in js/appkit-bundle.js so the page loads
// light, and only fetches it when the user clicks "Connect Wallet". Works in ANY browser
// via the WalletConnect QR modal (scan with phone) + email/social login (AppKit Auth).

// Reown credentials (kept in sync with /root/.hermes/.env)
const REOWN_PROJECT_ID = '17e1a3b695d76f2fe901e769d20b1a86'
const REOWN_APPKIT_AUTH_API_KEY = 'e195f364-bda6-412a-8d5e-ee5960b26e85'

let appKitModal = null;
let initPromise = null;

async function initAppKit() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // appkit-bundle.js exports the already-initialized `modal` (createAppKit ran at import)
      const mod = await import('./appkit-bundle.js');
      appKitModal = mod.modal || null;
      if (!appKitModal) throw new Error('AppKit modal not exported from bundle');

      // Reflect account changes on the Connect button
      appKitModal.subscribeAccount((account) => {
        const btn = document.getElementById('walletBtn');
        if (btn) {
          if (account.isConnected && account.address) {
            btn.textContent = account.address.slice(0, 6) + '…' + account.address.slice(-4);
            btn.classList.add('connected');
            window.dispatchEvent(new CustomEvent('walletConnected', { detail: account }));
          } else {
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');
          }
        }
      });
      return appKitModal;
    } catch (err) {
      console.error('[Pante] Reown AppKit failed to load:', err);
      appKitModal = null;
      initPromise = null;
      throw err;
    }
  })();
  return initPromise;
}

async function openWallet() {
  try {
    const modal = await initAppKit();
    if (modal && typeof modal.open === 'function') modal.open();
  } catch (err) {
    console.warn('[Pante] Falling back to injected wallet / notice');
    fallbackNotice();
  }
}

function fallbackNotice() {
  const hasMM = typeof window.ethereum !== 'undefined';
  if (hasMM) {
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(accs => {
        const btn = document.getElementById('walletBtn');
        if (btn && accs[0]) {
          btn.textContent = accs[0].slice(0,6) + '…' + accs[0].slice(-4);
          btn.classList.add('connected');
          window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: accs[0], isConnected: true } }));
        }
      })
      .catch(() => alert('Wallet connection cancelled.'));
  } else {
    alert('Wallet not available.\n\nInstall MetaMask or use a Web3 browser (Brave, Opera, Trust) to connect.\n\nOn mobile, open this site in the WalletConnect or MetaMask app to scan a QR code.');
  }
}

// Bind the Connect Wallet button (present on every page)
const walletBtn = document.getElementById('walletBtn');
if (walletBtn) {
  walletBtn.addEventListener('click', (e) => { e.preventDefault(); openWallet(); });
}
