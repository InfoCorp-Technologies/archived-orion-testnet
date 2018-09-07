pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../sesc-contracts/Whitelist.sol";

contract Livestock is ERC721Token, Ownable {

    Whitelist public whitelist;

    event Mint(address indexed to, uint indexed id);
    event Burn(address indexed burner, uint indexed id);

    modifier isWhitelisted(address from, address to) {
        require(whitelist.isWhitelist(from));
        require(whitelist.isWhitelist(to));
        _;
    }

    constructor(
        string _name,
        string _symbol,
        address _registry,
        Whitelist _whitelist
    ) public ERC721Token(_name, _symbol) {
        owner = _registry;
        whitelist = _whitelist;
    }

    function tokensOfOwner(address _owner) external view returns (uint[]) {
        return ownedTokens[_owner];
    }

    function transfer(address _to, uint256 _tokenId)
        public isWhitelisted(msg.sender, _to)
    {
        require(_to != address(0));
        removeTokenFrom(msg.sender, _tokenId);
        addTokenTo(_to, _tokenId);
        emit Transfer(msg.sender, _to, _tokenId);
    }

    function safeTransfer(address _to, uint256 _tokenId) public {
        safeTransfer(_to, _tokenId, "");
    }

    function safeTransfer(address _to, uint256 _tokenId, bytes _data) public {
        transfer(_to, _tokenId);
        require(checkAndCallSafeTransfer(msg.sender, _to, _tokenId, _data));
    }

    function transferFrom(address _from, address _to, uint256 _tokenId)
        public isWhitelisted(_from, _to)
    {
        super.transferFrom(_from, _to, _tokenId);
    }

    function mint(address _to, uint256 _tokenId) external onlyOwner {
        super._mint(_to, _tokenId);
        emit Mint(_to, _tokenId);
    }

    function burn(address _to, uint256 _tokenId) external onlyOwner {
        super._burn(_to, _tokenId);
        emit Burn(_to, _tokenId);
    }

    function setWhitelist(Whitelist _whitelist) external onlyOwner {
        whitelist = _whitelist;
    }
}