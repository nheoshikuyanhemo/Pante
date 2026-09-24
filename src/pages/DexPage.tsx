import { useState, useCallback, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi, parseAbi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { Loader2, CheckCircle, AlertCircle, ExternalLink, ArrowUpDown, Lock } from 'lucide-react'
import { PanteFooter } from '../components/PanteFooter'
import { resolvePanteAddress, PANTE_TOKEN_ABI, PANTE_LOGO } from '../contracts/PanteToken'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { parseAmount } from '@/onchain-money'

const CHAIN_ID = arcTestnet.id
const usdcFact  = getUsdc(CHAIN_ID)!

type TabId = 'swap' | 'send' | 'stake'

function parseErr(e: Error | null): string {
  if (!e) return ''
  const m = e.message?.toLowerCase() ?? ''
  if (m.includes('user rejected') || m.includes('user denied')) return 'Transaction cancelled.'
  if (m.includes('insufficient')) return 'Insufficient balance.'
  if (m.includes('reverted')) return 'Transaction reverted.'
  return 'Something went wrong. Please retry.'
}

// ── Pre-launch gate ───────────────────────────────────────────────────────
function DexPreLaunch() {
  return (
    <div className="pante-page">
      <section className="pante-hero pante-reveal visible">
        <img
          src="/pante-banner.svg"
          alt="Pante DEX Banner" className="pante-hero-banner"
        />
        <h1>DEX Platform</h1>
        <p>Swap PANTE &amp; USDC with low fees on Arc Testnet.</p>
      </section>
      <section className="pante-dex-section pante-reveal visible">
        <div className="pante-prelaunch-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <img src={PANTE_LOGO} alt="PANTE" className="pante-prelaunch-logo" />
          <div className="pante-prelaunch-badge"><Lock size={14} /> Token Not Yet Launched</div>
          <h3>DEX Opens After Token Launch</h3>
          <p>
            The PANTE token has not been deployed yet. Once the dev launches the token
            from the Dev Console, the DEX will be available for swapping automatically.
          </p>
          <a href="https://x.com/pante_coin" target="_blank" rel="noopener" className="pante-dex-btn pante-dex-btn--secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Follow for launch announcement
          </a>
        </div>
      </section>
      <PanteFooter />
    </div>
  )
}

// ── Token logo resolved from contractURI or GitHub fallback ───────────────
function useTokenLogo(panteAddr: `0x${string}`): string {
  const [img, setImg] = useState(PANTE_LOGO)
  const { data: contractUri } = useReadContract({
    address: panteAddr,
    abi: parseAbi(['function contractURI() view returns (string)']),
    functionName: 'contractURI', chainId: CHAIN_ID,
  })
  useEffect(() => {
    if (!contractUri) return
    if (contractUri.startsWith('ipfs://')) {
      const cid = contractUri.slice(7)
      fetch(`https://ipfs.io/ipfs/${cid}`)
        .then(r => r.json())
        .then((m: { image?: string }) => {
          if (m.image?.startsWith('ipfs://')) setImg(`https://ipfs.io/ipfs/${m.image.slice(7)}`)
          else if (m.image) setImg(m.image)
        })
        .catch(() => {/* keep fallback */})
    }
  }, [contractUri])
  return img
}

// ── Swap Panel ─────────────────────────────────────────────────────────────
function SwapPanel({ panteAddr }: { panteAddr: `0x${string}` }) {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const wrongChain = isConnected && walletChainId !== CHAIN_ID
  const tokenImg = useTokenLogo(panteAddr)

  const TOKENS = [
    { symbol: 'USDC',  address: usdcFact.address as `0x${string}`, decimals: 6,  img: '' },
    { symbol: 'PANTE', address: panteAddr,                          decimals: 18, img: tokenImg },
  ]

  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(1)
  const [amount, setAmount] = useState('')
  const fromToken = TOKENS[fromIdx]
  const toToken   = TOKENS[toIdx]

  const { data: rawBal } = useReadContract({
    address: fromToken.address, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address },
  })
  const formattedBal = rawBal != null
    ? (Number(rawBal) / 10 ** fromToken.decimals).toFixed(fromToken.decimals === 6 ? 2 : 4) : '0.00'

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  const canSwap = isConnected && !wrongChain && parseFloat(amount) > 0 && !isPending && !isConfirming

  const handleSwap = () => {
    if (!canSwap || !address) return
    if (fromToken.symbol === 'PANTE') {
      alert('PANTE → USDC requires an AMM pool. Deploy liquidity first from /dev.')
      return
    }
    let parsed: bigint
    try { parsed = parseAmount(CHAIN_ID, amount).raw } catch { return }
    writeContract({ address: fromToken.address, abi: erc20Abi, functionName: 'transfer', args: [panteAddr, parsed], chainId: CHAIN_ID })
  }

  const flipTokens = () => { setFromIdx(toIdx); setToIdx(fromIdx); setAmount(''); reset() }
  const outAmount  = amount
    ? fromToken.symbol === 'USDC' ? (parseFloat(amount) * 1000).toLocaleString() : (parseFloat(amount) / 1000).toFixed(6)
    : '0'

  const tokenBadge = (tok: { symbol: string; img: string }) => (
    <span className="pante-input-badge pante-token-badge">
      {tok.img && <img src={tok.img} alt={tok.symbol} className="pante-badge-logo" />}
      {tok.symbol}
    </span>
  )

  return (
    <div className="pante-dex-card">
      <div className="pante-dex-card-header">
        <span>Swap</span>
        <span className="pante-pair-badge">
          {fromToken.img && <img src={fromToken.img} alt={fromToken.symbol} className="pante-pair-logo" />}
          {fromToken.symbol}/{toToken.symbol}
        </span>
      </div>

      {isSuccess ? (
        <div className="pante-swap-success">
          <CheckCircle size={36} className="pante-success-icon" />
          <h3>Swap Sent!</h3>
          <p>{amount} {fromToken.symbol} → {outAmount} {toToken.symbol}</p>
          {txUrl && <a href={txUrl} target="_blank" rel="noopener" className="pante-explorer-link">View on ArcScan <ExternalLink size={12} /></a>}
          <button className="pante-dex-btn" onClick={() => { reset(); setAmount('') }}>Swap Again</button>
        </div>
      ) : (
        <div className="pante-swap-body">
          <div className="pante-swap-input">
            <label>From</label>
            <div className="pante-input-row">
              <input inputMode="decimal" value={amount}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v) }}
                placeholder="0.00"
              />
              <select className="pante-token-select" value={fromIdx} onChange={(e) => { setFromIdx(Number(e.target.value)); setAmount('') }}>
                {TOKENS.map((t, i) => <option key={t.symbol} value={i}>{t.symbol}</option>)}
              </select>
            </div>
            {isConnected && (
              <div className="pante-input-balance">
                Balance: {formattedBal} {fromToken.symbol}
                <button className="pante-max-btn" onClick={() => rawBal != null && setAmount((Number(rawBal) / 10 ** fromToken.decimals).toFixed(6))}>MAX</button>
              </div>
            )}
          </div>

          <button className="pante-swap-flip" onClick={flipTokens} title="Flip tokens"><ArrowUpDown size={16} /></button>

          <div className="pante-swap-input">
            <label>To (estimated)</label>
            <div className="pante-input-row">
              <input type="text" value={outAmount} readOnly placeholder="0.00" />
              {tokenBadge(TOKENS[toIdx])}
            </div>
          </div>

          <div className="pante-swap-rate">Rate: 1 USDC = 1,000 PANTE</div>

          {writeError && <div className="pante-error-row"><AlertCircle size={14} />{parseErr(writeError)}</div>}

          {wrongChain
            ? <button className="pante-dex-btn" onClick={() => switchChain({ chainId: CHAIN_ID })} disabled={isSwitching}>{isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}</button>
            : <button className="pante-dex-btn" disabled={!canSwap} onClick={handleSwap}>
                {!isConnected ? 'Connect Wallet' :
                 isPending    ? <><Loader2 size={14} className="pante-spin" /> Confirm in wallet…</> :
                 isConfirming ? <><Loader2 size={14} className="pante-spin" /> Confirming…</> :
                 `Swap ${fromToken.symbol} → ${toToken.symbol}`}
              </button>
          }
        </div>
      )}
    </div>
  )
}

