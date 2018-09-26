pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "./Whitelist.sol";
import "./SentinelExchange.sol";

contract LCToken is DetailedERC20, MintableToken, BurnableToken {

    Whitelist public whitelist;

    modifier canTransfer(address _from, address _to) {
        require(whitelist.isWhitelist(_from));
        require(whitelist.isWhitelist(_to));
        _;
    }

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        Whitelist _whitelist,
        SentinelExchange _exchange
    ) public DetailedERC20(_name, _symbol, _decimals) {
        whitelist = _whitelist;
        owner = _exchange;
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

    function transferFromOwner(address _to, uint _value) external onlyOwner {
        require(whitelist.isWhitelist(_to));
        super.transfer(_to, _value);
    }

    function exchange(uint256 _value) public {
        require(whitelist.isWhitelist(msg.sender));
        super.transfer(owner, _value);
        SentinelExchange(owner).exchangeLct(msg.sender, _value, symbol);
    }

    function setWhitelist(Whitelist _whitelist) external onlyOwner {
        whitelist = _whitelist;
    }
}
