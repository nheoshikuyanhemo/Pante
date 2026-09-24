// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PanteLiquidityLocker
 * @notice Time-locks LP tokens (or any ERC-20) after presale migration.
 *         The owner deposits LP tokens here and sets an unlock timestamp.
 *         No withdrawal is possible before unlockTime — not even by the owner.
 *
 * Lifecycle:
 *   1. Dev calls migrate() on PanteLiquidityMigrator → gets LP tokens.
 *   2. Dev approves PanteLiquidityLocker, then calls lock(lpToken, amount, unlockTime).
 *   3. LP tokens are held here until block.timestamp >= unlockTime.
 *   4. After unlockTime, owner calls withdraw() to retrieve LP tokens.
 *
 * Multiple locks per LP token are supported (each call to lock() creates a
 * new LockRecord with its own unlock time, useful for partial locks).
 */
contract PanteLiquidityLocker is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LockRecord {
        address token;
        uint256 amount;
        uint256 unlockTime;
        bool    withdrawn;
    }

    LockRecord[] public locks;

    // ── Min lock duration — 30 days (protects users from a rug-pull unlock) ──
    uint256 public constant MIN_LOCK_DURATION = 30 days;

    // ── Events ────────────────────────────────────────────────────────────────
    event Locked(uint256 indexed lockId, address indexed token, uint256 amount, uint256 unlockTime);
    event Withdrawn(uint256 indexed lockId, address indexed token, uint256 amount, address indexed to);

    // ── Errors ────────────────────────────────────────────────────────────────
    error InvalidAddress();
    error ZeroAmount();
    error LockTooShort(uint256 given, uint256 minimum);
    error StillLocked(uint256 unlockTime, uint256 currentTime);
    error AlreadyWithdrawn(uint256 lockId);
    error LockNotFound(uint256 lockId);

    constructor() Ownable(msg.sender) {}

    // ── Lock ──────────────────────────────────────────────────────────────────

    /**
     * @notice Lock `amount` of `token` until `unlockTime`.
     * @param token       ERC-20 LP token address.
     * @param amount      Amount to lock (must be pre-approved).
     * @param unlockTime  Unix timestamp when tokens can be withdrawn.
     *                    Must be at least block.timestamp + MIN_LOCK_DURATION.
     * @return lockId     Index into the locks array.
     */
    function lock(
        address token,
        uint256 amount,
        uint256 unlockTime
    ) external onlyOwner nonReentrant returns (uint256 lockId) {
        if (token == address(0))  revert InvalidAddress();
        if (amount == 0)          revert ZeroAmount();

        uint256 minUnlock = block.timestamp + MIN_LOCK_DURATION;
        if (unlockTime < minUnlock) revert LockTooShort(unlockTime, minUnlock);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        lockId = locks.length;
        locks.push(LockRecord({
            token:      token,
            amount:     amount,
            unlockTime: unlockTime,
            withdrawn:  false
        }));

        emit Locked(lockId, token, amount, unlockTime);
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw locked tokens after the unlock time has passed.
     * @param lockId  Index returned by lock().
     * @param to      Recipient of the unlocked tokens.
     */
    function withdraw(uint256 lockId, address to) external onlyOwner nonReentrant {
        if (lockId >= locks.length)       revert LockNotFound(lockId);
        LockRecord storage rec = locks[lockId];

        if (rec.withdrawn)                revert AlreadyWithdrawn(lockId);
        if (block.timestamp < rec.unlockTime)
            revert StillLocked(rec.unlockTime, block.timestamp);
        if (to == address(0))             revert InvalidAddress();

        rec.withdrawn = true;
        IERC20(rec.token).safeTransfer(to, rec.amount);

        emit Withdrawn(lockId, rec.token, rec.amount, to);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @notice Total number of lock records (including withdrawn ones).
    function lockCount() external view returns (uint256) {
        return locks.length;
    }

    /// @notice Seconds remaining until a lock expires (0 if already unlocked).
    function timeLeft(uint256 lockId) external view returns (uint256) {
        if (lockId >= locks.length) revert LockNotFound(lockId);
        LockRecord storage rec = locks[lockId];
        if (block.timestamp >= rec.unlockTime) return 0;
        return rec.unlockTime - block.timestamp;
    }

    /// @notice Return all lock records as an array (for frontend enumeration).
    function allLocks() external view returns (LockRecord[] memory) {
        return locks;
    }
}
