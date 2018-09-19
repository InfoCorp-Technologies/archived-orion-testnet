pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Whitelist is Ownable {

    uint public count;
    mapping(address => bool) public isWhitelist;

    event Whitelisted (address indexed addr);
    event Removed(address indexed addr);

    constructor(address _owner) public {
        require(_owner != address(0), "Owner address is required");
        owner = _owner;
    }

    function addWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = i; i < _addresses.length; i++) {
            if (!isWhitelist[_addresses[i]]) {
                isWhitelist[_addresses[i]] = true;
                count++;
                emit Whitelisted(_addresses[i]);
            }
        }
    }

    function removeWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = i; i < _addresses.length; i++) {
            if (isWhitelist[_addresses[i]]) {
                isWhitelist[_addresses[i]] = false;
                count--;
                emit Removed(_addresses[i]);
            }
        }
    }
}
