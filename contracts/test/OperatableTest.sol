pragma solidity 0.4.24;

import "../shared/Operatable.sol";


contract OperatableTest is Operatable {

    uint256 public some;

    function setVariable(uint256 _variable) public onlyOperator {
        some = _variable;
    }
}
