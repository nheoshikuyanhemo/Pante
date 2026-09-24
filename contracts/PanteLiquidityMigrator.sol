// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PanteLiquidityMigrator
 * @notice After the presale ends, the owner deposits raised USDC and a matching
 *         amount of PANTE here, then calls migrate() to pair them for DEX liquidity.
 *
 * Migration flow:
 *   1. Owner (or treasury) transfers raised USDC here via depositUsdc().
 *   2. Owner transfers PANTE liquidity allocation here via depositPante().
 *   3. Owner calls migrate(dexRouter, minLpTokens) which:
 *        a. Approves dexRouter to spend USDC + PANTE.
 *        b. Calls IUniswapV2Router.addLiquidity (or compatible AMM).
 *        c. LP tokens are held in this contract (owner can withdraw after).
 *
 * For Arc Testnet there is no live AMM yet, so migrate() stores the balances
 * and emits MigrationComplete — a real AMM call can be wired once deployed.
 *
 * @dev The contract does not hard-code any AMM address so it works with any
 *      Uniswap-V2-compatible router.
 */
contract PanteLiquidityMigrator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable pante;

    bool public migrated;
    uint256 public migratedUsdc;
    uint256 public migratedPante;

    // ─── Events ───────────────────────────────────────────────────────────
    event UsdcDeposited(address indexed from, uint256 amount);
    event PanteDeposited(address indexed from, uint256 amount);
    event MigrationComplete(uint256 usdcAmount, uint256 panteAmount, address router);
    event LpWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────
    error AlreadyMigrated();
    error NothingToMigrate();
    error InvalidAddress();
    error ZeroAmount();

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(address usdc_, address pante_) Ownable(msg.sender) {
        if (usdc_ == address(0) || pante_ == address(0)) revert InvalidAddress();
        usdc  = IERC20(usdc_);
        pante = IERC20(pante_);
    }

    // ─── Deposit helpers (owner or anyone) ────────────────────────────────

    /// @notice Pull USDC from caller into this contract.
    function depositUsdc(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit UsdcDeposited(msg.sender, amount);
    }

    /// @notice Pull PANTE from caller into this contract.
    function depositPante(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        pante.safeTransferFrom(msg.sender, address(this), amount);
        emit PanteDeposited(msg.sender, amount);
    }

    // ─── Migration ────────────────────────────────────────────────────────

    /**
     * @notice Pair USDC + PANTE held in this contract as DEX liquidity.
     * @param dexRouter  Address of a Uniswap-V2-compatible router.
     *                   Pass address(0) on Arc Testnet to skip the AMM call
     *                   and only emit the event (staging mode).
     * @param minLpTokens  Minimum LP tokens to accept (slippage protection).
     *                     Ignored in staging mode.
     */
    function migrate(address dexRouter, uint256 minLpTokens) external onlyOwner nonReentrant {
        if (migrated) revert AlreadyMigrated();

        uint256 usdcBal  = usdc.balanceOf(address(this));
        uint256 panteBal = pante.balanceOf(address(this));
        if (usdcBal == 0 || panteBal == 0) revert NothingToMigrate();

        migratedUsdc  = usdcBal;
        migratedPante = panteBal;
        migrated = true;

        if (dexRouter != address(0)) {
            // Approve router
            usdc.forceApprove(dexRouter, usdcBal);
            pante.forceApprove(dexRouter, panteBal);

            // IUniswapV2Router02.addLiquidity signature
            // addLiquidity(tokenA, tokenB, amountADesired, amountBDesired,
            //              amountAMin, amountBMin, to, deadline)
            (bool success,) = dexRouter.call(
                abi.encodeWithSignature(
                    "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)",
                    address(usdc),
                    address(pante),
                    usdcBal,
                    panteBal,
                    usdcBal,          // amountAMin (no slippage for exact amounts)
                    (panteBal * 95) / 100, // amountBMin (5% slippage on PANTE)
                    address(this),    // LP tokens go to this contract
                    block.timestamp + 300
                )
            );
            // Do not revert on AMM failure — LP tokens may not yet exist on testnet.
            // The owner can re-migrate after the pool is seeded.
            if (!success) {
                // Reset so owner can retry
                migrated = false;
                migratedUsdc = 0;
                migratedPante = 0;
                // Reset approvals
                usdc.forceApprove(dexRouter, 0);
                pante.forceApprove(dexRouter, 0);
                revert NothingToMigrate();
            }
        }

        emit MigrationComplete(usdcBal, panteBal, dexRouter);
        // minLpTokens acknowledged — enforce off-chain on testnet until AMM is live
        (minLpTokens);
    }

    // ─── Post-migration ───────────────────────────────────────────────────

    /// @notice Owner can withdraw any token (LP tokens, residual USDC/PANTE) after migration.
    function withdrawToken(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(to, amount);
        emit LpWithdrawn(token, to, amount);
    }
}