// ── Send Panel ─────────────────────────────────────────────────────────────
function SendPanel({ panteAddr }: { panteAddr: `0x${string}` }) {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const wrongChain = isConnected && walletChainId !== CHAIN_ID
  const tokenImg = useTokenLogo(panteAddr)

  const TOKENS = [
    { symbol: 'USDC',  address: usdcFact.address as `0x${string}`, decimals: 6  },
    { symbol: 'PANTE', address: panteAddr,                          decimals: 18 },
  ]
  const [tokenIdx, setTokenIdx] = useState(0)
  const [amount, setAmount]     = useState('')
  const [recipient, setRecipient] = useState('')
  const token = TOKENS[tokenIdx]

  const { data: rawBal } = useReadContract({
    address: token.address, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address },
  })
  const formattedBal = rawBal != null
    ? (Number(rawBal) / 10 ** token.decimals).toFixed(token.decimals === 6 ? 2 : 4) : '0.00'

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined
  const isValidAddr = recipient.startsWith('0x') && recipient.length === 42
  const canSend = isConnected && !wrongChain && parseFloat(amount) > 0 && isValidAddr && !isPending && !isConfirming

  const handleSend = useCallback(() => {
    if (!canSend) return
    const raw = BigInt(Math.round(parseFloat(amount) * 10 ** token.decimals))
    if (token.symbol === 'USDC') {
      try { const p = parseAmount(CHAIN_ID, amount).raw; writeContract({ address: token.address, abi: erc20Abi, functionName: 'transfer', args: [recipient as `0x${string}`, p], chainId: CHAIN_ID }) } catch { return }
    } else {
      writeContract({ address: token.address, abi: PANTE_TOKEN_ABI, functionName: 'transfer', args: [recipient as `0x${string}`, raw], chainId: CHAIN_ID })
    }
  }, [canSend, amount, recipient, token, writeContract])

  const logoBadge = (sym: string) => (
    <span className="pante-input-badge pante-token-badge">
      {sym === 'PANTE' && <img src={tokenImg} alt="PANTE" className="pante-badge-logo" />}
      {sym}
    </span>
  )

  return (
    <div className="pante-dex-card">
      <div className="pante-dex-card-header"><span>Send Tokens</span></div>
      {isSuccess ? (
        <div className="pante-swap-success">
          <CheckCircle size={36} className="pante-success-icon" />
          <h3>Sent!</h3>
          <p>{amount} {token.symbol} transferred.</p>
          {txUrl && <a href={txUrl} target="_blank" rel="noopener" className="pante-explorer-link">View on ArcScan <ExternalLink size={12} /></a>}
          <button className="pante-dex-btn" onClick={() => { reset(); setAmount(''); setRecipient('') }}>Send Again</button>
        </div>
      ) : (
        <div className="pante-swap-body">
          <div className="pante-swap-input">
            <label>Token</label>
            <div className="pante-input-row">
              <select className="pante-token-select pante-token-select--full" value={tokenIdx} onChange={(e) => { setTokenIdx(Number(e.target.value)); setAmount('') }}>
                {TOKENS.map((t, i) => <option key={t.symbol} value={i}>{t.symbol}</option>)}
              </select>
            </div>
          </div>
          <div className="pante-swap-input">
            <label>Amount</label>
            <div className="pante-input-row">
              <input inputMode="decimal" value={amount} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v) }} placeholder="0.00" />
              {logoBadge(token.symbol)}
            </div>
            {isConnected && <div className="pante-input-balance">Balance: {formattedBal} {token.symbol} <button className="pante-max-btn" onClick={() => rawBal != null && setAmount((Number(rawBal) / 10 ** token.decimals).toFixed(6))}>MAX</button></div>}
          </div>
          <div className="pante-swap-input">
            <label>Recipient</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x..." className="pante-mono-input" spellCheck={false} />
          </div>
          {writeError && <div className="pante-error-row"><AlertCircle size={14} />{parseErr(writeError)}</div>}
          {wrongChain
            ? <button className="pante-dex-btn" onClick={() => switchChain({ chainId: CHAIN_ID })} disabled={isSwitching}>{isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}</button>
            : <button className="pante-dex-btn" disabled={!canSend} onClick={handleSend}>
                {!isConnected ? 'Connect Wallet' : isPending ? <><Loader2 size={14} className="pante-spin" /> Confirm…</> : isConfirming ? <><Loader2 size={14} className="pante-spin" /> Confirming…</> : `Send ${token.symbol}`}
              </button>
          }
        </div>
      )}
    </div>
  )
}

