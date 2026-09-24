import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowUpDown, Loader2, CheckCircle, AlertCircle, ExternalLink, Coins, Info } from 'lucide-react'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { PANTE_TOKEN } from '../contracts/PanteToken'
import { formatUnitsExact, parseUnitsExact } from '@/onchain-money'

const CHAIN_ID = arcTestnet.id
const PANTE_DECIMALS = 18

const glass = {
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,
}

function parseOnchainError(error: Error | null): string {
  if (!error) return ''
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient')) return 'Insufficient PANTE balance.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check balance and address.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please retry.'
}

type ActivePanel = 'transfer' | 'info'

export function PanteCard() {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [panel, setPanel] = useState<ActivePanel>('transfer')
  const wrongChain = isConnected && walletChainId !== CHAIN_ID

  // Live PANTE balance
  const { data: rawBalance, isLoading: balanceLoading } = useReadContract({
    address: PANTE_TOKEN.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  // PANTE total supply
  const { data: totalSupply } = useReadContract({
    address: PANTE_TOKEN.address,
    abi: erc20Abi,
    functionName: 'totalSupply',
    chainId: CHAIN_ID,
  })

  // PANTE token name
  const { data: tokenName } = useReadContract({
    address: PANTE_TOKEN.address,
    abi: erc20Abi,
    functionName: 'name',
    chainId: CHAIN_ID,
  })

  const formattedBalance =
    rawBalance != null
      ? parseFloat(formatUnitsExact(rawBalance, PANTE_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : '0'

  const formattedSupply =
    totalSupply != null
      ? (Number(totalSupply) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : '...'

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, '')
    if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
  }, [])

  const handleMax = useCallback(() => {
    if (rawBalance != null) {
      setAmount(formatUnitsExact(rawBalance, PANTE_DECIMALS))
    }
  }, [rawBalance])

  const isValidAddress = recipient.startsWith('0x') && recipient.length === 42
  const isValidAmount = parseFloat(amount) > 0
  const canSend = isConnected && !wrongChain && isValidAddress && isValidAmount && !isPending && !isConfirming

  const handleTransfer = useCallback(() => {
    if (!canSend) return
    let parsed: bigint
    try {
      parsed = parseUnitsExact(amount, PANTE_DECIMALS)
    } catch {
      return
    }
    writeContract({
      address: PANTE_TOKEN.address,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, parsed],
      chainId: CHAIN_ID,
    })
  }, [canSend, amount, recipient, writeContract])

  const handleReset = () => {
    reset()
    setAmount('')
    setRecipient('')
  }

  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  return (
    <div
      className="rounded-3xl p-1"
      style={{
        background: 'linear-gradient(135deg, rgba(175,143,244,0.22) 0%, rgba(175,143,244,0.04) 100%)',
        boxShadow: '0 0 0 1px rgba(175,143,244,0.18)',
      }}
    >
      <div className="rounded-[22px] p-5" style={glass.card}>
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-xl"
              style={{ background: 'rgba(175,143,244,0.18)' }}
            >
              <Zap className="size-3.5" style={{ color: '#af8ff4' }} fill="currentColor" />
            </div>
            <span className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {tokenName ?? 'PANTE'} Token
            </span>
          </div>
          <div className="flex gap-1 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['transfer', 'info'] as ActivePanel[]).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                style={
                  panel === p
                    ? { background: 'rgba(175,143,244,0.18)', color: '#af8ff4' }
                    : { color: 'var(--subtle)' }
                }
              >
                {p === 'transfer' ? <ArrowUpDown className="size-3.5" /> : <Info className="size-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* PANTE balance */}
        <div className="mb-4 rounded-2xl p-4" style={glass.inner}>
          <div className="mb-1 flex items-center gap-1.5">
            <Coins className="size-3.5" style={{ color: '#af8ff4' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Your PANTE balance</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="display text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {balanceLoading ? '...' : formattedBalance}
            </span>
            <span className="text-base font-semibold" style={{ color: '#af8ff4' }}>PANTE</span>
          </div>
          {!isConnected && (
            <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>Connect wallet to see balance</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ── INFO PANEL ── */}
          {panel === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[
                { label: 'Contract', value: `${PANTE_TOKEN.address.slice(0, 10)}...${PANTE_TOKEN.address.slice(-6)}`, mono: true },
                { label: 'Network', value: 'Arc Testnet', mono: false },
                { label: 'Total Supply', value: `${formattedSupply} PANTE`, mono: false },
                { label: 'Decimals', value: '18', mono: false },
                { label: 'Standard', value: 'ERC-20 + Permit + EIP-1363', mono: false },
                { label: 'Fee-on-transfer', value: 'Via IARCFees module', mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between rounded-xl px-3 py-2" style={glass.inner}>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                  <span className={`text-xs font-semibold ${mono ? 'mono' : ''}`} style={{ color: 'var(--ink-2)' }}>{value}</span>
                </div>
              ))}
              <a
                href={`https://explorer.testnet.arc.io/address/${PANTE_TOKEN.address}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(175,143,244,0.12)', color: '#af8ff4' }}
              >
                View on ArcScan <ExternalLink className="size-3" />
              </a>
            </motion.div>
          )}

          {/* ── TRANSFER PANEL ── */}
          {panel === 'transfer' && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {isSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex size-14 items-center justify-center rounded-full" style={{ background: 'rgba(52,211,153,0.12)' }}>
                    <CheckCircle className="size-7" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="text-center">
                    <p className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Sent!</p>
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{amount} PANTE transferred</p>
                  </div>
                  {txUrl && (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(175,143,244,0.12)', color: '#af8ff4' }}
                    >
                      View on ArcScan <ExternalLink className="size-3" />
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    className="w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{ background: 'var(--surface-strong)', color: 'var(--ink-2)' }}
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount */}
                  <div className="rounded-2xl p-4" style={glass.inner}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                        Amount
                      </span>
                      <button
                        onClick={handleMax}
                        disabled={!isConnected || balanceLoading}
                        className="text-xs font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                        style={{ color: '#af8ff4' }}
                      >
                        {balanceLoading ? '...' : `${formattedBalance} Max`}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        inputMode="decimal"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className="display flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
                        style={{ color: 'var(--ink)' }}
                      />
                      <div
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                        style={{ background: 'rgba(175,143,244,0.12)' }}
                      >
                        <Zap className="size-4" style={{ color: '#af8ff4' }} fill="currentColor" />
                        <span className="text-sm font-semibold" style={{ color: '#af8ff4' }}>PANTE</span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="rounded-2xl p-4" style={glass.inner}>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                      Recipient address
                    </label>
                    <input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value.trim())}
                      placeholder="0x..."
                      className="mono w-full bg-transparent text-sm outline-none placeholder:opacity-20"
                      style={{ color: 'var(--ink-2)' }}
                      spellCheck={false}
                    />
                  </div>

                  {/* Error */}
                  {writeError && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(248,113,113,0.10)' }}>
                      <AlertCircle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
                      <span className="text-xs" style={{ color: 'var(--danger)' }}>{parseOnchainError(writeError)}</span>
                    </div>
                  )}

                  {/* CTA */}
                  {wrongChain ? (
                    <button
                      onClick={() => switchChain({ chainId: CHAIN_ID })}
                      disabled={isSwitching}
                      className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: '#af8ff4', color: '#0d1b2f' }}
                    >
                      {isSwitching ? 'Switching...' : 'Switch to Arc Testnet'}
                    </button>
                  ) : (
                    <button
                      onClick={handleTransfer}
                      disabled={!canSend}
                      className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background: canSend ? '#af8ff4' : 'var(--surface-strong)',
                        color: canSend ? '#0a1628' : 'var(--muted)',
                      }}
                    >
                      {!isConnected
                        ? 'Connect wallet to transfer'
                        : isPending
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Confirm in wallet...</span>
                        : isConfirming
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Confirming...</span>
                        : 'Transfer PANTE'}
                    </button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
