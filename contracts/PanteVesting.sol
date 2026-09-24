// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PanteVesting
 * @notice Linear vesting for the 20% PANTE allocation reserved from the presale.
 *
 * Flow:
 *   1. Deploy this contract.
 *   2. Call initialize(presaleContract_, vestingDuration_, cliffDuration_).
 *   3. Call PantePresale.setVestingContract(address(this)).
 *   4. Call claimFromPresale() once after presale ends to pull the 20% from presale.
 *   5. Beneficiaries call release(beneficiary) periodically to receive their
 *      vested tokens. The owner can add/update beneficiary shares before
 *      vesting starts.
 *
 * Distribution among beneficiaries is pro-rata based on shares.
 * Default: a single beneficiary (owner) with 100 shares.
 *
 * Cliff + linear vesting:
 *   - No tokens releasable until cliff passes.
 *   - After cliff, tokens vest linearly until vestingEnd.
 */
contract PanteVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────
    struct Beneficiary {
        uint256 shares;      // relative weight
        uint256 released;    // PANTE already released to this address
    }

    // ─── State ────────────────────────────────────────────────────────────
    IERC20 public immutable pante;

    address public presaleContract;
    bool    public initialized;
    bool    public claimed;        // true after claimFromPresale() succeeds

    uint256 public vestingStart;   // timestamp when vesting begins (= claim time)
    uint256 public cliffDuration;  // seconds before first release
    uint256 public vestingDuration;// total vesting period in seconds (from start)

    uint256 public totalAllocation;// total PANTE received from presale
    uint256 public totalShares;    // sum of all beneficiary shares
    uint256 public totalReleased;  // total PANTE released so far

    mapping(address => Beneficiary) public beneficiaries;
    address[] public beneficiaryList;

    // ─── Events ───────────────────────────────────────────────────────────
    event Initialized(address indexed presaleContract, uint256 vestingDuration, uint256 cliffDuration);
    event AllocationClaimed(uint256 amount);
    event BeneficiaryAdded(address indexed account, uint256 shares);
    event BeneficiaryUpdated(address indexed account, uint256 shares);
    event TokensReleased(address indexed beneficiary, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────
    error AlreadyInitialized();
    error NotInitialized();
    error AlreadyClaimed();
    error NothingClaimed();
    error CliffNotReached();
    error NothingToRelease();
    error InvalidAddress();
    error ZeroAmount();
    error InvalidShares();
    error VestingStarted();

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(address pante_) Ownable(msg.sender) {
        if (pante_ == address(0)) revert InvalidAddress();
        pante = IERC20(pante_);
        // Default beneficiary = deployer, 100 shares
        _addBeneficiary(msg.sender, 100);
    }

    // ─── Initialise (once) ────────────────────────────────────────────────

    function initialize(
        address presaleContract_,
        uint256 vestingDuration_,
        uint256 cliffDuration_
    ) external onlyOwner {
        if (initialized) revert AlreadyInitialized();
        if (presaleContract_ == address(0)) revert InvalidAddress();
        if (vestingDuration_ == 0) revert ZeroAmount();
        initialized = true;
        presaleContract = presaleContract_;
        vestingDuration = vestingDuration_;
        cliffDuration   = cliffDuration_;
        emit Initialized(presaleContract_, vestingDuration_, cliffDuration_);
    }

    // ─── Beneficiary management (owner, before vesting starts) ────────────

    function addBeneficiary(address account, uint256 shares) external onlyOwner {
        if (claimed) revert VestingStarted(); // lock shares once vesting begins
        _addBeneficiary(account, shares);
    }

    function updateBeneficiary(address account, uint256 newShares) external onlyOwner {
        if (claimed) revert VestingStarted();
        if (account == address(0)) revert InvalidAddress();
        Beneficiary storage b = beneficiaries[account];
        if (b.shares == 0) revert InvalidShares();
        totalShares = totalShares - b.shares + newShares;
        b.shares = newShares;
        emit BeneficiaryUpdated(account, newShares);
    }

    // ─── Claim allocation from presale ────────────────────────────────────

    /**
     * @notice Pull the 20% allocation from PantePresale.
     *         Can only be called once, after presale ends.
     */
    function claimFromPresale() external onlyOwner nonReentrant {
        if (!initialized) revert NotInitialized();
        if (claimed) revert AlreadyClaimed();

        uint256 before = pante.balanceOf(address(this));

        // Call PantePresale.claimVesting()
        (bool success,) = presaleContract.call(
            abi.encodeWithSignature("claimVesting()")
        );
        require(success, "claimVesting call failed");

        uint256 received = pante.balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();

        totalAllocation = received;
        vestingStart    = block.timestamp;
        claimed         = true;

        emit AllocationClaimed(received);
    }

    // ─── Release ──────────────────────────────────────────────────────────

    /**
     * @notice Release vested tokens to `beneficiary`.
     *         Anyone can call this on behalf of any beneficiary.
     */
    function release(address beneficiary) external nonReentrant {
        if (!claimed) revert NothingClaimed();
        if (beneficiary == address(0)) revert InvalidAddress();

        Beneficiary storage b = beneficiaries[beneficiary];
        if (b.shares == 0) revert InvalidShares();

        uint256 releasableAmount = _releasable(beneficiary);
        if (releasableAmount == 0) revert NothingToRelease();

        b.released    += releasableAmount;
        totalReleased += releasableAmount;

        pante.safeTransfer(beneficiary, releasableAmount);
        emit TokensReleased(beneficiary, releasableAmount);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Tokens vested (but not yet released) for `beneficiary`.
    function releasable(address beneficiary) external view returns (uint256) {
        return _releasable(beneficiary);
    }

    /// @notice Total tokens vested for `beneficiary` (cumulative, includes already released).
    function vestedAmount(address beneficiary) external view returns (uint256) {
        return _vestedAmount(beneficiary);
    }

    function vestingEnd() external view returns (uint256) {
        return vestingStart + vestingDuration;
    }

    function cliffEnd() external view returns (uint256) {
        return vestingStart + cliffDuration;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _addBeneficiary(address account, uint256 shares) internal {
        if (account == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidShares();
        if (beneficiaries[account].shares == 0) {
            beneficiaryList.push(account);
        }
        totalShares += shares;
        beneficiaries[account].shares += shares;
        emit BeneficiaryAdded(account, shares);
    }

    function _releasable(address beneficiary) internal view returns (uint256) {
        Beneficiary storage b = beneficiaries[beneficiary];
        if (b.shares == 0) return 0;
        return _vestedAmount(beneficiary) - b.released;
    }

    function _vestedAmount(address beneficiary) internal view returns (uint256) {
        if (!claimed) return 0;
        Beneficiary storage b = beneficiaries[beneficiary];
        if (b.shares == 0) return 0;

        uint256 elapsed = block.timestamp - vestingStart;

        // Cliff not passed
        if (elapsed < cliffDuration) return 0;

        // Pro-rata share of total allocation for this beneficiary
        uint256 allocation = (totalAllocation * b.shares) / totalShares;

        // Fully vested
        if (elapsed >= vestingDuration) return allocation;

        // Linear vesting
        return (allocation * elapsed) / vestingDuration;
    }
}
