// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SwipeGigPool is Ownable, ReentrancyGuard {
    IERC20 public goodDollarToken;
    
    uint256 public weeklyClaimAmount;
    uint256 public activityThreshold;

    mapping(address => uint256) public lastClaimedTimestamp;
    mapping(address => uint256) public weeklyActivity;
    
    event Claimed(address indexed user, uint256 amount, uint256 timestamp);
    event ActivityLogged(address indexed user, uint256 newActivityCount, uint256 timestamp);
    event PoolFunded(address indexed donor, uint256 amount, uint256 timestamp);

    constructor(
        address _goodDollarToken,
        uint256 _weeklyClaimAmount,
        uint256 _activityThreshold
    ) Ownable(msg.sender) {
        goodDollarToken = IERC20(_goodDollarToken);
        weeklyClaimAmount = _weeklyClaimAmount;
        activityThreshold = _activityThreshold;
    }

    function setParams(uint256 _weeklyClaimAmount, uint256 _activityThreshold) external onlyOwner {
        weeklyClaimAmount = _weeklyClaimAmount;
        activityThreshold = _activityThreshold;
    }

    function logActivity(address user, uint256 count) external onlyOwner {
        weeklyActivity[user] += count;
        emit ActivityLogged(user, weeklyActivity[user], block.timestamp);
    }

    function resetActivity(address user) external onlyOwner {
        weeklyActivity[user] = 0;
    }

    function fundPool(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(goodDollarToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit PoolFunded(msg.sender, amount, block.timestamp);
    }

    function claimWeeklyReward() external nonReentrant {
        require(block.timestamp >= lastClaimedTimestamp[msg.sender] + 7 days, "Claim limit is weekly");
        require(weeklyActivity[msg.sender] >= activityThreshold, "Insufficient activity count");

        uint256 poolBalance = goodDollarToken.balanceOf(address(this));
        require(poolBalance >= weeklyClaimAmount, "Insufficient pool funding");

        lastClaimedTimestamp[msg.sender] = block.timestamp;
        weeklyActivity[msg.sender] = 0;

        require(goodDollarToken.transfer(msg.sender, weeklyClaimAmount), "Transfer failed");
        
        emit Claimed(msg.sender, weeklyClaimAmount, block.timestamp);
    }
}
