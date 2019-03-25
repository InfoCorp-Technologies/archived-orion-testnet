pragma solidity ^0.4.19;


import "../upgradeable_contracts/erc20_to_erc20/ForeignBridgeErcToErc.sol";


interface OwnableToken {
    function transferOwnership(address) external;
}

contract ForeignBridgeV2 is ForeignBridgeErcToErc {
    function changeTokenOwnership(address _newTokenOwner) public onlyOwner {
        address token = address(erc20token());
        OwnableToken sentinel = OwnableToken(token);
        sentinel.transferOwnership(_newTokenOwner);
    }
    // used for testing
    address public something;
    function doSomething(address _newTokenOwner) public onlyOwner {
        something = _newTokenOwner;
    }
}
