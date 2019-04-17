pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/access/rbac/RBAC.sol";


/**
 * @title Operatable
 * @dev Stores and provides setters and getters for roles and addresses.
 * Uses Role-Based Access Control contract from zeppelin.
 */
contract Operatable is RBAC, Ownable {

    string public constant ROLE_OPERATOR = "operator";

    modifier onlyOperator() {
        if (msg.sender != owner) {
            checkRole(msg.sender, ROLE_OPERATOR);
        }
        _;
    }

    function addOperator(address _operator) public onlyOwner {
        addRole(_operator, ROLE_OPERATOR);
    }

    function removeOperator(address _operator) public onlyOwner {
        removeRole(_operator, ROLE_OPERATOR);
    }
}
