pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Administration is Ownable {
    
    uint constant public set_interface_required = 0;
    uint constant public verify_interface_required = 1;
    uint constant public set_interface_forbidden = 2;
    uint constant public verify_interface_forbidden = 3;
    uint constant public remove_interface_required = 4;
    uint constant public verify_remove_interface_required = 5;
    uint constant public remove_interface_forbidden = 6;
    uint constant public verify_remove_interface_forbidden = 7;
    
    mapping(bytes28 => mapping(uint => bytes28[])) rules;
    
    event RuleAdded(string role, string target, uint rule);
    event RuleRemoved(string role, string target, uint rule);
    
    constructor(address admin) public {
        owner = admin;
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
}