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

contract SwipeGigApplications is Ownable {
    enum ApplicationStatus {
        APPLIED,
        INTERVIEWING,
        OFFERED,
        REJECTED,
        WITHDRAWN
    }

    struct ApplicationRecord {
        uint256 id;
        string jobId;
        string companyName;
        ApplicationStatus status;
        uint256 timestamp;
    }

    mapping(address => ApplicationRecord[]) private userApplications;
    uint256 public nextApplicationId;

    event ApplicationRecorded(address indexed user, uint256 indexed id, string jobId, string companyName, uint256 timestamp);
    event StatusUpdated(address indexed user, uint256 indexed id, ApplicationStatus status, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function recordApplication(address user, string calldata jobId, string calldata companyName) external onlyOwner returns (uint256) {
        require(user != address(0), "Invalid user address");
        
        uint256 appId = nextApplicationId++;
        
        userApplications[user].push(ApplicationRecord({
            id: appId,
            jobId: jobId,
            companyName: companyName,
            status: ApplicationStatus.APPLIED,
            timestamp: block.timestamp
        }));

        emit ApplicationRecorded(user, appId, jobId, companyName, block.timestamp);
        return appId;
    }

    function updateStatus(address user, uint256 appId, ApplicationStatus status) external onlyOwner {
        ApplicationRecord[] storage apps = userApplications[user];
        bool found = false;
        
        for (uint256 i = 0; i < apps.length; i++) {
            if (apps[i].id == appId) {
                apps[i].status = status;
                found = true;
                emit StatusUpdated(user, appId, status, block.timestamp);
                break;
            }
        }
        
        require(found, "Application not found");
    }

    function getApplications(address user) external view returns (ApplicationRecord[] memory) {
        return userApplications[user];
    }
}
