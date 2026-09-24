import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  useAccount, useReadContract, useWriteContract,
  useWaitForTransactionReceipt, useSwitchChain,
} from 'wagmi'
import { erc20Abi, parseAbi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Lock, Clock } from 'lucide-react'
import { PanteFooter } from '../components/PanteFooter'
import {
  resolvePanteAddress, resolvePresaleAddress,
  PANTE_TOKEN_ABI, PANTE_LOGO,
} from '../contracts/PanteToken'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor, parseAmount } from '@/onchain-money'

const CHAIN_ID = arcTestnet.id
const usdcFact  = getUsdc(CHAIN_ID)!

// ABI for the PantePresale.buy() + reads
const PRESALE_ABI = parseAbi([
  'function buy(uint256 usdcAmount) external',
  'function presaleActive() view returns (bool)',
  'function presaleEnded() view returns (bool)',
  'function totalRaised() view returns (uint256)',
  'function hardCapUsdc() view returns (uint256)',
  'function ratePerUsdc() view returns (uint256)',
])

// ── Scroll-reveal hook ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}
function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <section ref={ref} className={`pante-reveal${visible ? ' visible' : ''} ${className}`}>
      {children}
    </section>
  )
}

// ── Pre-launch placeholder ────────────────────────────────────────────────
function PreLaunchPresale() {
  return (
    <RevealSection className="pante-presale-section">
      <h2 className="pante-section-title">PANTE Presale</h2>
      <div className="pante-prelaunch-card">
        <img src={PANTE_LOGO} alt="PANTE Token" className="pante-prelaunch-logo" />
        <div className="pante-prelaunch-badge">
          <Lock size={14} /> Token Not Yet Launched
        </div>
        <h3>Presale Opening Soon</h3>
        <p>
          The PANTE token contract has not been deployed yet. The presale will open
          automatically once the dev launches the contract. Stay tuned — follow our
          socials for the announcement.
        </p>
        <div className="pante-prelaunch-links">
          <a href="https://x.com/pante_coin" target="_blank" rel="noopener" className="pante-dex-btn pante-dex-btn--secondary">
            Follow on X
          </a>
          <a href="https://github.com/nheoshikuyanhemo/Pante" target="_blank" rel="noopener" className="pante-dex-btn pante-dex-btn--secondary">
            GitHub
          </a>
        </div>
      </div>
    </RevealSection>
  )
}

