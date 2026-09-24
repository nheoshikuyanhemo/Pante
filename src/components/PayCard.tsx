import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor, parseAmount } from '@/onchain-money'

const CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(CHAIN_ID)!

const glass = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,
}

const QUICK_AMOUNTS = ['1', '5', '10', '25']

function parseOnchainError(error: Error | null): string {
  if (!error) return ''
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient')) return 'Insufficient balance.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check your balance.'
  return 'Something went wrong. Please retry.'
}

export function PayCard() {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  // Tabs: pay | request
  const [tab, setTab] = useState<'pay' | 'request'>('pay')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [requestTo, setRequestTo] = useState('')
  const [copied, setCopied] = useState(false)

  const wrongChain = isConnected && walletChainId !== CHAIN_ID

  // Balance
  const { data: rawBalance } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })
  const formattedBalance = rawBalance != null
    ? Amount.fromRaw(rawBalance, usdcDecimalsFor(CHAIN_ID)).toFixed(2)
    : null

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, '')
    if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
  }, [])

  // Pay self (demo): send to own wallet as checkout demo
  // In real use, this would go to a merchant address
  const isValidAmount = parseFloat(amount) > 0
  const canPay = isConnected && !wrongChain && isValidAmount && !isPending && !isConfirming

  const handlePay = useCallback(() => {
    if (!canPay || !address) return
    let parsed: bigint
    try {
      parsed = parseAmount(CHAIN_ID, amount).raw
    } catch {
      return
    }
    // For this demo, transfer to the connected wallet itself as a self-pay demo
    // Replace address with your merchant/contract address in production
    writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [address, parsed],
      chainId: CHAIN_ID,
    })
  }, [canPay, address, amount, writeContract])

  const handleReset = () => {
    reset()
    setAmount('')
    setMemo('')
  }

  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  // Payment link generation
  const paymentLink = amount && isConnected && address
    ? `${window.location.origin}?to=${address}&amount=${amount}${memo ? `&memo=${encodeURIComponent(memo)}` : ''}`
    : ''

  const handleCopyLink = () => {
    if (!paymentLink) return
    navigator.clipboard.writeText(paymentLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="rounded-3xl" style={glass.card}>
      {/* Spectral strip */}
      <div className="h-0.5 rounded-t-3xl" style={{ background: 'var(--spectral)' }} />

      <div className="p-5">
        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['pay', 'request'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition-all"
              style={tab === t
                ? { background: 'rgba(172,198,233,0.16)', color: 'var(--accent)' }
                : { color: 'var(--subtle)' }
              }
            >
              {t === 'pay' ? 'Pay' : 'Request'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ---- PAY TAB ---- */}
          {tab === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
              {isSuccess ? (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-5">
                  <div className="flex size-14 items-center justify-center rounded-full" style={{ background: 'rgba(52,211,153,0.12)' }}>
                    <CheckCircle className="size-7" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="text-center">
                    <p className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Payment sent</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{amount} USDC{memo ? ` — ${memo}` : ''}</p>
                  </div>
                  {txUrl && (
                    <a href={txUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      View on ArcScan <ExternalLink className="size-3" />
                    </a>
                  )}
                  <button onClick={handleReset} className="mt-2 rounded-2xl px-6 py-2.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--ink-2)' }}>
                    New payment
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Amount input */}
                  <div className="rounded-2xl p-4" style={glass.inner}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>Amount</span>
                      {formattedBalance && (
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>Bal: {formattedBalance} USDC</span>
                      )}
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
                      <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <TokenUSDC variant="branded" size={16} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>USDC</span>
                      </div>
                    </div>
                    {/* Quick chips */}
                    <div className="mt-3 flex gap-2">
                      {QUICK_AMOUNTS.map((q) => (
                        <button
                          key={q}
                          onClick={() => setAmount(q)}
                          className="flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                          style={amount === q
                            ? { background: 'rgba(172,198,233,0.18)', color: 'var(--accent)' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }
                          }
                        >
                          ${q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="rounded-2xl px-4 py-3" style={glass.inner}>
                    <input
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Memo (optional)"
                      className="w-full bg-transparent text-sm outline-none placeholder:opacity-30"
                      style={{ color: 'var(--ink-2)' }}
                    />
                  </div>

                  {writeError && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(248,113,113,0.10)' }}>
                      <AlertCircle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
                      <span className="text-xs" style={{ color: 'var(--danger)' }}>{parseOnchainError(writeError)}</span>
                    </div>
                  )}

                  {wrongChain ? (
                    <button
                      onClick={() => switchChain({ chainId: CHAIN_ID })}
                      disabled={isSwitching}
                      className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: '#0d1b2f' }}
                    >
                      {isSwitching ? 'Switching...' : 'Switch to Arc Testnet'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePay}
                      disabled={!canPay}
                      className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: canPay ? 'var(--accent)' : 'var(--surface-strong)', color: canPay ? '#0a1628' : 'var(--muted)' }}
                    >
                      {!isConnected
                        ? 'Connect wallet'
                        : isPending
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet...</span>
                        : isConfirming
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirming...</span>
                        : `Pay ${amount ? `${amount} USDC` : 'USDC'}`}
                    </button>
                  )}
                  <p className="text-center text-xs" style={{ color: 'var(--subtle)' }}>Demo: sends USDC to your own address</p>
                </>
              )}
            </motion.div>
          )}

          {/* ---- REQUEST TAB ---- */}
          {tab === 'request' && (
            <motion.div key="request" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <div className="rounded-2xl p-4" style={glass.inner}>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>Request amount</label>
                <div className="flex items-center gap-3">
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="display flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
                    style={{ color: 'var(--ink)' }}
                  />
                  <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <TokenUSDC variant="branded" size={16} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>USDC</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl px-4 py-3" style={glass.inner}>
                <input
                  value={requestTo}
                  onChange={(e) => setRequestTo(e.target.value)}
                  placeholder="Your address (auto-filled when connected)"
                  className="mono w-full bg-transparent text-xs outline-none placeholder:opacity-30"
                  style={{ color: 'var(--ink-2)' }}
                  spellCheck={false}
                />
              </div>

              <div className="rounded-2xl px-4 py-3" style={glass.inner}>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Memo (e.g. Invoice #42)"
                  className="w-full bg-transparent text-sm outline-none placeholder:opacity-30"
                  style={{ color: 'var(--ink-2)' }}
                />
              </div>

              {paymentLink && (
                <div className="rounded-2xl p-3" style={glass.inner}>
                  <p className="mb-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Payment link</p>
                  <div className="flex items-center gap-2">
                    <p className="mono flex-1 truncate text-xs" style={{ color: 'var(--accent)' }}>{paymentLink}</p>
                    <button
                      onClick={handleCopyLink}
                      className="rounded-lg p-1.5 transition-all hover:opacity-80"
                      style={{ background: 'rgba(172,198,233,0.10)' }}
                    >
                      {copied ? <Check className="size-3.5" style={{ color: 'var(--success)' }} /> : <Copy className="size-3.5" style={{ color: 'var(--accent)' }} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  // Use the connected address if no requestTo entered
                  if (!requestTo && address) setRequestTo(address)
                }}
                disabled={!isValidAmount || (!requestTo && !address)}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: isValidAmount ? 'rgba(172,198,233,0.16)' : 'var(--surface-strong)', color: isValidAmount ? 'var(--accent)' : 'var(--muted)' }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Link className="size-4" />
                  Generate payment link
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
