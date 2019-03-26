pragma solidity ^0.4.23;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./IWhitelist.sol";


contract Whitelist is IWhitelist, Ownable {

    uint256 public count;
    mapping(address => bool) list;

    event LogWhitelisted(address indexed addr);
    event LogRemoved(address indexed addr);

    constructor(address _owner) public {
        require(_owner != address(0), "Owner address is required");
        owner = _owner;
    }

    function addAddresses(address[] _addresses) external onlyOwner {
        require(_addresses.length > 0, "Address list is required");
        for (uint256 i = 0; i < _addresses.length; i++) {
            if (!_isWhitelisted(_addresses[i])) {
                list[_addresses[i]] = true;
                count++;
                emit LogWhitelisted(_addresses[i]);
            }
        }
    }

    function removeAddresses(address[] _addresses) external onlyOwner {
        require(_addresses.length > 0, "Address list is required");
        for (uint256 i = 0; i < _addresses.length; i++) {
            if (_isWhitelisted(_addresses[i])) {
                list[_addresses[i]] = false;
                count--;
                emit LogRemoved(_addresses[i]);
            }
        }
    }

    function isWhitelisted(address addr) external view returns(bool) {
        return _isWhitelisted(addr);
    }

    function _isWhitelisted(address addr) internal view returns(bool) {
        return list[addr];
    }
}
