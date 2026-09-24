// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PantePresale
 * @notice USDC-denominated presale for PANTE tokens.
 *
 * Flow:
 *   1. Owner calls startPresale() with a hard cap in USDC.
 *   2. Buyers call buy(usdcAmount) — USDC is pulled from buyer, PANTE is
 *      transferred to buyer immediately at the configured rate.
 *   3. Owner calls endPresale() when the presale is over (or hard cap reached).
 *   4. Owner calls withdrawUsdc(to) to drain raised USDC to treasury.
 *
 * Distribution (set once at construction):
 *   - 80% of raised PANTE allocation goes to buyers directly in buy().
 *   - 20% is held here for the vesting contract to pull via claimVesting().
 *
 * PANTE must be transferred to this contract before startPresale() is called.
 */
contract PantePresale is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    IERC20 public immutable pante;

    /// PANTE per USDC, scaled to 6-decimal USDC.
    /// e.g. 1000 PANTE (1e18-per-token) per 1 USDC (1e6) → rate = 1000 * 1e18 / 1e6 = 1e15
    uint256 public ratePerUsdc; // PANTE wei per 1 USDC (= 1e6 raw)

    uint256 public hardCapUsdc;   // maximum USDC to raise
    uint256 public totalRaised;   // total USDC collected so far

    bool public presaleActive;
    bool public presaleEnded;

    uint256 public vestingAllocation; // 20% of PANTE allocated for vesting, held here
    address public vestingContract;   // address authorised to claim vestingAllocation

    mapping(address => uint256) public contributions; // USDC contributed per buyer

    // ─── Events ───────────────────────────────────────────────────────────
    event PresaleStarted(uint256 hardCapUsdc, uint256 ratePerUsdc);
    event PresaleEnded(uint256 totalRaised);
    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 panteAmount);
    event UsdcWithdrawn(address indexed to, uint256 amount);
    event VestingContractSet(address indexed vestingContract);
    event VestingClaimed(address indexed vestingContract, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────
    error PresaleNotActive();
    error PresaleAlreadyActive();
    error PresaleAlreadyEnded();
    error PresaleNotEnded();
    error HardCapExceeded();
    error ZeroAmount();
    error InvalidAddress();
    error InsufficientPanteBalance();
    error VestingAlreadyClaimed();
    error CallerNotVestingContract();

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(address usdc_, address pante_) Ownable(msg.sender) {
        if (usdc_ == address(0) || pante_ == address(0)) revert InvalidAddress();
        usdc = IERC20(usdc_);
        pante = IERC20(pante_);
    }

    // ─── Owner: configure ─────────────────────────────────────────────────

    /**
     * @notice Start the presale.
     * @param hardCapUsdc_  Maximum USDC to raise (6-decimal).
     * @param ratePerUsdc_  PANTE wei per 1 USDC (e.g. 1000e18 for 1000 PANTE/USDC, divided by 1e6).
     *                      Practical value: ratePerUsdc_ = pantePerUsdc * 1e12
     *                      e.g. 1000 PANTE per USDC → ratePerUsdc_ = 1000 * 1e12
     *
     * PANTE must already be deposited into this contract before calling.
     * The contract expects at least hardCapUsdc_ * ratePerUsdc_ / 1e6 PANTE.
     */
    function startPresale(uint256 hardCapUsdc_, uint256 ratePerUsdc_) external onlyOwner {
        if (presaleActive) revert PresaleAlreadyActive();
        if (presaleEnded) revert PresaleAlreadyEnded();
        if (hardCapUsdc_ == 0 || ratePerUsdc_ == 0) revert ZeroAmount();

        uint256 panteNeeded = (hardCapUsdc_ * ratePerUsdc_) / 1e6;
        if (pante.balanceOf(address(this)) < panteNeeded) revert InsufficientPanteBalance();

        hardCapUsdc = hardCapUsdc_;
        ratePerUsdc = ratePerUsdc_;
        presaleActive = true;

        emit PresaleStarted(hardCapUsdc_, ratePerUsdc_);
    }

    /// @notice End the presale manually. Can be called before hard cap is reached.
    function endPresale() external onlyOwner {
        if (!presaleActive) revert PresaleNotActive();
        presaleActive = false;
        presaleEnded = true;
        emit PresaleEnded(totalRaised);
    }

    /// @notice Set the vesting contract address (can only be set once after presale ends).
    function setVestingContract(address vestingContract_) external onlyOwner {
        if (vestingContract_ == address(0)) revert InvalidAddress();
        vestingContract = vestingContract_;
        emit VestingContractSet(vestingContract_);
    }

    // ─── Buyer ────────────────────────────────────────────────────────────

    /**
     * @notice Buy PANTE with USDC. Buyer receives 80% of their allocation immediately.
     *         The remaining 20% is earmarked for the vesting contract.
     * @param usdcAmount  Amount of USDC (6-decimal) to spend.
     */
    function buy(uint256 usdcAmount) external nonReentrant whenNotPaused {
        if (!presaleActive) revert PresaleNotActive();
        if (usdcAmount == 0) revert ZeroAmount();
        if (totalRaised + usdcAmount > hardCapUsdc) revert HardCapExceeded();

        // Pull USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Calculate total PANTE allocation
        uint256 totalPante = (usdcAmount * ratePerUsdc) / 1e6;
        uint256 immediateAmount = (totalPante * 80) / 100; // 80% immediate
        uint256 vestedAmount    = totalPante - immediateAmount; // 20% vested

        totalRaised += usdcAmount;
        contributions[msg.sender] += usdcAmount;
        vestingAllocation += vestedAmount;

        // Transfer 80% immediately
        pante.safeTransfer(msg.sender, immediateAmount);

        emit TokensPurchased(msg.sender, usdcAmount, totalPante);

        // Auto-end if hard cap reached
        if (totalRaised >= hardCapUsdc) {
            presaleActive = false;
            presaleEnded = true;
            emit PresaleEnded(totalRaised);
        }
    }

    // ─── Vesting contract ─────────────────────────────────────────────────

    /**
     * @notice Called by the vesting contract to claim the 20% allocation.
     *         Can only be called once and only after presale ends.
     */
    function claimVesting() external nonReentrant {
        if (!presaleEnded) revert PresaleNotEnded();
        if (msg.sender != vestingContract) revert CallerNotVestingContract();
        uint256 amount = vestingAllocation;
        if (amount == 0) revert VestingAlreadyClaimed();
        vestingAllocation = 0;
        pante.safeTransfer(vestingContract, amount);
        emit VestingClaimed(vestingContract, amount);
    }

    // ─── Owner: withdraw ──────────────────────────────────────────────────

    /// @notice Withdraw raised USDC to treasury after presale ends.
    function withdrawUsdc(address to) external onlyOwner nonReentrant {
        if (!presaleEnded) revert PresaleNotEnded();
        if (to == address(0)) revert InvalidAddress();
        uint256 amount = usdc.balanceOf(address(this));
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransfer(to, amount);
        emit UsdcWithdrawn(to, amount);
    }

    /// @notice Emergency withdrawal of PANTE (unsold tokens) after presale ends.
    function withdrawUnsoldPante(address to) external onlyOwner nonReentrant {
        if (!presaleEnded) revert PresaleNotEnded();
        if (to == address(0)) revert InvalidAddress();
        // Leave vestingAllocation in the contract for the vesting contract to claim.
        uint256 balance = pante.balanceOf(address(this));
        uint256 withdrawable = balance > vestingAllocation ? balance - vestingAllocation : 0;
        if (withdrawable == 0) revert ZeroAmount();
        pante.safeTransfer(to, withdrawable);
    }

    /// @notice Pause buying in an emergency.
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause buying.
    function unpause() external onlyOwner { _unpause(); }
}