// ── Stake Info Panel ───────────────────────────────────────────────────────
function StakePanel({ panteAddr }: { panteAddr: `0x${string}` }) {
  const { address, isConnected } = useAccount()
  const tokenImg = useTokenLogo(panteAddr)
  const { data: balance } = useReadContract({
    address: panteAddr, abi: PANTE_TOKEN_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address },
  })
  const panteBalance = balance != null ? (Number(balance) / 1e18).toFixed(4) : '0.0000'

  return (
    <div className="pante-dex-card">
      <div className="pante-dex-card-header">
        <span>Staking</span>
        {tokenImg && <img src={tokenImg} alt="PANTE" className="pante-pair-logo" />}
      </div>
      <div className="pante-stake-info">
        <div className="pante-stat-card">
          <span className="pante-stat-label">Your PANTE</span>
          <span className="pante-stat-value">{isConnected ? panteBalance : '—'}</span>
        </div>
        <div className="pante-stat-card">
          <span className="pante-stat-label">Est. APY</span>
          <span className="pante-stat-value" style={{ color: '#00ff88' }}>Coming Soon</span>
        </div>
      </div>
      <div className="pante-coming-soon">
        <div className="pante-cs-icon">🔒</div>
        <h3>Staking Pool — Coming Soon</h3>
        <p>The onchain staking module activates after the presale. Stake PANTE to earn rewards automatically.</p>
        <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-explorer-link">
          View PANTE Contract <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

// ── Main DEX Page ──────────────────────────────────────────────────────────
export function DexPage() {
  const [panteAddr] = useState(() => resolvePanteAddress())
  const [tab, setTab] = useState<TabId>('swap')
  const tokenImg = panteAddr ? useTokenLogo(panteAddr) : PANTE_LOGO // eslint-disable-line react-hooks/rules-of-hooks

  if (!panteAddr) return <DexPreLaunch />

  return (
    <div className="pante-page">
      {/* Hero */}
      <section className="pante-hero pante-reveal visible">
        <img
          src="/pante-banner.svg"
          alt="Pante DEX Banner" className="pante-hero-banner"
        />
        <h1>DEX Platform</h1>
        <p>Swap PANTE &amp; USDC with low fees on Arc Testnet.</p>
      </section>

      <section className="pante-dex-section pante-reveal visible">
        <h2 className="pante-section-title">Decentralized Exchange</h2>
        <p className="pante-section-desc">Swap tokens on the Pante DEX. Gas is paid in USDC — no ETH needed.</p>

        {/* Tabs */}
        <div className="pante-dex-tabs">
          {(['swap', 'send', 'stake'] as TabId[]).map((t) => (
            <button key={t} className={`pante-tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="pante-dex-panel">
          {tab === 'swap'  && <SwapPanel  panteAddr={panteAddr} />}
          {tab === 'send'  && <SendPanel  panteAddr={panteAddr} />}
          {tab === 'stake' && <StakePanel panteAddr={panteAddr} />}

          {/* Sidebar */}
          <div className="pante-dex-sidebar">
            <div className="pante-dex-card">
              <div className="pante-dex-card-header"><span>Token Pairs</span></div>
              <ul className="pante-pair-list">
                <li className="pante-pair-item">
                  <span className="pante-pair-item-label">
                    <img src={tokenImg} alt="PANTE" className="pante-pair-logo" />
                    PANTE / USDC
                  </span>
                  <span className="pante-pair-rate">1000 PANTE / USDC</span>
                </li>
              </ul>
            </div>
            <div className="pante-dex-card" style={{ marginTop: '1rem' }}>
              <div className="pante-dex-card-header">
                <span>Contract Info</span>
                <img src={tokenImg} alt="PANTE" style={{ width: 20, height: 20, borderRadius: '50%' }} />
              </div>
              <div style={{ fontSize: '0.82rem', padding: '0.5rem 0' }}>
                <div className="pante-stat-label">PANTE Token</div>
                <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-stat-addr" style={{ display: 'block', marginTop: '0.25rem' }}>
                  {panteAddr.slice(0, 14)}…{panteAddr.slice(-8)} <ExternalLink size={10} style={{ display: 'inline' }} />
                </a>
                <div className="pante-stat-label" style={{ marginTop: '0.75rem' }}>Network</div>
                <div style={{ color: '#00ff88', marginTop: '0.2rem' }}>Arc Testnet</div>
                <div className="pante-stat-label" style={{ marginTop: '0.75rem' }}>Gas Token</div>
                <div style={{ color: '#f0f0ff', marginTop: '0.2rem' }}>USDC (native)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pante-faucet-hint">
          <strong>Need test USDC?</strong> Click "Get test USDC" in the Arc Studio sidebar. Gas on Arc is paid in USDC — no ETH needed.
        </div>
      </section>

      <PanteFooter />
    </div>
  )
}
