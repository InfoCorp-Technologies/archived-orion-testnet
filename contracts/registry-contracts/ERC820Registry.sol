pragma solidity ^0.4.23;

import './ERC820ImplementerInterface.sol';

contract ERC820Registry {
    
    struct Implementer {
        address implementer;
        string multichain;
    }
    
    bytes4 constant InvalidID = 0xffffffff;
    bytes4 constant ERC165ID = 0x01ffc9a7;
    bytes32 constant ERC820_ACCEPT_MAGIC = keccak256("ERC820_ACCEPT_MAGIC");

    mapping (string => bool) registered;
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
        if (isERC165Interface(iHash)) {
            implementer = erc165InterfaceSupported(addr, bytes4(iHash)) ? addr : 0;
        } else {
            implementer = interfaces[addr][iHash].implementer;
        }
        return (implementer, interfaces[addr][iHash].multichain);
    }

    function setInterfaceImplementer(address addr, string name, address implementer, string multichain) external canManage(addr) 
    {
        bytes32 iHash = interfaceHash(name);
        require(!isERC165Interface(iHash));
        require(bytes(multichain).length == 38);
        if (registered[interfaces[addr][iHash].multichain]) {
            registered[interfaces[addr][iHash].multichain] = false;
        }
        require(!registered[multichain]);
        if ((implementer != 0) && (implementer != msg.sender)) {
            require(ERC820ImplementerInterface(implementer).canImplementInterfaceForAddress(addr, iHash) == ERC820_ACCEPT_MAGIC);
        }
        interfaces[addr][iHash].implementer = implementer;
        interfaces[addr][iHash].multichain = multichain;
        registered[multichain] = true;
        emit InterfaceImplementerSet(addr, iHash, implementer);
    }
    
    function changeInterfaceImplementer(address oldAddr, bytes32 iHash, address newAddr) public canManage(oldAddr) {
        require(interfaces[newAddr][iHash].implementer == 0);
        interfaces[newAddr][iHash] = interfaces[oldAddr][iHash];
        interfaces[oldAddr][iHash] = Implementer(0x0, "");
        emit InterfaceImplementerChanged(oldAddr, iHash, newAddr);
    }
    
    function removeInterfaceImplementer(address addr, bytes32 iHash) external canManage(addr) {
        interfaces[addr][iHash] = Implementer(0x0, "");
        registered[interfaces[addr][iHash].multichain] = false;
        emit InterfaceImplementerRemoved(addr, iHash);
    }

    /// ERC165 Specific

    function isERC165Interface(bytes32 iHash) internal pure returns (bool) {
        return iHash & 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF == 0;
    }

    function erc165InterfaceSupported(address _contract, bytes4 _interfaceId) view public returns (bool) {
        if (!erc165Cache[_contract][_interfaceId]) {
            erc165UpdateCache(_contract, _interfaceId);
        }
        return interfaces[_contract][_interfaceId].implementer != 0;
    }

    function erc165UpdateCache(address _contract, bytes4 _interfaceId) public {
        interfaces[_contract][_interfaceId].implementer =
            erc165InterfaceSupported_NoCache(_contract, _interfaceId) ? _contract : 0;
        erc165Cache[_contract][_interfaceId] = true;
    }

    function erc165InterfaceSupported_NoCache(address _contract, bytes4 _interfaceId) public view returns (bool) {
        uint256 success;
        uint256 result;

        (success, result) = noThrowCall(_contract, ERC165ID);
        if ((success==0)||(result==0)) {
            return false;
        }

        (success, result) = noThrowCall(_contract, InvalidID);
        if ((success==0)||(result!=0)) {
            return false;
        }

        (success, result) = noThrowCall(_contract, _interfaceId);
        if ((success==1)&&(result==1)) {
            return true;
        }
        return false;
    }

    function noThrowCall(address _contract, bytes4 _interfaceId) view internal returns (uint256 success, uint256 result) {
        bytes4 erc165ID = ERC165ID;

        assembly {
                let x := mload(0x40)               // Find empty storage location using "free memory pointer"
                mstore(x, erc165ID)                // Place signature at begining of empty storage
                mstore(add(x, 0x04), _interfaceId) // Place first argument directly next to signature

                success := staticcall(
                                    30000,         // 30k gas
                                    _contract,     // To addr
                                    x,             // Inputs are stored at location x
                                    0x08,          // Inputs are 8 bytes long
                                    x,             // Store output over input (saves space)
                                    0x20)          // Outputs are 32 bytes long

                result := mload(x)                 // Load the result
        }
    }
}