// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwipeGigPool is Ownable {
    IERC20 public gToken;
    address public backendSigner;

    // Stream rate: G$ per second per active user
    uint256 public streamRatePerSecond = 0.0001 ether;

    struct Streamer {
        bool isActive;
        uint256 lastClaimedAt;
        uint256 totalClaimed;
        uint256 joinedAt;
    }

    mapping(address => Streamer) public streamers;
    address[] public activeStreamers;
    uint256 public activeStreamerCount;

    event StreamerAdded(address indexed user, uint256 timestamp);
    event StreamerRemoved(address indexed user, uint256 timestamp);
    event StreamClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event PoolFunded(address indexed donor, uint256 amount, uint256 timestamp);

    modifier onlyBackend() {
        require(msg.sender == backendSigner, "Not authorized");
        _;
    }

    constructor(address _gToken, address _backendSigner) Ownable(msg.sender) {
        gToken = IERC20(_gToken);
        backendSigner = _backendSigner;
    }

    /// @notice Add a verified job seeker to the stream
    function addStreamer(address user) external onlyBackend {
        require(!streamers[user].isActive, "Already streaming");
        streamers[user] = Streamer({
            isActive: true,
            lastClaimedAt: block.timestamp,
            totalClaimed: 0,
            joinedAt: block.timestamp
        });
        activeStreamers.push(user);
        activeStreamerCount++;
        emit StreamerAdded(user, block.timestamp);
    }

    /// @notice Remove a user from the stream (missed weekly activity)
    function removeStreamer(address user) external onlyBackend {
        require(streamers[user].isActive, "Not streaming");
        streamers[user].isActive = false;
        activeStreamerCount--;
        emit StreamerRemoved(user, block.timestamp);
    }

    /// @notice User claims their accumulated G$ stream
    function claimStream() external {
        Streamer storage s = streamers[msg.sender];
        require(s.isActive, "Not an active streamer");

        uint256 elapsed = block.timestamp - s.lastClaimedAt;
        uint256 claimable = elapsed * streamRatePerSecond;

        require(claimable > 0, "Nothing to claim");
        require(
            gToken.balanceOf(address(this)) >= claimable,
            "Pool insufficient funds"
        );

        s.lastClaimedAt = block.timestamp;
        s.totalClaimed += claimable;

        gToken.transfer(msg.sender, claimable);
        emit StreamClaimed(msg.sender, claimable, block.timestamp);
    }

    /// @notice View claimable amount for a user
    function claimableAmount(address user) external view returns (uint256) {
        Streamer memory s = streamers[user];
        if (!s.isActive) return 0;
        uint256 elapsed = block.timestamp - s.lastClaimedAt;
        return elapsed * streamRatePerSecond;
    }

    /// @notice Anyone can fund the pool
    function fundPool(uint256 amount) external {
        gToken.transferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount, block.timestamp);
    }

    /// @notice Pool balance
    function poolBalance() external view returns (uint256) {
        return gToken.balanceOf(address(this));
    }

    function setStreamRate(uint256 rate) external onlyOwner {
        streamRatePerSecond = rate;
    }

    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }
}
