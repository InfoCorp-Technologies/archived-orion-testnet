pragma solidity ^0.4.23;

import "../ValidatorSet.sol";


contract TestValidatorSet is ValidatorSet {

    constructor(address _systemAddress, address[] _init, address _owner)
		ValidatorSet(_init, _owner)
        public
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
