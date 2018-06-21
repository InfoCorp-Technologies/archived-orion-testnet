pragma solidity ^0.4.23;

import '../operation-contracts/Operations.sol';

contract Validator {

    Operations public operation;
    address[] private validatorArr;
    address[] private pendingArr = [
        0x574366e84f74f2e913aD9A6782CE6Ac8022e16EB
        , 
        0xca35b7d915458ef540ade6068dfe2f44e8fa733c
    ];
    bool private operation_set = false;
    bool public finalized = true;
    mapping (address => uint) validatorMap;

    event InitiateChange(bytes32 indexed parent_hash, address[] new_set);
    event ChangeFinalized(address[] current_set);

    modifier is_finalized {
        require(finalized);
        _;
    }
    
    // Function modifier that let's add or remove validar based on current msg.sender status
    modifier is_sender_validator (address sender) {
        if (operation_set) {
            require(msg.sender == address(operation));
        }
        require(validatorMap[sender] > 0);
        _;
    }
    
    modifier is_validator {
        require(validatorMap[msg.sender] > 0);
        _;
    }

    constructor() public {
        validatorArr = pendingArr;
        for (uint i = 0; i < validatorArr.length; i++) {
            validatorMap[validatorArr[i]] = i+1;
        }
    }

    // Called on every block to update node validator list.
    function getValidators() public constant returns (address[]) {
        return validatorArr;
    }
    
    function getPendings() public constant returns (address[]) {
        return pendingArr;
    }
    
    // Expand the list of validators.
    function addValidator(address _newValidator) public is_finalized is_validator {
        validatorMap[_newValidator] = pendingArr.length;
        pendingArr.push(_newValidator);
        operation.addClient(_newValidator, msg.sender);
        initiateChange();
    }

    // Remove a validator from the list.
    function removeValidator(address _oldValidator) public is_finalized is_validator {
        uint index = validatorMap[_oldValidator];
        validatorMap[_oldValidator] = 0;
        pendingArr[index] = pendingArr[pendingArr.length-1];
        pendingArr.length--;
        operation.removeClient(_oldValidator, msg.sender);
        initiateChange();
    }
    
    function setOperation(Operations _operation, address _sender) public 
        is_sender_validator(_sender) 
    {
        require(!operation_set);
        operation = _operation;
        operation_set = true;
    }

    function initiateChange() private {
        finalized = false;
        emit InitiateChange(blockhash(block.number - 1), pendingArr);
    }

    function finalizeChange() public {
        validatorArr = pendingArr;
        finalized = true;
        emit ChangeFinalized(validatorArr);
    }
}