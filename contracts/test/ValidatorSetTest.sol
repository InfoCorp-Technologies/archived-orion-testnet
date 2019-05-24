pragma solidity 0.4.24;

import "../validator/ValidatorSet.sol";


contract ValidatorSetTest is ValidatorSet {

    constructor(address _systemAddress, address[] _init, address _owner)
        public
        ValidatorSet(_init, _owner)
    {
        systemAddress = _systemAddress;
    }

    // expose `status` to use for assertions in tests
    function getStatus(address _validator)
        public
        view
        returns (bool isValidator, uint index)
    {
        AddressStatus storage addressStatus = status[_validator];

        isValidator = addressStatus.isValidator;
        index = addressStatus.index;
    }
}