// ── Active presale (contract deployed + presale started) ──────────────────
function ActivePresale({
  panteAddr,
  presaleAddr,
}: {
  panteAddr: `0x${string}`
  presaleAddr: `0x${string}`
}) {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [usdcAmount, setUsdcAmount] = useState('')
  const wrongChain = isConnected && walletChainId !== CHAIN_ID

  // Presale reads
  const { data: active }      = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'presaleActive', chainId: CHAIN_ID })
  const { data: ended }       = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'presaleEnded',  chainId: CHAIN_ID })
  const { data: totalRaised } = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'totalRaised',   chainId: CHAIN_ID })
  const { data: hardCap }     = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'hardCapUsdc',   chainId: CHAIN_ID })
  const { data: ratePerUsdc } = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'ratePerUsdc',   chainId: CHAIN_ID })

  // Token supply
  const { data: totalSupply } = useReadContract({
    address: panteAddr, abi: PANTE_TOKEN_ABI, functionName: 'totalSupply', chainId: CHAIN_ID,
  })
  // ContractURI for on-chain logo
  const { data: contractUri } = useReadContract({
    address: panteAddr,
    abi: parseAbi(['function contractURI() view returns (string)']),
    functionName: 'contractURI', chainId: CHAIN_ID,
  })
  // USDC balance
  const { data: rawBal } = useReadContract({
    address: usdcFact.address as `0x${string}`, abi: erc20Abi,
    functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: CHAIN_ID, query: { enabled: !!address },
  })

  // Derive display values
  const rate         = ratePerUsdc != null ? Number(ratePerUsdc) / 1e12 : 1000
  const panteOut     = usdcAmount ? (parseFloat(usdcAmount) * rate).toLocaleString() : '0'
  const formattedBal = rawBal != null
    ? Amount.fromRaw(rawBal, usdcDecimalsFor(CHAIN_ID)).toFixed(2) : '0.00'
  const raisedPct    = (totalRaised != null && hardCap != null && Number(hardCap) > 0)
    ? Math.min(100, (Number(totalRaised) / Number(hardCap)) * 100) : 0
  const supplyFmt    = totalSupply
    ? (Number(totalSupply) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '...'

  // Resolve token image: prefer on-chain contractURI JSON → else GitHub logo
  const [tokenImg, setTokenImg] = useState<string>(PANTE_LOGO)
  useEffect(() => {
    if (!contractUri) return
    if (contractUri.startsWith('ipfs://')) {
      const cid = contractUri.slice(7)
      const gateway = `https://ipfs.io/ipfs/${cid}`
      fetch(gateway)
        .then(r => r.json())
        .then((meta: { image?: string }) => {
          if (meta.image?.startsWith('ipfs://')) {
            setTokenImg(`https://ipfs.io/ipfs/${meta.image.slice(7)}`)
          } else if (meta.image) {
            setTokenImg(meta.image)
          }
        })
        .catch(() => {/* keep GitHub logo */})
    }
  }, [contractUri])

  // Step 1: approve USDC to presale contract
  // Step 2: call buy(usdcAmount)
  const [step, setStep] = useState<'approve' | 'buy'>('approve')
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  const isValidAmount = parseFloat(usdcAmount) >= 0.1
  const canAct = isConnected && !wrongChain && isValidAmount && !isPending && !isConfirming

  const handleApprove = useCallback(() => {
    if (!canAct) return
    let parsed: bigint
    try { parsed = parseAmount(CHAIN_ID, usdcAmount).raw } catch { return }
    writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [presaleAddr, parsed],
      chainId: CHAIN_ID,
    })
  }, [canAct, usdcAmount, presaleAddr, writeContract])

  const handleBuy = useCallback(() => {
    if (!canAct) return
    let parsed: bigint
    try { parsed = parseAmount(CHAIN_ID, usdcAmount).raw } catch { return }
    writeContract({
      address: presaleAddr,
      abi: PRESALE_ABI,
      functionName: 'buy',
      args: [parsed],
      chainId: CHAIN_ID,
    })
  }, [canAct, usdcAmount, presaleAddr, writeContract])

  // Derive effective step from tx state — no setState-in-effect needed
  const effectiveStep: 'approve' | 'buy' | 'done' =
    step === 'approve' && isSuccess ? 'buy'
    : step === 'buy'   && isSuccess ? 'done'
    : step

  const handleReset = () => { reset(); setUsdcAmount(''); setStep('approve') }

  if (ended) {
    return (
      <RevealSection className="pante-presale-section">
        <h2 className="pante-section-title">PANTE Presale</h2>
        <div className="pante-prelaunch-card">
          <img src={tokenImg} alt="PANTE" className="pante-prelaunch-logo" />
          <div className="pante-prelaunch-badge ok"><CheckCircle size={14} /> Presale Ended</div>
          <h3>Thank you for participating!</h3>
          <p>The presale has ended. Check the DEX for trading once liquidity is seeded.</p>
          <Link to="/dex" className="pante-dex-btn" style={{ marginTop: '1rem', display: 'inline-block' }}>Go to DEX</Link>
        </div>
      </RevealSection>
    )
  }

  if (!active) {
    return (
      <RevealSection className="pante-presale-section">
        <h2 className="pante-section-title">PANTE Presale</h2>
        <div className="pante-prelaunch-card">
          <img src={tokenImg} alt="PANTE" className="pante-prelaunch-logo" />
          <div className="pante-prelaunch-badge">
            <Clock size={14} /> Presale Not Started Yet
          </div>
          <h3>Token Deployed — Presale Opening Soon</h3>
          <p>The PANTE token is live on Arc Testnet. The presale starts soon — follow socials for updates.</p>
          <div className="pante-stat-card pante-stat-card--full" style={{ marginTop: '1rem' }}>
            <span className="pante-stat-label">Contract</span>
            <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-stat-addr">
              {panteAddr.slice(0, 10)}…{panteAddr.slice(-8)} <ExternalLink size={11} style={{ display: 'inline' }} />
            </a>
          </div>
        </div>
      </RevealSection>
    )
  }

  return (
    <RevealSection className="pante-presale-section">
      <h2 className="pante-section-title">PANTE Presale</h2>
      <p className="pante-section-desc">Buy $PANTE early at the best rate. 1 USDC = {rate.toLocaleString()} PANTE.</p>

      <div className="pante-presale-grid">
        {/* Stats */}
        <div className="pante-presale-stats">
          <div className="pante-presale-logo-wrap">
            <img src={tokenImg} alt="PANTE Token Logo" className="pante-token-logo" />
          </div>
          <div className="pante-stat-card">
            <span className="pante-stat-label">Token</span>
            <span className="pante-stat-value">PANTE</span>
          </div>
          <div className="pante-stat-card">
            <span className="pante-stat-label">Rate</span>
            <span className="pante-stat-value">1 USDC = {rate.toLocaleString()} PANTE</span>
          </div>
          <div className="pante-stat-card">
            <span className="pante-stat-label">Total Supply</span>
            <span className="pante-stat-value">{supplyFmt}</span>
          </div>
          <div className="pante-stat-card">
            <span className="pante-stat-label">Raised</span>
            <span className="pante-stat-value">
              {totalRaised != null ? (Number(totalRaised) / 1e6).toFixed(2) : '—'} /
              {hardCap     != null ? (Number(hardCap)     / 1e6).toFixed(0) : '—'} USDC
            </span>
          </div>
          {/* Progress bar */}
          <div className="pante-stat-card pante-stat-card--full">
            <span className="pante-stat-label">Progress</span>
            <div className="pante-progress-bar">
              <div className="pante-progress-fill" style={{ width: `${raisedPct}%` }} />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--pante-muted)' }}>{raisedPct.toFixed(1)}% filled</span>
          </div>
          <div className="pante-stat-card pante-stat-card--full">
            <span className="pante-stat-label">Contract</span>
            <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-stat-addr">
              {panteAddr.slice(0, 10)}…{panteAddr.slice(-8)}
              <ExternalLink size={11} style={{ marginLeft: 4, display: 'inline' }} />
            </a>
          </div>
        </div>

        {/* Buy form */}
        <div className="pante-presale-form">
          {effectiveStep === 'done' ? (
            <div className="pante-presale-success">
              <CheckCircle size={40} className="pante-success-icon" />
              <h3>PANTE Purchased!</h3>
              <p>You bought ~{panteOut} PANTE for {usdcAmount} USDC.</p>
              {txUrl && (
                <a href={txUrl} target="_blank" rel="noopener" className="pante-explorer-link">
                  View on ArcScan <ExternalLink size={13} />
                </a>
              )}
              <button className="pante-dex-btn" onClick={handleReset}>Buy More</button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="pante-presale-steps">
                <span className={`pante-step${effectiveStep === 'approve' ? ' active' : ' done'}`}>1. Approve USDC</span>
                <span className="pante-step-arrow">→</span>
                <span className={`pante-step${effectiveStep === 'buy' ? ' active' : ''}`}>2. Buy PANTE</span>
              </div>

              <div className="pante-swap-input">
                <label>You Pay (USDC)</label>
                <div className="pante-input-row">
                  <input
                    inputMode="decimal" type="text" value={usdcAmount}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setUsdcAmount(v) }}
                    placeholder="0.00"
                  />
                  <span className="pante-input-badge">USDC</span>
                </div>
                {isConnected && (
                  <div className="pante-input-balance">
                    Balance: {formattedBal} USDC
                    <button className="pante-max-btn" onClick={() => rawBal != null && setUsdcAmount(Amount.fromRaw(rawBal, usdcDecimalsFor(CHAIN_ID)).toFixed(6))}>MAX</button>
                  </div>
                )}
              </div>

              <div className="pante-swap-arrow">↓</div>

              <div className="pante-swap-input">
                <label>You Receive (PANTE)</label>
                <div className="pante-input-row">
                  <input type="text" value={panteOut} readOnly />
                  <span className="pante-input-badge">
                    <img src={tokenImg} alt="PANTE" style={{ width: 16, height: 16, borderRadius: '50%', marginRight: 4, verticalAlign: 'middle' }} />
                    PANTE
                  </span>
                </div>
              </div>

              {writeError && (
                <div className="pante-error-row">
                  <AlertCircle size={15} />
                  {writeError.message?.includes('user rejected') ? 'Transaction cancelled.' : 'Transaction failed. Check balance.'}
                </div>
              )}

              {wrongChain ? (
                <button className="pante-dex-btn" onClick={() => switchChain({ chainId: CHAIN_ID })} disabled={isSwitching}>
                  {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
                </button>
              ) : effectiveStep === 'approve' ? (
                <button className="pante-dex-btn" onClick={handleApprove} disabled={!canAct}>
                  {!isConnected ? 'Connect Wallet' :
                   isPending    ? <><Loader2 size={15} className="pante-spin" /> Confirm in wallet…</> :
                   isConfirming ? <><Loader2 size={15} className="pante-spin" /> Approving…</> :
                   'Step 1: Approve USDC'}
                </button>
              ) : (
                <button className="pante-dex-btn" onClick={handleBuy} disabled={!canAct}>
                  {isPending    ? <><Loader2 size={15} className="pante-spin" /> Confirm in wallet…</> :
                   isConfirming ? <><Loader2 size={15} className="pante-spin" /> Buying…</> :
                   'Step 2: Buy PANTE'}
                </button>
              )}

              <p className="pante-presale-note">
                Minimum 0.1 USDC. Get test USDC via "Get test USDC" in the sidebar.
              </p>
            </>
          )}
        </div>
      </div>
    </RevealSection>
  )
}

