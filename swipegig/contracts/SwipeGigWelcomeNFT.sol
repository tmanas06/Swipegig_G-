// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for any contract that wants to support safeTransfers from ERC721 asset contracts.
 */
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

/**
 * @title SwipeGigWelcomeNFT
 * @dev Self-contained ERC-721 Welcome Pass NFT for new SwipeGig joiners.
 */
contract SwipeGigWelcomeNFT {
    string public name = "SwipeGig Welcome Pass";
    string public symbol = "SGWP";

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    
    address public owner;
    uint256 private _nextTokenId;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event WelcomeNFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Zero address query");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address ownerAddress = _owners[tokenId];
        require(ownerAddress != address(0), "Token does not exist");
        return ownerAddress;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function mintWelcomeNFT(address to, string calldata uri) external onlyOwner returns (uint256) {
        require(to != address(0), "Mint to zero address");
        
        uint256 tokenId = _nextTokenId++;
        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
        emit WelcomeNFTMinted(to, tokenId, uri);

        // Safe transfer check for contract recipients
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, address(0), tokenId, "") returns (bytes4 retval) {
                require(retval == IERC721Receiver.onERC721Received.selector, "ERC721: transfer to non ERC721Receiver implementer");
            } catch {
                revert("ERC721: transfer to non ERC721Receiver implementer");
            }
        }

        return tokenId;
    }
}
