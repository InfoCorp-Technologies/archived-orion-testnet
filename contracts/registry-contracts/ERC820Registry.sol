pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Administration.sol";
import "./Livestock.sol";
import '../sesc-contracts/Whitelist.sol';

contract ERC820Registry is Ownable {
    
    struct Implementer {
        address implementer;
        bytes multichain;
        bool verified;
        bool removing;
    }
    
    Administration public administration;

    mapping (address => address) managers;
    mapping (bytes28 => Livestock) livestockMap;
    mapping (bytes32 => address) registeredLivestock;
    mapping (bytes => bool) registeredMultichain;
    mapping (address => mapping(bytes32 => Implementer)) interfacesMap;
    
    event LivestockAdded(string name, address indexed addr);
    event LivestockRemoved(string name, address indexed addr);
    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, string multichain);
    event InterfaceImplementerRemoving(address indexed addr, bytes32 indexed interfaceHash);
    event InterfaceImplementerVerified(address indexed addr, bytes32 indexed interfaceHash, string action);
    event ManagerChanged(address indexed addr, address indexed newManager);
    
    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }

    constructor(address _owner, Administration _administration) public {
        owner = _owner;
        administration = _administration;
    }

    /// @notice GetManager
    function getManager(address addr) public view returns(address) {
        // By default the manager of an address is the same address
        if (managers[addr] == 0) {
            return addr;
        } else {
            return managers[addr];
        }
    }

    function setManager(address addr, address newManager) 
        external canManage(addr) 
    {
        managers[addr] = newManager == addr ? 0 : newManager;
        emit ManagerChanged(addr, newManager);
    }
    
    function getLivestock(string _name) external view returns(address) {
        bytes28 name = strToBytes28(_name);
        return livestockMap[name];
    }
     
    function setLivestock(Livestock _livestock) external onlyOwner {
        bytes28 name = strToBytes28(_livestock.symbol());
        require(_livestock.owner() == address(this), "The livestock contract must have this Registry contract as owner");
        require(livestockMap[name] == address(0), "This livestock is already set");
        livestockMap[name] = _livestock;
        emit LivestockAdded(_livestock.symbol(), _livestock);
    }
    
    function removeLivestock(string _name) external onlyOwner {
        bytes28 name = strToBytes28(_name);
        Livestock livestock = livestockMap[name];
        require(livestock != address(0), "This livestock hasn't been set");
        livestock.transferOwnership(msg.sender);
        livestockMap[name] = Livestock(0);
        emit LivestockRemoved(_name, livestock);
    }
    
    /**
     * @dev The administration variables setter 
     * @param _administration The administration address
     */
    function setAdministration(Administration _administration) external onlyOwner {
        administration = _administration;
    }

    /**
     * @dev Query the combined interface given a name and id 
     * @param interfaceName Name of the interface
     * @param id Id of the livestock, left empty (id = 0) if not livestock
     */
    function interfaceHash(string interfaceName, uint id) 
        public pure returns(bytes32) 
    {
        bytes32 interfaceBytes = bytes32(strToBytes28(interfaceName));
        bytes32 idBytes = bytes32(id);
        if (bytes(interfaceName).length > 28 || idBytes > 0xffffffff) {
            return 0;
        }
        return interfaceBytes | idBytes;
    }
    
    /**
     * @dev Query the registered information of an address by the interface
     * @param addr The address used to query
     * @param iHash The interface used to query
     */
    function getInterfaceImplementer(address addr, bytes32 iHash) public 
        view returns (address implementer, string multichain, bool verified) 
    {
        Implementer memory interfaces = getInterfaces(addr, iHash);
        implementer = interfaces.implementer;
        multichain = string(interfaces.multichain);
        verified = interfaces.verified;
    }

    /**
     * @dev Register interface to an address with the Multichain address. 
     * @param addr The address that is registered
     * @param iHash The combined interface registered to the address. 
     * @param multichain The Multichain address that is registered to the address
     */
    function setInterfaceImplementer(
        address addr, bytes32 iHash, string multichain) 
        external canManage(addr) 
    {
        Implementer memory interfaces = interfacesMap[addr][iHash];
        bytes memory multichainBytes = bytes(multichain);
        uint id = uint(bytes4(iHash << (8 * 28)));
        bytes28 name = bytes28(iHash);
        require(multichainBytes.length == 38, "The Multichain address string length must longer than 38");
        require(!registeredMultichain[multichainBytes], "The Multichain address has been claimed");
        require(!interfaces.verified, "The registered information must not be registered and verified before");
        requiredRule(addr, name, administration.ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE());
        forbiddenRule(addr, name, administration.ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE());
        if (id > 0) {
            require(livestockMap[name] != address(0), "This livestock contract is not set");
            require(!livestockMap[name].exists(id), "The token has already been minted");
        }
        registeredMultichain[interfaces.multichain] = false;
        interfacesMap[addr][iHash].implementer = msg.sender;
        interfacesMap[addr][iHash].multichain = multichainBytes;
        emit InterfaceImplementerSet(addr, iHash, multichain);
    }
    
    /**
     * @dev Verify the register of an address through an interface. 
     * @param addr The address that is registered
     * @param iHash The combined interface registered to the address. 
     */
    function verifyInterfaceImplementer(address addr, bytes32 iHash) external {
        Implementer memory interfaces = interfacesMap[addr][iHash];
        uint id = uint(bytes4(iHash << (8 * 28)));
        bytes28 name = bytes28(iHash);
        require(interfaces.implementer != 0, "This registered information hasn't existed");
        require(!interfaces.verified, "This registered information has already been verified");
        require(!registeredMultichain[interfaces.multichain], "The Multichain address has been claimed");
        requiredRule(addr, name, administration.ADD_REGISTER_REQUIRED_IMPLEMENTER_TYPE());
        requiredRule(addr, name, administration.ADD_REGISTER_REQUIRED_VERIFIER_TYPE());
        forbiddenRule(addr, name, administration.ADD_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE());
        forbiddenRule(addr, name, administration.ADD_REGISTER_FORBIDDEN_VERIFIER_TYPE());
        if (id > 0) {
            livestockMap[name].mint(addr, id);
            registeredLivestock[iHash] = addr;
        }
        registeredMultichain[interfaces.multichain] = true;
        interfacesMap[addr][iHash].verified = true;
        emit InterfaceImplementerVerified(addr, iHash, "Added");
    }
    
    /**
     * @dev Remove the register of an address through an interface. 
     * @param addr The address that is registered
     * @param iHash The combined interface registered to the address. 
     */
    function removeInterfaceImplementer(address addr, bytes32 iHash) 
        external canManage(addr) 
    {
        Implementer memory interfaces = getInterfaces(addr, iHash);
        bytes28 name = bytes28(iHash);
        require(interfaces.verified, "This registered information is not verified");
        requiredRule(addr, name, administration.REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE());
        forbiddenRule(addr, name, administration.REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE());
        interfacesMap[addr][iHash].removing = true;
        emit InterfaceImplementerRemoving(addr, iHash);
    }
    
    /**
     * @dev Verify the register removal of an address through an interface. 
     * @param addr The address that is registered
     * @param iHash The combined interface registered to the address. 
     */
    function verifyInterfaceRemoval(address addr, bytes32 iHash) external {
        Implementer memory empty = Implementer(0x0, "", false, false);
        Implementer memory interfaces;
        uint id = uint(bytes4(iHash << (8 * 28)));
        bytes28 name = bytes28(iHash);
        require(interfacesMap[addr][iHash].removing, "This registered information is not marked as removing");
        // require the interface register to satisfy the rules set in Adminisstration
        requiredRule(addr, name, administration.REMOVE_REGISTER_REQUIRED_IMPLEMENTER_TYPE());
        requiredRule(addr, name, administration.REMOVE_REGISTER_REQUIRED_VERIFIER_TYPE());
        forbiddenRule(addr, name, administration.REMOVE_REGISTER_FORBIDDEN_IMPLEMENTER_TYPE());
        forbiddenRule(addr, name, administration.REMOVE_REGISTER_FORBIDDEN_VERIFIER_TYPE()s);
        if (id > 0) {
            address registered = registeredLivestock[iHash];
            interfaces = interfacesMap[registered][iHash];
            interfacesMap[registered][iHash] = empty;
            interfacesMap[addr][iHash].removing = false;
            registeredLivestock[iHash] = 0;
            livestockMap[name].burn(addr, id);
        } else {
            interfaces = interfacesMap[addr][iHash];
            interfacesMap[addr][iHash] = empty;
        }
        registeredMultichain[interfaces.multichain] = false;
        emit InterfaceImplementerVerified(addr, iHash, "Removed");
    }
    
    /**
     * @dev Check if the interface of an address fit with the rule's required interfaces
     * @param addr The address that the interface is registered to
     * @param interfaceName The address's implementer or verifier interface name
     * @param ruleType The rule type (must be Required type)
     */
    function requiredRule(address addr, bytes28 interfaceName,  uint ruleType) 
        internal view 
    {
        string memory name = string(abi.encodePacked(interfaceName));
        bytes28[] memory rules = administration.getRules(name, ruleType);
        bool result;
        if (rules.length < 1 && (ruleType == 0 || ruleType == 4)) {
            result = true;
        }
        for (uint i = 0; i < rules.length; i++) {
            bytes28 rule = rules[i];
            if (isFitWithRule(addr, rule, ruleType)) { 
                result = true;
                break;
            }
        }
        require(result);
    }
    
    /**
     * @dev Check if the interface of an address fit with the rule's forbidden interfaces  
     * @param addr The address that the interface is registered to
     * @param interfaceName The address's implementer or verifier interface name
     * @param ruleType The rule type (must be Forbidden type)
     */
    function forbiddenRule(address addr, bytes28 interfaceName,  uint ruleType) 
        internal view 
    {
        string memory name = string(abi.encodePacked(interfaceName));
        bytes28[] memory rules = administration.getRules(name, ruleType);
        bool result = true;
        for (uint i = 0; i < rules.length; i++) {
            bytes28 rule = rules[i];
            if (isFitWithRule(addr, rule, ruleType)) {
                result = false;
                break;
            }
        }
        require(result);
    }
    
    function isFitWithRule(address addr, bytes28 rule, uint ruleType) 
        internal view returns(bool)
    {
        return (ruleType % 2 == 0 && interfacesMap[addr][rule].verified ||
        ruleType % 2 == 0 && rule == "admin" && addr == administration.owner() ||
        ruleType % 2 != 0 && interfacesMap[msg.sender][rule].verified ||
        ruleType % 2 != 0 && rule == "admin" && msg.sender == administration.owner());
    }
    
    function getInterfaces(address addr, bytes32 iHash) 
        internal view returns(Implementer interfaces) 
    {
        uint id = uint(bytes4(iHash << (8 * 28)));
        bytes28 name = bytes28(iHash);
        address registered = registeredLivestock[iHash];
        if (address(livestockMap[name]) != 0 && 
            livestockMap[name].exists(id)) {
            if (livestockMap[name].ownerOf(id) == addr) {
                interfaces = interfacesMap[registered][iHash];
            } else {
                interfaces = interfacesMap[addr][0x0];
            }
        } else {
            interfaces = interfacesMap[addr][iHash];
        }
    }
    
    function strToBytes28(string name) internal pure returns(bytes28 result) {
        assembly {
            result := mload(add(name, 32))
        }
    }
}