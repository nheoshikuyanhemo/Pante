import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ExternalLink, ShoppingCart, TrendingUp, Droplets } from 'lucide-react'
import {
  PANTE_ADDRESS, PANTE_CHAIN_ID, PANTE_DECIMALS, PANTE_LOGO,
  PANTE_ERC20_ABI, SYNTHRA_LAUNCHPAD_URL, SYNTHRA_SWAP_URL,
  SYNTHRA_POOL_URL,
} from '../contracts/PanteToken'
import { useReadContract } from 'wagmi'

type Tab = 'buy' | 'swap' | 'pool'

const TABS: { id: Tab; label: string; icon: React.ReactNode; url: string }[] = [
  { id: 'buy',  label: 'Buy / Launchpad', icon: <ShoppingCart size={14} />, url: SYNTHRA_LAUNCHPAD_URL },
  { id: 'swap', label: 'Swap',            icon: <TrendingUp   size={14} />, url: SYNTHRA_SWAP_URL },
  { id: 'pool', label: 'Add Liquidity',   icon: <Droplets     size={14} />, url: SYNTHRA_POOL_URL },
]

// ── Live PANTE balance in tab bar ─────────────────────────────────────────
function BalanceBadge() {
  const { address, isConnected } = useAccount()
  const { data: balRaw } = useReadContract({
    address: PANTE_ADDRESS, abi: PANTE_ERC20_ABI,
    functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: PANTE_CHAIN_ID, query: { enabled: !!address },
  })
  if (!isConnected || balRaw == null) return null
  const bal = (Number(balRaw) / 10 ** PANTE_DECIMALS).toLocaleString(undefined, { maximumFractionDigits: 2 })
  return (
    <span className="pante-dex-balance-badge">
      <img src={PANTE_LOGO} alt="PANTE" className="pante-badge-logo" />
      {bal} PANTE
    </span>
  )
}

// ── Synthra iframe — fullscreen, wallet bridge via postMessage ────────────
function SynthraFrame({ tab }: { tab: Tab }) {
  const { address, isConnected } = useAccount()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const activeTab = TABS.find(t => t.id === tab)!

  // Bridge wallet state to Synthra iframe via postMessage
  // Synthra listens for EIP-1193 compatible events
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return
    const msg = isConnected && address
      ? { type: 'WALLET_CONNECTED', address, chainId: PANTE_CHAIN_ID }
      : { type: 'WALLET_DISCONNECTED' }
    try {
      iframe.contentWindow.postMessage(msg, 'https://app.synthra.org')
    } catch {
      // cross-origin postMessage may be blocked depending on Synthra CSP
    }
  }, [isConnected, address])

  return (
    <div className="pante-dex-fullframe-wrap">
      <div className="pante-dex-frame-bar">
        <span className="pante-dex-frame-url">
          <span className="pante-dex-frame-dot" />
          app.synthra.org
        </span>
        <BalanceBadge />
        <a
          href={activeTab.url}
          target="_blank"
          rel="noopener"
          className="pante-dex-frame-open"
        >
          Open in Synthra <ExternalLink size={12} />
        </a>
      </div>
      <iframe
        ref={iframeRef}
        key={tab}
        src={activeTab.url}
        title={`Synthra — ${activeTab.label}`}
        className="pante-dex-fullframe"
        allow="clipboard-write; clipboard-read"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-modals"
      />
    </div>
  )
}

// ── Main DEX page ─────────────────────────────────────────────────────────
export function DexPage() {
  const [tab, setTab] = useState<Tab>('buy')

  return (
    <div className="pante-dex-fullpage">
      {/* Tab bar */}
      <div className="pante-dex-tabbar">
        <div className="pante-dex-tabbar-logo">
          <img src={PANTE_LOGO} alt="PANTE" className="pante-badge-logo" style={{ width: 22, height: 22 }} />
          <span>Pante DEX</span>
        </div>
        <div className="pante-dex-tabs" style={{ border: 'none', margin: 0, flex: 1, justifyContent: 'center' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`pante-tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="pante-dex-tabbar-right">
          <span style={{ fontSize: '0.78rem', color: 'var(--pante-muted)' }}>Arc Mainnet</span>
        </div>
      </div>

      {/* Full-screen Synthra iframe */}
      <SynthraFrame tab={tab} />
    </div>
  )
}
