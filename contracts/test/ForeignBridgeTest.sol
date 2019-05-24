pragma solidity 0.4.24;

import "../bridge/upgradeable_contracts/erc20_to_erc20/ForeignBridgeErcToErc.sol";


interface OwnableToken {
    function transferOwnership(address) external;
}


contract ForeignBridgeTest is ForeignBridgeErcToErc {
    // used for testing
    address public something;

    function changeTokenOwnership(address _newTokenOwner) public onlyOwner {
        address token = address(erc20token());
        OwnableToken sentinel = OwnableToken(token);
        sentinel.transferOwnership(_newTokenOwner);
    }

    function doSomething(address _newTokenOwner) public onlyOwner {
        something = _newTokenOwner;
    }
}
