pragma solidity ^0.4.23;

contract Registry {
    
    struct Implementer {
        address implementer;
        bytes multichain;
        bool verified;
    }
    
    address public admin;

    mapping (bytes => bool) registeredMultichain;
    mapping (address => address) managers;
    mapping (address => mapping(bytes32 => Implementer)) interfaces;

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }

    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, string indexed multichain);
    event InterfaceImplementerChanged(address indexed odAddr, bytes32 indexed interfaceHash, address indexed newAddr);
    event InterfaceImplementerRemoved(address indexed addr, bytes32 indexed interfaceHash);
    event ManagerChanged(address indexed addr, address indexed newManager);
    
    constructor(address _address) public {
        admin = _address;
    }

    /// @notice Query the hash of an interface given a name
    /// @param interfaceName Name of the interfce
    function interfaceHash(string interfaceName, uint id) 
        public pure returns(bytes32) 
    {
        bytes32 interfaceBytes;
        bytes32 idBytes = bytes32(id);
        assembly {
            interfaceBytes := mload(add(interfaceName, 32))
        }
        if (bytes(interfaceName).length > 28 && idBytes > 0xffffffff) {
            return 0;
        }
        return interfaceBytes | idBytes;
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

    function getInterfaceImplementer(address addr, bytes32 iHash) view external 
        returns (address implementer, string multichain, bool verified) 
    {
        implementer = interfaces[addr][iHash].implementer;
        multichain = string(interfaces[addr][iHash].multichain);
        verified = interfaces[addr][iHash].verified;
    }

    function setInterfaceImplementer(
        address addr, bytes32 iHash, string multichain) 
        external canManage(addr) 
    {
        require(bytes(multichain).length == 38);
        require(!registeredMultichain[bytes(multichain)]);
        require(!interfaces[addr][iHash].verified);
        if (registeredMultichain[interfaces[addr][iHash].multichain]) {
            registeredMultichain[interfaces[addr][iHash].multichain] = false;
        }
        interfaces[addr][iHash].implementer = msg.sender;
        interfaces[addr][iHash].multichain = bytes(multichain);
        emit InterfaceImplementerSet(addr, iHash, multichain);
    }
    
    function verifyInterfaceImplementer(address addr, bytes32 iHash) external {
        bytes memory multichain = interfaces[addr][iHash].multichain;
        require(!interfaces[addr][iHash].verified);
        require(interfaces[addr][iHash].implementer != 0);
        require(!registeredMultichain[multichain]);
        if (iHash == bytes32("attestator")) {
            require(msg.sender == admin);
        } else {
            require(interfaces[msg.sender]["attestator"].verified);
            require(!interfaces[addr]["attestator"].verified);
        }
        registeredMultichain[multichain] = true;
        interfaces[addr][iHash].verified = true;
    }
    
    function removeInterfaceImplementer(address addr, bytes32 iHash) 
        external canManage(addr) 
    {
        interfaces[addr][iHash] = Implementer(0x0, "", false);
        registeredMultichain[interfaces[addr][iHash].multichain] = false;
        emit InterfaceImplementerRemoved(addr, iHash);
    }
}