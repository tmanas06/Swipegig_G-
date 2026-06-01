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

contract SwipeGigRewards is Ownable, ReentrancyGuard {
    struct RewardRecord {
        uint256 amount;
        string triggerType;
        uint256 timestamp;
    }

    mapping(address => RewardRecord[]) private userRewards;
    mapping(address => uint256) public totalEarned;
    
    address public backendSigner;

    event RewardMinted(address indexed user, uint256 amount, string triggerType, uint256 timestamp);

    constructor(address _backendSigner) Ownable(msg.sender) {
        backendSigner = _backendSigner;
    }

    modifier onlyBackendOrOwner() {
        require(msg.sender == owner() || msg.sender == backendSigner, "Unauthorized");
        _;
    }

    function setBackendSigner(address _backendSigner) external onlyOwner {
        backendSigner = _backendSigner;
    }

    function recordReward(address user, uint256 amount, string calldata triggerType) external onlyBackendOrOwner nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        userRewards[user].push(RewardRecord({
            amount: amount,
            triggerType: triggerType,
            timestamp: block.timestamp
        }));

        totalEarned[user] += amount;

        emit RewardMinted(user, amount, triggerType, block.timestamp);
    }

    function getRewardHistory(address user) external view returns (RewardRecord[] memory) {
        return userRewards[user];
    }
}
