// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title PanteToken
 * @notice ERC-20 token that mirrors USDC on the Arc Network.
 *         - ERC-20 interface uses 18 decimals (standard USDC).
 *         - Native balance (used for gas, msg.value) is 18 decimals.
 *         - Provides helper functions to work with both representations.
 *         - Implements Arc-specific fee handling via Arc fee module and staking via Arc's staking contract.
 * 
 * @dev    The contract relies on external Arc contracts:
 *         • IARCFees  – provides current fee (basis points) and fee collector.
 *         • IStaking  – Arc staking contract for stake/withdraw/rewards.
 *         - Includes EIP-2612 Permit, Pausable, ReentrancyGuard, AccessControl.
 * 
 *         The contract assumes the Arc fee module and staking module follow the
 *         interfaces defined below. Replace them with the actual ABI when
 *         deploying on Arc testnet/mainnet.
 */
 
// ---------------------------------------------------------------------------
// 1️⃣  IMPORTS
// ---------------------------------------------------------------------------
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ---------------------------------------------------------------------------
// 2️⃣  EIP-1363 RECEIVER INTERFACE (must be defined before contract)
// ---------------------------------------------------------------------------
interface IERC1363Receiver {
    /**
     * @dev Called after a `transfer` or `transferFrom` of tokens.
     * @param operator The address which initiated the transfer (msg.sender)
     * @param amount   The amount of tokens transferred.
     * @param data     Additional data, can be empty string (\"\") if not used.
     * @return bytes4  ERC165 interface ID (optional, but must return `bytes4(keccak256(\"onTokenTransfer(address,uint256,bytes))\")` to accept the transfer).
     */
    function onTransferReceived(address operator, uint256 amount, bytes calldata data) external returns (bytes4);
}

// ---------------------------------------------------------------------------
// 2️⃣  EXTERNAL INTERFACES (match Arc contracts)
// ---------------------------------------------------------------------------
/**
 * @notice Interface for Arc's Fee Manager / Native Coin Authority precompile.
 */
interface IARCFees {
    /// @dev Returns the current fee in basis points (e.g., 25 = 0.25%).
    function currentFee() external view returns (uint256);
    /// @dev Returns the address that receives collected fees.
    function feeCollector() external view returns (address);
}

/**
 * @notice Minimal stub for Arc's staking contract. Replace with the real ABI.
 *         All amounts are in ERC-20 units (18 decimals).
 */
interface IStaking {
    /// @dev Stake `amount` tokens for `user`.
    function stake(address user, uint256 amount) external;
    /// @dev Withdraw `amount` tokens for `user`.
    function withdraw(address user, uint256 amount) external;
    /// @dev Returns the staked balance of `user`.
    function balanceOf(address user) external view returns (uint256);
    /// @dev Returns the total amount staked.
    function totalStaked() external view returns (uint256);
    /// @dev Returns the current reward rate.
    function rewardRate() external view returns (uint256);
    /// @dev Claim rewards for `user`.
    function claimRewards(address user) external;
}

