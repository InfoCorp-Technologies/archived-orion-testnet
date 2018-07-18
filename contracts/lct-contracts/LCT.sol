pragma solidity ^0.4.23;

import 'github.com/openzeppelin/openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import 'github.com/openzeppelin/openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol';
import './Salvageable.sol';
import './Whitelist.sol';

contract LCT is DetailedERC20, MintableToken {
    
    Whitelist public whitelist;
    
    modifier canTransfer(address _from, address _to) {
        require(whitelist.isWhitelist(_from));
        require(whitelist.isWhitelist(_to));
        _;
    }
    
    constructor(string _name, string _symbol, uint8 _decimals, address _whitelist)
        public DetailedERC20(_name, _symbol, _decimals) 
    { 
        whitelist = Whitelist(_whitelist);
    }
    
    function transfer(address _to, uint256 _value) 
        public canTransfer(msg.sender, _to) returns (bool) 
    {
        super.transfer(_to, _value);
    }
    
    function transferFrom(address _from, address _to, uint256 _value) 
        public canTransfer(_from, _to) returns (bool) 
    {
        super.transferFrom(_from, _to, _value);
    }
}