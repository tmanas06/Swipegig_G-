// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SwipeGigApplications is Ownable {
    struct Application {
        address applicant;
        string jobId;
        string company;
        uint256 appliedAt;
        uint8 status; // 0=applied, 1=interviewing, 2=offered, 3=rejected
    }

    mapping(address => Application[]) public userApplications;
    mapping(address => uint256) public applicationCount;

    address public backendSigner;

    event ApplicationRecorded(
        address indexed applicant,
        string jobId,
        string company,
        uint256 timestamp
    );

    event ApplicationStatusUpdated(
        address indexed applicant,
        uint256 applicationIndex,
        uint8 newStatus
    );

    modifier onlyBackend() {
        require(msg.sender == backendSigner, "Not authorized");
        _;
    }

    constructor(address _backendSigner) Ownable(msg.sender) {
        backendSigner = _backendSigner;
    }

    function recordApplication(
        address applicant,
        string calldata jobId,
        string calldata company
    ) external onlyBackend {
        userApplications[applicant].push(Application({
            applicant: applicant,
            jobId: jobId,
            company: company,
            appliedAt: block.timestamp,
            status: 0
        }));
        applicationCount[applicant]++;
        emit ApplicationRecorded(applicant, jobId, company, block.timestamp);
    }

    function updateApplicationStatus(
        address applicant,
        uint256 index,
        uint8 status
    ) external onlyBackend {
        require(index < userApplications[applicant].length, "Invalid index");
        userApplications[applicant][index].status = status;
        emit ApplicationStatusUpdated(applicant, index, status);
    }

    function getApplications(
        address applicant
    ) external view returns (Application[] memory) {
        return userApplications[applicant];
    }

    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }
}
