# Pante Web3 dApp Structure

## Project Layout
- `/root/.hermes/Pante/` – main project directory
  - `index.html` – main HTML page (header, hero, features, footer, menu)
  - `style.css` – modern cyber‑security styling, responsive layout, side‑sliding menu, thin red border (`.bordered`) on header, nav, hero, features, footer
  - `script.js` – JavaScript handling menu toggle, click effects, smooth scroll, and scroll‑reveal via IntersectionObserver
  - `banner.png` – hero background image
  - `logo.png` – site logo (1:1 ratio)
  - `backup/` – folder containing backup copies of the original files before any edits
  - `structure.md` – this file, documenting the project layout and file purposes

## File Purposes
- **index.html** – Main page markup; includes header, hero, features, footer, and menu structure.
- **style.css** – CSS styling; modern clean look, responsive, thin red border (`.bordered`) on key sections, smooth scroll, hover/click effects.
- **script.js** – JavaScript that handles menu toggle (click), smooth scroll, click‑effects (ripple), and scroll‑reveal (IntersectionObserver).
- **banner.png** – Hero background image.
- **logo.png** – Site logo (square, 1:1 ratio).
- **backup/** – Directory containing backup copies of the original files before any edits.
- **structure.md** – This file, describing the project layout and file purposes.

## Workflow
1. **Backup** – Copy all relevant files into the `backup/` directory before making any changes.
2. **Edit** – Modify `style.css` for visual styling, `script.js` for interactivity, and `index.html` for structure if needed.
3. **Validate** – Open the site, test the menu, scroll, and overall look.
4. **Update** `structure.md` – After each change, ensure the description reflects the current state of the project.

## Key Visual Enhancements
- **Scroll Effects**: Elements with class `reveal` fade in and slide up as they enter the viewport.
- **Click Effects**: Menu button toggles the side panel; clicking on menu items or feature cards triggers a subtle scale/ripple animation.
- **Thin Border**: All main sections (header, navigation, hero, features, footer) have a thin red border (`border: 1px solid #ff0000;`) applied via the `.bordered` class.

## Critical Context
- The website runs on a local server (port 12345) and is accessed via `http://localhost:12345`.
- The design follows a “hacker‑style” aesthetic: dark background, bright accent color (#ff9500), and clean square elements.
- All interactions are neutral and do not require any external dependencies beyond the standard web technologies.