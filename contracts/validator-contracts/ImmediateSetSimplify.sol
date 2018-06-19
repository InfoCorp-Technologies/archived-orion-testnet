pragma solidity ^0.4.23;

contract Validator {

    address _operation;
    address[] private _validatorArr;
    address[] private _pendingArr = [
        0x574366e84f74f2e913aD9A6782CE6Ac8022e16EB
        , 
        0xca35b7d915458ef540ade6068dfe2f44e8fa733c
    ];
    bool private _operationSetted = false;
    bool public _finalized = true;
    mapping (address => uint) _validatorMap;

    event InitiateChange(bytes32 indexed _parent_hash, address[] _new_set);
    event ChangeFinalized(address[] current_set);

    modifier finalized {
        require(_finalized);
        _;
    }
    
    // Function modifier that let's add or remove validar based on current msg.sender status
    modifier isSenderValidator (address sender) {
        require(msg.sender == _operation);
        require(_validatorMap[sender] > 0);
        _;
    }
    
    modifier isValidator {
        require(_validatorMap[msg.sender] > 0);
        _;
    }

    constructor() public {
        _validatorArr = _pendingArr;
        for (uint i = 0; i < _validatorArr.length; i++) {
            _validatorMap[_validatorArr[i]] = i+1;
        }
    }

    // Called on every block to update node validator list.
    function getValidators() public constant returns (address[]) {
        return _validatorArr;
    }
    
    function getPendings() public constant returns (address[]) {
        return _pendingArr;
    }
    
    // Expand the list of validators.
    function addValidator(address newValidator) public finalized isValidator {
        _validatorMap[newValidator] = _pendingArr.length;
        _pendingArr.push(newValidator);
        initiateChange();
    }
    
    function addValidator(address newValidator, address sender) public finalized isSenderValidator(sender) {
        _validatorMap[newValidator] = _pendingArr.length;
        _pendingArr.push(newValidator);
        initiateChange();
    }

    // Remove a validator from the list.
    function removeValidator(address oldValidator) public finalized isValidator {
        uint index = _validatorMap[oldValidator];
        _validatorMap[oldValidator] = 0;
        _pendingArr[index] = _pendingArr[_pendingArr.length-1];
        _pendingArr.length--;
        initiateChange();
    }
    
    function removeValidator(address oldValidator, address sender) public finalized isSenderValidator(sender) {
        uint index = _validatorMap[oldValidator];
        _validatorMap[oldValidator] = 0;
        _pendingArr[index] = _pendingArr[_pendingArr.length-1];
        _pendingArr.length--;
        initiateChange();
    }
    
    function setOperation(address operation) public isValidator {
        require(!_operationSetted);
        _operation = operation;
        _operationSetted = true;
    }

    function initiateChange() private {
        _finalized = false;
        emit InitiateChange(blockhash(block.number - 1), _pendingArr);
    }

    function finalizeChange() public {
        _validatorArr = _pendingArr;
        _finalized = true;
        emit ChangeFinalized(_validatorArr);
    }
}