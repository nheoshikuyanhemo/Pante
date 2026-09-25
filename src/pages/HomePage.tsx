import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { ExternalLink, Copy, CheckCircle, Zap, Shield, TrendingUp, Users } from 'lucide-react'
import { PanteFooter } from '../components/PanteFooter'
import {
  PANTE_ADDRESS, PANTE_CHAIN_ID, PANTE_DECIMALS, PANTE_LOGO,
  PANTE_ERC20_ABI, SYNTHRA_LAUNCHPAD_URL, SYNTHRA_SWAP_URL,
  ARC_EXPLORER_URL, PANTE_TOTAL_SUPPLY,
} from '../contracts/PanteToken'

// ── Scroll-reveal ─────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.07 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return { ref, visible }
}
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal()
  return <section ref={ref} className={`pante-reveal${visible ? ' visible' : ''} ${className}`}>{children}</section>
}

// ── Copy helper ────────────────────────────────────────────────────────────
function CopyAddress({ addr }: { addr: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  return (
    <button onClick={copy} className="pante-copy-btn" title="Copy address">
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : `${addr.slice(0, 10)}…${addr.slice(-8)}`}
    </button>
  )
}

// ── Stats bar ──────────────────────────────────────────────────────────────
function TokenStats() {
  const { address, isConnected } = useAccount()

  const { data: balRaw } = useReadContract({
    address: PANTE_ADDRESS, abi: PANTE_ERC20_ABI,
    functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: PANTE_CHAIN_ID, query: { enabled: !!address },
  })

  const balance = balRaw != null
    ? (Number(balRaw) / 10 ** PANTE_DECIMALS).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : null

  return (
    <div className="pante-token-stats">
      <div className="pante-ts-card">
        <span className="pante-ts-label">Token</span>
        <span className="pante-ts-value">$PANTE</span>
      </div>
      <div className="pante-ts-card">
        <span className="pante-ts-label">Network</span>
        <span className="pante-ts-value">Arc Mainnet</span>
      </div>
      <div className="pante-ts-card">
        <span className="pante-ts-label">Total Supply</span>
        <span className="pante-ts-value">{Number(PANTE_TOTAL_SUPPLY).toLocaleString()}</span>
      </div>
      <div className="pante-ts-card">
        <span className="pante-ts-label">Decimals</span>
        <span className="pante-ts-value">{PANTE_DECIMALS}</span>
      </div>
      {isConnected && balance != null && (
        <div className="pante-ts-card pante-ts-card--highlight">
          <span className="pante-ts-label">Your Balance</span>
          <span className="pante-ts-value">{balance} PANTE</span>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export function HomePage() {
  return (
    <div className="pante-page">

      {/* ── HERO ── */}
      <Reveal className="pante-hero">
        <img src="/pante-banner.png" alt="Pante Banner" className="pante-hero-banner" />
        <div className="pante-hero-badge">
          <span className="pante-dot-live" /> Live on Arc Mainnet
        </div>
        <h1>Pante: Meme with Utility &amp; Sustainable Development</h1>
        <p>The community-driven token on Arc — USDC-native gas, sub-second finality, real DeFi utility.</p>
        <div className="pante-hero-ctas">
          <a href={SYNTHRA_LAUNCHPAD_URL} target="_blank" rel="noopener" className="pante-dex-btn">
            Buy $PANTE on Synthra <ExternalLink size={14} />
          </a>
          <Link to="/dex" className="pante-dex-btn pante-dex-btn--secondary">
            Open DEX
          </Link>
        </div>
      </Reveal>

      {/* ── CONTRACT INFO ── */}
      <Reveal className="pante-contract-section">
        <h2 className="pante-section-title">Smart Contract</h2>
        <div className="pante-contract-card">
          <div className="pante-contract-row">
            <span className="pante-contract-label">Contract Address</span>
            <div className="pante-contract-addr-row">
              <CopyAddress addr={PANTE_ADDRESS} />
              <a href={ARC_EXPLORER_URL} target="_blank" rel="noopener" className="pante-explorer-link">
                View on Explorer <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="pante-contract-row">
            <span className="pante-contract-label">Network</span>
            <span className="pante-contract-value">Arc Mainnet (Chain ID: {PANTE_CHAIN_ID})</span>
          </div>
          <div className="pante-contract-row">
            <span className="pante-contract-label">Standard</span>
            <span className="pante-contract-value">ERC-20 (18 decimals)</span>
          </div>
          <div className="pante-contract-row">
            <span className="pante-contract-label">Total Supply</span>
            <span className="pante-contract-value">1,000,000,000 PANTE</span>
          </div>
          <div className="pante-contract-row">
            <span className="pante-contract-label">Launchpad</span>
            <a href={SYNTHRA_LAUNCHPAD_URL} target="_blank" rel="noopener" className="pante-explorer-link">
              Synthra Launchpad <ExternalLink size={12} />
            </a>
          </div>
          <div className="pante-contract-row">
            <span className="pante-contract-label">DEX</span>
            <a href={SYNTHRA_SWAP_URL} target="_blank" rel="noopener" className="pante-explorer-link">
              Synthra Swap <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <TokenStats />
      </Reveal>

      {/* ── BUY SECTION ── */}
      <Reveal className="pante-buy-section">
        <h2 className="pante-section-title">Buy $PANTE</h2>
        <p className="pante-section-desc">
          PANTE is live and available for purchase on the Synthra Launchpad on Arc Mainnet.
        </p>
        <div className="pante-buy-grid">
          <div className="pante-buy-card pante-buy-card--primary">
            <img src={PANTE_LOGO} alt="PANTE" className="pante-buy-logo" />
            <h3>Synthra Launchpad</h3>
            <p>Buy PANTE tokens directly from the official launchpad at the fair launch price.</p>
            <a href={SYNTHRA_LAUNCHPAD_URL} target="_blank" rel="noopener" className="pante-dex-btn">
              Buy on Launchpad <ExternalLink size={14} />
            </a>
          </div>
          <div className="pante-buy-card">
            <div className="pante-buy-icon"><TrendingUp size={32} /></div>
            <h3>Synthra Swap</h3>
            <p>Swap USDC → PANTE directly. Arc mainnet pair pre-selected, ready to trade.</p>
            <a href={SYNTHRA_SWAP_URL} target="_blank" rel="noopener" className="pante-dex-btn pante-dex-btn--secondary">
              USDC → PANTE <ExternalLink size={14} />
            </a>
          </div>
          <div className="pante-buy-card">
            <div className="pante-buy-icon"><Zap size={32} /></div>
            <h3>Pante DEX</h3>
            <p>Use our integrated DEX page for a native Pante trading experience.</p>
            <Link to="/dex" className="pante-dex-btn pante-dex-btn--secondary">
              Open Pante DEX
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── HOW TO BUY ── */}
      <Reveal className="pante-howto-section">
        <h2 className="pante-section-title">How to Buy</h2>
        <div className="pante-steps-grid">
          {[
            { n: '01', title: 'Set Up Wallet', desc: 'Install MetaMask or any EVM wallet. Add Arc Mainnet (Chain ID 5042, RPC: https://rpc.arc.io).' },
            { n: '02', title: 'Get USDC on Arc', desc: 'Bridge USDC to Arc Mainnet via CCTP or buy directly. USDC is the native gas token on Arc.' },
            { n: '03', title: 'Connect to Synthra', desc: 'Visit the Synthra Launchpad link, connect your wallet, and switch to Arc Mainnet.' },
            { n: '04', title: 'Buy $PANTE', desc: 'Enter your desired USDC amount, confirm the transaction, and PANTE will appear in your wallet.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="pante-step-card">
              <div className="pante-step-num">{n}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── VISION ── */}
      <Reveal className="pante-vision">
        <h2 className="pante-section-title">Our Vision</h2>
        <p>
          Pante is not just a meme — it is the evolution of meme tokens. We merge meme culture with
          real DeFi utility: a decentralized exchange, liquidity mining, and staking rewards — all
          running natively on Arc Mainnet with USDC as gas. Sub-second finality, stable fees, and
          a community-first governance model.
        </p>
      </Reveal>

      {/* ── FEATURES ── */}
      <Reveal className="pante-features">
        <h2 className="pante-section-title">Core Features</h2>
        <div className="pante-feature-grid">
          {[
            { icon: <TrendingUp size={24} />, title: 'Decentralized Exchange', desc: 'Swap PANTE & USDC on Synthra DEX with minimal fees on Arc Mainnet.' },
            { icon: <Zap size={24} />,        title: 'USDC Gas Token',          desc: 'Arc uses USDC as native gas — no wrapped ETH, no price volatility in fees.' },
            { icon: <Shield size={24} />,     title: 'Fair Launch',              desc: 'Token launched transparently via Synthra Launchpad — no pre-mine, no hidden allocation.' },
            { icon: <Users size={24} />,      title: 'Community Governance',     desc: 'Token holders vote on protocol upgrades and treasury decisions.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="pante-feature-card">
              <div className="pante-feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── ECOSYSTEM ── */}
      <Reveal className="pante-ecosystem">
        <h2 className="pante-section-title">Ecosystem</h2>
        <ul className="pante-eco-list">
          <li>
            <strong>PANTE Token</strong> —{' '}
            <a href={ARC_EXPLORER_URL} target="_blank" rel="noopener" className="pante-inline-link">
              {PANTE_ADDRESS.slice(0, 14)}…{PANTE_ADDRESS.slice(-10)} <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </a>
          </li>
          <li><strong>PanteSwap</strong> — Integrated with Synthra DEX on Arc Mainnet</li>
          <li><strong>PanteStake</strong> — Staking pools coming soon</li>
          <li><strong>PanteBridge</strong> — Cross-chain liquidity via CCTP</li>
          <li><strong>PanteDAO</strong> — Community governance (roadmap)</li>
        </ul>
      </Reveal>

      {/* ── ARC NETWORK INFO ── */}
      <Reveal className="pante-arc-section">
        <h2 className="pante-section-title">Built on Arc</h2>
        <div className="pante-arc-grid">
          <div className="pante-arc-card">
            <div className="pante-arc-icon">⚡</div>
            <h3>Sub-Second Finality</h3>
            <p>Transactions confirmed in under 1 second — instant trading experience.</p>
          </div>
          <div className="pante-arc-card">
            <div className="pante-arc-icon">💵</div>
            <h3>USDC as Gas</h3>
            <p>Pay all gas fees in USDC. No ETH required. Predictable, stable costs.</p>
          </div>
          <div className="pante-arc-card">
            <div className="pante-arc-icon">🔒</div>
            <h3>EVM Compatible</h3>
            <p>Full EVM compatibility — use any Ethereum wallet and tooling seamlessly.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a
            href="https://arc.io"
            target="_blank" rel="noopener"
            className="pante-dex-btn pante-dex-btn--secondary"
            style={{ display: 'inline-flex', width: 'auto' }}
          >
            Learn about Arc <ExternalLink size={14} />
          </a>
        </div>
      </Reveal>

      <PanteFooter />
    </div>
  )
}
