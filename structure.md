# Pante Web3 dApp – Structure Documentation

This document describes the organized folder layout and the purpose of each file in the Pante project. All categories are in English for clarity and consistency.

## 📂 Directory Layout

```
root/
├── html/                 # HTML pages
│   ├── index.html        # Main landing page
│   ├── about.html        # About page (English)
│   └── whitepaper.html   # Full technical whitepaper (English)
├── assets/               # Image and media assets
│   ├── banner.png        # Hero background image
│   └── logo.png          # Project logo (1:1 aspect ratio)
├── css/                  # Styling files
│   └── style.css         # Main stylesheet with modern dark theme
├── js/                   # JavaScript files
│   └── script.js         # Interactivity: menu toggle, scroll reveal, click effects
├── scripts/              # Utility scripts
│   ├── server.py         # Backend server (optional)
│   └── start-server.sh   # Convenience script to launch the dev server
├── backup/               # Auto‑generated backups of original files before edits
├── .gitignore            # Git ignore patterns
├── README.md             # Project documentation
└── structure.md          # This file – layout and file purpose description
```

## 📄 File Purposes

| File | Category | Purpose |
|------|----------|---------|
| `html/index.html` | HTML | Main landing page: header, hero, feature cards, footer, side menu. |
| `html/about.html` | HTML | About page: vision, core features, related links. |
| `html/whitepaper.html` | HTML | Whitepaper: abstract, tokenomics, ecosystem, roadmap, security. |
| `assets/banner.png` | Assets | Hero background image used on the landing page. |
| `assets/logo.png` | Assets | Square logo (1:1) displayed in the header. |
| `css/style.css` | CSS | All styling: dark theme, scroll reveal, RGB line, side menu, responsive layout. |
| `js/script.js` | JS | Client‑side logic: menu toggle, smooth scroll, IntersectionObserver reveal, click ripple. |
| `scripts/server.py` | Scripts | Optional Python HTTP server for local testing. |
| `scripts/start-server.sh` | Scripts | Shell script to quickly start the local server on port 12345. |
| `backup/` | Backup | Original file copies created before any edit, for safe rollback. |
| `.gitignore` | Config | Specifies files/folders excluded from Git (e.g., `backup/`, `*.bak`). |
| `README.md` | Docs | High‑level project overview, quick start, and feature list. |
| `structure.md` | Docs | Detailed folder structure and per‑file responsibility (this file). |

## 🔧 Workflow

1. **Backup** – Before editing, copy the target file into `backup/` (e.g., `cp html/index.html backup/index.html.bak`).
2. **Edit** – Modify files in their respective category folders (`css/style.css` for styling, `js/script.js` for behavior, `html/*.html` for markup).
3. **Validate** – Run the local server (`python3 -m http.server 12345`) and verify the page in a browser.
4. **Update Docs** – After structural changes, refresh `README.md` and `structure.md` to reflect the current state.

## 🎨 Key Visual Effects (Implemented)

- **Scroll Reveal** – Elements with class `reveal` start hidden (`opacity:0; translateY(30px)`) and become visible when scrolled into view (IntersectionObserver adds `.visible`).
- **Moving RGB Line** – A fixed 1px‑high `div.moving-line` at the top with an animated gradient (`#ff0000 → #ff7f00 → #ffff00 → #00ff00 → #0000ff → #4b0082 → #9400d3`) using CSS keyframes.
- **Side Menu** – Panel slides from the right (`transform: translateX(100%) → 0`) when the 3‑dot trigger is clicked; backdrop dims the page.
- **Click Effects** – Ripple animation on feature cards and menu items; menu trigger dots animate into an “X”.
- **Thin Border** – Main sections use `.bordered` (2px solid `#ff9500`) for a clean framed look.
- **White Menu Text** – All menu list items (`.mc-title`, `.mc-desc`) are forced to white (`#ffffff`) for readability.

## 🌐 Runtime Context

- **Local Server**: Runs on port **12345** (`python3 -m http.server 12345 --bind 0.0.0.0`).
- **Access URL**: `http://localhost:12345` (or the appropriate host IP).
- **Design Aesthetic**: Dark hacker‑style theme (`#0d0d1a` background, `#ff9500` accent), monospace font, square elements.
- **No External Dependencies**: Pure HTML/CSS/JS; no frameworks or libraries required.