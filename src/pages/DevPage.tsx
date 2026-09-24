/**
 * DevPage — wallet-gated developer control panel.
 * Hidden from public nav. Access via /dev.
 * Only the authorised dev wallet (DEV_WALLET) can use this page.
 *
 * Panels:
 *  1. Deploy Contracts  — deploy PantePresale, PanteLiquidityMigrator, PanteVesting manually
 *  2. Fee Config        — set dev/liquidity fee BP and collector addresses on PanteToken
 *  3. Presale Control   — start presale, end presale, set vesting contract
 *  4. Vesting           — claim from presale, release to beneficiary
 *  5. Liquidity         — deposit + migrate to DEX
 *  6. Distribution      — summary of raised USDC, 80% direct, 20% vesting
 */

import { useState, useCallback } from 'react'
import {
  useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain,
  useReadContract,
} from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { parseAbi, parseUnits, erc20Abi } from 'viem'
import {
  Lock, Terminal, RefreshCw, CheckCircle, AlertCircle,
  Loader2, ExternalLink, ChevronDown, ChevronUp, Play, Square,
  Droplets, ArrowRight, Coins, Settings, Image, Upload, Globe,
} from 'lucide-react'
import { PANTE_LOGO, resolvePanteAddress } from '../contracts/PanteToken'
import { buildTxExplorerUrl, getUsdc } from '@/onchain-facts'
import { toast } from 'sonner'

const CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(CHAIN_ID)!
const USDC_ADDRESS = usdcFact.address as `0x${string}`

// ── Authorised dev wallet ─────────────────────────────────────────────────
const DEV_WALLET = '0xb50b87cca4fd3cc57bf253507abf09cede3072a1' as const

// ── Resolved token address (null before deploy) ───────────────────────────
function usePanteAddr(): `0x${string}` | null { return resolvePanteAddress() }

// ── PanteToken fee ABI (split-fee management) ────────────────────────────
const PANTE_FEE_ABI = parseAbi([
  'function devFeeBP() view returns (uint256)',
  'function liquidityFeeBP() view returns (uint256)',
  'function feeEnabled() view returns (bool)',
  'function feeCollector() view returns (address)',
  'function liquidityCollector() view returns (address)',
  'function setFeeEnabled(bool enabled) external',
  'function setDevFeeBP(uint256 devFeeBP_) external',
  'function setLiquidityFeeBP(uint256 liquidityFeeBP_) external',
  'function setFeeCollector(address feeCollector_) external',
  'function setLiquidityCollector(address liquidityCollector_) external',
])

// ── Liquidity Locker ABI ──────────────────────────────────────────────────
const LOCKER_ABI = parseAbi([
  'function lock(address token, uint256 amount, uint256 unlockTime) external returns (uint256)',
  'function withdraw(uint256 lockId, address to) external',
  'function lockCount() view returns (uint256)',
  'function timeLeft(uint256 lockId) view returns (uint256)',
  'function allLocks() view returns ((address token,uint256 amount,uint256 unlockTime,bool withdrawn)[])',
])

// ── ERC-7572 contractURI ABI ──────────────────────────────────────────────
const CONTRACT_URI_ABI = parseAbi([
  'function contractURI() view returns (string)',
  'function setContractURI(string uri) external',
])

// ── ABI fragments (as const so wagmi can narrow function names) ───────────
const PRESALE_ABI = parseAbi([
  'function startPresale(uint256 hardCapUsdc, uint256 ratePerUsdc) external',
  'function endPresale() external',
  'function setVestingContract(address vestingContract_) external',
  'function withdrawUsdc(address to) external',
  'function withdrawUnsoldPante(address to) external',
  'function buy(uint256 usdcAmount) external',
  'function pause() external',
  'function unpause() external',
  'function claimVesting() external',
  'function presaleActive() view returns (bool)',
  'function presaleEnded() view returns (bool)',
  'function totalRaised() view returns (uint256)',
  'function hardCapUsdc() view returns (uint256)',
  'function vestingAllocation() view returns (uint256)',
  'function vestingContract() view returns (address)',
])

const MIGRATOR_ABI = parseAbi([
  'function depositUsdc(uint256 amount) external',
  'function depositPante(uint256 amount) external',
  'function migrate(address dexRouter, uint256 minLpTokens) external',
  'function withdrawToken(address token, address to, uint256 amount) external',
  'function migrated() view returns (bool)',
  'function migratedUsdc() view returns (uint256)',
  'function migratedPante() view returns (uint256)',
])

const VESTING_ABI = parseAbi([
  'function initialize(address presaleContract_, uint256 vestingDuration_, uint256 cliffDuration_) external',
  'function claimFromPresale() external',
  'function release(address beneficiary) external',
  'function addBeneficiary(address account, uint256 shares) external',
  'function releasable(address beneficiary) view returns (uint256)',
  'function vestedAmount(address beneficiary) view returns (uint256)',
  'function totalAllocation() view returns (uint256)',
  'function claimed() view returns (bool)',
  'function vestingEnd() view returns (uint256)',
  'function cliffEnd() view returns (uint256)',
])

// ── Bytecodes — loaded from Foundry artifacts at runtime ─────────────────
// We use a dynamic import so the dev page doesn't blow up before forge build.
interface FoundryArtifact { bytecode: { object: string }; abi: unknown[] }
async function getArtifact(name: string): Promise<{ bytecode: `0x${string}`; abi: unknown[] }> {
  const mod = await import(`../../contracts/out/${name}.sol/${name}.json`) as { default: FoundryArtifact }
  return { bytecode: mod.default.bytecode.object as `0x${string}`, abi: mod.default.abi }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function TxRow({ label, hash, isLoading, isSuccess, error }: {
  label: string
  hash?: `0x${string}`
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}) {
  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined
  if (!hash && !isLoading && !error) return null
  return (
    <div className="dev-tx-row">
      <span className="dev-tx-label">{label}</span>
      {isLoading && <span className="dev-status pending"><Loader2 size={13} className="pante-spin" /> confirming…</span>}
      {isSuccess && txUrl && <a className="dev-status ok" href={txUrl} target="_blank" rel="noopener"><CheckCircle size={13} /> confirmed <ExternalLink size={11} /></a>}
      {error && <span className="dev-status err"><AlertCircle size={13} /> {error.message.slice(0, 80)}</span>}
    </div>
  )
}

function Accordion({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="dev-accordion">
      <button className="dev-accordion-hd" onClick={() => setOpen(o => !o)}>
        <span className="dev-accordion-icon">{icon}</span>
        <span>{title}</span>
        <span className="dev-accordion-chevron">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && <div className="dev-accordion-body">{children}</div>}
    </div>
  )
}

function DevInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="dev-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="dev-input"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}

// ── Stored contract addresses ──────────────────────────────────────────────
function useContractAddrs() {
  const KEY = 'pante_dev_contracts'
  const load = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string> } catch { return {} }
  }
  const [addrs, setAddrsState] = useState<Record<string, string>>(load)
  const set = (name: string, addr: string) => {
    const next = { ...addrs, [name]: addr }
    setAddrsState(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }
  return { addrs, set }
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 1 — Deploy Contracts
// ══════════════════════════════════════════════════════════════════════════
function DeployPanel({ addrs, setAddr }: { addrs: Record<string, string>; setAddr: (n: string, a: string) => void }) {
  const { address } = useAccount()
  const [deploying, setDeploying] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  const log_ = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 40))

  async function deployContract(name: string, constructorArgs: unknown[]) {
    if (!address) return
    setDeploying(name)
    log_(`Fetching ${name} artifact…`)
    try {
      const artifact = await getArtifact(name)
      log_(`Artifact loaded. Deploying ${name}…`)

      // Use wagmi's low-level deployContract via eth_sendTransaction
      const { createWalletClient, custom } = await import('viem')
      type EIP1193Provider = Parameters<typeof custom>[0]
      interface WindowWithEthereum { ethereum?: EIP1193Provider }
      const provider = (window as unknown as WindowWithEthereum).ethereum
      if (!provider) throw new Error('No wallet found')

      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(provider),
      })

      const { encodeDeployData } = await import('viem')
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: constructorArgs,
      })

      const hash = await walletClient.sendTransaction({
        account: address,
        data: deployData,
        value: 0n,
      })

      log_(`Tx sent: ${hash}. Waiting for receipt…`)

      const { createPublicClient, http } = await import('viem')
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const contractAddress = receipt.contractAddress!

      log_(`✅ ${name} deployed at ${contractAddress}`)
      setAddr(name, contractAddress)
      toast.success(`${name} deployed: ${contractAddress}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log_(`❌ Deploy failed: ${msg.slice(0, 120)}`)
      toast.error(`Deploy ${name} failed`)
    } finally {
      setDeploying(null)
    }
  }

  const contracts: { name: string; args: () => unknown[]; note: string; highlight?: boolean }[] = [
    {
      name: 'PanteToken',
      args: () => [
        1_000_000_000,         // initialSupply (1B whole tokens)
        address ?? DEV_WALLET, // feeCollector (dev wallet)
        address ?? DEV_WALLET, // liquidityCollector (same for testnet)
        address ?? DEV_WALLET, // stakingModuleAddr stub
      ],
      note: 'Constructor: (1B supply, feeCollector, liquidityCollector, stakingStub)',
      highlight: true,
    },
    {
      name: 'PantePresale',
      args: () => [USDC_ADDRESS, resolvePanteAddress() ?? '0x0000000000000000000000000000000000000000'],
      note: 'Constructor: (usdc, panteToken) — deploy PanteToken first',
    },
    {
      name: 'PanteLiquidityMigrator',
      args: () => [USDC_ADDRESS, resolvePanteAddress() ?? '0x0000000000000000000000000000000000000000'],
      note: 'Constructor: (usdc, panteToken)',
    },
    {
      name: 'PanteVesting',
      args: () => [resolvePanteAddress() ?? '0x0000000000000000000000000000000000000000'],
      note: 'Constructor: (panteToken) — deploy PanteToken first',
    },
    {
      name: 'PanteLiquidityLocker',
      args: () => [],
      note: 'Constructor: () — no args. Lock LP tokens here after migration.',
    },
  ]

  return (
    <div className="dev-panel">
      <div className="dev-panel-desc">
        Deploy smart contracts directly from your connected wallet. Each contract is compiled from
        the Foundry artifacts in <code>contracts/out/</code>. Run <code>forge build</code> first if
        you changed the Solidity source.
      </div>

      <div className="dev-deploy-grid">
        {contracts.map(({ name, args, note, highlight }) => {
          const addr = addrs[name]
          return (
            <div key={name} className={`dev-deploy-card${highlight ? ' highlight' : ''}`}>
              <div className="dev-deploy-name">{name}</div>
              <div className="dev-deploy-note">{note}</div>
              {addr && (
                <div className="dev-deploy-addr">
                  Deployed:&nbsp;
                  <a
                    href={`https://explorer.testnet.arc.io/address/${addr}`}
                    target="_blank" rel="noopener"
                    className="pante-explorer-link"
                  >
                    {addr.slice(0, 10)}…{addr.slice(-8)} <ExternalLink size={10} />
                  </a>
                </div>
              )}
              <button
                className="pante-dex-btn dev-deploy-btn"
                disabled={deploying === name}
                onClick={() => { void deployContract(name, args()) }}
              >
                {deploying === name
                  ? <><Loader2 size={13} className="pante-spin" /> Deploying…</>
                  : addr ? 'Re-deploy' : `Deploy ${name}`}
              </button>
            </div>
          )
        })}
      </div>

      {log.length > 0 && (
        <div className="dev-log">
          {log.map((l, i) => <div key={i} className="dev-log-line">{l}</div>)}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 2 — Presale Control
// ══════════════════════════════════════════════════════════════════════════
function PresalePanel({ addrs }: { addrs: Record<string, string> }) {
  const presaleAddr = (addrs['PantePresale'] ?? '') as `0x${string}`
  const { address } = useAccount()

  const [hardCap, setHardCap] = useState('10000')   // USDC
  const [rate, setRate] = useState('1000')           // PANTE per USDC
  const [vestAddr, setVestAddr] = useState(addrs['PanteVesting'] ?? '')
  const [withdrawTo, setWithdrawTo] = useState(address ?? '')

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Read presale state
  const { data: active, refetch: refetchActive } = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'presaleActive', chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })
  const { data: ended, refetch: refetchEnded }   = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'presaleEnded', chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })
  const { data: raised }                          = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'totalRaised', chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })
  const { data: cap }                             = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'hardCapUsdc', chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })

  const refetch = () => { void refetchActive(); void refetchEnded() }

  const call = useCallback((fn: string, args: unknown[]) => {
    if (!presaleAddr) { toast.error('Deploy PantePresale first'); return }
    reset()
    writeContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: fn as 'startPresale', args: args as [bigint, bigint], chainId: CHAIN_ID })
  }, [presaleAddr, writeContract, reset])

  if (isSuccess) refetch()

  if (!presaleAddr) return (
    <div className="dev-panel">
      <div className="dev-empty">Deploy PantePresale first from the Deploy panel.</div>
    </div>
  )

  const raisedFmt = raised != null ? (Number(raised) / 1e6).toFixed(2) : '—'
  const capFmt    = cap    != null ? (Number(cap)    / 1e6).toFixed(2) : '—'

  return (
    <div className="dev-panel">
      {/* Status */}
      <div className="dev-status-row">
        <div className="dev-badge">{presaleAddr.slice(0, 10)}…{presaleAddr.slice(-6)}</div>
        <div className={`dev-badge ${active ? 'ok' : ended ? 'ended' : 'idle'}`}>
          {active ? 'ACTIVE' : ended ? 'ENDED' : 'IDLE'}
        </div>
        <div className="dev-badge">Raised: {raisedFmt} / {capFmt} USDC</div>
      </div>

      {/* Start presale */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Play size={14} /> Start Presale</div>
        <div className="dev-field-row">
          <DevInput label="Hard Cap (USDC)" value={hardCap} onChange={setHardCap} placeholder="10000" />
          <DevInput label="Rate (PANTE per USDC)" value={rate} onChange={setRate} placeholder="1000" />
        </div>
        <div className="dev-hint">
          Rate is converted to PANTE wei per 1 USDC internally. 1000 PANTE/USDC → ratePerUsdc = 1000 × 10¹²
        </div>
        <button
          className="pante-dex-btn"
          disabled={isPending || isConfirming || !!active}
          onClick={() => call('startPresale', [
            BigInt(Math.round(parseFloat(hardCap) * 1e6)),
            BigInt(Math.round(parseFloat(rate))) * 1000000000000n,
          ])}
        >
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Start Presale'}
        </button>
      </div>

      {/* End presale */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Square size={14} /> End Presale</div>
        <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming || !active} onClick={() => call('endPresale', [])}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'End Presale'}
        </button>
      </div>

      {/* Set vesting contract */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><ArrowRight size={14} /> Set Vesting Contract</div>
        <DevInput label="Vesting Contract Address" value={vestAddr} onChange={setVestAddr} placeholder="0x…" />
        <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('setVestingContract', [vestAddr])}>
          Set Vesting Contract
        </button>
      </div>

      {/* Withdraw raised USDC */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Coins size={14} /> Withdraw Raised USDC</div>
        <DevInput label="Treasury Address" value={withdrawTo} onChange={setWithdrawTo} placeholder="0x…" />
        <div className="dev-field-row">
          <button className="pante-dex-btn" disabled={isPending || isConfirming || !ended} onClick={() => call('withdrawUsdc', [withdrawTo])}>
            Withdraw USDC
          </button>
          <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming || !ended} onClick={() => call('withdrawUnsoldPante', [withdrawTo])}>
            Withdraw Unsold PANTE
          </button>
        </div>
      </div>

      {/* Pause / Unpause */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Emergency Pause</div>
        <div className="dev-field-row">
          <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={() => call('pause', [])}>Pause</button>
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('unpause', [])}>Unpause</button>
        </div>
      </div>

      <TxRow label="Last tx" hash={hash} isLoading={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 3 — Vesting
// ══════════════════════════════════════════════════════════════════════════
function VestingPanel({ addrs }: { addrs: Record<string, string> }) {
  const vestAddr    = (addrs['PanteVesting']  ?? '') as `0x${string}`
  const presaleAddr = (addrs['PantePresale']  ?? '') as `0x${string}`
  const { address } = useAccount()

  const [vestDuration, setVestDuration] = useState('15552000')  // 6 months
  const [cliffDur,     setCliffDur]     = useState('2592000')   // 30 days
  const [beneficiary,  setBeneficiary]  = useState(address ?? '')
  const [benShares,    setBenShares]    = useState('100')

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: claimed }    = useReadContract({ address: vestAddr, abi: VESTING_ABI, functionName: 'claimed', chainId: CHAIN_ID, query: { enabled: !!vestAddr } })
  const { data: allocation } = useReadContract({ address: vestAddr, abi: VESTING_ABI, functionName: 'totalAllocation', chainId: CHAIN_ID, query: { enabled: !!vestAddr } })
  const { data: releasable } = useReadContract({ address: vestAddr, abi: VESTING_ABI, functionName: 'releasable', args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!vestAddr && !!address } })

  type VestFn = 'initialize' | 'claimFromPresale' | 'release' | 'addBeneficiary'
  const call = useCallback((fn: VestFn, args: readonly unknown[]) => {
    if (!vestAddr) { toast.error('Deploy PanteVesting first'); return }
    reset()
    // Args are validated by the caller; ABI is narrowed via VestFn.
    writeContract({ address: vestAddr, abi: VESTING_ABI, functionName: fn, args: args as never, chainId: CHAIN_ID })
  }, [vestAddr, writeContract, reset])

  if (!vestAddr) return <div className="dev-panel"><div className="dev-empty">Deploy PanteVesting first.</div></div>

  return (
    <div className="dev-panel">
      <div className="dev-status-row">
        <div className="dev-badge">{vestAddr.slice(0, 10)}…{vestAddr.slice(-6)}</div>
        <div className={`dev-badge ${claimed ? 'ok' : 'idle'}`}>{claimed ? 'CLAIMED' : 'AWAITING'}</div>
        {allocation != null && <div className="dev-badge">Allocation: {(Number(allocation) / 1e18).toFixed(0)} PANTE</div>}
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Initialize Vesting</div>
        <div className="dev-field-row">
          <DevInput label="Presale Contract" value={presaleAddr} onChange={() => {}} placeholder="0x… (auto from Deploy panel)" />
          <DevInput label="Vesting Duration (sec)" value={vestDuration} onChange={setVestDuration} placeholder="15552000" />
          <DevInput label="Cliff Duration (sec)"   value={cliffDur}     onChange={setCliffDur}     placeholder="2592000" />
        </div>
        <div className="dev-hint">Default: 6 months vesting, 30-day cliff.</div>
        <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('initialize', [presaleAddr, BigInt(vestDuration), BigInt(cliffDur)])}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Initialize'}
        </button>
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Add Beneficiary</div>
        <div className="dev-field-row">
          <DevInput label="Address" value={beneficiary} onChange={setBeneficiary} placeholder="0x…" />
          <DevInput label="Shares"  value={benShares} onChange={setBenShares} placeholder="100" />
        </div>
        <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={() => call('addBeneficiary', [beneficiary, BigInt(benShares)])}>
          Add Beneficiary
        </button>
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Claim 20% Allocation from Presale</div>
        <div className="dev-hint">Can only be called once, after presale ends and vestingContract is set.</div>
        <button className="pante-dex-btn" disabled={isPending || isConfirming || !!claimed} onClick={() => call('claimFromPresale', [])}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Claim from Presale'}
        </button>
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Release Vested Tokens</div>
        <DevInput label="Beneficiary Address" value={beneficiary} onChange={setBeneficiary} placeholder="0x…" />
        {releasable != null && <div className="dev-hint">Releasable now: {(Number(releasable) / 1e18).toFixed(4)} PANTE</div>}
        <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('release', [beneficiary])}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Release'}
        </button>
      </div>

      <TxRow label="Last tx" hash={hash} isLoading={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 4 — Liquidity Migration
// ══════════════════════════════════════════════════════════════════════════
function LiquidityPanel({ addrs }: { addrs: Record<string, string> }) {
  const migratorAddr = (addrs['PanteLiquidityMigrator'] ?? '') as `0x${string}`
  const { address }  = useAccount()

  const [usdcDeposit,  setUsdcDeposit]  = useState('')
  const [panteDeposit, setPanteDeposit] = useState('')
  const [dexRouter,    setDexRouter]    = useState('0x0000000000000000000000000000000000000000')
  const [approveWhat,  setApproveWhat]  = useState<'usdc' | 'pante' | null>(null)

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: migrated }      = useReadContract({ address: migratorAddr, abi: MIGRATOR_ABI, functionName: 'migrated',      chainId: CHAIN_ID, query: { enabled: !!migratorAddr } })
  const { data: migratedUsdc }  = useReadContract({ address: migratorAddr, abi: MIGRATOR_ABI, functionName: 'migratedUsdc',  chainId: CHAIN_ID, query: { enabled: !!migratorAddr } })
  const { data: migratedPante } = useReadContract({ address: migratorAddr, abi: MIGRATOR_ABI, functionName: 'migratedPante', chainId: CHAIN_ID, query: { enabled: !!migratorAddr } })

  type MigrFn = 'depositUsdc' | 'depositPante' | 'migrate' | 'withdrawToken'
  const call = useCallback((fn: MigrFn, args: readonly unknown[]) => {
    if (!migratorAddr) { toast.error('Deploy PanteLiquidityMigrator first'); return }
    reset()
    writeContract({ address: migratorAddr, abi: MIGRATOR_ABI, functionName: fn, args: args as never, chainId: CHAIN_ID })
  }, [migratorAddr, writeContract, reset])

  const approve = useCallback((token: `0x${string}`, amount: bigint, label: 'usdc' | 'pante') => {
    if (!address || !migratorAddr) return
    setApproveWhat(label)
    writeContract({ address: token, abi: erc20Abi, functionName: 'approve', args: [migratorAddr, amount], chainId: CHAIN_ID })
  }, [address, migratorAddr, writeContract])

  if (!migratorAddr) return <div className="dev-panel"><div className="dev-empty">Deploy PanteLiquidityMigrator first.</div></div>

  return (
    <div className="dev-panel">
      <div className="dev-status-row">
        <div className="dev-badge">{migratorAddr.slice(0, 10)}…{migratorAddr.slice(-6)}</div>
        <div className={`dev-badge ${migrated ? 'ok' : 'idle'}`}>{migrated ? 'MIGRATED' : 'PENDING'}</div>
        {migrated && migratedUsdc != null && <div className="dev-badge">{(Number(migratedUsdc) / 1e6).toFixed(2)} USDC + {(Number(migratedPante) / 1e18).toFixed(0)} PANTE paired</div>}
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Droplets size={14} /> Deposit USDC</div>
        <DevInput label="USDC Amount" value={usdcDeposit} onChange={setUsdcDeposit} placeholder="1000" />
        <div className="dev-field-row">
          <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={() => approve(USDC_ADDRESS, parseUnits(usdcDeposit || '0', 6), 'usdc')}>
            {approveWhat === 'usdc' && (isPending || isConfirming) ? <><Loader2 size={13} className="pante-spin" /> Approving…</> : 'Approve USDC'}
          </button>
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('depositUsdc', [parseUnits(usdcDeposit || '0', 6)])}>
            Deposit USDC
          </button>
        </div>
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Droplets size={14} /> Deposit PANTE</div>
        <DevInput label="PANTE Amount" value={panteDeposit} onChange={setPanteDeposit} placeholder="1000000" />
        <div className="dev-field-row">
          <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={() => approve((resolvePanteAddress() ?? '0x0000000000000000000000000000000000000000'), parseUnits(panteDeposit || '0', 18), 'pante')}>
            {approveWhat === 'pante' && (isPending || isConfirming) ? <><Loader2 size={13} className="pante-spin" /> Approving…</> : 'Approve PANTE'}
          </button>
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('depositPante', [parseUnits(panteDeposit || '0', 18)])}>
            Deposit PANTE
          </button>
        </div>
      </div>

      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><ArrowRight size={14} /> Migrate to Liquidity</div>
        <DevInput label="DEX Router Address (0x0 = staging mode)" value={dexRouter} onChange={setDexRouter} placeholder="0x…" />
        <div className="dev-hint">
          Pass <code>0x000…000</code> to migrate in staging mode (no AMM yet on testnet). When an AMM is live, paste its router address.
        </div>
        <button className="pante-dex-btn" disabled={isPending || isConfirming || !!migrated} onClick={() => call('migrate', [dexRouter, 0n])}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Migrating…</> : 'Migrate to Liquidity'}
        </button>
      </div>

      <TxRow label="Last tx" hash={hash} isLoading={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 5c — Lock LP Tokens (after liquidity migration)
// ══════════════════════════════════════════════════════════════════════════
function LockLPPanel({ addrs }: { addrs: Record<string, string> }) {
  const lockerAddr   = (addrs['PanteLiquidityLocker'] ?? '') as `0x${string}`
  const migratorAddr = (addrs['PanteLiquidityMigrator'] ?? '') as `0x${string}`
  const { address }  = useAccount()

  // LP token address input — after migration the LP token address is the AMM pair address
  const [lpTokenAddr, setLpTokenAddr] = useState('')
  const [lockAmount,  setLockAmount]  = useState('')
  const [lockMonths,  setLockMonths]  = useState('6')       // default 6 months
  const [withdrawId,  setWithdrawId]  = useState('0')
  const [withdrawTo,  setWithdrawTo]  = useState(address ?? '')
  // Stable reference date updated only when lockMonths changes — avoids Date.now in render
  const [baseDate]                    = useState(() => new Date())

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: lockCount } = useReadContract({
    address: lockerAddr || undefined,
    abi: LOCKER_ABI,
    functionName: 'lockCount',
    chainId: CHAIN_ID,
    query: { enabled: !!lockerAddr },
  })
  const { data: allLocks } = useReadContract({
    address: lockerAddr || undefined,
    abi: LOCKER_ABI,
    functionName: 'allLocks',
    chainId: CHAIN_ID,
    query: { enabled: !!lockerAddr },
  })

  const handleApproveLP = () => {
    if (!lpTokenAddr || !lockerAddr) { toast.error('Enter LP token address and deploy Locker first'); return }
    const amt = parseUnits(lockAmount || '0', 18)
    writeContract({ address: lpTokenAddr as `0x${string}`, abi: erc20Abi, functionName: 'approve', args: [lockerAddr, amt], chainId: CHAIN_ID })
  }

  const handleLock = () => {
    if (!lpTokenAddr || !lockerAddr) { toast.error('Enter LP token address and deploy Locker first'); return }
    reset()
    const amt = parseUnits(lockAmount || '0', 18)
    // Compute unlock timestamp at click time, not during render
    const nowSec = Math.floor(new Date().getTime() / 1000)
    const unlockTs = BigInt(nowSec + parseInt(lockMonths) * 30 * 24 * 3600)
    writeContract({ address: lockerAddr, abi: LOCKER_ABI, functionName: 'lock', args: [lpTokenAddr as `0x${string}`, amt, unlockTs], chainId: CHAIN_ID })
  }

  const handleWithdraw = () => {
    if (!lockerAddr) return
    reset()
    writeContract({ address: lockerAddr, abi: LOCKER_ABI, functionName: 'withdraw', args: [BigInt(withdrawId), (withdrawTo || address) as `0x${string}`], chainId: CHAIN_ID })
  }

  if (!lockerAddr) return (
    <div className="dev-panel">
      <div className="dev-empty">Deploy PanteLiquidityLocker first from the Deploy panel.</div>
    </div>
  )

  type LockEntry = { token: string; amount: bigint; unlockTime: bigint; withdrawn: boolean }

  return (
    <div className="dev-panel">
      <div className="dev-status-row">
        <div className="dev-badge">{lockerAddr.slice(0,10)}…{lockerAddr.slice(-6)}</div>
        <div className="dev-badge ok">LOCKER DEPLOYED</div>
        {lockCount != null && <div className="dev-badge">Total Locks: {lockCount.toString()}</div>}
      </div>

      {/* Migrator reminder */}
      {migratorAddr && (
        <div className="dev-hint" style={{ marginBottom: '1rem' }}>
          After <code>migrate()</code>, the LP token pair address from the AMM will appear in the
          migrator event. Paste it as the LP Token Address below.
        </div>
      )}

      {/* Step 1: Approve LP token */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Step 1 — Approve LP Token</div>
        <div className="dev-field-row">
          <DevInput label="LP Token Address (from AMM pair)"  value={lpTokenAddr} onChange={setLpTokenAddr} placeholder="0x… (AMM pair contract)" />
          <DevInput label="Amount to Lock (LP tokens)"        value={lockAmount}  onChange={setLockAmount}  placeholder="e.g. 1000" />
        </div>
        <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={handleApproveLP}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Approving…</> : 'Approve LP Tokens'}
        </button>
      </div>

      {/* Step 2: Lock */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Step 2 — Lock LP Tokens</div>
        <DevInput label="Lock Duration (months)" value={lockMonths} onChange={setLockMonths} placeholder="6" type="number" />
        <div className="dev-hint">
          Lock until: <strong>{new Date(baseDate.getTime() + parseInt(lockMonths || '0') * 30 * 24 * 3600 * 1000).toLocaleDateString()}</strong>
          {' '}({lockMonths} months). After lock, LP tokens cannot be withdrawn until the timelock expires.
        </div>
        <button className="pante-dex-btn" disabled={isPending || isConfirming || !lpTokenAddr || !lockAmount} onClick={handleLock}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Locking…</> : `Lock LP for ${lockMonths} months`}
        </button>
      </div>

      {/* All locks table */}
      {allLocks && (allLocks as LockEntry[]).length > 0 && (
        <div className="dev-subpanel">
          <div className="dev-subpanel-title">Active Locks</div>
          <div className="dev-locks-table">
            {(allLocks as LockEntry[]).map((l, i) => (
              <div key={i} className={`dev-lock-row ${l.withdrawn ? 'withdrawn' : 'active'}`}>
                <span className="dev-lock-id">#{i}</span>
                <span className="dev-lock-token">{l.token.slice(0,10)}…</span>
                <span className="dev-lock-amt">{(Number(l.amount) / 1e18).toFixed(4)} LP</span>
                <span className="dev-lock-until">
                  {l.withdrawn ? '✅ withdrawn' : `until ${new Date(Number(l.unlockTime) * 1000).toLocaleDateString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw (after timelock) */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Withdraw (after timelock expires)</div>
        <div className="dev-field-row">
          <DevInput label="Lock ID" value={withdrawId} onChange={setWithdrawId} placeholder="0" type="number" />
          <DevInput label="Withdraw To" value={withdrawTo} onChange={setWithdrawTo} placeholder="0x…" />
        </div>
        <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={handleWithdraw}>
          {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Withdrawing…</> : 'Withdraw LP Tokens'}
        </button>
      </div>

      <TxRow label="Last tx" hash={hash} isLoading={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 2 — Fee Config (PanteToken split fee)
// ══════════════════════════════════════════════════════════════════════════
function FeeConfigPanel() {
  const panteAddr = usePanteAddr()
  const [devBP,  setDevBP]  = useState('50')
  const [liqBP,  setLiqBP]  = useState('50')
  const [devCol, setDevCol] = useState(DEV_WALLET as string)
  const [liqCol, setLiqCol] = useState('')

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Live reads from deployed PanteToken
  const enabled_ = !!panteAddr
  const { data: currentDevBP }   = useReadContract({ address: panteAddr ?? undefined, abi: PANTE_FEE_ABI, functionName: 'devFeeBP',           chainId: CHAIN_ID, query: { enabled: enabled_ } })
  const { data: currentLiqBP }   = useReadContract({ address: panteAddr ?? undefined, abi: PANTE_FEE_ABI, functionName: 'liquidityFeeBP',     chainId: CHAIN_ID, query: { enabled: enabled_ } })
  const { data: currentEnabled } = useReadContract({ address: panteAddr ?? undefined, abi: PANTE_FEE_ABI, functionName: 'feeEnabled',         chainId: CHAIN_ID, query: { enabled: enabled_ } })
  const { data: currentDevCol }  = useReadContract({ address: panteAddr ?? undefined, abi: PANTE_FEE_ABI, functionName: 'feeCollector',       chainId: CHAIN_ID, query: { enabled: enabled_ } })
  const { data: currentLiqCol }  = useReadContract({ address: panteAddr ?? undefined, abi: PANTE_FEE_ABI, functionName: 'liquidityCollector', chainId: CHAIN_ID, query: { enabled: enabled_ } })

  type FeeFn = 'setFeeEnabled' | 'setDevFeeBP' | 'setLiquidityFeeBP' | 'setFeeCollector' | 'setLiquidityCollector'
  const call = useCallback((fn: FeeFn, args: readonly unknown[]) => {
    if (!panteAddr) { toast.error('Deploy PanteToken first'); return }
    reset()
    writeContract({ address: panteAddr, abi: PANTE_FEE_ABI, functionName: fn, args: args as never, chainId: CHAIN_ID })
  }, [panteAddr, writeContract, reset])

  if (!panteAddr) return <div className="dev-panel"><div className="dev-empty">Deploy PanteToken first from the Deploy panel.</div></div>

  return (
    <div className="dev-panel">
      {/* Live state */}
      <div className="dev-status-row">
        <div className={`dev-badge ${currentEnabled ? 'ok' : 'ended'}`}>
          Fees: {currentEnabled ? 'ENABLED' : 'DISABLED'}
        </div>
        <div className="dev-badge">Dev fee: {currentDevBP != null ? Number(currentDevBP) / 100 : '…'}%</div>
        <div className="dev-badge">Liquidity fee: {currentLiqBP != null ? Number(currentLiqBP) / 100 : '…'}%</div>
      </div>
      <div className="dev-status-row" style={{ marginTop: '0.4rem' }}>
        <div className="dev-badge" style={{ maxWidth: '100%', wordBreak: 'break-all' }}>
          Dev collector: {currentDevCol ?? '…'}
        </div>
      </div>
      <div className="dev-status-row" style={{ marginTop: '0.4rem' }}>
        <div className="dev-badge" style={{ maxWidth: '100%', wordBreak: 'break-all' }}>
          Liquidity collector: {currentLiqCol ?? '…'}
        </div>
      </div>

      {/* Toggle */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Enable / Disable Fees</div>
        <div className="dev-field-row">
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('setFeeEnabled', [true])}>
            Enable Fees
          </button>
          <button className="pante-dex-btn pante-dex-btn--secondary" disabled={isPending || isConfirming} onClick={() => call('setFeeEnabled', [false])}>
            Disable Fees
          </button>
        </div>
      </div>

      {/* Fee basis points */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Set Fee Basis Points</div>
        <div className="dev-hint">50 bp = 0.5 %. Dev + Liquidity combined must not exceed 1000 bp (10 %).</div>
        <div className="dev-field-row">
          <DevInput label="Dev Fee (bp)"       value={devBP} onChange={setDevBP} placeholder="50" />
          <DevInput label="Liquidity Fee (bp)" value={liqBP} onChange={setLiqBP} placeholder="50" />
        </div>
        <div className="dev-field-row">
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('setDevFeeBP', [BigInt(devBP || '0')])}>
            {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Set Dev BP'}
          </button>
          <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('setLiquidityFeeBP', [BigInt(liqBP || '0')])}>
            {isPending || isConfirming ? <><Loader2 size={13} className="pante-spin" /> Sending…</> : 'Set Liquidity BP'}
          </button>
        </div>
      </div>

      {/* Collector addresses */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title">Set Collector Addresses</div>
        <DevInput label="Dev Collector (0.5% → dev)" value={devCol} onChange={setDevCol} placeholder="0x…" />
        <button className="pante-dex-btn" style={{ marginBottom: '0.75rem' }} disabled={isPending || isConfirming} onClick={() => call('setFeeCollector', [devCol])}>
          Set Dev Collector
        </button>
        <DevInput label="Liquidity Collector (0.5% → LP)" value={liqCol} onChange={setLiqCol} placeholder="0x…" />
        <button className="pante-dex-btn" disabled={isPending || isConfirming} onClick={() => call('setLiquidityCollector', [liqCol])}>
          Set Liquidity Collector
        </button>
      </div>

      <TxRow label="Last tx" hash={hash} isLoading={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 5b — Token Metadata (IPFS photo + contractURI onchain)
// ══════════════════════════════════════════════════════════════════════════

/** Upload a file to IPFS via Pinata's public pinning gateway (no API key needed for <1 MB). */
async function pinFileToIPFS(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  // Pinata public endpoint — no key required for small files on free tier
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      // Pinata requires authorization for pinning. For production, add your JWT.
      // For testnet/demo this will work with a guest key.
      Authorization: `Bearer ${(import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''}`,
    },
    body: formData,
  })
  if (!res.ok) throw new Error(`IPFS upload failed: ${res.status} ${await res.text()}`)
  const json = await res.json() as { IpfsHash: string }
  return json.IpfsHash
}

/** Build and pin a contract-level metadata JSON to IPFS. */
async function pinMetadataJSON(opts: {
  name: string
  symbol: string
  description: string
  imageCID: string
  externalLink: string
  tokenAddress: string
}): Promise<string> {
  const metadata = {
    name: opts.name,
    symbol: opts.symbol,
    description: opts.description,
    image: `ipfs://${opts.imageCID}`,
    external_link: opts.externalLink,
    decimals: 18,
    properties: {
      network: 'Arc Testnet',
      chain_id: 5042002,
      token_address: opts.tokenAddress,
    },
  }
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
  const file = new File([blob], 'metadata.json')
  return pinFileToIPFS(file)
}

function TokenMetadataPanel({ addrs }: { addrs: Record<string, string> }) {
  const { address } = useAccount()
  const panteAddr = (addrs['PanteToken'] ?? resolvePanteAddress() ?? '') as `0x${string}`

  // Form state
  const [tokenName,    setTokenName]    = useState('Pante Token')
  const [tokenSymbol,  setTokenSymbol]  = useState('PANTE')
  const [description,  setDescription]  = useState('Pante is a meme token with DeFi utility on Arc Testnet. DEX, staking, and governance built-in.')
  const [externalLink, setExternalLink] = useState('https://pante.vercel.app')
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  // Default preview = GitHub logo (no upload needed if using the canonical logo)
  const [imagePreview, setImagePreview] = useState<string | null>(PANTE_LOGO)
  const [imageCID,     setImageCID]     = useState('')
  const [metaCID,      setMetaCID]      = useState('')
  const [uploading,    setUploading]    = useState(false)
  const [uploadStep,   setUploadStep]   = useState('')
  const [manualURI,    setManualURI]    = useState('')

  // Read current contractURI from chain
  const { data: currentURI, refetch: refetchURI } = useReadContract({
    address: panteAddr,
    abi: CONTRACT_URI_ABI,
    functionName: 'contractURI',
    chainId: CHAIN_ID,
    query: { enabled: !!panteAddr },
  })

  // Write setContractURI
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  if (isSuccess) { void refetchURI() }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setImageFile(f)
    setImageCID('')
    if (f) {
      const reader = new FileReader()
      reader.onload = ev => setImagePreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setImagePreview(null)
    }
  }

  const handleUploadAndPin = async () => {
    if (!imageFile) { toast.error('Choose a token image first'); return }
    setUploading(true)
    try {
      setUploadStep('Uploading image to IPFS…')
      const imgCID = await pinFileToIPFS(imageFile)
      setImageCID(imgCID)
      toast.success(`Image pinned: ipfs://${imgCID}`)

      setUploadStep('Building & pinning metadata JSON…')
      const mCID = await pinMetadataJSON({
        name: tokenName,
        symbol: tokenSymbol,
        description,
        imageCID: imgCID,
        externalLink,
        tokenAddress: panteAddr,
      })
      setMetaCID(mCID)
      setManualURI(`ipfs://${mCID}`)
      toast.success(`Metadata pinned: ipfs://${mCID}`)
      setUploadStep('Done! Review the URI below, then click Set on Blockchain.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`IPFS upload failed: ${msg.slice(0, 100)}`)
      setUploadStep(`Error: ${msg.slice(0, 80)}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSetURI = () => {
    if (!address) { toast.error('Connect wallet'); return }
    const uri = manualURI.trim()
    if (!uri) { toast.error('Enter a URI first'); return }
    reset()
    writeContract({
      address: panteAddr,
      abi: CONTRACT_URI_ABI,
      functionName: 'setContractURI',
      args: [uri],
      chainId: CHAIN_ID,
    })
  }

  return (
    <div className="dev-panel">
      <div className="dev-panel-desc">
        Upload the token photo to IPFS, build the metadata JSON (name, symbol, description,
        image), and record the <code>ipfs://&lt;CID&gt;</code> URI directly onchain via{' '}
        <code>setContractURI()</code> — exactly like a token launchpad.
        Requires a <a href="https://pinata.cloud" target="_blank" rel="noopener" className="pante-inline-link">Pinata</a> JWT in <code>VITE_PINATA_JWT</code> for real IPFS pinning.
      </div>

      {/* Current URI */}
      {currentURI && (
        <div className="dev-status-row" style={{ marginBottom: '1rem' }}>
          <div className="dev-badge ok" style={{ maxWidth: '100%', wordBreak: 'break-all' }}>
            <Globe size={12} style={{ marginRight: 4, display: 'inline' }} />
            Current URI: {currentURI}
          </div>
        </div>
      )}

      {/* Step 1 — Image upload */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Image size={14} /> Step 1 — Token Image</div>
        <div className="dev-meta-image-row">
          <label className="dev-image-upload-label">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="dev-image-preview" />
              : <div className="dev-image-placeholder"><Upload size={28} /><span>Click to select image</span></div>
            }
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          <div className="dev-meta-fields">
            <DevInput label="Token Name"    value={tokenName}    onChange={setTokenName}    placeholder="Pante Token" />
            <DevInput label="Token Symbol"  value={tokenSymbol}  onChange={setTokenSymbol}  placeholder="PANTE" />
            <DevInput label="External Link" value={externalLink} onChange={setExternalLink} placeholder="https://…" />
          </div>
        </div>
        <div className="dev-field" style={{ marginTop: '0.75rem' }}>
          <label>Description</label>
          <textarea
            className="dev-input dev-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe your token…"
          />
        </div>
      </div>

      {/* Step 2 — Upload to IPFS */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Upload size={14} /> Step 2 — Pin to IPFS</div>
        {uploadStep && <div className="dev-hint dev-hint--mono">{uploadStep}</div>}
        {imageCID && (
          <div className="dev-hint">
            Image CID: <a href={`https://ipfs.io/ipfs/${imageCID}`} target="_blank" rel="noopener" className="pante-inline-link">ipfs://{imageCID.slice(0, 20)}…</a>
          </div>
        )}
        {metaCID && (
          <div className="dev-hint">
            Metadata CID: <a href={`https://ipfs.io/ipfs/${metaCID}`} target="_blank" rel="noopener" className="pante-inline-link">ipfs://{metaCID.slice(0, 20)}…</a>
          </div>
        )}
        <button
          className="pante-dex-btn"
          onClick={() => { void handleUploadAndPin() }}
          disabled={uploading || !imageFile}
        >
          {uploading
            ? <><Loader2 size={13} className="pante-spin" /> {uploadStep || 'Uploading…'}</>
            : 'Upload Image + Build Metadata → IPFS'
          }
        </button>
      </div>

      {/* Step 3 — Set onchain */}
      <div className="dev-subpanel">
        <div className="dev-subpanel-title"><Globe size={14} /> Step 3 — Record URI Onchain</div>
        <DevInput
          label="Contract URI (ipfs://… or https://…)"
          value={manualURI}
          onChange={setManualURI}
          placeholder="ipfs://Qm… or https://…"
        />
        <div className="dev-hint">Auto-filled after Step 2. You can also paste a manual URI here.</div>
        {error && (
          <div className="dev-error">{error.message.includes('user rejected') ? 'Cancelled.' : error.message.slice(0, 100)}</div>
        )}
        {isSuccess && txUrl && (
          <div className="dev-hint ok">
            <CheckCircle size={13} style={{ marginRight: 4, display: 'inline', color: 'var(--pante-green)' }} />
            URI recorded onchain!{' '}
            <a href={txUrl} target="_blank" rel="noopener" className="pante-inline-link">View tx <ExternalLink size={11} /></a>
          </div>
        )}
        <button
          className="pante-dex-btn"
          onClick={handleSetURI}
          disabled={isPending || isConfirming || !manualURI}
        >
          {isPending || isConfirming
            ? <><Loader2 size={13} className="pante-spin" /> Confirming…</>
            : 'Set contractURI on Blockchain'
          }
        </button>
        <div className="dev-hint" style={{ marginTop: '0.5rem' }}>
          After this, any DEX, explorer, or launchpad that reads <code>contractURI()</code>
          on the PANTE contract will show your token logo and metadata automatically.
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL 6 — Distribution summary
// ══════════════════════════════════════════════════════════════════════════
function DistributionPanel({ addrs }: { addrs: Record<string, string> }) {
  const presaleAddr = (addrs['PantePresale'] ?? '') as `0x${string}`
  const vestAddr    = (addrs['PanteVesting']  ?? '') as `0x${string}`

  const { data: raised }       = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'totalRaised',      chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })
  const { data: vestAlloc }    = useReadContract({ address: presaleAddr, abi: PRESALE_ABI, functionName: 'vestingAllocation', chainId: CHAIN_ID, query: { enabled: !!presaleAddr } })
  const { data: totalVested }  = useReadContract({ address: vestAddr,    abi: VESTING_ABI, functionName: 'totalAllocation',   chainId: CHAIN_ID, query: { enabled: !!vestAddr } })

  const raisedFmt   = raised    != null ? (Number(raised)    / 1e6).toFixed(2)  : '—'
  const vestFmt     = vestAlloc != null ? (Number(vestAlloc) / 1e18).toFixed(0) : '—'
  const totalVFmt   = totalVested != null ? (Number(totalVested) / 1e18).toFixed(0) : '—'
  const immediate   = vestAlloc != null ? (Number(vestAlloc) / 0.20 * 0.80 / 1e18).toFixed(0) : '—'

  return (
    <div className="dev-panel">
      <div className="dev-dist-grid">
        <div className="dev-dist-card">
          <div className="dev-dist-label">Total USDC Raised</div>
          <div className="dev-dist-value">{raisedFmt} USDC</div>
        </div>
        <div className="dev-dist-card">
          <div className="dev-dist-label">80% — Distributed to Buyers</div>
          <div className="dev-dist-value ok">{immediate} PANTE</div>
          <div className="dev-dist-sub">Sent immediately in buy()</div>
        </div>
        <div className="dev-dist-card">
          <div className="dev-dist-label">20% — Held for Vesting</div>
          <div className="dev-dist-value pending">{vestFmt} PANTE</div>
          <div className="dev-dist-sub">In PantePresale, claimable by vesting contract</div>
        </div>
        <div className="dev-dist-card">
          <div className="dev-dist-label">Vesting Contract Allocation</div>
          <div className="dev-dist-value">{totalVFmt} PANTE</div>
          <div className="dev-dist-sub">After claimFromPresale() succeeds</div>
        </div>
      </div>

      <div className="dev-dist-legend">
        <div className="dev-legend-title">Token Distribution Model</div>
        <div className="dev-legend-bar">
          <div className="dev-legend-seg seg-80" style={{ flex: 80 }}>80% Immediate</div>
          <div className="dev-legend-seg seg-20" style={{ flex: 20 }}>20% Vesting</div>
        </div>
        <ul className="dev-legend-list">
          <li><span className="dot ok" />80% sent to buyer wallet at time of purchase</li>
          <li><span className="dot pending" />20% held in PantePresale → claimed by PanteVesting → released linearly over vesting period</li>
        </ul>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// WALLET GATE — only DEV_WALLET may enter
// ══════════════════════════════════════════════════════════════════════════
function WalletGate() {
  const { isConnected, address, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const wrongChain = isConnected && chainId !== CHAIN_ID
  const wrongWallet = isConnected && address?.toLowerCase() !== DEV_WALLET.toLowerCase()

  return (
    <div className="dev-gate">
      <div className="dev-gate-card">
        <Lock size={36} className="dev-gate-icon" />
        <h2>Developer Access</h2>

        {!isConnected && (
          <>
            <p>Connect the authorised dev wallet to continue.</p>
            <div className="dev-gate-wallet">
              <span className="dev-gate-addr">{DEV_WALLET.slice(0, 10)}…{DEV_WALLET.slice(-8)}</span>
            </div>
            <p className="dev-gate-hint">Use the Connect Wallet button in the header.</p>
          </>
        )}

        {isConnected && wrongChain && (
          <>
            <p>Switch to Arc Testnet to continue.</p>
            <button className="pante-dex-btn" onClick={() => switchChain({ chainId: CHAIN_ID })} disabled={isSwitching}>
              {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
            </button>
          </>
        )}

        {isConnected && !wrongChain && wrongWallet && (
          <>
            <p>Connected wallet does not match the authorised dev wallet.</p>
            <div className="dev-gate-wallet">
              <span className="dev-gate-label">Required:</span>
              <span className="dev-gate-addr">{DEV_WALLET.slice(0, 10)}…{DEV_WALLET.slice(-8)}</span>
            </div>
            <div className="dev-gate-wallet" style={{ marginTop: '0.5rem' }}>
              <span className="dev-gate-label">Connected:</span>
              <span className="dev-gate-addr err">{address?.slice(0, 10)}…{address?.slice(-8)}</span>
            </div>
            <p className="dev-gate-hint">Switch to the dev wallet in MetaMask.</p>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN — DevPage
// ══════════════════════════════════════════════════════════════════════════
export function DevPage() {
  const { isConnected, chainId, address } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const wrongChain  = isConnected && chainId !== CHAIN_ID
  const wrongWallet = !isConnected || address?.toLowerCase() !== DEV_WALLET.toLowerCase()
  const { addrs, set } = useContractAddrs()

  // Show gate whenever not connected, wrong chain, or wrong wallet
  if (!isConnected || wrongChain || wrongWallet) return <WalletGate />

  return (
    <div className="dev-page">
      <div className="dev-topbar">
        <div className="dev-topbar-left">
          <Terminal size={18} />
          <span>Pante Dev Console</span>
        </div>
        <div className="dev-topbar-right">
          <span className="dev-badge ok">
            {address.slice(0, 8)}…{address.slice(-6)}
          </span>
          {wrongChain && (
            <button
              className="pante-dex-btn"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', marginTop: 0 }}
              onClick={() => switchChain({ chainId: CHAIN_ID })}
              disabled={isSwitching}
            >
              {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
            </button>
          )}
        </div>
      </div>

      <div className="dev-body">
        <Accordion title="1 — Deploy Contracts" icon={<Terminal size={15} />} defaultOpen>
          <DeployPanel addrs={addrs} setAddr={set} />
        </Accordion>

        <Accordion title="2 — Fee Config (PANTE Token)" icon={<Settings size={15} />}>
          <FeeConfigPanel />
        </Accordion>

        <Accordion title="3 — Presale Control" icon={<Play size={15} />}>
          <PresalePanel addrs={addrs} />
        </Accordion>

        <Accordion title="4 — Vesting (20%)" icon={<RefreshCw size={15} />}>
          <VestingPanel addrs={addrs} />
        </Accordion>

        <Accordion title="5 — Liquidity Migration" icon={<Droplets size={15} />}>
          <LiquidityPanel addrs={addrs} />
        </Accordion>

        <Accordion title="6 — Lock LP Tokens" icon={<Droplets size={15} />}>
          <LockLPPanel addrs={addrs} />
        </Accordion>

        <Accordion title="7 — Token Image & Metadata (IPFS)" icon={<Image size={15} />}>
          <TokenMetadataPanel addrs={addrs} />
        </Accordion>

        <Accordion title="8 — Distribution Summary" icon={<Coins size={15} />} defaultOpen>
          <DistributionPanel addrs={addrs} />
        </Accordion>
      </div>
    </div>
  )
}
