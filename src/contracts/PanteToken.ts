/**
 * PanteToken contract config.
 *
 * The token address is ONLY available after the Dev deploys PanteToken from /dev.
 * Before deploy: `resolveAddress()` returns null — every page must handle this
 * and show a "Token not yet launched" state instead of connecting to a stale address.
 *
 * After deploy from /dev:
 *   DevPage saves the address into localStorage['pante_dev_contracts'].PanteToken
 *   and every page picks it up automatically on the next render.
 *
 * Logo (used in presale, DEX, and metadata panel):
 *   https://raw.githubusercontent.com/nheoshikuyanhemo/Pante/refs/heads/main/html/assets/logo.png
 */
import { PANTETOKEN_ABI } from './artifacts'

export { PANTETOKEN_ABI }
export const PANTE_LOGO =
  'https://raw.githubusercontent.com/nheoshikuyanhemo/Pante/refs/heads/main/html/assets/logo.png'

/** Returns the deployed PanteToken address, or null if not yet deployed. */
export function resolvePanteAddress(): `0x${string}` | null {
  try {
    const stored = localStorage.getItem('pante_dev_contracts')
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>
      const addr = parsed['PanteToken']
      if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
        return addr as `0x${string}`
      }
    }
  } catch {
    // localStorage unavailable
  }
  return null
}

/** Returns the deployed PantePresale address, or null if not yet deployed. */
export function resolvePresaleAddress(): `0x${string}` | null {
  try {
    const stored = localStorage.getItem('pante_dev_contracts')
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>
      const addr = parsed['PantePresale']
      if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
        return addr as `0x${string}`
      }
    }
  } catch { /* ignore */ }
  return null
}

/** Returns true if the PanteToken has been deployed from /dev. */
export function isPanteDeployed(): boolean {
  return resolvePanteAddress() !== null
}

export const PANTE_TOKEN_ABI = PANTETOKEN_ABI

/**
 * Legacy compat — components that already import PANTE_TOKEN.address will
 * still work: address is a getter that throws if not yet deployed, so pages
 * should check isPanteDeployed() / resolvePanteAddress() first.
 */
export const PANTE_TOKEN = {
  get address(): `0x${string}` {
    const addr = resolvePanteAddress()
    if (!addr) throw new Error('PanteToken not yet deployed — go to /dev first')
    return addr
  },
  get abi() { return PANTETOKEN_ABI },
  chain: 5042002, // Arc Testnet
} as const

export type PanteTokenAddress = `0x${string}`
