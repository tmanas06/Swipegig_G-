// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwipeGigRewards is Ownable {
    IERC20 public gToken;
    address public backendSigner;

    // Reward amounts in G$ (18 decimals)
    uint256 public constant REWARD_PROFILE_COMPLETE = 50 ether;
    uint256 public constant REWARD_FIRST_APPLICATION = 20 ether;
    uint256 public constant REWARD_PER_APPLICATION = 5 ether;
    uint256 public constant REWARD_INTERVIEW = 100 ether;
    uint256 public constant REWARD_REFERRAL = 30 ether;
    uint256 public constant REWARD_REVIEW = 15 ether;
    uint256 public constant REWARD_DAILY_STREAK = 2 ether;

    // Prevent double-claiming
    mapping(address => mapping(string => bool)) public hasClaimed;

    // Track reward history
    mapping(address => uint256) public totalEarned;

    event RewardDistributed(
        address indexed user,
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    modifier onlyBackend() {
        require(msg.sender == backendSigner, "Not authorized");
        _;
    }

    constructor(address _gToken, address _backendSigner) Ownable(msg.sender) {
        gToken = IERC20(_gToken);
        backendSigner = _backendSigner;
    }

    /// @notice Distribute G$ reward to a user for a specific action
    /// @param user The recipient address (Privy wallet)
    /// @param amount Amount of G$ to distribute (in wei)
    /// @param reason Unique key for this reward (e.g. "profile_complete", "apply_123")
    function rewardUser(
        address user,
        uint256 amount,
        string calldata reason
    ) external onlyBackend {
        require(!hasClaimed[user][reason], "Already claimed");
        require(
            gToken.balanceOf(address(this)) >= amount,
            "Insufficient reward pool"
        );

        hasClaimed[user][reason] = true;
        totalEarned[user] += amount;

        gToken.transfer(user, amount);

        emit RewardDistributed(user, amount, reason, block.timestamp);
    }

    /// @notice Batch reward multiple users at once
    function batchRewardUsers(
        address[] calldata users,
        uint256[] calldata amounts,
        string[] calldata reasons
    ) external onlyBackend {
        require(
            users.length == amounts.length &&
            amounts.length == reasons.length,
            "Array length mismatch"
        );
        for (uint256 i = 0; i < users.length; i++) {
            if (!hasClaimed[users[i]][reasons[i]]) {
                hasClaimed[users[i]][reasons[i]] = true;
                totalEarned[users[i]] += amounts[i];
                gToken.transfer(users[i], amounts[i]);
                emit RewardDistributed(
                    users[i], amounts[i], reasons[i], block.timestamp
                );
            }
        }
    }

    /// @notice Check reward balance in contract
    function rewardPoolBalance() external view returns (uint256) {
        return gToken.balanceOf(address(this));
    }

    /// @notice Update backend signer
    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }

    /// @notice Emergency withdraw by owner
    function withdrawTokens(uint256 amount) external onlyOwner {
        gToken.transfer(owner(), amount);
    }
}
