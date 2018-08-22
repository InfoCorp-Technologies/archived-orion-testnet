pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Livestock is ERC721Token, Ownable {
    
    constructor(
        string _name, 
        string _symbol, 
        address _registry
    ) public ERC721Token(_name, _symbol) {
        owner = _registry;
    }
    
    function transfer(address _to, uint256 _tokenId) public {
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
    
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        super._mint(_to, _tokenId);
    }
    
    function burn(address _to, uint256 _tokenId) external onlyOwner {
        super._burn(_to, _tokenId);
    }
}