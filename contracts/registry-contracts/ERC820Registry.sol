pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './Livestock.sol';

contract ERC820Registry is Ownable {
    
    struct Implementer {
        address implementer;
        bytes multichain;
        bool verified;
        bool removing;
    }

    mapping (address => address) managers;
    mapping (bytes28 => Livestock) livestockMap;
    mapping (bytes32 => address) registeredLivestock;
    mapping (bytes => bool) registeredMultichain;
    mapping (address => mapping(bytes32 => Implementer)) interfacesMap;

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }
    
    event LivestockAdded(string name, address indexed addr);
    event LivestockRemoved(string name, address indexed addr);
    event InterfaceImplementerSet(
        address indexed addr, 
        bytes32 indexed interfaceHash, 
        string multichain);
    event InterfaceImplementerRemoving(
        address indexed addr, 
        bytes32 indexed interfaceHash);
    event InterfaceImplementerVerified(
        address indexed addr, 
        bytes32 indexed interfaceHash,
        string action);
    event ManagerChanged(address indexed addr, address indexed newManager);

    constructor(address admin) public {
        owner = admin;
    }

    /// @notice Query the combined interface given a name and id 
    /// @param interfaceName Name of the interfce
    function interfaceHash(string interfaceName, uint id) 
        public pure returns(bytes32) 
    {
        bytes32 interfaceBytes;
        bytes32 idBytes = bytes32(id);
        assembly {
            interfaceBytes := mload(add(interfaceName, 32))
        }
        if (bytes(interfaceName).length > 28 || idBytes > 0xffffffff) {
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
    
    function getLivestock(string _name) external view returns(address) {
        bytes28 name = toBytes28(_name);
        return livestockMap[name];
    }
     
    function setLivestock(Livestock _livestock) external onlyOwner {
        bytes28 name = toBytes28(_livestock.symbol());
        require(_livestock.owner() == address(this), "The livestock contract must have this Registry contract as owner");
        require(livestockMap[name] == address(0), "This livestock is already set");
        livestockMap[name] = _livestock;
        emit LivestockAdded(_livestock.symbol(), _livestock);
    }
    
    function removeLivestock(string _name) external onlyOwner {
        bytes28 name = toBytes28(_name);
        Livestock livestock = livestockMap[name];
        require(livestock != address(0), "This livestock hasn't been set");
        livestock.transferOwnership(msg.sender);
        livestockMap[name] = Livestock(0);
        emit LivestockRemoved(_name, livestock);
    }
    
    function getInterfaceImplementer(address addr, bytes32 iHash) public 
        view returns (address implementer, string multichain, bool verified) 
    {
        Implementer memory interfaces = getInterfaces(addr, iHash);
        implementer = interfaces.implementer;
        multichain = string(interfaces.multichain);
        verified = interfaces.verified;
    }

    function setInterfaceImplementer(
        address addr, bytes32 iHash, string multichain) 
        external canManage(addr) 
    {
        Implementer memory interfaces = interfacesMap[addr][iHash];
        bytes memory multichainBytes = bytes(multichain);
        require(multichainBytes.length == 38, "The Multichain address string length must longer than 38");
        require(!registeredMultichain[multichainBytes], "The Multichain address has been claimed");
        require(!interfaces.verified, "The registered information must not be registered and verified before");
        if (iHash == "attestator") {
            require(!interfacesMap[addr]["user"].verified, "A user must not have attestator role at the same time");
        } else {
            require(!interfacesMap[addr]["attestator"].verified, "An attestator must not have user role at the same time");
            uint id = uint(bytes4(iHash << (8 * 28)));
            bytes28 name = bytes28(iHash);
            if (id > 0) {
                require(interfacesMap[addr]["user"].verified, "Only user can register livestock");
                require(!livestockMap[name].exists(id), "This livestock contract is not set or the token has already been minted");
            }
        }
        if (registeredMultichain[interfaces.multichain]) {
            registeredMultichain[interfaces.multichain] = false;
        }
        interfacesMap[addr][iHash].implementer = msg.sender;
        interfacesMap[addr][iHash].multichain = multichainBytes;
        emit InterfaceImplementerSet(addr, iHash, multichain);
    }
    
    function verifyInterfaceImplementer(address addr, bytes32 iHash) external {
        Implementer memory interfaces = interfacesMap[addr][iHash];
        require(interfaces.implementer != 0, "This registered information hasn't existed");
        require(!interfaces.verified, "This registered information has already been verified");
        require(!registeredMultichain[interfaces.multichain], "The Multichain address has been claimed");
        if (iHash == "attestator") {
            require(msg.sender == owner, "The verifier must be admin to verify attestator");
            require(!interfacesMap[addr]["user"].verified, "A user must not have attestator role at the same time");
        } else {
            require(interfacesMap[msg.sender]["attestator"].verified, "The verifier must be attestator to verify user or livestock");
            require(!interfacesMap[addr]["attestator"].verified, "An attestator must not have user role at the same time");
            uint id = uint(bytes4(iHash << (8 * 28)));
            bytes28 name = bytes28(iHash);
            if (id > 0) {
                livestockMap[name].mint(addr, id);
                registeredLivestock[iHash] = addr;
            }
        }
        registeredMultichain[interfaces.multichain] = true;
        interfacesMap[addr][iHash].verified = true;
        emit InterfaceImplementerVerified(addr, iHash, "Added");
    }
    
    function removeInterfaceImplementer(address addr, bytes32 iHash) 
        external canManage(addr) 
    {
        Implementer memory interfaces = getInterfaces(addr, iHash);
        require(interfaces.verified, "This registered information is not verified");
        interfacesMap[addr][iHash].removing = true;
        emit InterfaceImplementerRemoving(addr, iHash);
    }
    
    function verifyInterfaceRemoval(address addr, bytes32 iHash) external {
        Implementer memory empty = Implementer(0x0, "", false, false);
        Implementer memory interfaces;
        require(interfacesMap[addr][iHash].removing, "This registered information is not marked as removing");
        if (iHash == "attestator") {
            require(msg.sender == owner, "The verifier must be admin to verify removal of attestator");
        } else {
            require(interfacesMap[msg.sender]["attestator"].verified, "The verifier must be attestator to verify removal of user and livestock");
        }
        uint id = uint(bytes4(iHash << (8 * 28)));
        bytes28 name = bytes28(iHash);
        if (id > 0) {
            address registered = registeredLivestock[iHash];
            interfaces = interfacesMap[registered][iHash];
            registeredMultichain[interfaces.multichain] = false;
            registeredLivestock[iHash] = 0;
            livestockMap[name].burn(addr, id);
            interfacesMap[addr][iHash].removing = false;
            interfacesMap[registered][iHash] = empty;
        } else {
            interfaces = interfacesMap[addr][iHash];
            registeredMultichain[interfaces.multichain] = false;
            interfacesMap[addr][iHash] = empty;
        }
        emit InterfaceImplementerVerified(addr, iHash, "Removed");
    }
    
    function toBytes28(string name) internal pure returns(bytes28 result) {
        assembly {
            result := mload(add(name, 32))
        }
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
}