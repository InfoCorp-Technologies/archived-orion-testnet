pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Administration is Ownable {
    
    struct Rule {
        bytes28[] requiredImplementer;
        bytes28[] requiredVerifier;
        bytes28[] forbiddenImplementer;
        bytes28[] forbiddenVerifier;
    }
    
    uint constant public ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE = 0;
    uint constant public ADD_REGISTER_REQUIRED_VERIFIER_TYPE = 1;
    uint constant public ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE = 2;
    uint constant public ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE = 3;
    uint constant public REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE = 4;
    uint constant public REMOVE_REGISTER_REQUIRED_VERIFIER_TYPE = 5;
    uint constant public REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE = 6;
    uint constant public REMOVE_REGISTER_FORBIDDEN_VERIFIER_TYPE = 7;
    
    mapping(bytes28 => Rule) addRegisterRule;
    mapping(bytes28 => Rule) removeRegisterRule;
    
    event RuleAdded(string implementer, string ruleName, uint ruleType);
    event RuleRemoved(string implementer, string ruleName, uint ruleType);
    
    constructor(address admin) public {
        owner = admin;
    }
    
    function getRules(string _implementer, uint ruleType) 
        public view returns(bytes28[]) 
    {
        bytes28 implementer;
        assembly {
            implementer := mload(add(_implementer, 32))
        }
        if (ruleType == ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            return addRegisterRule[implementer].requiredImplementer;
        if (ruleType == ADD_REGISTER_REQUIRED_VERIFIER_TYPE)
            return addRegisterRule[implementer].requiredVerifier;
        if (ruleType == ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            return addRegisterRule[implementer].forbiddenImplementer;
        if (ruleType == ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            return addRegisterRule[implementer].forbiddenVerifier;
        if (ruleType == REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            return removeRegisterRule[implementer].requiredImplementer;
        if (ruleType == REMOVE_REGISTER_REQUIRED_VERIFIER_TYPE)
            return removeRegisterRule[implementer].requiredVerifier;
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            return removeRegisterRule[implementer].forbiddenImplementer;
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            return removeRegisterRule[implementer].forbiddenVerifier;
    }
    
    function addRule(string implementerName, string ruleName, uint ruleType) 
        public onlyOwner
    {
        bytes28 implementer;
        bytes28 rule;
        assembly {
            implementer := mload(add(implementerName, 32))
            rule := mload(add(ruleName, 32))
        }
        if (ruleType == ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            addRegisterRule[implementer].requiredImplementer.push(rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            addRegisterRule[implementer].requiredVerifier.push(rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            addRegisterRule[implementer].forbiddenImplementer.push(rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            addRegisterRule[implementer].forbiddenVerifier.push(rule);
        if (ruleType == REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            removeRegisterRule[implementer].requiredImplementer.push(rule);
        if (ruleType == REMOVE_REGISTER_REQUIRED_VERIFIER_TYPE)
            removeRegisterRule[implementer].requiredVerifier.push(rule);
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            removeRegisterRule[implementer].forbiddenImplementer.push(rule);
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            removeRegisterRule[implementer].forbiddenVerifier.push(rule);
        if (ruleType < 8) {
            emit RuleAdded(implementerName, ruleName, ruleType);
        }
    }
    
    function removeRule(string implementerName, string ruleName, uint ruleType) 
        public onlyOwner
    {
        bytes28 implementer;
        bytes28 rule;
        assembly {
            implementer := mload(add(implementerName, 32))
            rule := mload(add(ruleName, 32))
        }
        if (ruleType == ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            remove(addRegisterRule[implementer].requiredImplementer, rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            remove(addRegisterRule[implementer].requiredVerifier, rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            remove(addRegisterRule[implementer].forbiddenImplementer, rule);
        if (ruleType == ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            remove(addRegisterRule[implementer].forbiddenVerifier, rule);
        if (ruleType == REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE)
            remove(removeRegisterRule[implementer].requiredImplementer, rule);
        if (ruleType == REMOVE_REGISTER_REQUIRED_VERIFIER_TYPE)
            remove(removeRegisterRule[implementer].requiredVerifier, rule);
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE)
            remove(removeRegisterRule[implementer].forbiddenImplementer, rule);
        if (ruleType == REMOVE_REGISTER_FORBIDDEN_VERIFIER_TYPE)
            remove(removeRegisterRule[implementer].forbiddenVerifier, rule);
        if (ruleType < 8) {
            emit RuleRemoved(implementerName, ruleName, ruleType);
        }
    }
    
    function remove(bytes28[] storage list, bytes28 removed) internal {
        uint length = list.length;
        for (uint i = 0; i < length; i++) {
            if (list[i] == removed) {
                list[i] = list[length-1];
                list.length--;
                return;
            }
        }
    }
}