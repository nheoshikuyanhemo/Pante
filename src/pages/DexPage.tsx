import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ExternalLink, TrendingUp, Droplets, BarChart2, ShoppingCart } from 'lucide-react'
import { PanteFooter } from '../components/PanteFooter'
import {
  PANTE_ADDRESS, PANTE_CHAIN_ID, PANTE_DECIMALS, PANTE_LOGO,
  PANTE_ERC20_ABI, SYNTHRA_LAUNCHPAD_URL, SYNTHRA_SWAP_URL,
  SYNTHRA_POOL_URL, ARC_EXPLORER_URL,
} from '../contracts/PanteToken'

type Tab = 'buy' | 'swap' | 'pool'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'buy',  label: 'Buy / Launchpad', icon: <ShoppingCart size={15} /> },
  { id: 'swap', label: 'Swap',            icon: <TrendingUp size={15} /> },
  { id: 'pool', label: 'Liquidity Pool',  icon: <Droplets size={15} /> },
]

const SYNTHRA_URLS: Record<Tab, string> = {
  buy:  SYNTHRA_LAUNCHPAD_URL,
  swap: SYNTHRA_SWAP_URL,
  pool: SYNTHRA_POOL_URL,
}

// ── PANTE Balance badge ────────────────────────────────────────────────────
function BalanceBadge() {
  const { address, isConnected } = useAccount()
  const { data: balRaw } = useReadContract({
    address: PANTE_ADDRESS, abi: PANTE_ERC20_ABI,
    functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: PANTE_CHAIN_ID, query: { enabled: !!address },
  })
  if (!isConnected || balRaw == null) return null
  const bal = (Number(balRaw) / 10 ** PANTE_DECIMALS).toLocaleString(undefined, { maximumFractionDigits: 4 })
  return (
    <div className="pante-dex-balance-badge">
      <img src={PANTE_LOGO} alt="PANTE" className="pante-badge-logo" />
      <span>{bal} PANTE</span>
    </div>
  )
}

// ── Synthra iframe — key forces remount on tab change (no setState-in-effect) ─
function SynthraPanel({ tab }: { tab: Tab }) {
  const url = SYNTHRA_URLS[tab]
  return (
    <div className="pante-synthra-wrap" key={tab}>
      <iframe
        src={url}
        title={`Synthra ${tab}`}
        className="pante-synthra-iframe loaded"
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
      />
      <div className="pante-synthra-overlay-link">
        <a href={url} target="_blank" rel="noopener" className="pante-explorer-link">
          Open in Synthra <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

// ── Token info sidebar ─────────────────────────────────────────────────────
function TokenSidebar() {
  return (
    <div className="pante-dex-sidebar">
      <div className="pante-dex-card">
        <div className="pante-dex-card-header">
          <img src={PANTE_LOGO} alt="PANTE" className="pante-badge-logo" style={{ width: 22, height: 22 }} />
          $PANTE Info
        </div>
        <ul className="pante-pair-list">
          {[
            { label: 'Network',  value: 'Arc Mainnet',     cls: 'pante-pair-rate' },
            { label: 'Chain ID', value: String(PANTE_CHAIN_ID) },
            { label: 'Supply',   value: '1,000,000,000' },
            { label: 'Decimals', value: '18' },
          ].map(({ label, value, cls }) => (
            <li key={label} className="pante-pair-item">
              <span style={{ fontSize: '0.82rem' }}>{label}</span>
              <span className={cls ?? ''}>{value}</span>
            </li>
          ))}
          <li className="pante-pair-item">
            <span style={{ fontSize: '0.78rem' }}>Contract</span>
            <a href={ARC_EXPLORER_URL} target="_blank" rel="noopener"
              className="pante-pair-rate" style={{ fontSize: '0.75rem' }}>
              {PANTE_ADDRESS.slice(0, 8)}…{PANTE_ADDRESS.slice(-6)}
              <ExternalLink size={10} style={{ marginLeft: 3, display: 'inline', verticalAlign: 'middle' }} />
            </a>
          </li>
        </ul>
      </div>

      <div className="pante-dex-card" style={{ marginTop: '1rem' }}>
        <div className="pante-dex-card-header"><BarChart2 size={15} /> Quick Links</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' }}>
          {[
            { href: SYNTHRA_LAUNCHPAD_URL, label: 'Launchpad' },
            { href: SYNTHRA_SWAP_URL,      label: 'Synthra Swap' },
            { href: SYNTHRA_POOL_URL,      label: 'Add Liquidity' },
            { href: ARC_EXPLORER_URL,      label: 'Arc Explorer' },
          ].map(({ href, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener"
              className="pante-dex-btn pante-dex-btn--secondary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>
              {label} <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main DEX Page ──────────────────────────────────────────────────────────
export function DexPage() {
  const [tab, setTab] = useState<Tab>('buy')

  return (
    <div className="pante-page">
      <section className="pante-hero pante-reveal visible">
        <img src="/pante-banner.png" alt="Pante DEX Banner" className="pante-hero-banner" />
        <div className="pante-hero-badge">
          <span className="pante-dot-live" /> Powered by Synthra · Arc Mainnet
        </div>
        <h1>Pante DEX</h1>
        <p>Trade $PANTE on Arc Mainnet. Buy from the launchpad, swap, or provide liquidity.</p>
      </section>

      <section className="pante-dex-section">
        <div className="pante-dex-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`pante-tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}><BalanceBadge /></div>
        </div>

        <div className="pante-dex-panel">
          <SynthraPanel tab={tab} />
          <TokenSidebar />
        </div>
      </section>

      <PanteFooter />
    </div>
  )
}
