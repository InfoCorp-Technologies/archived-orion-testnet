pragma solidity ^0.4.23;

contract Registry {
    
    struct Implementer {
        address implementer;
        string multichain;
    }

    mapping (string => bool) registeredMultichain;
    mapping (address => address) managers;
    mapping (address => mapping(bytes32 => Implementer)) interfaces;
    mapping (address => mapping(bytes4 => bool)) erc165Cache;

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }

    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, address indexed implementer);
    event InterfaceImplementerChanged(address indexed odAddr, bytes32 indexed interfaceHash, address indexed newAddr);
    event InterfaceImplementerRemoved(address indexed addr, bytes32 indexed interfaceHash);
    event ManagerChanged(address indexed addr, address indexed newManager);

    /// @notice Query the hash of an interface given a name
    /// @param interfaceName Name of the interfce
    function interfaceHash(string interfaceName) public pure returns(bytes32) {
        return keccak256(interfaceName);
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

    function setManager(address addr, address newManager) external canManage(addr) {
        managers[addr] = newManager == addr ? 0 : newManager;
        emit ManagerChanged(addr, newManager);
    }

    function getInterfaceImplementer(address addr, bytes32 iHash) view external returns (address, string) {
        address implementer;
        implementer = interfaces[addr][iHash].implementer;
        return (implementer, interfaces[addr][iHash].multichain);
    }

    function setInterfaceImplementer(address addr, string name, address implementer, string multichain) external canManage(addr) 
    {
        bytes32 iHash = interfaceHash(name);
        require(bytes(multichain).length == 38);
        if (registeredMultichain[interfaces[addr][iHash].multichain]) {
            registeredMultichain[interfaces[addr][iHash].multichain] = false;
        }
        require(!registeredMultichain[multichain]);
        interfaces[addr][iHash].implementer = implementer;
        interfaces[addr][iHash].multichain = multichain;
        registeredMultichain[multichain] = true;
        emit InterfaceImplementerSet(addr, iHash, implementer);
    }
    
    function removeInterfaceImplementer(address addr, bytes32 iHash) external canManage(addr) {
        interfaces[addr][iHash] = Implementer(0x0, "");
        registeredMultichain[interfaces[addr][iHash].multichain] = false;
        emit InterfaceImplementerRemoved(addr, iHash);
    }
}