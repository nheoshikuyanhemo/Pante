# Pante – Meme with Utility

A Web3 project that merges meme culture with real-world utility through a comprehensive DeFi ecosystem. This repository contains the organized frontend code and documentation for the Pante dApp, featuring scroll-activated reveal effects, a sleek side menu, and modern cyber-inspired styling.

## 📂 Project Structure (English Categories)

All files are now organized into logical directories:

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
├── README.md             # Project documentation (this file)
└── structure.md          # Detailed folder layout and file purpose description
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/nheoshikuyanhemo/Pante.git
   cd Pante
   ```

2. **Install dependencies (none required)**
   ```bash
   # No npm or other dependencies needed – static site
   ```

3. **Run the local server**
   ```bash
   # Option 1: Using Python (built‑in)
   python3 -m http.server 12345 --bind 0.0.0.0

   # Option 2: Using convenience script
   ./scripts/start-server.sh
   ```

4. **Open the application**
   Navigate to `http://localhost:12345` in your web browser.

## 📂 Directory Purpose

- **html/** – Contains all HTML files: the landing page (`index.html`), the About page (`about.html`), and the full Whitepaper (`whitepaper.html`).
- **assets/** – Holds image and media resources used by the pages (`banner.png`, `logo.png`).
- **css/** – Stores the main stylesheet (`style.css`) that defines the dark, cyber‑inspired aesthetic, scroll effects, and responsive layout.
- **js/** – Contains the client‑side JavaScript (`script.js`) that implements menu toggling, smooth scrolling, scroll‑reveal animations, and click ripple effects.
- **scripts/** – Optional helper scripts for server startup and other command‑line tasks.
- **backup/** – Automatically stores copies of original files before any modifications, ensuring you can revert if needed.
- **backup/** – Contains original versions of files prior to edits.
- **scripts/** – Optional helper scripts for server startup and other command‑line tasks.
- **README.md** – This documentation file.
- **structure.md** – Detailed description of the project layout and file responsibilities.

## ✨ Key Features

- **Scroll Reveal**: Content fades in and slides up as users scroll down the page (using IntersectionObserver).
- **Moving RGB Line**: A thin 1‑pixel high element with an animated gradient runs across the top of the page.
- **Responsive Menu**: Side menu slides in from the right; menu links are displayed in white for clarity.
- **Click Effects**: Subtle ripple animations on feature cards and menu items.
- **Thin Border**: All major sections have a thin orange border (`#ff9500`) for visual distinction.
- **Transparent Borders**: All main sections have a thin orange border (`#ff9500`) for visual distinction.

## 🌐 Accessing the Live Demo

The application runs on a local server at port **12345**. After starting the server, open:

```
http://localhost:12345
```

in your preferred web browser.

## 📚 Documentation

- **About Page** – Details about Pante’s vision, core features, and community links.
- **Whitepaper** – Complete technical documentation covering tokenomics, ecosystem overview, roadmap, and security audits.
- **Structure.md** – Comprehensive overview of the project layout and file responsibilities.

## 🛠️ Customization

- Adjust colors and animations in `css/style.css`.
- Modify scroll effects by editing the `.reveal` CSS class and `js/script.js`.
- Add new sections to the landing page by updating `html/index.html`.

## 📜 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Special thanks to the open‑source community for inspiring design patterns.
- Built with ❤️ using modern web technologies.

Ready to explore the future of meme utility? Dive in and experience Pante's innovative DeFi dashboard today! 🚀