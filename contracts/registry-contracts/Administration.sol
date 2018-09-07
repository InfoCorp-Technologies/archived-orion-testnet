pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Administration is Ownable {

    uint constant public SET_INTERFACE_REQUIRED = 0;
    uint constant public VERIFY_INTERFACE_REQUIRED = 1;
    uint constant public SET_INTERFACE_FORBIDDEN = 2;
    uint constant public VERIFY_INTERFACE_FORBIDDEN = 3;
    uint constant public REMOVE_INTERFACE_REQUIRED = 4;
    uint constant public VERIFY_REMOVE_INTERFACE_REQUIRED = 5;
    uint constant public REMOVE_INTERFACE_FORBIDDEN = 6;
    uint constant public VERIFY_REMOVE_INTERFACE_FORBIDDEN = 7;

    /**
     * First mapping key bytes28 is the role name.
     * Second mapping key uint is the rule id.
     * Second mapping value bytes28[] is the array of rules.
     */
    mapping(bytes28 => mapping(uint => bytes28[])) rules;

    event RuleAdded(string role, string target, uint rule);
    event RuleRemoved(string role, string target, uint rule);

    function setAdminAddress(address _admin) external onlyOwner {
        require(_admin != address(0), "Admin address is required");
        owner = _admin;
    }

    function strToBytes28(string name) public pure returns(bytes28 result) {
        assembly {
            result := mload(add(name, 32))
        }
    }

    function getRules(bytes28 _role, uint _rule) public view returns(bytes28[]) {
        require(_rule < 8);
        return rules[_role][_rule];
    }

    function addRule(string _role, string _target, uint _rule) public onlyOwner {
        require(_rule < 8);
        bytes28 role = strToBytes28(_role);
        bytes28 target = strToBytes28(_target);
        rules[role][_rule].push(target);
        emit RuleAdded(_role, _target, _rule);
    }

    function removeRule(string _role, string _target, uint _rule) public onlyOwner {
        require(_rule < 8);
        bytes28 role = strToBytes28(_role);
        bytes28 target = strToBytes28(_target);
        remove(rules[role][_rule], target);
        emit RuleRemoved(_role, _target, _rule);
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

    /**
     * @dev Check if the interface of an address fit with the rule's required interfaces
     * @param _addr The address that the interface is registered to
     * @param _interfaceName The address's implementer or verifier interface name
     * @param _ruleType The rule type (must be Required type)
     */
    function requiredRule(address _addr, bytes28 _interfaceName, uint _ruleType)
        internal view
    {
        bytes28[] memory currentRules = getRules(_interfaceName, _ruleType);
        bool result = false;
        if (currentRules.length < 1 && (_ruleType == 0 || _ruleType == 4)) {
            result = true;
        }
        for (uint i = 0; i < currentRules.length; i++) {
            bytes28 rule = currentRules[i];
            if (isFitWithRule(_addr, rule, _ruleType)) {
                result = true;
                break;
            }
        }
        require(result);
    }

    /**
     * @dev Check if the interface of an address fit with the rule's forbidden interfaces
     * @param _addr The address that the interface is registered to
     * @param _interfaceName The address's implementer or verifier interface name
     * @param _ruleType The rule type (must be Forbidden type)
     */
    function forbiddenRule(address _addr, bytes28 _interfaceName, uint _ruleType)
        internal view
    {
        bytes28[] memory currentRules = getRules(_interfaceName, _ruleType);
        bool result = true;
        for (uint i = 0; i < currentRules.length; i++) {
            bytes28 rule = currentRules[i];
            if (isFitWithRule(_addr, rule, _ruleType)) {
                result = false;
                break;
            }
        }
        require(result);
    }

    function isFitWithRule(address, bytes28, uint) internal view returns(bool)
    {
        // has to be defined in the child contract
    }

}