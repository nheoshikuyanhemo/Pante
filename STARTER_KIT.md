# 🚀 Pante Starter Kit — Quick Reference

Untuk mempelajari dan memulai bekerja dengan cepat. Ikuti langkah-langkah berikut.

---

## 📁 Struktur Proyek

```
/root/.hermes/Pante/
├── index.html              # Halaman utama (home)
├── dex.html                # DEX page (swap)
├── nft.html                # NFT page (mint)
├── about.html              # About page
├── whitepaper.html         # Whitepaper
├── html/
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript modules
│   │   ├── wallet-reown.js # Wallet connection (AppKit + MetaMask)
│   │   ├── nft.js          # NFT minting logic
│   │   ├── script.js       # UI interactions
│   │   ├── i18n.js         # Internationalization
│   │   └── appkit-bundle.js# Reown AppKit bundle (5MB)
│   └── assets/             # Images & icons
├── contracts/              # Solidity contracts
├── scripts/                # Build scripts
├── test.cjs                # Test suite
├── package.json            # Dependencies
├── vercel.json             # Vercel config
└── .gitignore              # Git ignore rules
```

---

## ⚡ Quick Start

### 1. Start Local Server
```bash
cd /root/.hermes/Pante
python3 -m http.server 8000
```
Buka: `http://localhost:8000`

### 2. Run Tests
```bash
cd /root/.hermes/Pante
npm run test
```

### 3. Check Syntax
```bash
node --check html/js/wallet-reown.js
node --check html/js/nft.js
```

---

## 🔌 Wallet Connection Flow

### Supported Chains
| Chain | Chain ID | RPC | Default |
|-------|----------|-----|---------|
| Arc Testnet | 4387 | `rpc.testnet.arc.io` | ✅ Default |
| Arc Mainnet | 4386 | `rpc.arc.io` | |
| Ethereum | 1 | `eth.llamarpc.com` | |
| Polygon | 137 | `polygon-rpc.com` | |
| Arbitrum | 42161 | `arb1.arbitrum.io/rpc` | |
| Base | 8453 | `mainnet.base.org` | |
| Optimism | 10 | `mainnet.optimism.io` | |

### Connection Flow
1. Click **Connect Wallet** button
2. AppKit tries first (WalletConnect + email/social)
3. Falls back to MetaMask
4. After connect → Arc Testnet auto-added
5. Chain selector button (logo only) appears in header
6. Click chain logo → dropdown with all chains
7. Click any chain → switches via `wallet_switchEthereumChain` or `wallet_addEthereumChain`

### Key Functions
```javascript
// Open wallet modal
window.PanteWallet.open()

// Switch chain
await window.PanteWallet.switchToArcChain('arcTestnet')

// Check connection status
window.PanteWallet.getIsConnected()
window.PanteWallet.getAddress()

// Get current chain ID
window.PanteWallet.getChainId()
```

---

## 🔑 Environment Variables

The `.env` file in `/root/.hermes/` contains:
```
REOWN_PROJECT_ID=17e1a3b695d76f2fe901e769d20b1a86
REOWN_APPKIT_AUTH_API_KEY=***
```

**For Vercel deployment:**
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Add `REOWN_PROJECT_ID` and `REOWN_APPKIT_AUTH_API_KEY`

---

## 🧪 Testing Checklist

Before claiming work is complete, verify:
- [ ] `npm run test` passes (5/5)
- [ ] `node --check` on all JS files passes
- [ ] Local server starts: `python3 -m http.server 8000`
- [ ] Browser can load `http://localhost:8000`
- [ ] Wallet connect button appears and is clickable
- [ ] Chain selector (logo button) appears after connect
- [ ] Chain dropdown works (switch between Arc/Ethereum/etc.)
- [ ] NFT page loads (check for cat detection)
- [ ] DEX page loads (check for swap interface)

---

## 📋 Common Commands

```bash
# Start server
python3 -m http.server 8000

# Run tests
npm run test

# Check syntax
node --check html/js/wallet-reown.js
node --check html/js/nft.js

# Git push
git add -A && git commit -m "message" && git push origin main

# View commit log
git log --oneline -5

# Check git status
git status
```

---

## ⚠️ Important Notes

1. **No hardcoded secrets** — Use `.env` for credentials
2. **AppKit bundle** is 5MB, loaded lazily on first click
3. **Cross-tab sync** uses `storage` events
4. **Auto-detect** wallet on page load
5. **Pre-add Arc chains** on connect (so user can switch immediately)

---

## 🔗 Useful Links

- GitHub: `https://github.com/nheoshikuyanhemo/Pante`
- Vercel: `https://pante.vercel.app`
- X/Twitter: `https://x.com/pante_coin`
- Reown Dashboard: `https://dashboard.reown.com`

---

*Dibuat untuk memudahkan pemula memahami struktur dan alur kerja proyek Pante.*