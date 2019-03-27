pragma solidity ^0.4.23;


contract IWhitelist {
    function isWhitelisted(address addr) external view returns(bool);
    function _isWhitelisted(address addr) internal view returns(bool);
}
