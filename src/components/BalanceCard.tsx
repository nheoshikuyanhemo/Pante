import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { motion } from 'framer-motion'
import { TrendingUp, Wallet } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { ConnectKitButton } from 'connectkit'

const CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(CHAIN_ID)!

const glass = {
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    border: '1px solid rgba(172,198,233,0.18)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.10)',
  } as React.CSSProperties,
}

export function BalanceCard() {
  const { address, isConnected } = useAccount()

  const { data: rawBalance, isLoading } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  const formatted =
    rawBalance != null
      ? Amount.fromRaw(rawBalance, usdcDecimalsFor(CHAIN_ID)).toFixed(2)
      : '0.00'

  const [whole, frac] = formatted.split('.')

  return (
    <div className="rounded-3xl p-5" style={glass.card}>
      {/* Label row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg" style={{ background: 'rgba(52,211,153,0.12)' }}>
            <TrendingUp className="size-3.5" style={{ color: 'var(--success)' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
            USDC Balance
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TokenUSDC variant="branded" size={16} />
          <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>Arc Testnet</span>
        </div>
      </div>

      {/* Big number */}
      {isConnected ? (
        <motion.div
          key={formatted}
          initial={{ opacity: 0.7, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-baseline gap-1"
        >
          {isLoading ? (
            <div className="h-10 w-36 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
          ) : (
            <>
              <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {whole}
              </span>
              <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
                .{frac}
              </span>
              <span className="ml-1 text-base font-semibold" style={{ color: 'var(--subtle)' }}>USDC</span>
            </>
          )}
        </motion.div>
      ) : (
        <div className="flex items-center gap-2 py-1">
          <Wallet className="size-5" style={{ color: 'var(--subtle)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Connect wallet to view balance</span>
        </div>
      )}

      {/* Connect button row */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
          {isConnected && address
            ? `${address.slice(0, 8)}…${address.slice(-4)}`
            : 'No wallet connected'}
        </span>
        <ConnectKitButton.Custom>
          {({ isConnected: ckConnected, show, address: ckAddress, ensName }) => (
            <button
              onClick={show}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={ckConnected
                ? { background: 'rgba(255,255,255,0.06)', color: 'var(--ink-2)', border: '1px solid rgba(255,255,255,0.10)' }
                : { background: 'var(--accent)', color: '#0a1628' }
              }
            >
              {ckConnected ? (ensName ?? `${ckAddress?.slice(0, 6)}…`) : 'Connect Wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </div>
  )
}
