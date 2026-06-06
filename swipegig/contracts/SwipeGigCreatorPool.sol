// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwipeGigCreatorPool is Ownable {
    IERC20 public gToken;
    address public backendSigner;

    // Fixed bonus amounts (in G$ wei, 18 decimals)
    uint256 public constant BONUS_1ST = 10 ether;
    uint256 public constant BONUS_2ND = 5 ether;
    uint256 public constant BONUS_3RD = 1 ether;

    mapping(address => uint256) public totalEarned;

    event WeeklyBonusDistributed(
        address indexed winner,
        uint256 rank,
        uint256 amount,
        uint256 weekOf,
        uint256 timestamp
    );

    event PoolFunded(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyBackend() {
        require(msg.sender == backendSigner, "Not authorized");
        _;
    }

    constructor(
        address _gToken,
        address _backendSigner
    ) Ownable(msg.sender) {
        gToken = IERC20(_gToken);
        backendSigner = _backendSigner;
    }

    /// @notice Distribute weekly bonuses to top 3 creators
    /// @param winners Array of exactly 3 addresses [1st, 2nd, 3rd]
    /// @param weekOf Unix timestamp of the Monday for this week
    function distributeWeeklyBonus(
        address[3] calldata winners,
        uint256 weekOf
    ) external onlyBackend {
        uint256[3] memory amounts = [BONUS_1ST, BONUS_2ND, BONUS_3RD];
        uint256 totalNeeded = BONUS_1ST + BONUS_2ND + BONUS_3RD;

        require(
            gToken.balanceOf(address(this)) >= totalNeeded,
            "Insufficient pool balance"
        );

        for (uint256 i = 0; i < 3; i++) {
            totalEarned[winners[i]] += amounts[i];
            gToken.transfer(winners[i], amounts[i]);
            emit WeeklyBonusDistributed(
                winners[i], i + 1, amounts[i], weekOf, block.timestamp
            );
        }
    }

    /// @notice Anyone can fund the creator pool
    function fundPool(uint256 amount) external {
        gToken.transferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount, block.timestamp);
    }

    function poolBalance() external view returns (uint256) {
        return gToken.balanceOf(address(this));
    }

    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        gToken.transfer(owner(), amount);
    }
}
