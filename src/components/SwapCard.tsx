import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor, parseAmount } from '@/onchain-money'

const CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(CHAIN_ID)!

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
  if (msg.includes('insufficient')) return 'Insufficient balance.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check your balance.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please retry.'
}

export function SwapCard() {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [payAmount, setPayAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const wrongChain = isConnected && walletChainId !== CHAIN_ID

  // Live USDC balance
  const { data: rawBalance, isLoading: balanceLoading } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  const formattedBalance =
    rawBalance != null
      ? Amount.fromRaw(rawBalance, usdcDecimalsFor(CHAIN_ID)).toFixed(2)
      : '0.00'

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, '')
    if (v === '' || /^\d*\.?\d*$/.test(v)) setPayAmount(v)
  }, [])

  const handleMax = useCallback(() => {
    if (rawBalance != null) {
      setPayAmount(Amount.fromRaw(rawBalance, usdcDecimalsFor(CHAIN_ID)).toFixed(6))
    }
  }, [rawBalance])

  const isValidAddress = recipient.startsWith('0x') && recipient.length === 42
  const isValidAmount = parseFloat(payAmount) > 0

  const canSend = isConnected && !wrongChain && isValidAddress && isValidAmount && !isPending && !isConfirming

  const handleSend = useCallback(() => {
    if (!canSend) return
    let parsed: bigint
    try {
      parsed = parseAmount(CHAIN_ID, payAmount).raw
    } catch {
      return
    }
    writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, parsed],
      chainId: CHAIN_ID,
    })
  }, [canSend, payAmount, recipient, writeContract])

  const handleReset = () => {
    reset()
    setPayAmount('')
    setRecipient('')
  }

  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  return (
    <div className="rounded-3xl p-1" style={{ background: 'linear-gradient(135deg, rgba(172,198,233,0.18) 0%, rgba(172,198,233,0.04) 100%)', boxShadow: '0 0 0 1px rgba(172,198,233,0.12)' }}>
      <div className="rounded-[22px] p-5" style={glass.card}>
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-xl" style={{ background: 'rgba(172,198,233,0.14)' }}>
              <ArrowUpDown className="size-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>Send USDC</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(172,198,233,0.10)' }}>
            <div className="size-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Arc Testnet</span>
          </div>
        </div>

        {/* Success State */}
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex size-14 items-center justify-center rounded-full" style={{ background: 'rgba(52,211,153,0.12)' }}>
                  <CheckCircle className="size-7" style={{ color: 'var(--success)' }} />
                </div>
                <div className="text-center">
                  <p className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Sent!</p>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{payAmount} USDC transferred</p>
                </div>
                {txUrl && (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)' }}
                  >
                    View on ArcScan <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <button
                onClick={handleReset}
                className="w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: 'var(--surface-strong)', color: 'var(--ink-2)' }}
              >
                Send another
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Pay amount */}
              <div className="rounded-2xl p-4" style={glass.inner}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>You send</span>
                  <button
                    onClick={handleMax}
                    disabled={!isConnected || balanceLoading}
                    className="text-xs font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                  >
                    {balanceLoading ? '...' : `${formattedBalance} Max`}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    inputMode="decimal"
                    value={payAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="display flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
                    style={{ color: 'var(--ink)' }}
                  />
                  <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <TokenUSDC variant="branded" size={18} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>USDC</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex size-7 items-center justify-center rounded-full" style={{ background: 'var(--surface-muted)' }}>
                  <ArrowUpDown className="size-3.5" style={{ color: 'var(--muted)' }} />
                </div>
              </div>

              {/* Recipient */}
              <div className="rounded-2xl p-4" style={glass.inner}>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  To address
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
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#0d1b2f' }}
                >
                  {isSwitching ? 'Switching...' : 'Switch to Arc Testnet'}
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: canSend ? 'var(--accent)' : 'var(--surface-strong)', color: canSend ? '#0a1628' : 'var(--muted)' }}
                >
                  {!isConnected
                    ? 'Connect wallet to send'
                    : isPending
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Confirm in wallet...</span>
                    : isConfirming
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Confirming...</span>
                    : 'Send USDC'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
