import { useAccount, useReadContract } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { erc20Abi } from 'viem'

const CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(CHAIN_ID)!

interface TxEntry {
  hash: string
  type: 'send' | 'receive'
  amount: string
  address: string
  timestamp: number
}

interface TxHistoryProps {
  localTxs?: TxEntry[]
}

const glass = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function TxHistory({ localTxs = [] }: TxHistoryProps) {
  const { address, isConnected } = useAccount()

  const { data: rawBalance } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 6000 },
  })

  const formatted = rawBalance != null
    ? Amount.fromRaw(rawBalance, usdcDecimalsFor(CHAIN_ID)).toFixed(2)
    : null

  return (
    <div className="rounded-3xl p-5" style={glass.card}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4" style={{ color: 'var(--muted)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Activity</span>
        </div>
        {isConnected && formatted && (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <TokenUSDC variant="branded" size={12} />
            <span className="mono text-xs font-medium tabular-nums" style={{ color: 'var(--muted)' }}>{formatted} USDC</span>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>Connect your wallet to see activity</p>
        </div>
      ) : localTxs.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>No transactions yet</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)', opacity: 0.7 }}>Your activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {localTxs.map((tx, i) => (
            <motion.div
              key={tx.hash}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-2xl px-3 py-3"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{
                    background: tx.type === 'send'
                      ? 'rgba(248,113,113,0.12)'
                      : 'rgba(52,211,153,0.12)',
                  }}
                >
                  {tx.type === 'send'
                    ? <ArrowUpRight className="size-4" style={{ color: 'var(--danger)' }} />
                    : <ArrowDownLeft className="size-4" style={{ color: 'var(--success)' }} />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {tx.type === 'send' ? 'Sent' : 'Received'}
                  </p>
                  <p className="mono text-xs" style={{ color: 'var(--subtle)' }}>{formatAddress(tx.address)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="display text-sm font-semibold tabular-nums"
                  style={{ color: tx.type === 'send' ? 'var(--danger)' : 'var(--success)' }}
                >
                  {tx.type === 'send' ? '-' : '+'}{tx.amount} USDC
                </span>
                <a
                  href={buildTxExplorerUrl(CHAIN_ID, tx.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-0.5 text-xs transition-opacity hover:opacity-80"
                  style={{ color: 'var(--subtle)' }}
                >
                  {timeAgo(tx.timestamp)}
                  <ExternalLink className="ml-1 size-2.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
