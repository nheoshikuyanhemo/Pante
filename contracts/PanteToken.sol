// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface IStaking {
    function stake(address user, uint256 amount) external;
    function withdraw(address user, uint256 amount) external;
    function claimRewards(address user) external returns (uint256);
}

interface IERC1363Receiver {
    function onTransferReceived(address operator, address from, uint256 value, bytes calldata data)
        external
        returns (bytes4);
}

// ---------------------------------------------------------------------------
// PanteToken
//
// Fee model (on every ordinary transfer — skipped for mint / burn):
//   • 0.5 % (50 bp)  →  feeCollector   (dev wallet)
//   • 0.5 % (50 bp)  →  liquidityCollector  (liquidity wallet)
//   Total fee: 1 % (100 bp).
//
// Both collector addresses are set at construction and are updatable by
// FEE_MANAGER_ROLE.  The fee can be toggled off entirely via setFeeEnabled().
// ---------------------------------------------------------------------------
contract PanteToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, AccessControl, Ownable, ReentrancyGuard {

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE          = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE          = keccak256("BURNER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE     = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant STAKING_MANAGER_ROLE = keccak256("STAKING_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE          = keccak256("PAUSER_ROLE");

    // ── Fee constants ────────────────────────────────────────────────────────
    uint256 public constant MAX_BASIS_POINTS = 10_000;

    /// @notice Fee to dev wallet on every transfer (basis points, 50 = 0.5 %).
    uint256 public devFeeBP       = 50;

    /// @notice Fee to liquidity wallet on every transfer (basis points, 50 = 0.5 %).
    uint256 public liquidityFeeBP = 50;

    /// @notice Toggle fees on / off without changing the BP values.
    bool public feeEnabled = true;

    /// @notice Receives the 0.5 % dev portion of every fee-bearing transfer.
    ///         Set to the Pante dev wallet at construction.
    address public feeCollector;

    /// @notice Receives the 0.5 % liquidity portion of every fee-bearing transfer.
    address public liquidityCollector;

    // ── EIP-1363 ─────────────────────────────────────────────────────────────
    bytes4 private constant ERC1363_RECEIVED =
        bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"));

    // ── Staking module ───────────────────────────────────────────────────────
    IStaking public stakingModule;

    // ── ERC-7572 Contract-level metadata ─────────────────────────────────────
    /// @notice IPFS URI pointing to the token's contract-level metadata JSON.
    ///         Format: ipfs://<CID>  — matches the ERC-7572 / launchpad convention.
    ///         The JSON should include: name, symbol, description, image (ipfs://), decimals,
    ///         external_link, and any custom launchpad fields.
    string public contractURI;

    event ContractURIUpdated(string newURI);

    /// @notice Set or update the contract-level metadata URI (IPFS or HTTPS).
    ///         Restricted to DEFAULT_ADMIN_ROLE so only the deployer/owner can update.
    function setContractURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        contractURI = uri;
        emit ContractURIUpdated(uri);
    }

    // ── Events ───────────────────────────────────────────────────────────────
    event FeeEnabledUpdated(bool enabled);
    event DevFeeBPUpdated(uint256 devFeeBP);
    event LiquidityFeeBPUpdated(uint256 liquidityFeeBP);
    event FeeCollectorUpdated(address indexed feeCollector);
    event LiquidityCollectorUpdated(address indexed liquidityCollector);
    event StakingModuleUpdated(address indexed stakingModule);

    // ── Errors ───────────────────────────────────────────────────────────────
    error InvalidAddress();
    error InvalidBasisPoints();
    error ERC1363InvalidReceiver(address receiver);
    error ERC1363TransferRejected(address receiver, bytes4 response);

    // ── Constructor ──────────────────────────────────────────────────────────
    /// @param initialSupply     Whole-token supply (multiplied by 10^18 inside).
    /// @param feeCollector_     Dev wallet — receives 0.5 % of every transfer.
    /// @param liquidityCollector_ Liquidity wallet — receives 0.5 % of every transfer.
    /// @param stakingModuleAddr_ Staking contract (may be address(this) as stub on testnet).
    constructor(
        uint256 initialSupply,
        address feeCollector_,
        address liquidityCollector_,
        address stakingModuleAddr_
    )
        ERC20("Pante Token", "PANTE")
        ERC20Permit("Pante Token")
        Ownable(msg.sender)
    {
        if (feeCollector_         == address(0)) revert InvalidAddress();
        if (liquidityCollector_   == address(0)) revert InvalidAddress();
        if (stakingModuleAddr_    == address(0)) revert InvalidAddress();

        feeCollector       = feeCollector_;
        liquidityCollector = liquidityCollector_;
        stakingModule      = IStaking(stakingModuleAddr_);

        _grantRole(DEFAULT_ADMIN_ROLE,    msg.sender);
        _grantRole(MINTER_ROLE,           msg.sender);
        _grantRole(BURNER_ROLE,           msg.sender);
        _grantRole(FEE_MANAGER_ROLE,      msg.sender);
        _grantRole(STAKING_MANAGER_ROLE,  msg.sender);
        _grantRole(PAUSER_ROLE,           msg.sender);

        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // ── Admin — pause ─────────────────────────────────────────────────────────
    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ── Admin — mint / burn ───────────────────────────────────────────────────
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burnByRole(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    // ── Admin — fee config ────────────────────────────────────────────────────

    /// @notice Enable or disable transfer fees globally.
    function setFeeEnabled(bool enabled) external onlyRole(FEE_MANAGER_ROLE) {
        feeEnabled = enabled;
        emit FeeEnabledUpdated(enabled);
    }

    /// @notice Update the dev-fee slice (basis points).  Sum of dev + liquidity must not exceed 1000 bp (10 %).
    function setDevFeeBP(uint256 devFeeBP_) external onlyRole(FEE_MANAGER_ROLE) {
        if (devFeeBP_ + liquidityFeeBP > 1_000) revert InvalidBasisPoints();
        devFeeBP = devFeeBP_;
        emit DevFeeBPUpdated(devFeeBP_);
    }

    /// @notice Update the liquidity-fee slice (basis points).  Sum of dev + liquidity must not exceed 1000 bp (10 %).
    function setLiquidityFeeBP(uint256 liquidityFeeBP_) external onlyRole(FEE_MANAGER_ROLE) {
        if (devFeeBP + liquidityFeeBP_ > 1_000) revert InvalidBasisPoints();
        liquidityFeeBP = liquidityFeeBP_;
        emit LiquidityFeeBPUpdated(liquidityFeeBP_);
    }

    /// @notice Update the dev wallet that receives the 0.5 % dev fee.
    function setFeeCollector(address feeCollector_) external onlyRole(FEE_MANAGER_ROLE) {
        if (feeCollector_ == address(0)) revert InvalidAddress();
        feeCollector = feeCollector_;
        emit FeeCollectorUpdated(feeCollector_);
    }

    /// @notice Update the liquidity wallet that receives the 0.5 % liquidity fee.
    function setLiquidityCollector(address liquidityCollector_) external onlyRole(FEE_MANAGER_ROLE) {
        if (liquidityCollector_ == address(0)) revert InvalidAddress();
        liquidityCollector = liquidityCollector_;
        emit LiquidityCollectorUpdated(liquidityCollector_);
    }

    /// @notice Update the staking module contract.
    function updateStakingModule(address stakingModuleAddr_) external onlyRole(STAKING_MANAGER_ROLE) {
        if (stakingModuleAddr_ == address(0)) revert InvalidAddress();
        stakingModule = IStaking(stakingModuleAddr_);
        emit StakingModuleUpdated(stakingModuleAddr_);
    }

    // ── Staking pass-throughs ─────────────────────────────────────────────────
    function stake(uint256 amount) external nonReentrant {
        stakingModule.stake(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        stakingModule.withdraw(msg.sender, amount);
    }

    function claimRewards() external nonReentrant returns (uint256) {
        return stakingModule.claimRewards(msg.sender);
    }

    // ── Multicall ─────────────────────────────────────────────────────────────
    /**
     * @dev Executes a batch of calls via delegatecall.
     *      Reentrancy is blocked for the whole batch via nonReentrant.
     */
    function multicall(bytes[] calldata data) external nonReentrant returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; ++i) {
            (bool success, bytes memory returnData) = address(this).delegatecall(data[i]);
            if (!success) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            results[i] = returnData;
        }
    }

    // ── EIP-1363 ─────────────────────────────────────────────────────────────
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool) {
        transfer(to, value);
        _checkOnTransferReceived(to, msg.sender, msg.sender, value, data);
        return true;
    }

    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool) {
        transferFrom(from, to, value);
        _checkOnTransferReceived(to, msg.sender, from, value, data);
        return true;
    }

    // ── ERC-165 ──────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────
    function _checkOnTransferReceived(
        address to,
        address operator,
        address from,
        uint256 value,
        bytes calldata data
    ) internal {
        if (to.code.length == 0) revert ERC1363InvalidReceiver(to);
        bytes4 response = IERC1363Receiver(to).onTransferReceived(operator, from, value, data);
        if (response != ERC1363_RECEIVED) revert ERC1363TransferRejected(to, response);
    }

    // ── Transfer hook — split fee ─────────────────────────────────────────────
    /**
     * @dev Fee is applied on every ordinary transfer (from != 0, to != 0).
     *      Mint and burn paths bypass the fee entirely.
     *
     *      Fee split per transfer:
     *        devFee       = value * devFeeBP       / 10_000   → feeCollector
     *        liquidityFee = value * liquidityFeeBP / 10_000   → liquidityCollector
     *        net          = value - devFee - liquidityFee      → recipient
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        bool applyFee = feeEnabled
            && from != address(0)
            && to   != address(0)
            && feeCollector       != address(0)
            && liquidityCollector != address(0);

        if (applyFee) {
            uint256 devFee       = (value * devFeeBP)       / MAX_BASIS_POINTS;
            uint256 liquidityFee = (value * liquidityFeeBP) / MAX_BASIS_POINTS;
            uint256 netAmount    = value - devFee - liquidityFee;

            // Route each slice through the parent _update independently so
            // balances and events are always consistent.
            if (devFee > 0) {
                super._update(from, feeCollector, devFee);
            }
            if (liquidityFee > 0) {
                super._update(from, liquidityCollector, liquidityFee);
            }
            super._update(from, to, netAmount);
        } else {
            super._update(from, to, value);
        }
    }
}
