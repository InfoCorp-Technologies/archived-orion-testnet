pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract ValidatorSet is Ownable {

    struct AddressStatus {
        bool isValidator;
        uint256 index;
    }

    address systemAddress = 0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;

    address[] private validatorArr;
    address[] private pendingArr;
    bool public finalized;
    mapping (address => AddressStatus) status;

    event InitiateChange(bytes32 indexed parentHash, address[] newSet);
    event ChangeFinalized(address[] currentSet);

    modifier isFinalized {
        require(finalized, "The state must be finalized");
        _;
    }

    constructor(address[] _init, address _owner) public {
        require(_init.length > 0, "The address list can not be empty");
        require(_owner != address(0), "The owner address it's required ");
        owner = _owner;
        pendingArr = _init;
        for (uint256 i = 0; i < pendingArr.length; i++) {
            status[pendingArr[i]].isValidator = true;
            status[pendingArr[i]].index = i;
        }
        validatorArr = pendingArr;
    }

    /**
     * @notice Expand the list of validators.
     * @param _newValidator Address to be added.
     */
    function addValidator(address _newValidator)
        external
        onlyOwner
    {
        require(
            !_isValidator(_newValidator), "The address is already a validator"
        );
        status[_newValidator].isValidator = true;
        status[_newValidator].index = pendingArr.length;
        pendingArr.push(_newValidator);
        _initiateChange();
    }

    /**
     * @notice Remove a validator from the list.
     * @param _oldValidator Address to be deleted.
     */
    function removeValidator(address _oldValidator)
        external
        onlyOwner
    {
        require(_isValidator(_oldValidator), "The address must be a validator");
        require(
            validatorArr.length > 1,
            "The # of current validators must be greater than one"
        );
        // index of the validator that is going to be removed
        uint256 index = status[_oldValidator].index;
        // replace the _oldValidator with the last of the pendings
        pendingArr[index] = pendingArr[pendingArr.length - 1];
        // update the index
        status[pendingArr[index]].index = index;
        // delete _oldValidator from the validators array
        delete pendingArr[pendingArr.length - 1];
        pendingArr.length--;
        // Reset address status of the _oldValidator
        status[_oldValidator].isValidator = false;

        _initiateChange();
    }

    function finalizeChange() external {
        require(
            msg.sender == systemAddress || msg.sender == owner,
            "Only the engine or the owner can execute this function"
        );
        require(!finalized, "The state must be not finalized");
        validatorArr = pendingArr;
        finalized = true;
        emit ChangeFinalized(validatorArr);
    }

    /**
     * @notice Check if an address is a validator.
     * @dev Used to be called from Operation contract.
     * @param _address Address to be checked.
     */
    function isValidator(address _address) external view returns(bool) {
        return _isValidator(_address);
    }

    function getValidators() external view returns (address[]) {
        return validatorArr;
    }

    function getPendings() external view returns (address[]) {
        return pendingArr;
    }

    function _initiateChange() internal isFinalized {
        finalized = false;
        emit InitiateChange(blockhash(block.number - 1), pendingArr);
    }

    function _isValidator(address _address) internal view returns(bool) {
        return status[_address].isValidator;
    }
}