pragma solidity 0.4.24;
import "../../shared/IWhitelist.sol";
import "../upgradeability/EternalStorage.sol";


contract Whitelistable is EternalStorage {
    function whitelistContract() public view returns(IWhitelist) {
        return IWhitelist(
            addressStorage[keccak256(abi.encodePacked("whitelistContract"))]
        );
    }

    function isWhitelisted(address _addr) external view returns(bool) {
        return _isWhitelisted(_addr);
    }

    function _isWhitelisted(address _addr) internal view returns(bool) {
        return whitelistContract().isWhitelisted(_addr);
    }
}
