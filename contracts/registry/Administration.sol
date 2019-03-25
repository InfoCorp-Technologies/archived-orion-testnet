pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Administration is Ownable {

    enum Actions {
        SET_INTERFACE,
        VERIFY_INTERFACE,
        REMOVE_INTERFACE,
        VERIFY_REMOVE_INTERFACE
    }

    /**
     * First mapping key bytes28 is the role name.
     * Second mapping key uint is the action type.
     * Second mapping value bytes28[] is the array of roles for rules/permissions.
     */
    mapping(bytes28 => mapping(uint => bytes28[])) rules;
    mapping(bytes28 => mapping(uint => bytes28[])) permissions;

    event RuleAdded(string role, string target, uint action);
    event RuleRemoved(string role, string target, uint action);
    event PermissionAdded(string role, string target, uint action);
    event PermissionRemoved(string role, string target, uint action);

    modifier validAction(uint _action) {
        require(uint(Actions.VERIFY_REMOVE_INTERFACE) >= _action, "Action not exist");
        _;
    }

    function setAdminAddress(address _admin) external onlyOwner {
        require(_admin != address(0), "Admin address is required");
        owner = _admin;
    }

    function addPermission(string _role, string _target, uint _action) external
        onlyOwner validAction(_action)
    {
        (bytes28 role, bytes28  target) = encodeValues(_role, _target);
        permissions[role][_action].push(target);
        emit PermissionAdded(_role, _target, _action);
    }

    function addRule(string _role, string _target, uint _action) public
        onlyOwner validAction(_action)
    {
        (bytes28 role, bytes28  target) = encodeValues(_role, _target);
        rules[role][_action].push(target);
        emit RuleAdded(_role, _target, _action);
    }

    function removeRule(string _role, string _target, uint _action) public
        onlyOwner validAction(_action)
    {
        (bytes28 role, bytes28  target) = encodeValues(_role, _target);
        _remove(rules[role][_action], target);
        emit RuleRemoved(_role, _target, _action);
    }

    function _remove(bytes28[] storage _list, bytes28 _roleToRemove) internal {
        uint length = _list.length;
        for (uint i = 0; i < length; i++) {
            if (_list[i] == _roleToRemove) {
                _list[i] = _list[length-1];
                _list.length--;
                return;
            }
        }
    }

    function _canExecute(address _address, bytes28 _role, Actions _action) internal view
        validAction(uint(_action))
    {
        require(_checkPermissions(_address, _role, uint(_action)), "Implementer doesn't have the right permission");
        require(_checkRules(_address, _role, uint(_action)), "Implementer doesn't comply with the rules");
    }

    /**
     * @dev Check if the interface of an address fit with the permission's required interfaces
     * @param _address The address that the interface is registered to
     * @param _role The address's implementer or verifier interface name
     * @param _action The action type
     * @return a boolean indicating if the implementer has permission to execute the _action
     */
    function _checkPermissions(address _address, bytes28 _role, uint _action) internal view
        returns(bool result)
    {
        result = false;
        bytes28[] memory currentPermissions = permissions[_role][_action];
        if (currentPermissions.length == 0 &&
            (_action == uint(Actions.SET_INTERFACE) || _action == uint(Actions.REMOVE_INTERFACE)))
        {
            result = true;
        } else {
            for (uint i = 0; i < currentPermissions.length; i++) {
                bytes28 permission = currentPermissions[i];
                if (_isFitWithRule(_address, permission, _action)) {
                    result = true;
                    break;
                }
            }
        }
    }

    /**
     * @dev Check if the interface of an address fit with the rule's forbidden interfaces
     * @param _address The address that the interface is registered to
     * @param _role The address's implementer or verifier interface name
     * @param _action The action type
     * @return a boolean indicating whether the rules are respected or not
     */
    function _checkRules(address _address, bytes28 _role, uint _action) internal view
        returns(bool result)
    {
        result = true;
        bytes28[] memory currentRules = rules[_role][_action];
        if (currentRules.length != 0) {
            for (uint i = 0; i < currentRules.length; i++) {
                bytes28 rule = currentRules[i];
                if (_isFitWithRule(_address, rule, _action)) {
                    result = false;
                    break;
                }
            }
        }
    }

    function _isFitWithRule(address, bytes28, uint) internal view returns(bool)
    {
        // Has to be defined in the child contract
    }

    function strToBytes28(string name) public pure returns(bytes28 result) {
        assembly {
            result := mload(add(name, 32))
        }
    }

    function encodeValues(string _role, string _target) public pure
        returns(bytes28 role, bytes28 target)
    {
        role = strToBytes28(_role);
        target = strToBytes28(_target);
    }
}