// ── Presale router — decides which component to show ─────────────────────
function PresaleSection() {
  const [panteAddr]   = useState(() => resolvePanteAddress())
  const [presaleAddr] = useState(() => resolvePresaleAddress())

  // If PanteToken not deployed → pre-launch
  if (!panteAddr) return <PreLaunchPresale />

  // Token deployed but no presale contract yet → token live, presale pending
  if (!presaleAddr) {
    return (
      <RevealSection className="pante-presale-section">
        <h2 className="pante-section-title">PANTE Presale</h2>
        <div className="pante-prelaunch-card">
          <img src={PANTE_LOGO} alt="PANTE" className="pante-prelaunch-logo" />
          <div className="pante-prelaunch-badge"><Clock size={14} /> Presale Contract Deploying</div>
          <h3>Token Is Live — Presale Coming Soon</h3>
          <p>PANTE token is deployed. The presale contract is being set up. Stay tuned.</p>
          <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-explorer-link" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
            View token contract <ExternalLink size={12} style={{ marginLeft: 4 }} />
          </a>
        </div>
      </RevealSection>
    )
  }

  return <ActivePresale panteAddr={panteAddr} presaleAddr={presaleAddr} />
}

// ── Main HomePage ─────────────────────────────────────────────────────────
export function HomePage() {
  const panteAddr = resolvePanteAddress()

  return (
    <div className="pante-page">
      {/* HERO */}
      <RevealSection className="pante-hero">
        <img
          src="https://raw.githubusercontent.com/nheoshikuyanhemo/Pante/main/html/assets/banner.png"
          alt="Pante Banner" className="pante-hero-banner"
        />
        <h1>Pante: Meme with Utility &amp; Sustainable Development</h1>
        <p>Explore the future of memes — designed for utility, growth, and community-driven development.</p>
        <div className="pante-hero-ctas">
          <Link to="/dex" className="pante-dex-btn">Launch DEX</Link>
          <Link to="/presale" className="pante-dex-btn pante-dex-btn--secondary">Join Presale</Link>
        </div>
      </RevealSection>

      {/* VISION */}
      <RevealSection className="pante-vision">
        <h2 className="pante-section-title">Our Vision</h2>
        <p>
          Pante is not just a meme — it is the evolution of meme tokens. We merge meme culture with
          real DeFi utility: a decentralized exchange, liquidity mining, and staking rewards — all
          running natively on Arc Testnet with USDC as gas.
        </p>
      </RevealSection>

      {/* FEATURES */}
      <RevealSection className="pante-features">
        <h2 className="pante-section-title">Core Features</h2>
        <div className="pante-feature-grid">
          {[
            { title: 'Decentralized Exchange', desc: 'Swap PANTE & USDC effortlessly on our DEX with low fees on Arc Testnet.' },
            { title: 'Liquidity Mining',       desc: 'Earn rewards by providing liquidity to our pools.' },
            { title: 'Staking',                desc: 'Stake your $PANTE tokens and earn passive income via the onchain staking module.' },
            { title: 'Governance',             desc: 'Token holders vote on protocol upgrades and treasury decisions.' },
          ].map(({ title, desc }) => (
            <div key={title} className="pante-feature-card">
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* PRESALE — smart gating */}
      <PresaleSection />

      {/* ECOSYSTEM */}
      <RevealSection className="pante-ecosystem">
        <h2 className="pante-section-title">Ecosystem</h2>
        <ul className="pante-eco-list">
          <li>PanteSwap — AMM decentralized exchange</li>
          <li>PanteStake — flexible &amp; locked staking pools</li>
          <li>PanteBridge — cross-chain liquidity bridge</li>
          <li>PanteDAO — community governance</li>
          <li>PANTE Token —&nbsp;
            {panteAddr
              ? <a href={`https://explorer.testnet.arc.io/address/${panteAddr}`} target="_blank" rel="noopener" className="pante-inline-link">deployed on Arc Testnet</a>
              : <span className="pante-inline-muted">launching soon</span>
            }
          </li>
        </ul>
      </RevealSection>

      <PanteFooter />
    </div>
  )
}
