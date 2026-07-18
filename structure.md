# Pante Web3 dApp – Structure Documentation

This document describes the organized folder layout and the purpose of each file in the Pante project. All web‑facing assets now live under **html/** so the static server can be run from that directory and everything resolves with simple relative paths.

## 📂 Directory Layout

```
root/
├── html/                 # Root served by the HTTP server (run: cd html && python3 -m http.server 12345)
│   ├── index.html        # Main landing page
│   ├── about.html        # About page (English)
│   ├── whitepaper.html   # Full technical whitepaper (English)
│   ├── assets/           # Image & media assets (logo.png, banner.png)
│   ├── css/              # Styling
│   │   └── style.css
│   └── js/               # Client‑side logic
│       ├── script.js     # Menu, typewriter, i18n apply, wallet connect
│       ├── i18n.en.js    # ENGLISH SOURCE (edit this only)
│       └── i18n.js       # AUTO-GENERATED (15 langs) — do not edit by hand
├── scripts/
│   └── build_i18n.py     # Translates i18n.en.js → i18n.js via Google Translate
├── backup/               # Timestamped backups before edits
├── .gitignore
├── README.md             # Project documentation
└── structure.md          # This file – layout and file purpose description
```

## 📄 File Purposes

| File | Category | Purpose |
|------|----------|---------|
| `html/index.html` | HTML | Main landing page: header (Menu + nav links + Languages + Connect Wallet), hero, feature cards, footer, side menu. |
| `html/about.html` | HTML | About page: vision, core features, related links. Header same as index. |
| `html/whitepaper.html` | HTML | Whitepaper: abstract, tokenomics, ecosystem, roadmap, security. Header same as index. |
| `html/dex.html` | HTML | DEX page: TradingView chart, swap, liquidity, staking, bridge. Header same as index. |
| `html/nft.html` | HTML | NFT marketplace: upload, cat detection, mint, marketplace. Header same as index. |
| `html/assets/logo.png` | Assets | Square logo (1:1) displayed in the header. |
| `html/assets/banner.png` | Assets | Hero background image used on the landing page. |
| `html/css/style.css` | CSS | All styling: dark theme, scroll reveal, RGB line, side menu, responsive layout. |
| `html/js/script.js` | JS | Client‑side logic: menu toggle, typewriter, scroll reveal, language switch, wallet connect. |
| `html/js/i18n.en.js` | JS | **English source** — the ONLY i18n file you edit. Edit text here. |
| `html/js/i18n.js` | JS | **Auto‑generated** (15 languages) by `scripts/build_i18n.py`. Do not edit manually. |
| `scripts/build_i18n.py` | Script | Reads `i18n.en.js`, translates to 14 langs via Google Translate (free), writes `i18n.js`. |
| `backup/` | Backup | Original file copies created before any edit, for safe rollback. |
| `.gitignore` | Config | Specifies files/folders excluded from Git (e.g., `backup/`, `*.bak`). |
| `README.md` | Docs | High‑level project overview, quick start, and feature list. |
| `structure.md` | Docs | Detailed folder structure and per‑file responsibility (this file). |

## 🔧 Workflow

1. **Backup** – Before editing, copy the target file into `backup/` (e.g., `cp html/index.html backup/index.html.bak`).
2. **Edit** – Modify files in their respective category folders inside `html/` (`html/css/style.css` for styling, `html/js/script.js` for behavior, `html/*.html` for markup).
3. **Validate** – Run the local server (`cd html && python3 -m http.server 12345`) and verify the page in a browser.
4. **Update Docs** – After structural changes, refresh `README.md` and `structure.md` to reflect the current state.
5. **i18n (text translation)** – Edit ONLY `html/js/i18n.en.js` (English). Then run `python3 scripts/build_i18n.py` to auto‑translate all 14 other languages into `html/js/i18n.js`. Commit both.

## 🎨 Key Visual Effects (Implemented)

- **Scroll Reveal** – Elements with class `reveal` start hidden (`opacity:0; translateY(30px)`) and become visible when scrolled into view (IntersectionObserver adds `.visible`).
- **Moving RGB Line** – A fixed 1px‑high `div.moving-line` at the top with an animated gradient (`#ff0000 → #ff7f00 → #ffff00 → #00ff00 → #0000ff → #4b0082 → #9400d3`) using CSS keyframes.
- **Header Layout** – Single responsive row: `Menu (≡)` → `Home / DEX / NFT / About / Whitepaper` nav links → `Logo` (right) → `Languages (🇬🇧 EN)` + `Connect Wallet` button. Orange bottom border (`2px solid #ff9500`). Active page nav-link gets orange underline (box-shadow). On mobile (<900px) nav links hidden, shown in slide menu instead.
- **Click Effects** – Ripple animation on feature cards and menu items; menu trigger dots animate into an “X”.
- **Thin Border** – Main sections use `.bordered` (2px solid `#ff9500`) for a clean framed look.
- **White Menu Text** – All menu list items (`.mc-title`, `.mc-desc`) are forced to white (`#ffffff`) for readability.

## 🌐 Deployment & Preview Links

- **Production**: `https://pante.vercel.app` (auto-deploy dari branch `main`)
- **Testnet / Preview**: `https://testnet.pante.vercel.app` (auto-deploy dari branch `testnet`)
  - Setup di Vercel Dashboard → Project → **Settings → Git** → tambahkan `testnet` ke Production Branches
  - **Settings → Domains** → Add `testnet.pante.vercel.app` → assign ke branch `testnet` (Vercel auto-SSL)
  - Konten SAMA PERSIS dengan production, hanya beda URL (untuk user preview/testing)
- **Local**: `http://localhost:8000/html/` (server dari root Pante) atau `http://localhost:8001/` (server dari `html/`)

## 🌐 Runtime Context

- **Local Server**: Runs on port **12345** (`cd html && python3 -m http.server 12345 --bind 0.0.0.0`).
- **Access URL**: `http://localhost:12345/` (redirects to `/html/index.html`).
- **Design Aesthetic**: Dark hacker‑style theme (`#0d0d1a` background, `#ff9500` accent), monospace font, square elements.
- **No External Dependencies**: Pure HTML/CSS/JS; no frameworks or libraries required.