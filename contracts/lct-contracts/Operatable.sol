pragma solidity ^0.4.18;

// ----------------------------------------------------------------------------
// Operatable - Base contract which allows primary and secondary operator 
// to be enabled for child contract. 
//
// Copyright (c) 2018 InfoCorp Technologies Pte Ltd.
// http://www.sentinel-chain.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "github.com/openzeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "github.com/openzeppelin/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Operatable is Ownable {
    
    address public primaryOperator;
    address public secondaryOperator;

    modifier canOperate() {
        require(msg.sender == primaryOperator || msg.sender == secondaryOperator || msg.sender == owner);
        _;
    }

    constructor() public {
        primaryOperator = owner;
        secondaryOperator = owner;
    }

    function setPrimaryOperator (address addr) public onlyOwner {
        primaryOperator = addr;
    }

    function setSecondaryOperator (address addr) public onlyOwner {
        secondaryOperator = addr;
    }
}