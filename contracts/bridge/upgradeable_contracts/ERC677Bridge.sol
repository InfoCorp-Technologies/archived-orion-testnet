pragma solidity 0.4.24;

import "./BasicBridge.sol";
import "../../shared/ERC677/IBurnableMintableERC677Token.sol";
import "./Whitelistable.sol";


contract ERC677Bridge is BasicBridge, Whitelistable {


    function onTokenTransfer(address _from, uint256 _value, bytes _data)
        external
        returns(bool)
    {
        require(msg.sender == address(erc677token()));
        address recipient;
        uint256 valueToTransfer;
        if (_from == tollAddress()) {
            require(_data.length != 0);
            valueToTransfer = _value;
            recipient = _bytesToAddress(_data);
        } else {
            require(_isWhitelisted(_from));
            require(_value > tollFee());
            valueToTransfer = _value - tollFee();
            recipient = _from;
            require(withinLimit(_value));
            setTotalSpentPerDay(
                getCurrentDay(),
                totalSpentPerDay(getCurrentDay()).add(_value)
            );
            erc677token().transfer(tollAddress(), tollFee());
        }
        erc677token().burn(valueToTransfer);
        fireEventOnTokenTransfer(recipient, valueToTransfer);
        return true;
    }

    function erc677token() public view returns(IBurnableMintableERC677Token) {
        return IBurnableMintableERC677Token(
            addressStorage[keccak256(abi.encodePacked("erc677token"))]
        );
    }

    function setErc677token(address _token) internal {
        require(_token != address(0) && isContract(_token));
        addressStorage[keccak256(abi.encodePacked("erc677token"))] = _token;
    }

    function fireEventOnTokenTransfer(address /*_from */, uint256 /* _value */)
        internal
    {
        // has to be defined
    }

    // function _bytesToAddress(bytes data)
    //     internal
    //     pure
    //     returns(address parsed)
    // {
    //     assembly {
    //         parsed := mload(add(data, 32))
    //     }
    // }
    function _bytesToAddress(bytes b)
        internal
        pure
        returns(address)
    {
        uint256 number;
        for (uint i=0; i < b.length; i++) {
            number = number + uint(b[i])*(2**(8*(b.length-(i+1))));
        }
        return address(number);
    }
}
