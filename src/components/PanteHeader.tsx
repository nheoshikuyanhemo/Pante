import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/dex', label: 'DEX' },
  { to: '/presale', label: 'Presale' },
  { href: 'https://x.com/pante_coin', label: 'X', external: true },
  { href: 'https://github.com/nheoshikuyanhemo/Pante', label: 'GitHub', external: true },
]

const MENU_ITEMS = [
  { to: '/', label: 'Home', desc: 'Landing — banner, tagline & core features.' },
  { to: '/dex', label: 'DEX', desc: 'Swap PANTE & USDC on Arc Testnet.' },
  { to: '/presale', label: 'Presale', desc: 'Buy PANTE tokens in the public presale.' },
  { href: 'https://x.com/pante_coin', label: 'X (Twitter)', desc: 'Official announcements & community.', external: true },
  { href: 'https://github.com/nheoshikuyanhemo/Pante', label: 'GitHub', desc: 'Source code & development repository.', external: true },
]

export function PanteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      {/* Moving RGB line */}
      <div className="pante-rgb-line" />

      <header className="pante-header">
        <button className="pante-menu-trigger" onClick={() => setMenuOpen(true)} title="Menu">
          <span /><span /><span />
        </button>

        <nav className="pante-nav">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener" className="pante-nav-link">
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to!}
                className={`pante-nav-link${location.pathname === link.to ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="pante-header-right">
          <div className="pante-wallet-wrap">
            <ConnectKitButton.Custom>
              {({ isConnected, show, address }) => (
                <button
                  onClick={show}
                  className={`pante-wallet-btn${isConnected ? ' connected' : ''}`}
                >
                  {isConnected
                    ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
                    : 'Connect Wallet'}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
          <div className="pante-logo-box">
            <Link to="/">
              <img
                src="https://raw.githubusercontent.com/nheoshikuyanhemo/Pante/main/html/assets/logo.png"
                alt="Pante Logo"
                className="pante-logo"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div className="pante-menu-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* Side menu */}
      <aside className={`pante-menu-panel${menuOpen ? ' open' : ''}`}>
        <div className="pante-menu-head">
          <span className="pante-menu-title">// PANTE</span>
          <button className="pante-menu-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <ul className="pante-menu-list">
          {MENU_ITEMS.map((item, i) => (
            <li key={item.label} style={{ transitionDelay: `${0.05 + i * 0.05}s` }}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener" onClick={() => setMenuOpen(false)}>
                  <span className="pante-mc-title">{item.label}</span>
                  <span className="pante-mc-desc">{item.desc}</span>
                </a>
              ) : (
                <Link to={item.to!} onClick={() => setMenuOpen(false)}>
                  <span className="pante-mc-title">{item.label}</span>
                  <span className="pante-mc-desc">{item.desc}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}
