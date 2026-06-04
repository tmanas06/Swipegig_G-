// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SwipeGigWelcomeNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    address public backendSigner;

    mapping(address => bool) public hasMinted;

    string private _baseTokenURI;

    event WelcomeNFTMinted(address indexed user, uint256 tokenId);

    modifier onlyBackend() {
        require(msg.sender == backendSigner, "Not authorized");
        _;
    }

    constructor(
        address _backendSigner,
        string memory baseURI
    ) ERC721("SwipeGig Verified", "SWGV") Ownable(msg.sender) {
        backendSigner = _backendSigner;
        _baseTokenURI = baseURI;
    }

    /// @notice Mint welcome NFT to a newly verified user
    function mintWelcomeNFT(address user) external onlyBackend {
        require(!hasMinted[user], "Already minted");
        hasMinted[user] = true;
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(user, tokenId);
        emit WelcomeNFTMinted(user, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }
}