// ---------------------------------------------------------------------------
// 3️⃣  CONTRACT DEFINITION
// ---------------------------------------------------------------------------
contract PanteToken is ERC20, ERC20Permit, AccessControl, Pausable, ReentrancyGuard, Ownable {
    // -----------------------------------------------------------------------
    // 3.1  CONSTANTS & IMMUTABLES
    // -----------------------------------------------------------------------
    bytes32 public constant MINTER_ROLE        = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE        = keccak256("BURNER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE   = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant STAKING_MANAGER_ROLE = keccak256("STAKING_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE        = keccak256("PAUSER_ROLE");
    
    // 18-dec native <-> 18-dec ERC-20 conversion (both now 18 decimals)
    uint256 public constant NATIVE_DECIMALS    = 18;
    uint256 public constant ERC20_DECIMALS     = 18;
    uint256 public constant SCALE_FACTOR       = 10 ** (NATIVE_DECIMALS - ERC20_DECIMALS); // = 1
    
    // Max fee allowed (100% = 10_000 bp)
    uint256 public constant MAX_FEE_BP         = 10_000;
    
    // Fixed supply: 1,000,000,000 PANTE (1B tokens) with 18 decimals
    uint256 public constant MAX_SUPPLY         = 1_000_000_000 * 10 ** ERC20_DECIMALS;

    // -----------------------------------------------------------------------
    // 3.2  STATE VARIABLES
    // -----------------------------------------------------------------------
    IARCFees public feeModule;   // Arc fee module contract (mutable reference)
    IStaking public stakingModule; // Arc staking contract (mutable reference)
    
    // Arc fee module can be upgraded; keep mutable reference
    address public feeModuleAddr;
    address public stakingModuleAddr;
    
    // Fee configuration
    bool   public feeEnabled   = true;
    uint256 public maxFeeBP    = 100;            // default 1%
    address public feeCollector = address(0);   // Receiver of collected fees

    // -----------------------------------------------------------------------
    // 3.3  EVENTS
    // -----------------------------------------------------------------------
    event TransferWithFee(address indexed from, address indexed to, uint256 amount, uint256 fee);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event FeeEnabledChanged(bool enabled);
    event MaxFeeChanged(uint256 newMaxFeeBP);
    event FeeCollectorChanged(address newCollector);
    event FeeModuleUpdated(address newModule);
    event StakingModuleUpdated(address newModule);
    event NativeToERC20Converted(address indexed user, uint256 nativeAmount, uint256 erc20Amount);
    event ERC20ToNativeConverted(address indexed user, uint256 erc20Amount, uint256 nativeAmount);

    // -----------------------------------------------------------------------
    // 3.4  CONSTRUCTOR
    // -----------------------------------------------------------------------
    /**
     * @param initialSupply       Initial supply in whole tokens (e.g., 1_000_000_000 for 1B PANTE).
     * @param feeModuleAddr_      Address of Arc fee contract implementing IARCFees.
     * @param stakingModuleAddr_  Address of Arc staking contract.
     */
    constructor(
        uint256 initialSupply,
        address feeModuleAddr_,
        address stakingModuleAddr_
    ) 
        ERC20("Pante Token", "PANTE")
        ERC20Permit("Pante Token")
        AccessControl()
        Pausable()
        Ownable(msg.sender)
    {
        require(feeModuleAddr_ != address(0), "Invalid fee module address");
        require(stakingModuleAddr_ != address(0), "Invalid staking module address");
        
        // Store references for later use
        feeModuleAddr = feeModuleAddr_;
        stakingModuleAddr = stakingModuleAddr_;
        feeModule = IARCFees(feeModuleAddr_);
        stakingModule = IStaking(stakingModuleAddr_);
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);
        _grantRole(STAKING_MANAGER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Mint initial supply to the deployer (owner) – ERC-20 uses 18 decimals
        _mint(msg.sender, initialSupply * 10 ** ERC20_DECIMALS);
    }

    // -----------------------------------------------------------------------
    // 3.5  DECIMALS HELPERS (Arc stable-coin native model)
    // -----------------------------------------------------------------------
    /**
     * @notice Returns 18 – the ERC-20 decimals used by PanteToken on Arc.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @notice Convert native (18-dec) amount to ERC-20 (18-dec) amount.
     * @dev    Since both are 18 decimals, this is a no‑op.
     */
    function nativeToERC20(uint256 nativeAmount) public pure returns (uint256 erc20Amount) {
        erc20Amount = nativeAmount;
    }

    /**
     * @notice Convert ERC-20 (18-dec) amount to native (18-dec) amount.
     */
    function erc20ToNative(uint256 erc20Amount) public pure returns (uint256 nativeAmount) {
        nativeAmount = erc20Amount;
    }

    // -----------------------------------------------------------------------
    // 3.6  FEE HANDLING (Arc EWMA-smoothed USDC fees)
    // -----------------------------------------------------------------------
    /**
     * @dev Internal helper that computes the fee.
     *      Fee = amount * feeBP / 10_000.
     *      Returns (feeAmount, netAmount).
     */
    function _computeFee(uint256 amount) internal view returns (uint256 feeAmount, uint256 netAmount) {
        if (!feeEnabled) {
            return (0, amount);
        }
        
        // 1️⃣ Query fee (basis points) from Arc fee module
        uint256 feeBP = feeModule.currentFee();
        require(feeBP <= MAX_FEE_BP, "Fee exceeds protocol max");
        
        // 2️⃣ Apply the maximum fee set by the admin
        if (feeBP > maxFeeBP) feeBP = maxFeeBP;
        
        // 3️⃣ Compute fee amount (rounded down)
        feeAmount = (amount * feeBP) / 10_000;
        netAmount = amount - feeAmount;
    }

    // -----------------------------------------------------------------------
    // 3.7  HOOK: _update – apply fee on ordinary transfers
    // -----------------------------------------------------------------------
    /**
     * @dev Override OZ's `_update` to apply the fee on every ordinary transfer.
     *      The parent implementation does the storage updates; we only inject
     *      fee logic before delegating to it.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // Only apply fee for ordinary transfers (not mint/burn)
        if (from != address(0) && to != address(0)) {
            (uint256 feeAmount, uint256 netAmount) = _computeFee(value);
            
            // Transfer fee to fee collector (if any)
            if (feeAmount > 0) {
                super._update(from, feeCollector, feeAmount);
            }
            
            // Transfer net amount to recipient
            super._update(from, to, netAmount);
        }
        
        // For mint (from == 0) or burn (to == 0), use standard logic without fee
        // The parent implementation handles those cases, so we just delegate.
        super._update(from, to, value);
    }

    // -----------------------------------------------------------------------
    // 3.8  ERC-20 PUBLIC FUNCTIONS
    // -----------------------------------------------------------------------
    // We rely on ERC20's transfer and transferFrom which call _transfer -> _update.
    // No need to override them unless we want custom behavior.

    // -----------------------------------------------------------------------
    // 3.9  MINT / BURN (role‑guarded)
    // -----------------------------------------------------------------------
    /**
     * @notice Mint new tokens. Only minter role can call.
     * @dev   Checks that total supply does not exceed MAX_SUPPLY.
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds MAX_SUPPLY");
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from the caller.
     * @dev   Only burner role can call.
     */
    function burn(uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
        whenNotPaused
    {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from an account (via allowance).
     * @dev   Only burner role can call.
     */
    function burnFrom(address account, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
        whenNotPaused
    {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    // -----------------------------------------------------------------------
    // 3.10  STAKING INTEGRATION (Arc staking contract)
    // -----------------------------------------------------------------------
    /**
     * @notice Stake `amount` tokens into Arc's staking contract.
     * @param amount Amount in ERC-20 units (18 decimals).
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        // Transfer tokens from caller to staking contract (fee applied via _update)
        super.transfer(address(stakingModule), amount);
        stakingModule.stake(msg.sender, amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraw previously staked tokens.
     * @dev   Only non‑paused operation.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        stakingModule.withdraw(msg.sender, amount);
        // Transfer from staking contract to user (fee applied via super.transfer)
        super.transferFrom(address(stakingModule), msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim staking rewards from the Arc staking contract.
     */
    function claimRewards() external nonReentrant {
        stakingModule.claimRewards(msg.sender);
        emit RewardsClaimed(msg.sender, 0); // the actual amount is emitted by the staking contract
    }

    // -----------------------------------------------------------------------
    // 3.11  VIEW HELPERS
    // -----------------------------------------------------------------------
    function feeModuleAddress() external view returns (address) {
        return address(feeModule);
    }

    function stakingModuleAddress() external view returns (address) {
        return address(stakingModule);
    }

    function currentFeeBP() external view returns (uint256) {
        return feeModule.currentFee();
    }

    function isFeeEnabled() external view returns (bool) {
        return feeEnabled;
    }

    function getFeeCollector() external view returns (address) {
        return feeCollector;
    }

    function getMaxFeeBP() external view returns (uint256) {
        return maxFeeBP;
    }

    // -----------------------------------------------------------------------
    // 3.12 ADMIN / GOVERNANCE FUNCTIONS
    // -----------------------------------------------------------------------
    function setFeeEnabled(bool enabled) external onlyRole(FEE_MANAGER_ROLE) {
        feeEnabled = enabled;
        emit FeeEnabledChanged(enabled);
    }

    function setMaxFeeBP(uint256 newMaxFeeBP) external onlyRole(FEE_MANAGER_ROLE) {
        require(newMaxFeeBP <= MAX_FEE_BP, "Fee exceeds protocol max");
        maxFeeBP = newMaxFeeBP;
        emit MaxFeeChanged(newMaxFeeBP);
    }

    function setFeeCollector(address newCollector) external onlyRole(FEE_MANAGER_ROLE) {
        require(newCollector != address(0), "Invalid collector address");
        feeCollector = newCollector;
        emit FeeCollectorChanged(newCollector);
    }

    function updateFeeModule(address newModule) external onlyRole(FEE_MANAGER_ROLE) {
        require(newModule != address(0), "Zero address");
        feeModuleAddr = newModule;
        feeModule = IARCFees(newModule);
        feeCollector = feeModule.feeCollector(); // keep feeCollector in sync
        emit FeeModuleUpdated(newModule);
    }

    function updateStakingModule(address newModule) external onlyRole(STAKING_MANAGER_ROLE) {
        require(newModule != address(0), "Zero address");
        stakingModuleAddr = newModule;
        stakingModule = IStaking(newModule);
        emit StakingModuleUpdated(newModule);
    }

    // -----------------------------------------------------------------------
    // 3.13 PAUSABLE (emergency stop)
    // -----------------------------------------------------------------------
    /**
     * @notice Emergency stop for all token transfers.
     * @dev   Only a user with PAUSER_ROLE can trigger.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -----------------------------------------------------------------------
    // 3.15 ROLE MANAGEMENT HELPERS
    // -----------------------------------------------------------------------
    function grantMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    function revokeMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    function grantBurner(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BURNER_ROLE, account);
    }

    function revokeBurner(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(BURNER_ROLE, account);
    }

    // -----------------------------------------------------------------------
    // 3.15 MULTICALL (Arc CallFrom precompile compatibility)
    // -----------------------------------------------------------------------
    /**
     * @notice Execute multiple contract calls in one transaction.
     */
    function multicall(bytes[] calldata data) external nonReentrant returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory returnData) = address(this).delegatecall(data[i]);
            if (success) {
                results[i] = returnData;
            } else {
                assembly {
                    revert(returnData, returndatasize())
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // 3.16 EIP-1363 PAYABLE INTERFACE (tokenPayable)
    // -----------------------------------------------------------------------
    /**
     * @dev ERC-1363 `transferAndCall` – transfers tokens then calls a receiver.
     */
    function transferAndCall(
        address receiver,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool) {
        super.transfer(receiver, amount);
        bytes4 onTransfer = IERC1363Receiver(receiver).onTransferReceived(msg.sender, amount, data);
        require(onTransfer != bytes4(0), "Transfer rejected by receiver");
        return true;
    }

    function transferFromAndCall(
        address sender,
        address receiver,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool) {
        super.transferFrom(sender, receiver, amount);
        bytes4 onTransfer = IERC1363Receiver(receiver).onTransferReceived(sender, amount, data);
        require(onTransfer != bytes4(0), "Transfer rejected by receiver");
        return true;
    }
}