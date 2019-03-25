pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract SENCTest is DetailedERC20, MintableToken, BurnableToken {

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals
    ) public DetailedERC20(_name, _symbol, _decimals) {
    }

}